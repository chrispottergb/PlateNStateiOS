import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();

// Apple Guideline 3.1.1: digital goods may not be sold in the iOS app via
// external payment (Stripe). Per 3.1.3(b) users CAN access content purchased
// elsewhere, so on iOS all purchase UI is hidden entirely — no buy buttons,
// no links to external checkout. Android/web are unaffected.
export const isIOS = Capacitor.getPlatform() === "ios";
export const purchasesEnabled = !isIOS;

// Camera — picks from photo library on native, returns base64 data URL.
// Returns null on web (caller should trigger a file input instead).
// NOTE: AndroidManifest.xml must include <uses-permission android:name="android.permission.CAMERA" />
// (Capacitor's Camera plugin adds this automatically via its own manifest fragment,
//  but verify it is present after `npx cap sync android`).
export async function pickImageFromLibrary(): Promise<string | null> {
  if (!isNative) return null;
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
  // Do NOT request the 'photos' permission on Android: it maps to
  // READ_MEDIA_IMAGES, which is deliberately stripped from the manifest
  // (Google Play photo-permission policy), so the request auto-denies and we'd
  // throw before the picker ever opens. The system Photo Picker used by
  // getPhoto needs no permission at all. iOS still gets its native prompt.
  if (isIOS) {
    const perms = await Camera.requestPermissions({ permissions: ['photos'] });
    if (perms.photos !== 'granted') {
      throw new Error('Photo library access denied. Please enable it in Settings > Privacy > Photos.');
    }
  }
  const photo = await Camera.getPhoto({
    quality: 70,
    width: 1280,
    height: 960,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Photos,
    presentationStyle: 'popover',
  });
  if (!photo.base64String) return null;
  return `data:image/jpeg;base64,${photo.base64String}`;
}

// Camera — opens native camera app on native, returns base64 data URL.
// Returns null on web (caller should use getUserMedia instead).
// NOTE: AndroidManifest.xml must include <uses-permission android:name="android.permission.CAMERA" />
export async function takePhotoNative(): Promise<string | null> {
  if (!isNative) return null;
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
  const perms = await Camera.requestPermissions({ permissions: ['camera'] });
  if (perms.camera !== 'granted') {
    throw new Error('Camera access denied. Please enable it in Settings > Privacy > Camera.');
  }
  const photo = await Camera.getPhoto({
    quality: 70,
    width: 1280,
    height: 960,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Camera,
    presentationStyle: 'fullScreen',
  });
  if (!photo.base64String) return null;
  return `data:image/jpeg;base64,${photo.base64String}`;
}

// Geolocation — uses Capacitor plugin on native, browser API on web.
export async function getPosition(): Promise<{ latitude: number; longitude: number } | null> {
  if (isNative) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      // Request ONLY the coarseLocation alias. The default (no-arg) call requests
      // the 'location' alias too, which maps to ACCESS_FINE_LOCATION — a permission
      // deliberately absent from our manifest. Capacitor then throws "missing
      // permission in manifest" BEFORE showing any prompt, which we'd misreport
      // as the user denying permission.
      const perms = await Geolocation.requestPermissions({ permissions: ['coarseLocation'] });
      if (perms.coarseLocation !== 'granted' && perms.location !== 'granted') return null;
      // Coarse accuracy only — GPS coords are rounded to ~1km before storage,
      // so high accuracy isn't needed.
      try {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 12000,
        });
        return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch {
        // First fix can time out on coarse (cell/Wi-Fi) providers — retry once
        // with a longer window and accept a cached recent position.
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 120000,
        });
        return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      }
    } catch {
      return null;
    }
  }

  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  });
}
