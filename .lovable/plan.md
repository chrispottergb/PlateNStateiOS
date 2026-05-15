Problem found: production `https://platenstate.com/reset-password` is blank because the JavaScript bundle crashes immediately with `supabaseUrl is required`. That means the published build is missing the `VITE_SUPABASE_URL` value, so the app never reaches the reset-password route.

Plan:
1. Add a safe client-side fallback for Lovable Cloud public config so production can boot even if the injected Vite env vars are missing.
2. Keep using the generated Supabase client file untouched by creating a small config helper or adjusting imports around it, without exposing private keys.
3. Re-test `/reset-password#type=recovery` in preview to confirm the reset form renders.
4. Re-test `https://platenstate.com/reset-password#type=recovery` after implementation to confirm the production blank screen is gone.
5. If production still serves the old bundle, publish the latest app version and verify again.