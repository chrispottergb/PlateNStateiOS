-- Idempotency ledger for Apple IAP fulfillment (see api/apple-verify.js).
CREATE TABLE IF NOT EXISTS public.apple_transactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text NOT NULL UNIQUE,
  product_id     text NOT NULL,
  user_id        uuid NOT NULL,
  environment    text NOT NULL DEFAULT 'live',
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.apple_transactions ENABLE ROW LEVEL SECURITY;
-- service-role only: no policies for anon/authenticated
