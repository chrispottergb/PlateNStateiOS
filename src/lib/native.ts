import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();

// Camera — picks from photo library on native, returns base64 data URL.
// Returns null on web (caller should trigger a file input instead).
export async function pickImageFromLibrary(): Promise<string | null> {
  if (!isNative) return null;
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
  const photo = await Camera.getPhoto({
    quality: 85,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Photos,
  });
  if (!photo.base64String) return null;
  return `data:image/jpeg;base64,${photo.base64String}`;
}

// Camera — opens native camera app on native, returns base64 data URL.
// Returns null on web (caller should use getUserMedia instead).
export async function takePhotoNative(): Promise<string | null> {
  if (!isNative) return null;
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
  const photo = await Camera.getPhoto({
    quality: 85,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Camera,
  });
  if (!photo.base64String) return null;
  return `data:image/jpeg;base64,${photo.base64String}`;
}

// Geolocation — uses Capacitor plugin on native, browser API on web.
export async function getPosition(): Promise<{ latitude: number; longitude: number } | null> {
  if (isNative) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      await Geolocation.requestPermissions();
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch {
      return null;
    }
  }

  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}
