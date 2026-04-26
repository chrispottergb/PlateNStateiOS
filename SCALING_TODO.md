# SCALING_TODO — Plate N' State Production Hardening

This file tracks **infrastructure / dashboard** work that lives outside the codebase.

---

## ✅ Completed in code (Hardening II)

- Postgres token-bucket rate limiting (`rate_limits` table + `check_rate_limit` RPC).
  Wired into `spend_credit_on_report` (10/min per user, 60/min per IP),
  `submit_dispute` (5/min per user), and the `scan-plate` + `process-plate-upload`
  edge functions (60/min per IP). Edge functions return HTTP 429 on exhaustion.
- `spend_credit_on_report` now accepts `p_state` (validated against the 50 states + DC)
  and persists state on each report.
- `wall_of_shame_mv` materialized view + `refresh_wall_of_shame()` + `get_wall_of_shame()` RPC.
  `WallOfShame.tsx` reads from the MV instead of running live aggregation.
- `/health` edge function (no auth, returns `{ ok, ts, db }`).
- `_headers` (Cloudflare/Netlify) and `vercel.json` (Vercel) shipped at repo root.
- Captcha hook (`useCaptcha`) and edge verifier (`verifyCaptcha`) — graceful no-op
  until keys arrive.
- Sentry stubs in both `main.tsx` and edge functions (`_shared/sentry.ts`).
- HIBP leaked-password protection: **enabled via `configure_auth`**.
- k6 load-test harness in `loadtest/`.

---

## ⚠️ Action items still on you

### 1. Auth hardening — final knobs

HIBP is on. The minimum-password-length and number-required rules are enforced
**client-side** in `Auth.tsx` (≥10 chars, must contain a digit). Lovable Cloud
doesn't expose a programmatic toggle for server-side complexity rules; if you
want belt-and-suspenders, set them in:

> **Lovable Cloud → Users → Auth Settings (gear icon) → Email settings → Password rules**

### 2. Connection pooling

Every edge function in `supabase/functions/` uses the `@supabase/supabase-js` SDK
(PostgREST over HTTPS), so PgBouncer ports (5432 vs 6543) don't apply — the SDK
talks to the REST API gateway, which already pools internally.

If you ever add a function that uses raw `postgres.js` / `pg` / `deno-postgres`,
use the **transaction-mode pooler** URL on port 6543:

```
SUPABASE_DB_POOL_URL=postgres://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
```

Get it from: **Lovable Cloud → Database → Connection pooling → Transaction mode**.

### 3. pg_cron for the materialized view

The migration tries to create `pg_cron` and schedule `refresh_wall_of_shame()`
every 5 min. If it didn't take (extension needs superuser on some plans), run
this from **Cloud → Database → SQL editor**:

```sql
create extension if not exists pg_cron;
select cron.schedule(
  'refresh-wall-of-shame', '*/5 * * * *',
  $$ select public.refresh_wall_of_shame(); $$
);
```

Verify with: `select * from cron.job;`

### 4. Health endpoint URL

Public, no auth required:

```
https://diaydeyqbcseufpbwpki.supabase.co/functions/v1/health
```

Plug that into UptimeRobot, BetterStack, Pingdom, etc. Returns 200 + `{ok:true}`
when DB is reachable, 503 + `{ok:false}` otherwise.

### 5. Security headers — which file matters

| Hosting target | File honored |
|---|---|
| Cloudflare Pages, Netlify | `_headers` |
| Vercel | `vercel.json` |
| Lovable's `lovable.app` | **Neither** — Lovable's edge does not currently process either file. The meta-tag subset in `index.html` (X-Content-Type-Options, Referrer-Policy) is what's actually live. |

If you want full CSP/HSTS on the live site, front `lovable.app` with Cloudflare and
add a Transform Rule that injects the headers — or move the production domain to
Vercel/Netlify and let `vercel.json` / `_headers` apply.

### 6. Captcha (hCaptcha) — turns on the moment keys arrive

- Frontend env: `VITE_HCAPTCHA_SITE_KEY`
- Edge function secret: `HCAPTCHA_SECRET`

When unset, both layers no-op (and the edge logs a warning). When set, the hook
needs to be replaced with the real `@hcaptcha/react-hcaptcha` widget — the
plumbing for passing the token through to the edge is already in place.

### 7. Sentry — turns on the moment DSN arrives

- Frontend env: `VITE_SENTRY_DSN`
- Edge function secret: `SENTRY_DSN`

`main.tsx` and `_shared/sentry.ts` both check for these and stay silent until set.
`ErrorBoundary.componentDidCatch` already calls `Sentry.captureException` when
the DSN is configured.

### 8. k6 load test

Don't run from a laptop. See `loadtest/README.md` for the VPS recipe (Hetzner
CCX33 or similar). Stages: 1k → 10k → 100k VUs over ~42 min.

### 9. Push notifications (FCM)

`useNotifications` is in-app only. For mobile push, wire FCM via Capacitor:

- `FCM_SERVER_KEY` — server-side secret
- `FCM_SENDER_ID` — public, can live in `capacitor.config.ts`

See `MOBILE.md`.

### 10. Database scaling (already partly indexed)

Hot-path indexes from the previous pass are still in place. The new
materialized view shifts leaderboard load off `reports` entirely. If you cross
~50M rows in a single state, partition `reports` by `state`.

---

## 🔐 Summary of credentials I still need from you

| What | Env / secret name | Where it goes |
|---|---|---|
| Sentry | `VITE_SENTRY_DSN` (frontend), `SENTRY_DSN` (edge) | Lovable settings + Edge Functions secrets |
| hCaptcha | `VITE_HCAPTCHA_SITE_KEY` (frontend), `HCAPTCHA_SECRET` (edge) | Same as above |
| Cloudflare/Vercel publish | n/a | DNS + hosting choice |
| FCM | `FCM_SERVER_KEY`, `FCM_SENDER_ID` | Edge secrets + capacitor.config.ts |
| k6 VPS | n/a | A box with ≥4 vCPU |
