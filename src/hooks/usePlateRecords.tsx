import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { INFRACTIONS } from "@/lib/data";
import { PlateRecord, InfractionType } from "@/lib/types";
import { queryKeys } from "@/lib/queryKeys";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mvRowToRecord(row: {
  plate_number: string;
  state: string | null;
  total_score: number;
  report_count: number;
  last_reported_at: string;
  last_location: string | null;
  top_infraction: string | null;
}): PlateRecord {
  // Build a minimal infractions map — only top_infraction is known from the MV.
  // The full per-infraction breakdown lives in usePlateDetail (plate detail page).
  const infractions = Object.fromEntries(
    INFRACTIONS.map(i => [i.type, 0])
  ) as Record<InfractionType, number>;
  if (row.top_infraction && row.top_infraction in infractions) {
    infractions[row.top_infraction as InfractionType] = row.report_count;
  }
  return {
    plateNumber: row.plate_number,
    state: row.state,
    totalScore: row.total_score,
    reportCount: row.report_count,
    lastReported: row.last_reported_at,
    lastLocation: row.last_location ?? row.state ?? "",
    infractions,
  };
}

// ---------------------------------------------------------------------------
// usePlateRecords
// Replaces the old 1000-row client-side fetch + JS aggregation.
//   • No infraction filter → reads wall_of_shame_mv (pre-aggregated, fast).
//   • Infraction filter set → calls get_plates_by_infraction RPC (server GROUP BY).
// Both paths are cached by React Query and shared across all consumers.
// ---------------------------------------------------------------------------
export function usePlateRecords(limit?: number, infractionFilter?: string) {
  const { data = [], isLoading } = useQuery<PlateRecord[]>({
    queryKey: queryKeys.plateRecords(limit ?? "all", infractionFilter ?? "all"),
    queryFn: async () => {
      if (infractionFilter && infractionFilter !== "all") {
        // Server-side per-infraction aggregation
        const { data, error } = await (supabase.rpc as any)("get_plates_by_infraction", {
          p_infraction: infractionFilter,
          p_limit: limit ?? 100,
        });
        if (error) throw error;
        return (data as any[]).map(row => mvRowToRecord({
          plate_number: row.plate_number,
          state: row.state,
          total_score: row.total_score,
          report_count: row.report_count,
          last_reported_at: row.last_reported,
          last_location: row.last_location,
          top_infraction: row.top_infraction,
        }));
      }

      // General leaderboard — query pre-aggregated MV
      let query = supabase
        .from("wall_of_shame_mv")
        .select("plate_number, state, total_score, report_count, last_reported_at, last_location, top_infraction")
        .order("total_score", { ascending: false });
      if (limit) query = query.limit(limit);
      else query = query.limit(100);

      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]).map(mvRowToRecord);
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  return { plates: data, loading: isLoading };
}

// ---------------------------------------------------------------------------
// usePlateDetail — fetches all reports for a single plate.
// Keeps the full per-infraction breakdown needed by PlateDetail page.
// ---------------------------------------------------------------------------
function buildRecords(rows: {
  plate_number: string;
  infraction: string;
  location: string;
  created_at: string;
  state?: string | null;
}[]): PlateRecord[] {
  const map = new Map<string, PlateRecord>();
  for (const r of rows) {
    let rec = map.get(r.plate_number);
    if (!rec) {
      rec = {
        plateNumber: r.plate_number,
        state: r.state ?? null,
        totalScore: 0,
        reportCount: 0,
        lastLocation: r.location,
        lastReported: r.created_at,
        infractions: Object.fromEntries(
          INFRACTIONS.map(i => [i.type, 0])
        ) as Record<InfractionType, number>,
      };
      map.set(r.plate_number, rec);
    }
    const inf = INFRACTIONS.find(i => i.type === r.infraction);
    rec.totalScore += inf?.points ?? 0;
    rec.reportCount += 1;
    if (r.infraction in rec.infractions) {
      rec.infractions[r.infraction as InfractionType] += 1;
    }
    if (new Date(r.created_at) > new Date(rec.lastReported)) {
      rec.lastReported = r.created_at;
      rec.lastLocation = r.location;
      rec.state = r.state ?? rec.state;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalScore - a.totalScore);
}

export function usePlateDetail(plateNumber: string) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.plateDetail(plateNumber),
    queryFn: async () => {
      const { data } = await supabase
        .from("reports")
        .select("id, plate_number, infraction, location, created_at, upvote_count, is_flagged, state, latitude, longitude")
        .eq("plate_number", plateNumber)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    staleTime: 30_000,
    enabled: !!plateNumber,
  });

  const rows = data ?? [];
  const records = rows.length > 0 ? buildRecords(rows as any) : [];

  return {
    plate: records[0] ?? null,
    reports: rows as {
      id: string; infraction: string; location: string;
      created_at: string; upvote_count: number; is_flagged?: boolean; state?: string | null;
    }[],
    loading: isLoading,
  };
}
