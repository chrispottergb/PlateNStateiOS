import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { INFRACTIONS } from "@/lib/data";
import { PlateRecord, InfractionType } from "@/lib/types";

interface RawReport {
  plate_number: string;
  infraction: string;
  location: string;
  created_at: string;
}

function buildRecords(rows: RawReport[]): PlateRecord[] {
  const map = new Map<string, PlateRecord>();
  for (const r of rows) {
    let rec = map.get(r.plate_number);
    if (!rec) {
      rec = {
        plateNumber: r.plate_number,
        totalScore: 0,
        reportCount: 0,
        lastLocation: r.location,
        lastReported: r.created_at,
        infractions: Object.fromEntries(
          INFRACTIONS.map((i) => [i.type, 0])
        ) as Record<InfractionType, number>,
      };
      map.set(r.plate_number, rec);
    }
    const inf = INFRACTIONS.find((i) => i.type === r.infraction);
    rec.totalScore += inf?.points ?? 3;
    rec.reportCount += 1;
    if (r.infraction in rec.infractions) {
      rec.infractions[r.infraction as InfractionType] += 1;
    }
    if (new Date(r.created_at) > new Date(rec.lastReported)) {
      rec.lastReported = r.created_at;
      rec.lastLocation = r.location;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalScore - a.totalScore);
}

export function usePlateRecords(limit?: number) {
  const [plates, setPlates] = useState<PlateRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reports")
      .select("plate_number, infraction, location, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (data) {
      const records = buildRecords(data as RawReport[]);
      setPlates(limit ? records.slice(0, limit) : records);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, []);

  return { plates, loading, refetch: fetch };
}

export function usePlateDetail(plateNumber: string) {
  const [plate, setPlate] = useState<PlateRecord | null>(null);
  const [reports, setReports] = useState<
    { id: string; infraction: string; location: string; created_at: string; upvote_count: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("reports")
        .select("id, plate_number, infraction, location, created_at, upvote_count")
        .eq("plate_number", plateNumber)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const records = buildRecords(data as RawReport[]);
        setPlate(records[0]);
        setReports(data);
      } else {
        setPlate(null);
        setReports([]);
      }
      setLoading(false);
    };
    fetch();
  }, [plateNumber]);

  return { plate, reports, loading };
}
