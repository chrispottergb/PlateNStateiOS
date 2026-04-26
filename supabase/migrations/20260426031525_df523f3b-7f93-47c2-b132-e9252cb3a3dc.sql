
-- 1. Rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  tokens integer NOT NULL,
  last_refill timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text, p_capacity integer, p_refill_per_sec numeric
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_tokens integer;
  v_last timestamptz;
  v_refill integer;
BEGIN
  IF p_key IS NULL OR length(p_key) = 0 THEN RETURN true; END IF;

  INSERT INTO public.rate_limits(key, tokens, last_refill)
  VALUES (p_key, p_capacity, v_now)
  ON CONFLICT (key) DO NOTHING;

  SELECT tokens, last_refill INTO v_tokens, v_last
  FROM public.rate_limits WHERE key = p_key FOR UPDATE;

  v_refill := floor(EXTRACT(EPOCH FROM (v_now - v_last)) * p_refill_per_sec)::integer;
  IF v_refill > 0 THEN
    v_tokens := LEAST(p_capacity, v_tokens + v_refill);
    v_last := v_now;
  END IF;

  IF v_tokens <= 0 THEN
    UPDATE public.rate_limits SET tokens = v_tokens, last_refill = v_last WHERE key = p_key;
    RETURN false;
  END IF;

  v_tokens := v_tokens - 1;
  UPDATE public.rate_limits SET tokens = v_tokens, last_refill = v_last WHERE key = p_key;
  RETURN true;
END;
$$;

-- 2. spend_credit_on_report
CREATE OR REPLACE FUNCTION public.spend_credit_on_report(
  p_plate_number text, p_infraction text, p_location text,
  p_latitude double precision DEFAULT NULL, p_longitude double precision DEFAULT NULL,
  p_vehicle_type text DEFAULT NULL, p_vehicle_color text DEFAULT NULL,
  p_vehicle_make text DEFAULT NULL, p_vehicle_model text DEFAULT NULL,
  p_vehicle_features text[] DEFAULT '{}', p_driver_gender text DEFAULT NULL,
  p_comment text DEFAULT NULL, p_state text DEFAULT 'WI', p_ip text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid; v_credits integer; v_report_id uuid; v_dup_today integer;
  v_plate text; v_state text;
  v_valid_states text[] := ARRAY[
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
    'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
    'VA','WA','WV','WI','WY','DC'
  ];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  v_state := upper(coalesce(p_state, 'WI'));
  IF v_state !~ '^[A-Z]{2}$' OR NOT (v_state = ANY(v_valid_states)) THEN
    RAISE EXCEPTION 'INVALID_STATE: %', v_state;
  END IF;

  v_plate := upper(btrim(p_plate_number));

  IF NOT public.check_rate_limit('reporter:' || v_user_id::text, 10, 10.0/60.0) THEN
    RAISE EXCEPTION 'RATE_LIMITED: Too many requests, slow down';
  END IF;

  IF p_ip IS NOT NULL AND length(p_ip) > 0 THEN
    IF NOT public.check_rate_limit('report_ip:' || p_ip, 60, 60.0/60.0) THEN
      RAISE EXCEPTION 'RATE_LIMITED: Too many requests from this network';
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_dup_today FROM reports
  WHERE reporter_id = v_user_id AND upper(plate_number) = v_plate
    AND created_at > now() - interval '24 hours';
  IF v_dup_today >= 1 THEN
    RAISE EXCEPTION 'DUPLICATE_REPORT: You already reported this plate in the last 24 hours.';
  END IF;

  SELECT credits INTO v_credits FROM profiles WHERE user_id = v_user_id FOR UPDATE;
  IF v_credits IS NULL OR v_credits < 1 THEN RAISE EXCEPTION 'Insufficient credits'; END IF;

  UPDATE profiles SET credits = credits - 1 WHERE user_id = v_user_id;

  INSERT INTO reports (
    plate_number, infraction, location, reporter_id, latitude, longitude,
    vehicle_type, vehicle_color, vehicle_make, vehicle_model,
    vehicle_features, driver_gender, comment, state
  ) VALUES (
    v_plate, p_infraction, p_location, v_user_id, p_latitude, p_longitude,
    p_vehicle_type, p_vehicle_color, p_vehicle_make, p_vehicle_model,
    p_vehicle_features, p_driver_gender, p_comment, v_state
  ) RETURNING id INTO v_report_id;

  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (v_user_id, -1, 'report_spent', 'Report on ' || v_plate);

  UPDATE profiles SET total_reports = total_reports + 1 WHERE user_id = v_user_id;

  RETURN v_report_id;
END;
$$;

-- 3. submit_dispute
CREATE OR REPLACE FUNCTION public.submit_dispute(p_report_id uuid, p_reason text, p_note text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid; v_plate text; v_claim_id uuid; v_free_used boolean;
  v_dispute_id uuid; v_existing uuid; v_clean_note text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT public.check_rate_limit('dispute:' || v_user_id::text, 5, 5.0/60.0) THEN
    RAISE EXCEPTION 'RATE_LIMITED: Too many requests, slow down';
  END IF;

  IF p_reason NOT IN ('not_my_vehicle','inaccurate_details','duplicate','harassment_or_abuse','other') THEN
    RAISE EXCEPTION 'Invalid reason';
  END IF;

  v_clean_note := NULLIF(btrim(COALESCE(p_note, '')), '');
  IF v_clean_note IS NOT NULL AND length(v_clean_note) > 280 THEN
    v_clean_note := substr(v_clean_note, 1, 280);
  END IF;

  SELECT plate_number INTO v_plate FROM reports WHERE id = p_report_id;
  IF v_plate IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;

  SELECT id, free_dispute_used INTO v_claim_id, v_free_used
  FROM claimed_plates
  WHERE user_id = v_user_id AND plate_number = v_plate AND paid = true
  ORDER BY claimed_at DESC LIMIT 1;
  IF v_claim_id IS NULL THEN
    RAISE EXCEPTION 'Only the verified plate owner can dispute reports on this plate';
  END IF;

  SELECT id INTO v_existing FROM report_disputes
  WHERE report_id = p_report_id AND disputer_id = v_user_id;
  IF v_existing IS NOT NULL THEN RAISE EXCEPTION 'You have already disputed this report'; END IF;

  IF NOT v_free_used THEN
    INSERT INTO report_disputes (report_id, plate_number, disputer_id, reason, note, paid)
    VALUES (p_report_id, v_plate, v_user_id, p_reason, v_clean_note, true)
    RETURNING id INTO v_dispute_id;
    UPDATE claimed_plates SET free_dispute_used = true WHERE id = v_claim_id;
    RETURN json_build_object('dispute_id', v_dispute_id, 'requires_payment', false);
  ELSE
    INSERT INTO report_disputes (report_id, plate_number, disputer_id, reason, note, paid)
    VALUES (p_report_id, v_plate, v_user_id, p_reason, v_clean_note, false)
    RETURNING id INTO v_dispute_id;
    RETURN json_build_object('dispute_id', v_dispute_id, 'requires_payment', true);
  END IF;
END;
$$;

-- 4. wall_of_shame_mv (using window-function for top_infraction)
DROP MATERIALIZED VIEW IF EXISTS public.wall_of_shame_mv;

CREATE MATERIALIZED VIEW public.wall_of_shame_mv AS
WITH inf_counts AS (
  SELECT
    COALESCE(state, 'WI') AS state,
    plate_number,
    infraction,
    COUNT(*) AS inf_count,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(state, 'WI'), plate_number
      ORDER BY COUNT(*) DESC
    ) AS rn
  FROM reports
  GROUP BY COALESCE(state, 'WI'), plate_number, infraction
),
agg AS (
  SELECT
    COALESCE(state, 'WI') AS state,
    plate_number,
    COUNT(*)::integer AS report_count,
    LEAST(100, COALESCE(SUM(
      CASE infraction
        WHEN 'tailgating' THEN 20
        WHEN 'ran_red_light' THEN 25
        WHEN 'speeding' THEN 15
        WHEN 'distracted_driving' THEN 15
        WHEN 'bad_parking' THEN 5
        WHEN 'aggressive_lane_change' THEN 10
        ELSE 10
      END
    ), 0))::integer AS total_score,
    MAX(created_at) AS last_reported_at
  FROM reports
  GROUP BY COALESCE(state, 'WI'), plate_number
)
SELECT a.state, a.plate_number, a.report_count, a.total_score, a.last_reported_at,
       i.infraction AS top_infraction
FROM agg a
LEFT JOIN inf_counts i
  ON i.state = a.state AND i.plate_number = a.plate_number AND i.rn = 1;

CREATE UNIQUE INDEX wall_of_shame_mv_pk ON public.wall_of_shame_mv (state, plate_number);
CREATE INDEX wall_of_shame_mv_state_score ON public.wall_of_shame_mv (state, total_score DESC);

GRANT SELECT ON public.wall_of_shame_mv TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.refresh_wall_of_shame()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY public.wall_of_shame_mv; END; $$;

-- 5. pg_cron / pg_net (best-effort)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('refresh-wall-of-shame');
    EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN
      PERFORM cron.schedule(
        'refresh-wall-of-shame', '*/5 * * * *',
        $cron$ SELECT public.refresh_wall_of_shame(); $cron$
      );
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;
