import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { normalizePlate, resolveClaimStatus, type ClaimStatus } from "@/lib/plate";
import type { Database } from "@/integrations/supabase/types";

export type ClaimedPlate = Database["public"]["Tables"]["claimed_plates"]["Row"];

/** Shared with ClaimPlate.tsx so both read/write the same cache entry. */
export const myClaimsKey = (userId: string | undefined) => ["my-claimed-plates", userId] as const;
export const plateClaimKey = (plate: string) => ["plate-claim", normalizePlate(plate)] as const;

/** All of the current user's claimed_plates rows (paid and legacy unpaid). */
export function useMyClaims(userId: string | undefined) {
  const query = useQuery<ClaimedPlate[]>({
    queryKey: myClaimsKey(userId),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("claimed_plates")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
  const claims = query.data ?? [];
  return {
    claims,
    paidClaims: claims.filter(c => c.paid),
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

/**
 * Ownership of a single plate for the current viewer:
 *   "unclaimed" — no active (paid) claim exists
 *   "mine"      — active claim belongs to the signed-in user
 *   "other"     — active claim belongs to someone else (or viewer is signed out)
 * The plate is normalized before lookup so "abc-123" and "ABC 123" resolve alike.
 */
export function usePlateClaim(plate: string | null | undefined) {
  const { user } = useAuth();
  const canonical = normalizePlate(plate);
  const query = useQuery<Pick<ClaimedPlate, "user_id" | "paid" | "state"> | null>({
    queryKey: plateClaimKey(canonical),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claimed_plates")
        .select("user_id, paid, state")
        .eq("plate_number", canonical)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    enabled: canonical.length >= 3,
    staleTime: 30_000,
  });
  const status: ClaimStatus = resolveClaimStatus(query.data, user?.id);
  return { status, claim: query.data ?? null, isLoading: query.isLoading, plate: canonical };
}
