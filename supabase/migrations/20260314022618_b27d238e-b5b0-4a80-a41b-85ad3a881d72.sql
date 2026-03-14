
-- Add XP and streak tracking to profiles
ALTER TABLE public.profiles ADD COLUMN xp integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN streak_days integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN last_report_date date;

-- Report upvotes table
CREATE TABLE public.report_upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(report_id, user_id)
);

ALTER TABLE public.report_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view upvotes" ON public.report_upvotes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can upvote" ON public.report_upvotes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own upvote" ON public.report_upvotes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add upvote_count to reports for easy querying
ALTER TABLE public.reports ADD COLUMN upvote_count integer NOT NULL DEFAULT 0;

-- User badges table
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_key text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_key)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges" ON public.user_badges
  FOR SELECT USING (true);

CREATE POLICY "System can insert badges" ON public.user_badges
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Function: upvote a report (rewards reporter at threshold)
CREATE OR REPLACE FUNCTION public.upvote_report(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_reporter_id uuid;
  v_new_count integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get reporter
  SELECT reporter_id INTO v_reporter_id FROM reports WHERE id = p_report_id;
  IF v_reporter_id IS NULL THEN
    RAISE EXCEPTION 'Report not found';
  END IF;

  -- Can't upvote own report
  IF v_reporter_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot upvote own report';
  END IF;

  -- Insert upvote (will fail on duplicate)
  INSERT INTO report_upvotes (report_id, user_id) VALUES (p_report_id, v_user_id);

  -- Increment count
  UPDATE reports SET upvote_count = upvote_count + 1 WHERE id = p_report_id
    RETURNING upvote_count INTO v_new_count;

  -- Give reporter XP for each upvote
  UPDATE profiles SET xp = xp + 5 WHERE user_id = v_reporter_id;

  -- At 3 upvotes, give reporter 2 bonus coins
  IF v_new_count = 3 THEN
    UPDATE profiles SET credits = credits + 2 WHERE user_id = v_reporter_id;
    INSERT INTO credit_transactions (user_id, amount, type, description)
    VALUES (v_reporter_id, 2, 'upvote_bonus', 'Report verified by community');
  END IF;

  -- Give voter 1 XP for participating
  UPDATE profiles SET xp = xp + 1 WHERE user_id = v_user_id;
END;
$$;

-- Function: update streak on report submission (called after spend_credit_on_report)
CREATE OR REPLACE FUNCTION public.update_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_last date;
  v_streak integer;
BEGIN
  SELECT last_report_date, streak_days INTO v_last, v_streak
  FROM profiles WHERE user_id = NEW.reporter_id;

  IF v_last = CURRENT_DATE THEN
    -- Already reported today, no streak change
    NULL;
  ELSIF v_last = CURRENT_DATE - 1 THEN
    -- Consecutive day
    UPDATE profiles SET
      streak_days = streak_days + 1,
      last_report_date = CURRENT_DATE,
      xp = xp + 10 + (LEAST(streak_days + 1, 7) * 2)
    WHERE user_id = NEW.reporter_id;

    -- Streak bonus coins at 7 days
    IF v_streak + 1 = 7 THEN
      UPDATE profiles SET credits = credits + 5 WHERE user_id = NEW.reporter_id;
      INSERT INTO credit_transactions (user_id, amount, type, description)
      VALUES (NEW.reporter_id, 5, 'streak_bonus', '7-day reporting streak bonus');
    END IF;
  ELSE
    -- Streak reset
    UPDATE profiles SET
      streak_days = 1,
      last_report_date = CURRENT_DATE,
      xp = xp + 10
    WHERE user_id = NEW.reporter_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_report_update_streak
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_streak();

-- Enable realtime for upvotes
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_upvotes;
