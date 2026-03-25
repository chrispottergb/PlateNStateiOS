
-- Add new columns to reports
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS downvote_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS hot_take text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create report_reactions table
CREATE TABLE public.report_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (report_id, user_id, reaction_type)
);

ALTER TABLE public.report_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions" ON public.report_reactions FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can react" ON public.report_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON public.report_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime for report_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_reactions;
