-- get_plate_stats classified good/bad reports by the OLD sign convention
-- (negative = good). Since 20260920000000 good driving is POSITIVE, so a plate
-- with four good reports showed "4 bad · 0 good". Flip the filters.
CREATE OR REPLACE FUNCTION public.get_plate_stats(p_plate text)
 RETURNS TABLE(good_reports integer, bad_reports integer, good_witnesses integer, bad_witnesses integer, total_score integer, report_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COUNT(*) FILTER (WHERE s.points > 0)::integer,
    COUNT(*) FILTER (WHERE s.points < 0)::integer,
    COUNT(DISTINCT COALESCE(s.reporter_id::text, s.id::text)) FILTER (WHERE s.points > 0)::integer,
    COUNT(DISTINCT COALESCE(s.reporter_id::text, s.id::text)) FILTER (WHERE s.points < 0)::integer,
    COALESCE(SUM(s.weighted_points), 0)::integer,
    COUNT(*)::integer
  FROM public.scored_reports_v s
  WHERE upper(s.plate_number) = upper(btrim(p_plate));
$function$;

-- Same convention fix for the Wall of Shame RPC: offenders are now the most
-- NEGATIVE scores.
CREATE OR REPLACE FUNCTION public.get_wall_of_shame(p_state text DEFAULT NULL::text, p_limit integer DEFAULT 20)
 RETURNS TABLE(state text, plate_number text, report_count integer, total_score integer, last_reported_at timestamp with time zone, last_location text, top_infraction text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT state, plate_number, report_count, total_score, last_reported_at, last_location, top_infraction
  FROM public.wall_of_shame_mv
  WHERE (p_state IS NULL OR state = upper(p_state))
    AND total_score < 0
  ORDER BY total_score ASC, report_count DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$function$;
