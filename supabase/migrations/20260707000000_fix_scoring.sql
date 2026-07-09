-- Fix the plate scoring system (2026-07-07).
-- Bugs fixed:
--   1. Good-behavior infraction names the app actually submits
--      (yielded_pedestrian, great_parking, hazard_warning) were unknown to the
--      scorer and fell into ELSE +5 — good deeds were scored as bad ones.
--      The Wall of Shame #1 was a driver who yielded to a pedestrian.
--   2. 'unspecified' (the most common infraction in the DB) silently scored +5.
--      Now a deliberate +2 (a report happened, but nothing specific was claimed).
--   3. MV was stale — re-assert the pg_cron refresh and refresh immediately.
-- Convention (unchanged, required by the shipped app which orders DESC):
--   positive = bad ("shame points"), negative = good.

DROP FUNCTION IF EXISTS public.infraction_points(text) CASCADE;
CREATE OR REPLACE FUNCTION public.infraction_points(inf text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE inf
    WHEN 'road_rage'               THEN 15
    WHEN 'hit_and_run'             THEN 15
    WHEN 'passing_school_bus'      THEN 12
    WHEN 'dui_suspected'           THEN 12
    WHEN 'wrong_way'               THEN 12
    WHEN 'brake_checking'          THEN 10
    WHEN 'ran_red_light'           THEN 10
    WHEN 'running_stop_sign'       THEN 10
    WHEN 'speeding'                THEN 8
    WHEN 'distracted_driving'      THEN 8
    WHEN 'texting_driving'         THEN 8
    WHEN 'not_yielding_pedestrian' THEN 8
    WHEN 'aggressive_lane_change'  THEN 8
    WHEN 'tailgating'              THEN 6
    WHEN 'cutting_off'             THEN 6
    WHEN 'blocking_intersection'   THEN 6
    WHEN 'shoulder_driving'        THEN 6
    WHEN 'illegal_uturn'           THEN 5
    WHEN 'rolling_stop'            THEN 5
    WHEN 'double_parking'          THEN 5
    WHEN 'bad_parking'             THEN 5
    WHEN 'no_turn_signal'          THEN 3
    WHEN 'honking_excessively'     THEN 3
    WHEN 'high_beams'              THEN 3
    WHEN 'loud_exhaust'            THEN 3
    WHEN 'left_lane_camping'       THEN 3
    WHEN 'littering'               THEN 3
    WHEN 'driving_too_slow'        THEN 2
    WHEN 'expired_tags'            THEN 2
    WHEN 'suspicious_vehicle'      THEN 2
    WHEN 'unspecified'             THEN 2
    -- good behaviors: BOTH historical DB names and the names the app submits
    WHEN 'courteous_merge'         THEN -2
    WHEN 'yielded_to_pedestrian'   THEN -3
    WHEN 'yielded_pedestrian'      THEN -3
    WHEN 'let_me_in'               THEN -2
    WHEN 'used_turn_signal'        THEN -1
    WHEN 'stopped_for_school_bus'  THEN -4
    WHEN 'good_parking'            THEN -2
    WHEN 'great_parking'           THEN -2
    WHEN 'safe_following_distance' THEN -2
    WHEN 'hazard_lights_warning'   THEN -1
    WHEN 'hazard_warning'          THEN -1
    WHEN 'roadside_assist'         THEN -3
    ELSE 5
  END;
$$;

GRANT EXECUTE ON FUNCTION public.infraction_points(text) TO anon, authenticated;

-- Rebuild the MV on top of the shared scoring function.
-- NOTE: total_score is no longer clamped at 0 (GREATEST removed) so genuinely
-- good plates can sit below zero instead of being lumped with unknowns at 0.
DROP MATERIALIZED VIEW IF EXISTS public.wall_of_shame_mv CASCADE;

CREATE MATERIALIZED VIEW public.wall_of_shame_mv AS
WITH agg AS (
  SELECT
    COALESCE(state, 'WI') AS state,
    plate_number,
    COUNT(*)::integer AS report_count,
    COALESCE(SUM(public.infraction_points(infraction)), 0)::integer AS total_score,
    MAX(created_at) AS last_reported_at
  FROM reports
  WHERE created_at >= NOW() - INTERVAL '6 months'
  GROUP BY COALESCE(state, 'WI'), plate_number
),
inf_counts AS (
  SELECT
    COALESCE(state, 'WI') AS state,
    plate_number,
    infraction,
    COUNT(*) AS cnt,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(state, 'WI'), plate_number
      ORDER BY COUNT(*) DESC
    ) AS rn
  FROM reports
  WHERE created_at >= NOW() - INTERVAL '6 months'
  GROUP BY COALESCE(state, 'WI'), plate_number, infraction
)
SELECT
  a.state,
  a.plate_number,
  a.report_count,
  a.total_score,
  a.last_reported_at,
  i.infraction  AS top_infraction,
  loc.location  AS last_location
FROM agg a
LEFT JOIN inf_counts i
  ON i.state = a.state AND i.plate_number = a.plate_number AND i.rn = 1
LEFT JOIN LATERAL (
  SELECT location
  FROM public.reports r
  WHERE r.plate_number = a.plate_number
    AND COALESCE(r.state, 'WI') = a.state
  ORDER BY r.created_at DESC
  LIMIT 1
) loc ON true;

CREATE UNIQUE INDEX wall_of_shame_mv_pk          ON public.wall_of_shame_mv (state, plate_number);
CREATE INDEX        wall_of_shame_mv_state_score ON public.wall_of_shame_mv (state, total_score DESC);

GRANT SELECT ON public.wall_of_shame_mv TO anon, authenticated;

-- Recreate the dependent per-infraction leaderboard function (CASCADE dropped nothing,
-- but re-assert to bind against the rebuilt MV).
DROP FUNCTION IF EXISTS public.get_plates_by_infraction(text, integer);
CREATE OR REPLACE FUNCTION public.get_plates_by_infraction(
  p_infraction text,
  p_limit      integer DEFAULT 100
)
RETURNS TABLE (
  plate_number  text,
  state         text,
  report_count  integer,
  total_score   integer,
  last_reported timestamptz,
  last_location text,
  top_infraction text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.plate_number,
    COALESCE(r.state, 'WI')                       AS state,
    COUNT(*)::integer                               AS report_count,
    COALESCE(mv.total_score, 0)                    AS total_score,
    MAX(r.created_at)                               AS last_reported,
    (SELECT r2.location FROM reports r2
      WHERE r2.plate_number = r.plate_number
      ORDER BY r2.created_at DESC LIMIT 1)          AS last_location,
    p_infraction                                    AS top_infraction
  FROM reports r
  LEFT JOIN wall_of_shame_mv mv
    ON mv.plate_number = r.plate_number
   AND mv.state = COALESCE(r.state, 'WI')
  WHERE r.infraction = p_infraction
    AND r.is_flagged  = false
  GROUP BY r.plate_number, COALESCE(r.state, 'WI'), mv.total_score
  ORDER BY COUNT(*) DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_plates_by_infraction TO anon, authenticated;

-- Re-assert the refresh helper + schedule (idempotent) so the MV stops going stale.
CREATE OR REPLACE FUNCTION public.refresh_wall_of_shame()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.wall_of_shame_mv;
EXCEPTION WHEN OTHERS THEN
  -- concurrent refresh needs the unique index populated; fall back to full
  REFRESH MATERIALIZED VIEW public.wall_of_shame_mv;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_wall_of_shame() FROM anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'refresh-wall-of-shame';
    PERFORM cron.schedule(
      'refresh-wall-of-shame',
      '*/10 * * * *',
      $cron$ SELECT public.refresh_wall_of_shame(); $cron$
    );
  END IF;
END $$;

-- Populate immediately.
SELECT public.refresh_wall_of_shame();
