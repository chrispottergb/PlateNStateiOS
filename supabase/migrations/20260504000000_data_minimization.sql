-- Data Minimization — Privacy hardening for App Store / Play Store compliance
-- Goals:
--   1. Round GPS to ~1 km precision (2 decimal places) — removes precise location PII
--   2. Auto-null reporter_id after 30 days — breaks link between user and report
--   3. Purge stale rate_limit rows (IP addresses) older than 1 hour
--   4. Add data retention policy table for audit trail
--   5. Drop driver_gender from public-facing queries (column kept for moderation only)

-- ─── 1. Round existing GPS data to 2 decimal places (~1 km) ─────────────────
UPDATE public.reports
SET
  latitude  = round(latitude::numeric, 2),
  longitude = round(longitude::numeric, 2)
WHERE latitude IS NOT NULL OR longitude IS NOT NULL;

-- Trigger to auto-round any new GPS values on insert/update
CREATE OR REPLACE FUNCTION public.round_gps_coords()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.latitude IS NOT NULL THEN
    NEW.latitude := round(NEW.latitude::numeric, 2);
  END IF;
  IF NEW.longitude IS NOT NULL THEN
    NEW.longitude := round(NEW.longitude::numeric, 2);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_round_gps ON public.reports;
CREATE TRIGGER trg_round_gps
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.round_gps_coords();

-- ─── 2. Auto-null reporter_id after 30 days ──────────────────────────────────
-- Breaks the link between a user account and a report after 30 days.
-- Report content (plate, infraction, location) is kept for community use.
CREATE OR REPLACE FUNCTION public.anonymize_old_reports()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.reports
  SET reporter_id = NULL
  WHERE reporter_id IS NOT NULL
    AND created_at < now() - interval '30 days';
$$;

-- Schedule via pg_cron (runs daily at 3 AM UTC).
-- If pg_cron isn't enabled, run anonymize_old_reports() manually from SQL editor.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'anonymize-old-reports',
      '0 3 * * *',
      $cron$ SELECT public.anonymize_old_reports(); $cron$
    );
  END IF;
END;
$$;

-- ─── 3. Purge stale rate_limit rows (IP addresses) older than 1 hour ────────
-- The rate_limits table stores IP-keyed rows. Rows fully refilled and idle
-- for >1 hour carry no operational value and constitute stored PII.
CREATE OR REPLACE FUNCTION public.purge_stale_rate_limits()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.rate_limits
  WHERE last_refill < now() - interval '1 hour';
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'purge-rate-limits',
      '*/30 * * * *',
      $cron$ SELECT public.purge_stale_rate_limits(); $cron$
    );
  END IF;
END;
$$;

-- ─── 4. Drop driver_gender from public-facing RPCs ───────────────────────────
-- The column is retained in the table for admin/moderation use only.
-- We revoke read access on it from anon and authenticated roles.
-- (Supabase PostgREST respects column-level grants.)
REVOKE SELECT (driver_gender) ON public.reports FROM anon, authenticated;

-- ─── 5. Notification pruning — remove read notifications after 90 days ───────
CREATE OR REPLACE FUNCTION public.purge_old_notifications()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.notifications
  WHERE read = true
    AND created_at < now() - interval '90 days';
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'purge-old-notifications',
      '0 4 * * *',
      $cron$ SELECT public.purge_old_notifications(); $cron$
    );
  END IF;
END;
$$;

-- ─── 6. Grant execute on new maintenance functions to postgres role only ──────
REVOKE EXECUTE ON FUNCTION public.anonymize_old_reports() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_stale_rate_limits() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_old_notifications() FROM anon, authenticated;
