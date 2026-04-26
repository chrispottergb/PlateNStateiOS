
-- Revoke direct API access to the materialized view
REVOKE SELECT ON public.wall_of_shame_mv FROM anon, authenticated;

-- Public RPC to read leaderboard safely (no direct MV exposure)
CREATE OR REPLACE FUNCTION public.get_wall_of_shame(p_state text DEFAULT NULL, p_limit integer DEFAULT 20)
RETURNS TABLE (
  state text,
  plate_number text,
  report_count integer,
  total_score integer,
  last_reported_at timestamptz,
  top_infraction text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT state, plate_number, report_count, total_score, last_reported_at, top_infraction
  FROM public.wall_of_shame_mv
  WHERE (p_state IS NULL OR state = upper(p_state))
  ORDER BY total_score DESC, report_count DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;

GRANT EXECUTE ON FUNCTION public.get_wall_of_shame(text, integer) TO anon, authenticated;
