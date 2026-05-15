## Plan: make password reset work reliably in the Android app

### What I found
- The app is wrapped with Capacitor and an `.aab` is being built outside Lovable.
- Password reset emails currently point to `https://platenstate.com/reset-password`.
- The web reset route exists, but the native app does **not** currently have app/deep-link handling that forwards an opened reset URL into React Router.
- That explains the Android behavior: the email link can open the app/WebView but the app never navigates to `/reset-password` with the reset token, leaving the user on an unusable/blank state.

### Changes to make
1. **Add native URL handling**
   - Add a small native-link handler using `@capacitor/app`.
   - Listen for URLs opened from email links.
   - If the URL contains `/reset-password`, push the full path/query/hash into React Router so the reset screen receives the token.

2. **Make routing native-safe**
   - Keep web routing unchanged for the published site.
   - Add a safe redirect helper for Capacitor so native links like `https://platenstate.com/reset-password?code=...` become `/reset-password?code=...` inside the bundled app.

3. **Harden the reset page**
   - Keep support for all reset-link formats: `?code=...`, `?token_hash=...&type=recovery`, and legacy hash recovery links.
   - Ensure it never sits on an infinite spinner or crashes into a blank screen.
   - Show a visible invalid/expired-link message when token exchange fails.

4. **Keep reset emails pointed at production**
   - Continue using `https://platenstate.com/reset-password` so emails don’t use preview/native `localhost` origins.

5. **Verification before saying done**
   - Test web preview reset URLs for render/no blank page.
   - Test simulated native-open URL handling in browser-capable code paths.
   - Run targeted checks so we verify the reset route loads and the fallback states are visible.

### Important Android follow-up after implementation
After this change is approved and implemented, the `.aab` builder needs to pull the updated code, run `npm install` if needed, then run `npm run build && npx cap sync android` before generating the next `.aab`. If the native Android manifest in Claude Code does not already declare App Links for `platenstate.com`, that will also need to be added there for email links to open the app directly.