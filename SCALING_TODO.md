# SCALING_TODO — Plate N' State Production Hardening

This change set made the app multi-state and added in-code performance + hardening.
The items below require **infrastructure / dashboard configuration** outside the codebase.

## Security headers (must be set at CDN/edge)

The following cannot be reliably enforced from a `<meta>` tag and must be set as
HTTP response headers at the hosting layer (Lovable Cloud edge / custom CDN /
reverse proxy in front of the SPA):

- `Content-Security-Policy` — recommended starting policy:
  ```
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: blob: https:;
  connect-src 'self' https://*.supabase.co https://nominatim.openstreetmap.org wss://*.supabase.co;
  frame-ancestors 'none';
  ```
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `Permissions-Policy: geolocation=(self), camera=(self), microphone=()`
- `Cross-Origin-Opener-Policy: same-origin`

The subset Lovable can set from the document (`X-Content-Type-Options`, `Referrer-Policy`)
is already in `index.html`.

## Auth hardening (Supabase dashboard)

- **Leaked password protection**: Currently disabled (linter warning).
  Enable in Authentication → Policies → Password Strength.
  https://supabase.com/docs/guides/auth/password-security

## Rate limiting

- Server-side per-IP rate limits on the `spend_credit_on_report` RPC and the
  `scan-plate` / `process-plate-upload` edge functions.
  Recommended: 60 req/min per IP, 10 reports/min per user.
- The frontend already throttles on the credit system (1 coin per report).

## Observability (stubbed in code)

- `src/components/ErrorBoundary.tsx` currently logs to `console.error`.
  Wire up Sentry / LogRocket / Datadog RUM in `componentDidCatch`.
- Edge function logs are available in the Lovable Cloud dashboard.

## CDN / asset delivery

- Serve static assets through a CDN with long-cache headers
  (`Cache-Control: public, max-age=31536000, immutable` for hashed bundles).
- Enable Brotli + gzip at the edge.

## Database scaling

This migration added indexes on the hot paths:
`reports(plate_number)`, `reports(state, plate_number)`, `reports(reporter_id)`,
`reports(state, created_at desc)`, `claimed_plates(state, plate_number)`,
`notifications(user_id, read, created_at desc)`, `fleet_vehicles(state, plate_number)`.

For higher load consider:
- Read replicas for analytics / leaderboard queries.
- Materialized view for `wall_of_shame` rankings, refreshed every 5 min.
- Partitioning `reports` by `state` once a single state crosses ~50M rows.

## Multi-state rollout follow-ups

- **Backend RPC `spend_credit_on_report`** does not yet accept `p_state`.
  Existing rows default to `'WI'`; new rows also default to `'WI'` until the RPC is
  extended. Add `p_state text` parameter and pass `stateCode` from `ReportModal`.
- **Per-state plate styles** in `src/lib/usStates.ts` are first-pass approximations.
  Replace with official-look-alike SVG backgrounds for hero pages over time.
- **Cities list** covers the largest 5–10 cities per state. Swap in a complete
  USPS city dataset (or free-text input) when needed.
- **Map default bounds** in `WatchMap` should auto-fit to the user's detected state
  rather than centering on Wisconsin.

## Captcha / abuse protection (stubbed)

- Add hCaptcha or Cloudflare Turnstile to `/auth` signup and `ReportModal` submit.
- Hooks/placeholders not yet present — add a thin `useCaptcha()` wrapper when
  integrating.

## Push / FCM (stubbed)

- `useNotifications` is in-app only. For mobile push, wire FCM via the Capacitor
  layer (see `MOBILE.md`).
