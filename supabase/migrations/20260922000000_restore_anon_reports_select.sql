-- Anonymous SELECT on public.reports was found revoked on 2026-09-22 (anon kept
-- INSERT/UPDATE/DELETE but lost SELECT), which blanked Home's Fresh Catches,
-- the mini-map and the Map tab for every signed-out visitor. Row visibility is
-- still governed by RLS ("Reports viewable by everyone"); this only restores the
-- table-level privilege that RLS sits behind.
GRANT SELECT ON public.reports TO anon;
