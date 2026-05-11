## Plan

1. **Make the mock checkout function callable from the app**
   - Add a `mock-checkout` function entry to `supabase/config.toml` with JWT verification disabled at the platform layer.
   - Keep the existing in-code authentication check so only signed-in users can complete the mock payment.

2. **Improve the checkout error shown to users**
   - Update `CheckoutDialog` to surface backend error details when available instead of only showing the generic “Failed to load edge function”.
   - Include the selected plate state in the mock checkout request when available, so paid claims keep the correct state.

3. **Deploy and verify**
   - Deploy `mock-checkout` again.
   - Test it through the function endpoint and confirm POST requests reach the function instead of stopping after OPTIONS preflight.