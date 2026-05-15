I found real breakpoints instead of guessing:

- `https://platenstate.com/.well-known/assetlinks.json` is currently returning `404 Not found`, so Android App Links cannot verify. That alone can cause reset links to open wrong/blank in the installed app.
- The app config says the native app id is `com.platenstate`, but `assetlinks.json` was created for `com.platenstate.myapp`. One of these is wrong; the website and AAB must match exactly.
- The live published bundle still contains `https://platenstate.lovable.app` for native auth redirects. That means the latest auth redirect work has not fully landed on the production custom domain/AAB flow.
- Google OAuth reaches Google correctly from `platenstate.com` when probed directly, so the reported 404 is likely happening on the app/callback/deep-link side, not the initial Google provider step.

Plan:

1. Fix Android App Links source of truth
   - Confirm the final Android package id should be `com.platenstate.myapp` because that is what the submitted AAB/Play Console setup says.
   - Update Capacitor app id to match that package id if the project currently says `com.platenstate`.
   - Keep `public/.well-known/assetlinks.json` package name and SHA-256 aligned with the exact Play App Signing certificate.

2. Make assetlinks work on Lovable hosting, not Vercel-only config
   - Lovable hosting does not use `vercel.json` or `_headers` for this project.
   - Keep the static file in `public/.well-known/assetlinks.json` and verify after publish that the exact URL returns `200` and JSON:
     `https://platenstate.com/.well-known/assetlinks.json`
   - Do not rely on `vercel.json` rewrites/headers as the fix.

3. Stop native reset links from using the wrong domain
   - Change native auth redirect origin from `https://platenstate.lovable.app` to `https://platenstate.com`.
   - Keep password reset emails pointing to `https://platenstate.com/reset-password`.
   - Ensure `/reset-password` handles code/hash recovery links and displays a usable reset form, not a blank screen.

4. Fix native Google sign-in callback handling
   - For native builds, route Google sign-in through the custom domain and ensure callback/deep-link handling does not leave the WebView on a 404 page.
   - Keep browser web sign-in using the Lovable Cloud OAuth helper.
   - Add a safe fallback so OAuth/reset URLs opened inside the app navigate back to app routes instead of remaining on an external/callback route.

5. Validate before saying done
   - Check the published custom domain endpoints with `curl` after publish instructions.
   - Verify `/reset-password` renders in preview.
   - Verify the OAuth initiation URL no longer 404s and reaches Google.
   - Give you exact Claude Code rebuild steps: pull latest, run install if needed, rebuild web assets, `npx cap sync android`, create a new AAB, upload that new version.

Important: another AAB alone will not fix this unless the website is republished and `assetlinks.json` returns `200` on `platenstate.com` with the same package id as the AAB.