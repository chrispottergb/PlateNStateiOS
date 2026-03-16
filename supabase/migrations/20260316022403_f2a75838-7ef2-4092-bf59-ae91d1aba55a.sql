
-- Drop if exist then recreate
DROP TRIGGER IF EXISTS trg_update_streak ON public.reports;
DROP TRIGGER IF EXISTS trg_notify_plate_owners ON public.reports;

CREATE TRIGGER trg_update_streak
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_streak();

CREATE TRIGGER trg_notify_plate_owners
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_plate_owners();
