-- Payment fulfillment fixes + claim bonus (2026-07-08).
--   1. add_credits() — called by the Stripe webhook for coin packs since launch
--      but NEVER EXISTED in this database: coin buyers paid and received nothing.
--   2. Used by the new "25 free coins with your first plate claim" bonus.

CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id     uuid,
  p_amount      integer,
  p_type        text DEFAULT 'purchase',
  p_description text DEFAULT 'Coin purchase'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 10000 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: %', p_amount;
  END IF;

  UPDATE profiles SET credits = COALESCE(credits, 0) + p_amount
  WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_PROFILE: %', p_user_id;
  END IF;

  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_amount, p_type, p_description);
END;
$$;

-- Service-role only (the webhook). Clients must never mint their own coins.
-- NOTE: PUBLIC must be in the revoke list — functions default-grant EXECUTE to
-- PUBLIC, so revoking only anon/authenticated leaves the door wide open.
REVOKE ALL ON FUNCTION public.add_credits(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
