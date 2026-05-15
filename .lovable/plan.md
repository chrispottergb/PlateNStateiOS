
## Issues & fixes

### 1 + 2. No confirmation emails / want auto sign-in after signup

These two are best solved together. Right now signup requires email verification before login — so if email delivery has any hiccup (DNS, spam folder, provider lag), users are stuck. The cleanest fix that also gives "auto sign-in after signup" is to **disable email confirmation**.

**Change:** Enable `auto_confirm_email` in auth settings. After this:
- Signup returns a session immediately → user is signed in automatically.
- Update `Auth.tsx` to navigate to `/` after a successful signup (instead of showing "Check your email").

Trade-off: anyone can sign up with any email address (no proof of ownership). Given the app already uses hCaptcha + rate limiting, this is acceptable for a community reporting app. If you ever want verified emails back, we can add a post-signup "verify your email" flow without blocking login.

### 3. Plate scan camera still not working

`PlateScanner.tsx` `startCamera()` calls `navigator.mediaDevices.getUserMedia` directly. In the Android/iOS WebView the page is served over `http://localhost`, which Chrome treats as insecure and blocks `getUserMedia` → "Camera access denied" toast.

The "Upload Photo" button already routes through Capacitor on native (`pickImageFromLibrary`) and works. The "Live Scan" button needs the same treatment, but using the **camera** source instead of the photo library.

**Change:** Add `takePhotoNative()` to `src/lib/native.ts` (Capacitor Camera with `CameraSource.Camera`). In `PlateScanner.tsx`, when `isNative` is true, the "Live Scan" button calls `takePhotoNative()` (opens the OS camera app, returns a photo, runs through `processImage`) instead of `startCamera()`. On web, behavior is unchanged — the in-page video stream still works because the preview runs over HTTPS.

This also lets us drop the in-app "passenger acknowledgement → live preview → capture frame" flow on native (the OS camera handles capture). We keep the passenger checkbox as a gate before opening the OS camera.

## Files to change

- `src/lib/native.ts` — add `takePhotoNative()` using `CameraSource.Camera`.
- `src/components/PlateScanner.tsx` — on native, "Live Scan" calls `takePhotoNative()`.
- `src/pages/Auth.tsx` — on successful signup, navigate to `/` (no "check your email" toast).
- Auth config — set `auto_confirm_email: true`.

No backend schema or RLS changes.
