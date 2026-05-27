
-- Performance indexes: leaderboard, plate-detail, public feed, enterprise screening
-- report_upvotes already has a UNIQUE(report_id, user_id) implicit index; no duplicate needed.

-- 1. Leaderboard / wall-of-shame sort by upvote_count
CREATE INDEX IF NOT EXISTS idx_reports_upvote_count
  ON public.reports (upvote_count DESC);

-- 2. Plate detail page: top-upvoted reports for a given plate
CREATE INDEX IF NOT EXISTS idx_reports_plate_upvote
  ON public.reports (plate_number, upvote_count DESC);

-- 3. Public feed: most queries filter out flagged reports — partial index keeps it lean
CREATE INDEX IF NOT EXISTS idx_reports_not_flagged_created
  ON public.reports (created_at DESC)
  WHERE is_flagged = false;

-- 4. State-scoped public feed (non-flagged) — common home-screen query
CREATE INDEX IF NOT EXISTS idx_reports_state_not_flagged_created
  ON public.reports (state, created_at DESC)
  WHERE is_flagged = false;

-- 5. Enterprise batch screening: user's saved screenings list
CREATE INDEX IF NOT EXISTS idx_saved_screenings_user
  ON public.saved_screenings (user_id, created_at DESC);
