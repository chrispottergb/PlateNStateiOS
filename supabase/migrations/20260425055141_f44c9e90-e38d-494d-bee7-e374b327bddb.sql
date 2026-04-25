-- 1. Paid claim columns on claimed_plates
ALTER TABLE public.claimed_plates
  ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_session_id text;

CREATE UNIQUE INDEX IF NOT EXISTS claimed_plates_plate_unique
  ON public.claimed_plates (plate_number);

-- 2. Subscriptions table (Stripe-driven via webhook)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plate_number text,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plate ON public.subscriptions(plate_number);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role bypasses RLS automatically, but we keep an explicit ALL policy for clarity
CREATE POLICY "Service role manages subscriptions"
  ON public.subscriptions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- 3. Helper: active blacklist tier for a plate
-- Returns 'total_block', 'privacy', or NULL (no active blacklist)
CREATE OR REPLACE FUNCTION public.plate_blacklist_tier(p_plate text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN s.price_id IN ('plate_total_block_monthly') THEN 'total_block'
    WHEN s.price_id IN ('plate_privacy_monthly') THEN 'privacy'
    ELSE NULL
  END
  FROM public.subscriptions s
  WHERE s.plate_number = upper(trim(p_plate))
    AND s.status IN ('active', 'trialing', 'past_due')
    AND (s.current_period_end IS NULL OR s.current_period_end > now())
  ORDER BY
    CASE WHEN s.price_id = 'plate_total_block_monthly' THEN 1 ELSE 2 END,
    s.current_period_end DESC NULLS LAST
  LIMIT 1;
$$;

-- 4. Helper: masked display of a plate when blacklisted
CREATE OR REPLACE FUNCTION public.plate_display(p_plate text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.plate_blacklist_tier(p_plate) IS NOT NULL THEN
      substr(p_plate, 1, 3) || repeat('*', GREATEST(length(p_plate) - 3, 1))
    ELSE p_plate
  END;
$$;

-- 5. Public reports view: masks privacy-tier plates, hides total_block entirely
CREATE OR REPLACE VIEW public.reports_public AS
SELECT
  r.id,
  public.plate_display(r.plate_number) AS plate_number,
  r.infraction,
  r.location,
  r.latitude,
  r.longitude,
  r.created_at,
  r.reporter_id,
  r.upvote_count,
  r.downvote_count,
  r.comment,
  r.tags,
  r.hot_take,
  r.vehicle_make,
  r.vehicle_model,
  r.vehicle_color,
  r.vehicle_type,
  r.vehicle_features,
  r.driver_gender,
  public.plate_blacklist_tier(r.plate_number) AS blacklist_tier
FROM public.reports r
WHERE public.plate_blacklist_tier(r.plate_number) IS DISTINCT FROM 'total_block';

GRANT SELECT ON public.reports_public TO anon, authenticated;

-- 6. Block new reports on Total Block plates at DB level
CREATE OR REPLACE FUNCTION public.block_reports_on_blacklisted_plates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.plate_blacklist_tier(NEW.plate_number) = 'total_block' THEN
    RAISE EXCEPTION 'PLATE_BLOCKED: This plate is protected and cannot be reported.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_reports_on_blacklisted ON public.reports;
CREATE TRIGGER trg_block_reports_on_blacklisted
  BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.block_reports_on_blacklisted_plates();

-- 7. Update insurance lookup to skip Total Block plates
CREATE OR REPLACE FUNCTION public.insurance_plate_lookup(p_plate_number text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_result json;
  v_tier text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT is_approved_insurance(v_user_id) THEN
    RAISE EXCEPTION 'Not authorized: insurance account not approved';
  END IF;

  v_tier := public.plate_blacklist_tier(p_plate_number);
  IF v_tier = 'total_block' THEN
    RETURN json_build_object(
      'plate_number', p_plate_number,
      'protected', true,
      'message', 'This plate is protected by the owner and unavailable for lookup.'
    );
  END IF;

  SELECT json_build_object(
    'plate_number', p_plate_number,
    'total_reports', COALESCE(COUNT(r.id), 0),
    'verified_reports', COALESCE(COUNT(r.id) FILTER (WHERE r.upvote_count >= 3), 0),
    'risk_score', LEAST(100, COALESCE(
      SUM(
        CASE r.infraction
          WHEN 'tailgating' THEN 20
          WHEN 'ran_red_light' THEN 25
          WHEN 'speeding' THEN 15
          WHEN 'distracted_driving' THEN 15
          WHEN 'bad_parking' THEN 5
          WHEN 'aggressive_lane_change' THEN 10
          ELSE 10
        END
      ), 0
    )),
    'infractions', COALESCE(
      json_agg(
        json_build_object(
          'id', r.id,
          'infraction', r.infraction,
          'location', r.location,
          'created_at', r.created_at,
          'upvote_count', r.upvote_count,
          'verified', r.upvote_count >= 3
        ) ORDER BY r.created_at DESC
      ) FILTER (WHERE r.id IS NOT NULL),
      '[]'::json
    )
  ) INTO v_result
  FROM reports r
  WHERE r.plate_number = p_plate_number;

  RETURN v_result;
END;
$function$;