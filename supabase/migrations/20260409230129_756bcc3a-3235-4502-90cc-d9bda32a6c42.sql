
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_reports_plate_number ON public.reports(plate_number);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_infraction ON public.reports(infraction);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_claimed_plates_plate ON public.claimed_plates(plate_number);
CREATE INDEX IF NOT EXISTS idx_uploaded_plates_list ON public.uploaded_plates(list_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);

-- Homepage stats function (single efficient query replacing 3 client calls)
CREATE OR REPLACE FUNCTION public.get_homepage_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'report_count', (SELECT COUNT(*) FROM reports),
    'reporter_count', (SELECT COUNT(*) FROM profiles WHERE total_reports > 0),
    'city_count', (SELECT COUNT(DISTINCT split_part(location, ',', 1)) FROM reports)
  );
$$;

-- Rate limiting: update the full spend_credit_on_report to check recent submissions
CREATE OR REPLACE FUNCTION public.spend_credit_on_report(
  p_plate_number text,
  p_infraction text,
  p_location text,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL,
  p_vehicle_type text DEFAULT NULL,
  p_vehicle_color text DEFAULT NULL,
  p_vehicle_make text DEFAULT NULL,
  p_vehicle_model text DEFAULT NULL,
  p_vehicle_features text[] DEFAULT '{}'::text[],
  p_driver_gender text DEFAULT NULL,
  p_comment text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_credits INTEGER;
  v_report_id UUID;
  v_recent_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Rate limit: max 10 reports per minute
  SELECT COUNT(*) INTO v_recent_count
  FROM reports
  WHERE reporter_id = v_user_id AND created_at > now() - interval '1 minute';

  IF v_recent_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before submitting more reports.';
  END IF;

  SELECT credits INTO v_credits FROM profiles WHERE user_id = v_user_id FOR UPDATE;

  IF v_credits IS NULL OR v_credits < 1 THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  UPDATE profiles SET credits = credits - 1 WHERE user_id = v_user_id;

  INSERT INTO reports (plate_number, infraction, location, reporter_id, latitude, longitude, vehicle_type, vehicle_color, vehicle_make, vehicle_model, vehicle_features, driver_gender, comment)
  VALUES (p_plate_number, p_infraction, p_location, v_user_id, p_latitude, p_longitude, p_vehicle_type, p_vehicle_color, p_vehicle_make, p_vehicle_model, p_vehicle_features, p_driver_gender, p_comment)
  RETURNING id INTO v_report_id;

  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (v_user_id, -1, 'report_spent', 'Report on ' || p_plate_number);

  UPDATE profiles SET total_reports = total_reports + 1 WHERE user_id = v_user_id;

  RETURN v_report_id;
END;
$function$;
