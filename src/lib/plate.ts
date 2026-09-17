/**
 * Canonical plate identity shared by every claim lookup and claim write.
 * Mirrors lib/claims.js in platenstate-scan-api and the DB trigger
 * `normalize_claimed_plate`: uppercase, alphanumerics only.
 *   "abc-123" → "ABC123"   "ABC 123" → "ABC123"   "abc123" → "ABC123"
 */
export function normalizePlate(input: string | null | undefined): string {
  return String(input ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export type ClaimStatus = "unclaimed" | "mine" | "other";

export interface ClaimRow {
  user_id: string;
  paid: boolean;
}

/** Resolve who owns a plate from its (single) claimed_plates row, if any. */
export function resolveClaimStatus(row: ClaimRow | null | undefined, userId: string | null | undefined): ClaimStatus {
  if (!row || !row.paid) return "unclaimed";
  return userId && row.user_id === userId ? "mine" : "other";
}
