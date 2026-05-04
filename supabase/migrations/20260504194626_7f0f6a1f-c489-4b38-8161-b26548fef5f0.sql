-- 1. Round existing GPS data to 2 decimal places (~1 km)
UPDATE public.reports
SET
  latitude  = round(latitude::numeric, 2),
  longitude = round(longitude::numeric, 2)
WHERE latitude IS NOT NULL OR longitude IS NOT NULL;

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

-- 2. Auto-null reporter_id after 30 days
CREATE OR REPLACE FUNCTION public.anonymize_old_reports()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.reports
  SET reporter_id = NULL
  WHERE reporter_id IS NOT NULL
    AND created_at < now() - interval '30 days';
$$;

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

-- 3. Purge stale rate_limit IP rows after 1 hour
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

-- 4. Restrict driver_gender to admin/service role only
REVOKE SELECT (driver_gender) ON public.reports FROM anon, authenticated;

-- 5. Prune read notifications after 90 days
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

-- 6. Lock down maintenance functions
REVOKE EXECUTE ON FUNCTION public.anonymize_old_reports() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_stale_rate_limits() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_old_notifications() FROM anon, authenticated;