# Fix Android Back Button

## Problem
On Android, Capacitor's default `backButton` behavior exits the app instead of navigating back through your in-app routes. The project has no `App.addListener('backButton', …)` handler, so pressing the device back button either closes the app or does nothing useful inside modals/sheets.

## Solution
Add a global Android back-button handler that:
1. Closes any open modal/sheet/drawer first (via a small subscription registry).
2. Otherwise, navigates back through React Router history.
3. If history is empty and the user is on the home route, minimizes the app (`App.minimizeApp()`), matching standard Android UX (does not force-close).

## Changes

### 1. New hook: `src/hooks/useAndroidBackButton.tsx`
- Uses `@capacitor/app` `App.addListener('backButton', …)`.
- Guarded by `Capacitor.getPlatform() === 'android'` so it's a no-op on web/iOS.
- Calls `navigate(-1)` when `window.history.length > 1` and current path isn't `/`.
- Calls `App.minimizeApp()` at root instead of `App.exitApp()` (less destructive).
- Exposes a tiny pub/sub (`registerBackHandler(fn)`) so open overlays can intercept first; handler returns `true` if it consumed the event.

### 2. Register hook in `src/App.tsx`
- Call `useAndroidBackButton()` once inside the Router so `useNavigate` is available.

### 3. Optional follow-up (only if needed)
- `ReportModal` and other Dialog/Sheet components can call `registerBackHandler` on open to close themselves on back press. Not required for the base fix — Radix Dialog already closes on Escape, but Android back doesn't dispatch Escape, so this makes modals dismiss naturally.

## Files
- create: `src/hooks/useAndroidBackButton.tsx`
- edit: `src/App.tsx` (one hook call inside Router)
- edit (optional): `src/components/ReportModal.tsx` to register a close handler while open

## Verification
- Web preview: hook is a no-op, no regressions.
- Android build (`npx cap sync && npx cap run android`): back button navigates one route back; at `/` it minimizes the app; open modals close first.
