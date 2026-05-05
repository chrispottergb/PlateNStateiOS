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
      const { data, error } = await supabase.rpc("get_wall_of_shame", {
        p_state: state ?? null,
        p_limit: limit,
      } as any);
      if (error) throw error;
      return (data as WallOfShameRow[]) ?? [];
    },
    staleTime: 5 * 60_000,
  });

  return { rows: data ?? [], loading: isLoading };
}
