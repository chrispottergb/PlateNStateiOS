import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WallOfShameRow {
  state: string;
  plate_number: string;
  report_count: number;
  total_score: number;
  last_reported_at: string;
  top_infraction: string | null;
}

// Reads the wall_of_shame_mv materialized view (refreshed every 10 min via
// pg_cron) — worst shame-scores first. Cache client-side for the same window
// so 1000 concurrent users don't fire 1000 identical DB queries per page load.
export function useWallOfShame(state?: string | null, limit = 20) {
  const { data, isLoading } = useQuery({
    queryKey: ["wall-of-shame", state ?? null, limit],
    queryFn: async () => {
      let query = supabase
        .from("wall_of_shame_mv")
        .select("state, plate_number, report_count, total_score, last_reported_at, top_infraction")
        .gt("total_score", 0) // the shame wall is for offenders, not good samaritans
        .order("total_score", { ascending: false })
        .limit(limit);
      if (state) query = query.eq("state", state);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as WallOfShameRow[];
    },
    staleTime: 5 * 60_000,
  });

  return { rows: data ?? [], loading: isLoading };
}
