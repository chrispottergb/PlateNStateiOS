-- Achievement badges were awarded client-side from the Profile page, which
-- could never INSERT into user_badges (authenticated has SELECT only), so no
-- badge was ever earned. Awarding now happens in the database from the same
-- thresholds, fires whenever a profile's counters move, and is backfilled.
-- Also removes two duplicate trigger registrations on reports that made
-- notify_plate_owners fire twice per report.

CREATE OR REPLACE FUNCTION public.award_badges(p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  p profiles%ROWTYPE;
BEGIN
  SELECT * INTO p FROM profiles WHERE user_id = p_user;
  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO user_badges (user_id, badge_key)
  SELECT p_user, k FROM (VALUES
    ('first_report',  p.total_reports >= 1),
    ('ten_reports',   p.total_reports >= 10),
    ('fifty_reports', p.total_reports >= 50),
    ('streak_7',      p.streak_days   >= 7),
    ('streak_30',     p.streak_days   >= 30),
    ('hundred_xp',    p.xp            >= 100),
    ('thousand_xp',   p.xp            >= 1000),
    ('first_verified', EXISTS (SELECT 1 FROM reports r WHERE r.reporter_id = p_user AND r.upvote_count >= 3))
  ) AS v(k, earned)
  WHERE earned
  ON CONFLICT (user_id, badge_key) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_badges_on_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.award_badges(NEW.user_id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_award_badges_on_profile ON public.profiles;
CREATE TRIGGER trg_award_badges_on_profile
  AFTER INSERT OR UPDATE OF total_reports, streak_days, xp ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.award_badges_on_profile();

CREATE OR REPLACE FUNCTION public.award_badges_on_upvote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.reporter_id IS NOT NULL AND NEW.upvote_count >= 3 THEN
    PERFORM public.award_badges(NEW.reporter_id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_award_badges_on_upvote ON public.reports;
CREATE TRIGGER trg_award_badges_on_upvote
  AFTER UPDATE OF upvote_count ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.award_badges_on_upvote();

-- Duplicate registrations of the same trigger functions.
DROP TRIGGER IF EXISTS on_report_notify_owners ON public.reports;
DROP TRIGGER IF EXISTS on_report_update_streak ON public.reports;

-- Backfill everyone who already qualifies.
SELECT public.award_badges(user_id) FROM public.profiles;
