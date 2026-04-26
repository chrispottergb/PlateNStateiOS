## Production Hardening II

A single coherent pass covering rate limiting, multi-state RPC, materialized read view, a health endpoint, security headers, captcha + Sentry stubs, and a k6 load-test harness. Items that require a Lovable Cloud / external provider to do real work (auth password rules, pg_cron, hCaptcha, Sentry, Cloudflare/Vercel publish target, k6 VPS) ship as code + documented click-paths so they "turn on" the moment credentials are pasted.

### 1. Auth hardening (Lovable Cloud)
Try to enable HIBP leaked-password protection, min length 10, require ≥1 number via the Cloud auth config tool. Whatever can't be set programmatically gets the exact dashboard click-path written into `SCALING_TODO.md` (Cloud → Users → Auth Settings → Password rules).

### 2. Connection pooling audit
Edge functions currently use `SUPABASE_URL` + service role via the JS SDK (HTTP PostgREST), so port 5432/6543 doesn't apply to them. Document this in `SCALING_TODO.md` and add the env-var pattern (`SUPABASE_DB_POOL_URL=postgres://...:6543/postgres?pgbouncer=true`) for any future direct-pg use, plus confirmation that all current functions go through PostgREST.

### 3. Server-side rate limiting (Postgres token bucket)
New migration:
- `rate_limits(key text PK, tokens int, last_refill timestamptz)`
- `check_rate_limit(p_key text, p_capacity int, p_refill_per_sec numeric) RETURNS boolean` — atomic UPSERT, refills tokens since last_refill, decrements one, returns false if empty.

Wire into:
- `spend_credit_on_report`: `reporter:<uid>` (10/min) and `report_ip:<ip>` (60/min). Adds `p_ip text DEFAULT NULL`.
- `submit_dispute`: `dispute:<uid>` (5/min).
- `scan-plate` and `process-plate-upload` edge functions: `scan_ip:<ip>` / `upload_ip:<ip>` (60/min) using `x-forwarded-for` first hop. Reject with HTTP 429 + `{ error: "Too many requests, slow down" }`.

ReportModal passes IP via a small `getClientIp()` helper (best-effort from a public IP echo; falls back to null and lets the per-user limit do the work).

### 4. Multi-state RPC follow-up
Extend `spend_credit_on_report` with `p_state text DEFAULT 'WI'`, validate against `^[A-Z]{2}$` and a 51-entry whitelist (50 states + DC), insert into `reports.state`. `ReportModal` already has `stateCode` — pass it in.

### 5. Wall of Shame materialized view
- `wall_of_shame_mv` (state, plate_number, report_count, total_score, last_reported_at, top_infraction) with unique index on (state, plate_number).
- `refresh_wall_of_shame()` SECURITY DEFINER → `REFRESH MATERIALIZED VIEW CONCURRENTLY`.
- Try to enable `pg_cron` + `pg_net` and schedule every 5 min; if not available, document the exact `cron.schedule(...)` snippet in `SCALING_TODO.md`.
- New `useWallOfShame(state)` hook reads from the MV; `WallOfShame.tsx` uses it instead of `usePlateRecords` aggregation.

### 6. Health endpoint
`supabase/functions/health/index.ts` — `select 1` via service client, returns `{ ok, ts, db: 'up'|'down' }`. `verify_jwt = false` block in `supabase/config.toml`. URL documented in `SCALING_TODO.md`.

### 7. Security headers
Both `_headers` (Cloudflare Pages / Netlify) and `vercel.json` at repo root with the full CSP / HSTS / XFO / Permissions-Policy / COOP set. `SCALING_TODO.md` notes that Lovable Cloud's published site doesn't currently honor either file, so these are for users self-hosting on Vercel/Netlify/Cloudflare; on `lovable.app` the meta-tag subset in `index.html` remains the live policy.

### 8. Captcha hook (graceful no-op)
- `src/hooks/useCaptcha.ts` returning `{ token, refresh, ready }`. If `VITE_HCAPTCHA_SITE_KEY` is unset, `ready=true` and `token=null` (no-op).
- Wired into `Auth.tsx` signup and `ReportModal` submit; both pass the (possibly null) token to the RPC/edge call.
- Edge functions check `HCAPTCHA_SECRET`; if unset → log warning + skip; if set → POST to hCaptcha verify endpoint and reject on failure.

### 9. Sentry stubs
- `bun add @sentry/react`.
- `main.tsx` calls `Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN })` only when DSN present.
- `ErrorBoundary.componentDidCatch` calls `Sentry.captureException` if initialized.
- Edge-function helper `_shared/sentry.ts` dynamic-imports `@sentry/deno` only when `SENTRY_DSN` is set; `scan-plate` and `process-plate-upload` use it in their catch blocks.

### 10. k6 load test
- `loadtest/scaling.js` — 90/10 read/write, scenarios hitting `/`, `/a-hole-patrol`, plate detail (random sampled), recent-reports REST. Stages match the spec (1k/10k/100k VUs).
- `loadtest/README.md` — install, env vars (`BASE_URL`, `SUPABASE_ANON_KEY`), how to run from a Hetzner/DO VPS with at least 4 vCPU, why a laptop will melt at 100k VUs.

### Verification
After all edits: `bun tsc --noEmit` and `bun run build`. Fix any failures before finishing.

### Technical notes

- **Migration ordering**: one migration creates `rate_limits` + `check_rate_limit` first, then function replacements (`spend_credit_on_report`, `submit_dispute`, MV + refresh fn) reference it.
- **Dropping the existing `spend_credit_on_report` overload**: PG function overloads resolve by signature, so adding `p_state` to the 12-arg version is a `CREATE OR REPLACE` — back-compat preserved because `p_state` defaults to `'WI'`.
- **`REFRESH MATERIALIZED VIEW CONCURRENTLY`** requires the unique index — included.
- **IP from x-forwarded-for**: take the first comma-separated entry, trim, fallback to `req.headers.get("cf-connecting-ip")`, then `null`.
- **hCaptcha edge verification** uses Deno `fetch` to `https://hcaptcha.com/siteverify` with `URLSearchParams`.
- **`@sentry/deno`** is imported via `https://esm.sh/@sentry/deno` only when DSN is present, so cold start cost is zero in the unconfigured state.

### What will be blocked on you (summary)

| Item | What I need from you | Where to put it |
|---|---|---|
| HIBP password rules | Toggle in Cloud → Users → Auth Settings (if `configure_auth` can't set it) | Dashboard |
| Sentry | DSN | `VITE_SENTRY_DSN` (frontend env), `SENTRY_DSN` (edge secret) |
| hCaptcha | Site key + secret | `VITE_HCAPTCHA_SITE_KEY` (frontend env), `HCAPTCHA_SECRET` (edge secret) |
| Security headers actually enforced | Move publish to Vercel/Netlify/Cloudflare or front `lovable.app` with Cloudflare | DNS / hosting choice |
| FCM push | Server key + sender ID + Capacitor config | `FCM_SERVER_KEY`, `FCM_SENDER_ID` |
| k6 100k VU run | A VPS (≥4 vCPU, 8 GB) | Run `BASE_URL=… k6 run loadtest/scaling.js` |
| pg_cron MV refresh | If extension not enabled, run snippet from `SCALING_TODO.md` | Dashboard SQL editor |

Final commit message: **"Production hardening II: rate limiting, p_state, materialized view, health, headers, captcha+sentry stubs"**.