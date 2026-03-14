
-- Drop the overly permissive insert policy and replace with authenticated-only
DROP POLICY "System can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
