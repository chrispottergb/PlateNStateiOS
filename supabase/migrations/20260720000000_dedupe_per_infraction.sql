-- Relax score dedupe: per-INFRACTION instead of per-DIRECTION (2026-07-20).
--
-- Before: a reporter's 2nd+ report on a plate in the same DIRECTION (good/bad)
--         within 30 days scored 0. This capped a driver's score at one report's
--         worth per reporter per direction — looked like a hard limit.
-- After:  dedupe is per DISTINCT INFRACTION. Reporting a plate for speeding AND
--         tailgating both score; reporting speeding 5 times still scores once.
--         No overall limit on a driver's total for genuinely varied behavior,
--         while identical-report spam from one account is still blocked.
--
-- Only the dedupe branch changes; self-boost block and new-account quarantine
-- are unchanged. wall_of_shame_mv and get_plate_stats read this view, so the
-- rule stays in exactly one place — just refresh the MV afterward.

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
    -- per-INFRACTION dedupe: only a reporter's FIRST report of THIS SPECIFIC
    -- infraction on this plate within 30 days carries points. Distinct
    -- infractions from the same reporter each count; identical repeats don't.
    WHEN r.reporter_id IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.reports r2
       WHERE r2.reporter_id = r.reporter_id
         AND r2.plate_number = r.plate_number
         AND COALESCE(r2.state, 'WI') = COALESCE(r.state, 'WI')
         AND r2.infraction = r.infraction
         AND r2.created_at <  r.created_at
         AND r2.created_at >= r.created_at - interval '30 days'
     )
    THEN 0
    ELSE public.infraction_points(r.infraction)
  END AS weighted_points
FROM public.reports r;

REVOKE ALL ON public.scored_reports_v FROM anon, authenticated;

SELECT public.refresh_wall_of_shame();
