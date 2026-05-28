import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const LS_KEY = "pns_scan_history";
const LS_MAX = 50;

export interface ScanEntry {
  id?: string;
  plate_number: string;
  state: string | null;
  scanned_at: string;
  result_json?: Record<string, unknown>;
}

function readLocalHistory(): ScanEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as ScanEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLocalHistory(entries: ScanEntry[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(0, LS_MAX)));
  } catch { /* storage full — silently ignore */ }
}

export function useScanHistory() {
  const [history, setHistory] = useState<ScanEntry[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Resolve current user once
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) =>
      setUserId(session?.user?.id ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  // Load initial history
  useEffect(() => {
    if (userId) {
      // Authenticated: fetch from Supabase (table must exist; falls back gracefully on error)
      (async () => {
        const { data, error } = await (supabase as any)
          .from("scan_history")
          .select("id, plate_number, state, scanned_at, result_json")
          .eq("user_id", userId)
          .order("scanned_at", { ascending: false })
          .limit(LS_MAX);
        if (!error && data) {
          setHistory(data as ScanEntry[]);
        } else {
          // Table may not exist yet — fall through to localStorage
          setHistory(readLocalHistory());
        }
      })();
    } else {
      setHistory(readLocalHistory());
    }
  }, [userId]);

  const addScan = useCallback(
    async (plate_number: string, state: string | null, result_json?: Record<string, unknown>) => {
      const entry: ScanEntry = {
        plate_number,
        state,
        scanned_at: new Date().toISOString(),
        result_json,
      };

      if (userId) {
        const { data, error } = await (supabase as any)
          .from("scan_history")
          .insert({ ...entry, user_id: userId })
          .select("id, plate_number, state, scanned_at, result_json")
          .single();
        if (!error && data) {
          setHistory((prev) => [data as ScanEntry, ...prev].slice(0, LS_MAX));
          return;
        }
        // Supabase insert failed (e.g. table not yet created) — fall through to localStorage
      }

      // Unauthenticated or Supabase unavailable: persist to localStorage
      const updated = [entry, ...readLocalHistory()].slice(0, LS_MAX);
      writeLocalHistory(updated);
      setHistory(updated);
    },
    [userId]
  );

  const clearHistory = useCallback(async () => {
    if (userId) {
      await (supabase as any).from("scan_history").delete().eq("user_id", userId);
    }
    writeLocalHistory([]);
    setHistory([]);
  }, [userId]);

  return { history, addScan, clearHistory };
}
