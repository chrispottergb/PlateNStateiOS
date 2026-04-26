import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WallOfShameRow {
  state: string;
  plate_number: string;
  report_count: number;
  total_score: number;
  last_reported_at: string;
  top_infraction: string | null;
}

/**
 * Reads from the `wall_of_shame_mv` materialized view via the
 * `get_wall_of_shame` RPC (refreshed every 5 min by pg_cron).
 */
export function useWallOfShame(state?: string | null, limit = 20) {
  const [rows, setRows] = useState<WallOfShameRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_wall_of_shame", {
        p_state: state ?? null,
        p_limit: limit,
      } as any);
      if (cancelled) return;
      if (error) {
        console.error("[useWallOfShame]", error);
        setRows([]);
      } else {
        setRows((data as WallOfShameRow[]) ?? []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [state, limit]);

  return { rows, loading };
}
