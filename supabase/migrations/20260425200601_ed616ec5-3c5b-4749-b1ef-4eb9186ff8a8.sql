-- Multi-state production readiness migration
-- Add state column to all location-bearing tables, backfill WI, add hot indexes

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.claimed_plates ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.fleet_vehicles ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS state text;

-- uploaded_plates may or may not exist — guard
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='uploaded_plates') THEN
    EXECUTE 'ALTER TABLE public.uploaded_plates ADD COLUMN IF NOT EXISTS state text';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subscriptions') THEN
    EXECUTE 'ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS state text';
  END IF;
END $$;

-- Add home_state to profiles for default state preference
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_state text;

-- Backfill existing rows to 'WI'
UPDATE public.reports SET state = 'WI' WHERE state IS NULL;
UPDATE public.claimed_plates SET state = 'WI' WHERE state IS NULL;
UPDATE public.fleet_vehicles SET state = 'WI' WHERE state IS NULL;
UPDATE public.notifications SET state = 'WI' WHERE state IS NULL;
UPDATE public.profiles SET home_state = 'WI' WHERE home_state IS NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='uploaded_plates') THEN
    EXECUTE 'UPDATE public.uploaded_plates SET state = ''WI'' WHERE state IS NULL';
  END IF;
END $$;

-- Default 'WI' going forward (sensible default; UI will set explicit state)
ALTER TABLE public.reports ALTER COLUMN state SET DEFAULT 'WI';
ALTER TABLE public.claimed_plates ALTER COLUMN state SET DEFAULT 'WI';
ALTER TABLE public.fleet_vehicles ALTER COLUMN state SET DEFAULT 'WI';
ALTER TABLE public.notifications ALTER COLUMN state SET DEFAULT 'WI';

-- Validation trigger: enforce 2-letter uppercase state code
CREATE OR REPLACE FUNCTION public.validate_state_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.state IS NOT NULL THEN
    NEW.state := upper(NEW.state);
    IF NEW.state !~ '^[A-Z]{2}$' THEN
      RAISE EXCEPTION 'Invalid state code: %, must be 2-letter US state code', NEW.state;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS validate_state_reports ON public.reports;
CREATE TRIGGER validate_state_reports BEFORE INSERT OR UPDATE OF state ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.validate_state_code();

DROP TRIGGER IF EXISTS validate_state_claimed ON public.claimed_plates;
CREATE TRIGGER validate_state_claimed BEFORE INSERT OR UPDATE OF state ON public.claimed_plates
  FOR EACH ROW EXECUTE FUNCTION public.validate_state_code();

DROP TRIGGER IF EXISTS validate_state_fleet ON public.fleet_vehicles;
CREATE TRIGGER validate_state_fleet BEFORE INSERT OR UPDATE OF state ON public.fleet_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.validate_state_code();

DROP TRIGGER IF EXISTS validate_state_notifications ON public.notifications;
CREATE TRIGGER validate_state_notifications BEFORE INSERT OR UPDATE OF state ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.validate_state_code();

-- Hot-path indexes for high traffic
CREATE INDEX IF NOT EXISTS idx_reports_plate_number ON public.reports (plate_number);
CREATE INDEX IF NOT EXISTS idx_reports_state ON public.reports (state);
CREATE INDEX IF NOT EXISTS idx_reports_state_plate ON public.reports (state, plate_number);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at_desc ON public.reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_state_created ON public.reports (state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_claimed_plates_plate ON public.claimed_plates (plate_number);
CREATE INDEX IF NOT EXISTS idx_claimed_plates_state_plate ON public.claimed_plates (state, plate_number);
CREATE INDEX IF NOT EXISTS idx_claimed_plates_user ON public.claimed_plates (user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_company ON public.fleet_vehicles (company_id);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_state_plate ON public.fleet_vehicles (state, plate_number);