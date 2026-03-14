
-- Notifications table for claimed plate owners
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_id uuid REFERENCES public.reports(id) ON DELETE CASCADE,
  plate_number text NOT NULL,
  infraction text NOT NULL,
  location text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Trigger: when a report is created, notify all users who claimed that plate
CREATE OR REPLACE FUNCTION public.notify_plate_owners()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO notifications (user_id, report_id, plate_number, infraction, location)
  SELECT cp.user_id, NEW.id, NEW.plate_number, NEW.infraction, NEW.location
  FROM claimed_plates cp
  WHERE cp.plate_number = NEW.plate_number
    AND cp.user_id IS DISTINCT FROM NEW.reporter_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_report_notify_owners
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_plate_owners();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
