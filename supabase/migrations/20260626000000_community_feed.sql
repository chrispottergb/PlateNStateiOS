-- Community sounding-board: a live feed of user posts + comments.

CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

-- Posts
CREATE POLICY "Anyone can view posts" ON public.community_posts
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can post" ON public.community_posts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.community_posts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Comments
CREATE POLICY "Anyone can view post comments" ON public.community_comments
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.community_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own post comments" ON public.community_comments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_community_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX idx_community_comments_post_id ON public.community_comments(post_id);

-- Realtime: stream inserts/deletes to subscribed clients (live scrolling feed).
ALTER TABLE public.community_posts REPLICA IDENTITY FULL;
ALTER TABLE public.community_comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comments;
