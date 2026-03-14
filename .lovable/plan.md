

# Credit System Implementation (No Stripe)

## What's Being Built
Wire up the existing credit database infrastructure (20 coins/month, 1 per report) into the UI. Users see their balance, spend coins when reporting, and credits auto-refresh monthly.

## Changes

### 1. ReportModal — Use `spend_credit_on_report` RPC
- Import `supabase` client and `useAuth`
- On submit, call `supabase.rpc('spend_credit_on_report', { p_plate_number, p_infraction, p_location })` instead of the current no-op toast
- Show error if insufficient credits or not authenticated
- Redirect to `/auth` if not signed in

### 2. Header — Show Credit Balance
- Fetch `profiles.credits` for the logged-in user
- Display a coin icon + count next to the user nav items (e.g. "🪙 18")

### 3. Profile Page — Show Credits + Transaction History
- Replace mock data with real data from `profiles` and `reports` tables
- Add a "Credits" stat card showing current balance
- Add a "Transaction History" section querying `credit_transactions`

### 4. Monthly Credit Refresh — Edge Function + Cron
- Create `supabase/functions/refresh-credits/index.ts` that resets all users' credits to 20 and logs a `monthly_refresh` transaction
- Configure `verify_jwt = false` in config.toml
- Set up a `pg_cron` job to call it on the 1st of each month

### 5. Minor Updates
- Update Index page ReportModal to pass auth requirement context
- Profile page fetches real user data instead of mock data

