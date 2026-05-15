## Problem

Sentry is being spammed by `AuthApiError: Invalid Refresh Token: Refresh Token Not Found` (status 400, code `refresh_token_not_found`). Confirmed in:
- Browser console (unhandled error from `supabase.auth._recoverAndRefresh` during init)
- Auth logs (`POST /token` → 400 `refresh_token_not_found`)

Cause: When the app boots with a stale or revoked refresh token in `localStorage`, supabase-js throws during init. The error is functionally harmless (user just isn't signed in), but it propagates as an uncaught promise rejection and Sentry captures it.

## Fix (two layers)

### 1. Clear stale tokens in `src/hooks/useAuth.tsx`
Wrap `supabase.auth.getSession()` in a `.catch` and call `supabase.auth.signOut({ scope: 'local' })` when the error is `refresh_token_not_found` / `AuthApiError`. This wipes the bad token from localStorage so the user starts clean instead of re-throwing on every page load.

### 2. Filter known-noise from Sentry in `src/main.tsx`
Add a `beforeSend` hook to the `Sentry.init` call that drops events whose error matches:
- `AuthApiError` with `code === 'refresh_token_not_found'`
- `AuthSessionMissingError`
- Any error message matching `/Invalid Refresh Token|Refresh Token Not Found|Auth session missing/i`

This prevents future variants of the same noise category from polluting Sentry while still letting genuine auth bugs through.

## Files touched

- `src/hooks/useAuth.tsx` — clean up stale refresh tokens on init failure
- `src/main.tsx` — Sentry `beforeSend` filter

## Verification

After implementation: hard-refresh the preview, confirm no `AuthApiError` in the console, confirm `localStorage` no longer holds the stale `sb-*-auth-token` after the recovery path runs, and confirm signed-in sessions still load normally.
