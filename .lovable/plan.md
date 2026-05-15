## What I verified

- The reset-password route is **not blank in preview**.
- I tested both common reset-link URL shapes:
  - `/reset-password?code=...`
  - `/reset-password#access_token=...&refresh_token=...&type=recovery`
- The form renders in preview with no auth-related console errors.
- Lovable Cloud backend health looks normal.

## Likely remaining problem

The app currently sends reset links to whatever domain the user is on when they request the email. In preview that can be a preview/lovableproject URL; in production it can be `platenstate.com` or `platenstate.lovable.app`. If the email link uses a domain or redirect URL Google/Auth settings do not allow, the link can appear broken or blank after leaving email.

## Plan

1. **Lock password reset emails to the production custom domain**
   - Change the reset email redirect to always use:
     - `https://platenstate.com/reset-password`
   - This avoids preview-origin reset emails and prevents needing a new Google review just because the preview URL changed.

2. **Make the reset page fail visibly instead of looking blank**
   - Add a small loading state while the reset link is being checked.
   - Catch `getSession()` / `verifyOtp()` errors so runtime auth errors cannot crash the page.
   - Keep showing the form only after a recovery session is confirmed.
   - Show a clear “invalid or expired link” message if the link is bad.

3. **Keep support for all reset-link formats**
   - PKCE links: `?code=...`
   - Token hash links: `?token_hash=...&type=recovery`
   - Legacy hash links: `#access_token=...&type=recovery`

4. **Verify before calling it done**
   - Open `/reset-password?code=test` and confirm the page never goes blank.
   - Open legacy hash reset URL and confirm the form appears.
   - Confirm no auth console errors.
   - Confirm the reset email code points to `https://platenstate.com/reset-password`.

## Files to update

- `src/pages/Auth.tsx`
- `src/pages/ResetPassword.tsx`