
-- ============ profiles ============
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Public-safe view for display lookups (security_invoker so RLS applies to base table)
-- We grant explicit SELECT on the safe columns of profiles for anon/authenticated
-- and back the view with a permissive policy scoped through column privileges.
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  user_id,
  display_name,
  total_reports,
  xp,
  joined_at
FROM public.profiles;

ALTER VIEW public.public_profiles SET (security_invoker = true);

-- Allow the view's underlying SELECT to succeed by granting just the safe columns
GRANT SELECT (user_id, display_name, total_reports, xp, joined_at)
  ON public.profiles TO anon, authenticated;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Add a policy that permits reading any row, but column GRANTs above restrict
-- what anon/authenticated can actually select on the base table to safe columns.
CREATE POLICY "Public can read safe profile fields"
ON public.profiles FOR SELECT
TO anon, authenticated
USING (true);

-- ============ claimed_plates ============
DROP POLICY IF EXISTS "Claimed plates viewable by everyone" ON public.claimed_plates;

CREATE POLICY "Users view own claimed plates"
ON public.claimed_plates FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all claimed plates"
ON public.claimed_plates FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============ companies ============
DROP POLICY IF EXISTS "Anyone can view companies" ON public.companies;

CREATE POLICY "Owners view own company"
ON public.companies FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Admins view all companies"
ON public.companies FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============ report_upvotes ============
DROP POLICY IF EXISTS "Anyone can view upvotes" ON public.report_upvotes;

CREATE POLICY "Users view own upvotes"
ON public.report_upvotes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ============ wall_of_shame_mv ============
REVOKE ALL ON public.wall_of_shame_mv FROM anon, authenticated;

-- ============ storage: plate-uploads UPDATE/DELETE policies ============
DROP POLICY IF EXISTS "Users update own plate files" ON storage.objects;
CREATE POLICY "Users update own plate files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'plate-uploads' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'plate-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own plate files" ON storage.objects;
CREATE POLICY "Users delete own plate files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'plate-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============ realtime.messages: restrict subscriptions to own topic ============
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users own topic" ON realtime.messages;
CREATE POLICY "Authenticated users own topic"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE ('user:' || auth.uid()::text || '%')
  OR realtime.topic() = ('notifications:' || auth.uid()::text)
);

-- ============ Function search_path fixes ============
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.round_gps_coords() SET search_path = public;
ALTER FUNCTION public.validate_incident_state_code() SET search_path = public;
ALTER FUNCTION public.validate_state_code() SET search_path = public;

-- ============ Revoke EXECUTE on internal-only SECURITY DEFINER functions ============
REVOKE EXECUTE ON FUNCTION public.anonymize_old_reports() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.block_reports_on_blacklisted_plates() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_report_flag() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_plate_owners() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_terms_acceptance() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_old_notifications() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_stale_rate_limits() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_wall_of_shame() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_streak() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.round_gps_coords() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_incident_state_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_state_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
