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

// MV refreshes every 5 min via pg_cron — cache client-side for the same window
// so 1000 concurrent users don't fire 1000 identical DB queries per page load.
export function useWallOfShame(state?: string | null, limit = 20) {
  const { data, isLoading } = useQuery({
    queryKey: ["wall-of-shame", state ?? null, limit],
    queryFn: async () => {
      let query = supabase
        .from("reports")
        .select("plate_number, infraction, location, created_at, state")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (state) query = query.eq("state", state);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        state: r.state || "",
        plate_number: r.plate_number,
        report_count: 1,
        total_score: 0,
        last_reported_at: r.created_at,
        top_infraction: r.infraction,
      })) as WallOfShameRow[];
    },
    staleTime: 5 * 60_000,
  });

  return { rows: data ?? [], loading: isLoading };
}
