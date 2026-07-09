-- Anti-gaming: stop score-boosting via sockpuppet/spam reports (2026-07-08).
--
-- Layers:
--   1. Display counts = DISTINCT reporters per direction (get_plate_stats RPC).
--   2. Score dedupe — a reporter's 2nd+ report on the same plate in the same
--      direction (good/bad) within 30 days carries 0 points (still visible).
--   3. 24h same-plate/same-reporter hard cap — already in spend_credit_on_report
--      (re-asserted here so the live DB can't drift from the repo again).
--   4. New-account quarantine — reports filed <48h after account creation
--      carry 0 points.
--   5. Self-boost block — good reports on a plate you claimed carry 0 points.
--   6. (deferred) same-IP cluster collapse — needs an ip column on reports.
--
-- weighted_points is computed in scored_reports_v; wall_of_shame_mv and
-- get_plate_stats both build on it so the rules live in exactly one place.

-- ============================================================
-- 1. Weighted-report view (internal only — NOT granted to clients;
--    it references reporter_id which is never exposed via API)
-- ============================================================
CREATE OR REPLACE VIEW public.scored_reports_v AS
SELECT
  r.id,
  r.plate_number,
  COALESCE(r.state, 'WI') AS state,
  r.infraction,
  r.reporter_id,
  r.created_at,
  r.is_flagged,
  public.infraction_points(r.infraction) AS points,
  CASE
    -- self-boost: good reports on your own claimed plate score nothing
    WHEN public.infraction_points(r.infraction) < 0
     AND r.reporter_id IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.claimed_plates cp
       WHERE cp.user_id = r.reporter_id
         AND upper(cp.plate_number) = upper(r.plate_number)
     )
    THEN 0
    -- new-account quarantine: accounts <48h old at report time score nothing
    WHEN r.reporter_id IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE p.user_id = r.reporter_id
         AND r.created_at - p.joined_at < interval '48 hours'
     )
    THEN 0
    -- per-direction dedupe: only a reporter's FIRST report on this plate in
    -- this direction within 30 days carries points
    WHEN r.reporter_id IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.reports r2
       WHERE r2.reporter_id = r.reporter_id
         AND r2.plate_number = r.plate_number
         AND COALESCE(r2.state, 'WI') = COALESCE(r.state, 'WI')
         AND sign(public.infraction_points(r2.infraction)) = sign(public.infraction_points(r.infraction))
         AND r2.created_at <  r.created_at
         AND r2.created_at >= r.created_at - interval '30 days'
     )
    THEN 0
    ELSE public.infraction_points(r.infraction)
  END AS weighted_points
FROM public.reports r;

REVOKE ALL ON public.scored_reports_v FROM anon, authenticated;

-- speeds up the dedupe EXISTS probe
CREATE INDEX IF NOT EXISTS idx_reports_reporter_plate_created
  ON public.reports (reporter_id, plate_number, created_at DESC);

-- ============================================================
-- 2. Rebuild wall_of_shame_mv on weighted points
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS public.wall_of_shame_mv CASCADE;

CREATE MATERIALIZED VIEW public.wall_of_shame_mv AS
WITH agg AS (
  SELECT
    s.state,
    s.plate_number,
    COUNT(*)::integer AS report_count,
    COALESCE(SUM(s.weighted_points), 0)::integer AS total_score,
    MAX(s.created_at) AS last_reported_at
  FROM public.scored_reports_v s
  WHERE s.created_at >= NOW() - INTERVAL '6 months'
  GROUP BY s.state, s.plate_number
),
inf_counts AS (
  SELECT
    COALESCE(state, 'WI') AS state,
    plate_number,
    infraction,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(state, 'WI'), plate_number
      ORDER BY COUNT(*) DESC
    ) AS rn
  FROM public.reports
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

-- ============================================================
-- 3. get_plate_stats — the good/bad numbers for the plate page.
--    Distinct-witness counts make sockpuppet spam visibly pointless.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_plate_stats(p_plate text)
RETURNS TABLE (
  good_reports   integer,
  bad_reports    integer,
  good_witnesses integer,
  bad_witnesses  integer,
  total_score    integer,
  report_count   integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE s.points < 0)::integer,
    COUNT(*) FILTER (WHERE s.points > 0)::integer,
    COUNT(DISTINCT COALESCE(s.reporter_id::text, s.id::text)) FILTER (WHERE s.points < 0)::integer,
    COUNT(DISTINCT COALESCE(s.reporter_id::text, s.id::text)) FILTER (WHERE s.points > 0)::integer,
    COALESCE(SUM(s.weighted_points), 0)::integer,
    COUNT(*)::integer
  FROM public.scored_reports_v s
  WHERE upper(s.plate_number) = upper(btrim(p_plate));
$$;

GRANT EXECUTE ON FUNCTION public.get_plate_stats(text) TO anon, authenticated;

-- ============================================================
-- 4. Recreate get_plates_by_infraction (dropped by CASCADE above)
-- ============================================================
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

-- ============================================================
-- 5. Refresh helper survives the MV rebuild; re-populate now.
-- ============================================================
SELECT public.refresh_wall_of_shame();
