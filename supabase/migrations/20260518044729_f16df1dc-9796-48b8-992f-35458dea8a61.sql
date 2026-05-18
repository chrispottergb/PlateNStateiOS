
-- =========================================================
-- 1. Reports: flag tracking
-- =========================================================
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS flag_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS excluded_from_score boolean NOT NULL DEFAULT false;

-- =========================================================
-- 2. report_flags table
-- =========================================================
CREATE TABLE IF NOT EXISTS public.report_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, user_id)
);

ALTER TABLE public.report_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own flag" ON public.report_flags;
CREATE POLICY "Users can insert their own flag"
  ON public.report_flags FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own flags" ON public.report_flags;
CREATE POLICY "Users can view own flags"
  ON public.report_flags FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS report_flags_report_idx ON public.report_flags(report_id);

-- Trigger: bump flag_count on insert and auto-flag at 3
CREATE OR REPLACE FUNCTION public.handle_report_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count integer;
BEGIN
  UPDATE public.reports
  SET flag_count = flag_count + 1
  WHERE id = NEW.report_id
  RETURNING flag_count INTO v_new_count;

  IF v_new_count >= 3 THEN
    UPDATE public.reports
    SET is_flagged = true, excluded_from_score = true
    WHERE id = NEW.report_id AND is_flagged = false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_report_flag_insert ON public.report_flags;
CREATE TRIGGER on_report_flag_insert
  AFTER INSERT ON public.report_flags
  FOR EACH ROW EXECUTE FUNCTION public.handle_report_flag();

-- =========================================================
-- 3. appeals table
-- =========================================================
CREATE TABLE IF NOT EXISTS public.appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number text NOT NULL,
  user_id uuid NOT NULL,
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);

ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can create appeals" ON public.appeals;
CREATE POLICY "Owners can create appeals"
  ON public.appeals FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.claimed_plates cp
      WHERE cp.user_id = auth.uid()
        AND cp.plate_number = appeals.plate_number
        AND cp.paid = true
    )
  );

DROP POLICY IF EXISTS "Users can view own appeals" ON public.appeals;
CREATE POLICY "Users can view own appeals"
  ON public.appeals FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all appeals" ON public.appeals;
CREATE POLICY "Admins can view all appeals"
  ON public.appeals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update appeals" ON public.appeals;
CREATE POLICY "Admins can update appeals"
  ON public.appeals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS appeals_plate_idx ON public.appeals(plate_number);
CREATE INDEX IF NOT EXISTS appeals_status_idx ON public.appeals(status);

-- =========================================================
-- 4. Recreate wall_of_shame_mv: 6mo window, good behaviors,
--    exclude flagged
-- =========================================================
DROP MATERIALIZED VIEW IF EXISTS public.wall_of_shame_mv;

CREATE MATERIALIZED VIEW public.wall_of_shame_mv AS
WITH recent_reports AS (
  SELECT * FROM reports
  WHERE created_at >= NOW() - INTERVAL '6 months'
    AND excluded_from_score = false
),
inf_counts AS (
  SELECT
    COALESCE(state, 'WI') AS state,
    plate_number,
    infraction,
    COUNT(*) AS inf_count,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(state, 'WI'), plate_number
      ORDER BY COUNT(*) DESC
    ) AS rn
  FROM recent_reports
  WHERE infraction NOT IN (
    'courteous_merge','yielded_pedestrian','let_me_in','used_turn_signal',
    'stopped_for_school_bus','great_parking','safe_following_distance',
    'hazard_warning','roadside_assist'
  )
  GROUP BY COALESCE(state, 'WI'), plate_number, infraction
),
agg AS (
  SELECT
    COALESCE(state, 'WI') AS state,
    plate_number,
    COUNT(*)::integer AS report_count,
    GREATEST(-50, LEAST(100, COALESCE(SUM(
      CASE infraction
        -- Good behaviors (negative)
        WHEN 'courteous_merge' THEN -3
        WHEN 'yielded_pedestrian' THEN -4
        WHEN 'let_me_in' THEN -2
        WHEN 'used_turn_signal' THEN -2
        WHEN 'stopped_for_school_bus' THEN -4
        WHEN 'great_parking' THEN -2
        WHEN 'safe_following_distance' THEN -3
        WHEN 'hazard_warning' THEN -2
        WHEN 'roadside_assist' THEN -4
        -- Bad behaviors
        WHEN 'tailgating' THEN 20
        WHEN 'ran_red_light' THEN 25
        WHEN 'speeding' THEN 15
        WHEN 'distracted_driving' THEN 15
        WHEN 'bad_parking' THEN 5
        WHEN 'aggressive_lane_change' THEN 10
        WHEN 'road_rage' THEN 30
        WHEN 'hit_and_run' THEN 30
        WHEN 'dui_suspected' THEN 30
        WHEN 'wrong_way' THEN 20
        WHEN 'passing_school_bus' THEN 25
        WHEN 'brake_checking' THEN 15
        ELSE 10
      END
    ), 0)))::integer AS total_score,
    MAX(created_at) AS last_reported_at
  FROM recent_reports
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

-- =========================================================
-- 5. Update RPC scoring to include good behaviors + 6mo window
-- =========================================================
CREATE OR REPLACE FUNCTION public.batch_plate_screening(p_plates text[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid; v_result json;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT json_agg(plate_data ORDER BY plate_data->>'risk_score' DESC) INTO v_result
  FROM (
    SELECT json_build_object(
      'plate_number', p.plate,
      'total_reports', COALESCE(COUNT(r.id), 0),
      'verified_reports', COALESCE(COUNT(r.id) FILTER (WHERE r.upvote_count >= 3), 0),
      'risk_score', GREATEST(-50, LEAST(100, COALESCE(SUM(
        CASE r.infraction
          WHEN 'courteous_merge' THEN -3
          WHEN 'yielded_pedestrian' THEN -4
          WHEN 'let_me_in' THEN -2
          WHEN 'used_turn_signal' THEN -2
          WHEN 'stopped_for_school_bus' THEN -4
          WHEN 'great_parking' THEN -2
          WHEN 'safe_following_distance' THEN -3
          WHEN 'hazard_warning' THEN -2
          WHEN 'roadside_assist' THEN -4
          WHEN 'road_rage' THEN 30
          WHEN 'ran_red_light' THEN 25
          WHEN 'tailgating' THEN 20
          WHEN 'speeding' THEN 15
          WHEN 'distracted_driving' THEN 15
          WHEN 'bad_parking' THEN 5
          WHEN 'aggressive_lane_change' THEN 10
          ELSE 10
        END), 0))),
      'top_infraction', (
        SELECT r2.infraction FROM reports r2
        WHERE r2.plate_number = p.plate
          AND r2.created_at >= NOW() - INTERVAL '6 months'
          AND r2.excluded_from_score = false
        GROUP BY r2.infraction ORDER BY COUNT(*) DESC LIMIT 1
      ),
      'last_reported', MAX(r.created_at)
    ) as plate_data
    FROM unnest(p_plates) AS p(plate)
    LEFT JOIN reports r ON r.plate_number = p.plate
      AND r.created_at >= NOW() - INTERVAL '6 months'
      AND r.excluded_from_score = false
    GROUP BY p.plate
  ) sub;
  RETURN COALESCE(v_result, '[]'::json);
END;
$function$;

CREATE OR REPLACE FUNCTION public.insurance_plate_lookup(p_plate_number text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid; v_result json; v_tier text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT is_approved_insurance(v_user_id) THEN RAISE EXCEPTION 'Not authorized: insurance account not approved'; END IF;

  v_tier := public.plate_blacklist_tier(p_plate_number);
  IF v_tier = 'total_block' THEN
    RETURN json_build_object('plate_number', p_plate_number, 'protected', true,
      'message', 'This plate is protected by the owner and unavailable for lookup.');
  END IF;

  SELECT json_build_object(
    'plate_number', p_plate_number,
    'total_reports', COALESCE(COUNT(r.id), 0),
    'verified_reports', COALESCE(COUNT(r.id) FILTER (WHERE r.upvote_count >= 3), 0),
    'risk_score', GREATEST(-50, LEAST(100, COALESCE(SUM(
      CASE r.infraction
        WHEN 'courteous_merge' THEN -3
        WHEN 'yielded_pedestrian' THEN -4
        WHEN 'let_me_in' THEN -2
        WHEN 'used_turn_signal' THEN -2
        WHEN 'stopped_for_school_bus' THEN -4
        WHEN 'great_parking' THEN -2
        WHEN 'safe_following_distance' THEN -3
        WHEN 'hazard_warning' THEN -2
        WHEN 'roadside_assist' THEN -4
        WHEN 'road_rage' THEN 30
        WHEN 'ran_red_light' THEN 25
        WHEN 'tailgating' THEN 20
        WHEN 'speeding' THEN 15
        WHEN 'distracted_driving' THEN 15
        WHEN 'bad_parking' THEN 5
        WHEN 'aggressive_lane_change' THEN 10
        ELSE 10
      END), 0))),
    'infractions', COALESCE(json_agg(json_build_object(
      'id', r.id, 'infraction', r.infraction, 'location', r.location,
      'created_at', r.created_at, 'upvote_count', r.upvote_count,
      'verified', r.upvote_count >= 3
    ) ORDER BY r.created_at DESC) FILTER (WHERE r.id IS NOT NULL), '[]'::json)
  ) INTO v_result
  FROM reports r
  WHERE r.plate_number = p_plate_number
    AND r.created_at >= NOW() - INTERVAL '6 months'
    AND r.excluded_from_score = false;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.scan_uploaded_plates(p_list_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM uploaded_plate_lists WHERE id = p_list_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE uploaded_plates up SET
    total_reports = sub.total_reports,
    verified_reports = sub.verified_reports,
    risk_score = sub.risk_score,
    last_scanned_at = now()
  FROM (
    SELECT up2.id as plate_id,
      COALESCE(COUNT(r.id), 0)::integer as total_reports,
      COALESCE(COUNT(r.id) FILTER (WHERE r.upvote_count >= 3), 0)::integer as verified_reports,
      GREATEST(-50, LEAST(100, COALESCE(SUM(
        CASE r.infraction
          WHEN 'courteous_merge' THEN -3
          WHEN 'yielded_pedestrian' THEN -4
          WHEN 'let_me_in' THEN -2
          WHEN 'used_turn_signal' THEN -2
          WHEN 'stopped_for_school_bus' THEN -4
          WHEN 'great_parking' THEN -2
          WHEN 'safe_following_distance' THEN -3
          WHEN 'hazard_warning' THEN -2
          WHEN 'roadside_assist' THEN -4
          WHEN 'road_rage' THEN 30
          WHEN 'ran_red_light' THEN 25
          WHEN 'tailgating' THEN 20
          WHEN 'speeding' THEN 15
          WHEN 'distracted_driving' THEN 15
          WHEN 'bad_parking' THEN 5
          WHEN 'aggressive_lane_change' THEN 10
          ELSE 10
        END), 0)))::integer as risk_score
    FROM uploaded_plates up2
    LEFT JOIN reports r ON r.plate_number = up2.plate_number
      AND r.created_at >= NOW() - INTERVAL '6 months'
      AND r.excluded_from_score = false
    WHERE up2.list_id = p_list_id
    GROUP BY up2.id
  ) sub WHERE up.id = sub.plate_id;

  UPDATE uploaded_plate_lists SET status = 'complete' WHERE id = p_list_id;
END;
$function$;

-- Initial refresh
REFRESH MATERIALIZED VIEW public.wall_of_shame_mv;
