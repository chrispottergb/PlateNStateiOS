/**
 * Centralized React Query key factory.
 * Using functions here ensures every caller produces the same cache key shape,
 * preventing silent cache misses from key typos.
 *
 * Pattern: queryKeys.scope.variant(params)
 */

export const queryKeys = {
  // ── Auth / profile ────────────────────────────────────────────────────
  profile: (userId: string | undefined) => ["profile", userId] as const,
  credits: (userId: string | undefined) => ["credits", userId] as const,
  badges: (userId: string | undefined) => ["badges", userId] as const,
  disputes: (userId: string | undefined) => ["disputes", userId] as const,

  // ── Reports ───────────────────────────────────────────────────────────
  myReports: (userId: string | undefined) => ["my-reports", userId] as const,
  plateDetail: (plateNumber: string) => ["plate-detail", plateNumber] as const,

  // ── Leaderboard / community ───────────────────────────────────────────
  plateRecords: (limit: number | "all", infractionFilter: string) =>
    ["plate-records", limit, infractionFilter] as const,
} as const;
