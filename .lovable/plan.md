

# Google Play Readiness for Plate N' State

## The Short Answer
Google Play is the **easier** of the two stores. No Mac required, $25 one-time fee (vs Apple's $99/year), faster reviews (hours, not days), and Google is far more lenient about wrapped web apps. Same Capacitor setup as iOS — just skip the Apple-specific steps.

## Two Paths to Play Store

### Path A: Capacitor (recommended — same code as iOS path)
Wrap the existing web app in a real native Android shell. This is what was outlined in the previous plan.

### Path B: Trusted Web Activity (TWA / Bubblewrap)
Google-only shortcut: take the deployed PWA URL and wrap it in a thin Android shell using Google's `bubblewrap` CLI. Faster to ship, but tied to your live URL — if `platenstate.lovable.app` goes down, the app shows an error. No iOS equivalent.

Recommendation: **Path A (Capacitor)** so the same codebase ships to both stores later.

## What We Build in Lovable (Path A)

Same as the iOS plan, nothing Android-specific to add at the code level:
1. Install Capacitor core + Android platform packages
2. Create `capacitor.config.ts` (`appId: app.lovable.8d04b41e82334288b74dacb66aee32f6`, `appName: platenstate`)
3. Swap web APIs for Capacitor plugins with web fallbacks:
   - Camera (plate scanner) → `@capacitor/camera`
   - Geolocation (report locations) → `@capacitor/geolocation`
   - Push notifications → `@capacitor/push-notifications` (uses Firebase Cloud Messaging on Android)
4. Splash screen + status bar plugins themed dark
5. Deep-link config for Google OAuth return
6. Add Supabase redirect URL for the Android scheme

## What You Do Locally (one-time)

Android needs **no Mac** — works on Windows, Linux, or macOS.

1. Export project to GitHub → `git pull` locally
2. Install **Android Studio** (free, includes the Android SDK + emulator)
3. `npm install`
4. `npx cap add android`
5. `npm run build && npx cap sync`
6. `npx cap open android` → opens Android Studio
7. In Android Studio:
   - Set application ID, version code, version name
   - Add app icon (Image Asset wizard handles all densities)
   - Generate a **signing key** (`keytool` — one command, store the `.jks` file safely)
   - **Build → Generate Signed Bundle → AAB** (Android App Bundle, required by Play)
8. Upload the `.aab` to Play Console

## Play Console Setup

1. Pay $25 one-time at [play.google.com/console](https://play.google.com/console)
2. Create app listing:
   - Title, short + full description
   - Feature graphic (1024×500), phone screenshots (min 2), icon (512×512)
   - Privacy policy URL (**required** — even more strictly enforced than Apple)
   - Content rating questionnaire
   - Data safety form (declare camera, location, account data usage)
   - Target audience (likely 18+ given content)
3. Upload signed AAB to **Internal testing** track first
4. Add testers by email → they install via a Play Store link
5. Promote to **Closed testing** → **Open testing** → **Production**

New developer accounts (since 2023) must complete **closed testing with 12+ testers for 14 days** before being allowed into production. Plan for ~2-3 weeks from first upload to public launch.

## Android-Specific Things to Watch

| Item | Detail |
|---|---|
| Permissions | Each native plugin auto-adds entries to `AndroidManifest.xml` (camera, location, notifications). Review before submission. |
| Target SDK | Play requires apps target a recent Android API level (currently 34). Capacitor's Android template already does this. |
| Data Safety form | Must declare every data type collected (email, plate photos, location). Mismatch = rejection. |
| Content rating | "User-generated content" flag is required because of reports/comments. |
| 64-bit requirement | AAB format handles this automatically. |
| Google sign-in | Needs the SHA-1 of your signing key added to the Supabase Google OAuth config. |

## Cost & Timeline

- **Cost**: $25 one-time. No annual fee.
- **Review time**: First submission 1-7 days. Updates often within hours.
- **Closed-testing requirement**: 14 days + 12 testers for new accounts before production access.
- **Realistic timeline**: ~3 weeks from "approve this plan" to live on Play Store.

## What I'll Do If You Approve

The Capacitor setup is identical for iOS and Android — installing it once gets you both. If you only want Android right now, we still install the same packages; you just skip `npx cap add ios` locally. Approve and I'll:

1. Install Capacitor + Android plugin packages
2. Create `capacitor.config.ts`
3. Convert plate scanner camera + geolocation to Capacitor plugins (with web fallbacks so the Lovable preview still works)
4. Add splash, status bar, deep-link configs
5. Update Supabase auth redirect URLs to include the app scheme
6. Document the exact local Android Studio + Play Console steps in a `MOBILE.md` file in the repo

