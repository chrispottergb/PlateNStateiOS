# Plate N' State — Mobile App (iOS & Android)

This project is wrapped with [Capacitor](https://capacitorjs.com/) so the same web codebase ships as a real native app to the **Apple App Store** and **Google Play Store**.

> Hot-reload from the Lovable sandbox is enabled via `capacitor.config.ts → server.url`. Remove that block before producing a release build.

---

## Prerequisites

| Target | Required |
|---|---|
| **Android** | Any OS (Windows / macOS / Linux) + [Android Studio](https://developer.android.com/studio) |
| **iOS** | macOS + [Xcode](https://developer.apple.com/xcode/) + Apple Developer account ($99/yr) |

---

## First-time local setup

1. Click **Export to GitHub** in Lovable, then `git clone` your repo locally.
2. `npm install`
3. Add the platforms you need:
   ```bash
   npx cap add android
   npx cap add ios     # macOS only
   ```
4. Build the web bundle and sync it into the native projects:
   ```bash
   npm run build
   npx cap sync
   ```

After every `git pull` from Lovable, re-run `npm run build && npx cap sync`.

---

## Run on device / emulator

```bash
npx cap run android    # opens emulator or attached device
npx cap run ios        # opens simulator (macOS only)
```

Or open the native IDE directly:
```bash
npx cap open android
npx cap open ios
```

---

## Google Play Store — Release Checklist

1. **Sign up**: [play.google.com/console](https://play.google.com/console) — $25 one-time fee.
2. In Android Studio:
   - Set `applicationId`, `versionCode`, `versionName` in `android/app/build.gradle`
   - Add app icon via **Image Asset Studio**
   - Generate a signing key:
     ```bash
     keytool -genkey -v -keystore platenstate.jks -keyalg RSA -keysize 2048 -validity 10000 -alias platenstate
     ```
     **Back up `platenstate.jks` securely — losing it means you can never update the app.**
   - **Build → Generate Signed Bundle → Android App Bundle (.aab)**
3. In Play Console:
   - Create app, fill listing (title, description, screenshots, 512×512 icon, 1024×500 feature graphic)
   - Provide **Privacy Policy URL** (required)
   - Complete **Data Safety** form (declare camera, location, account data)
   - Complete **Content Rating** questionnaire (flag user-generated content)
   - Upload `.aab` to **Internal testing** track first
4. **New developer accounts**: must run **Closed testing with 12+ testers for 14 days** before unlocking Production.
5. Promote: Internal → Closed → Open → Production.

Typical timeline: **~3 weeks** from first upload to live on the Play Store.

---

## Apple App Store — Release Checklist

1. Enroll in [Apple Developer Program](https://developer.apple.com/programs/) ($99/yr).
2. In Xcode:
   - Set Bundle Identifier, version, build number
   - Add app icons (Assets.xcassets)
   - Select your Team for code signing
   - **Product → Archive → Distribute App → App Store Connect**
3. In [App Store Connect](https://appstoreconnect.apple.com):
   - Create app, fill listing, upload screenshots (6.7", 6.5", 5.5", iPad)
   - Privacy policy URL + privacy questionnaire
   - Submit for review (typically 1–3 days)

---

## OAuth (Google sign-in) on native

After `npx cap add android`, get the SHA-1 of your signing key:
```bash
keytool -list -v -keystore platenstate.jks -alias platenstate
```
Add this SHA-1 to the Google OAuth provider config in **Lovable Cloud → Users → Auth Settings → Google**.

---

## Going to production

Before shipping a release build, **remove the `server` block from `capacitor.config.ts`** so the app runs the bundled web assets instead of loading from the Lovable sandbox URL.
