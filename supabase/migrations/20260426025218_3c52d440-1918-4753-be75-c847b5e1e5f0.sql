CREATE OR REPLACE FUNCTION public.spend_credit_on_report(
  p_plate_number text,
  p_infraction text,
  p_location text,
  p_latitude double precision DEFAULT NULL::double precision,
  p_longitude double precision DEFAULT NULL::double precision,
  p_vehicle_type text DEFAULT NULL::text,
  p_vehicle_color text DEFAULT NULL::text,
  p_vehicle_make text DEFAULT NULL::text,
  p_vehicle_model text DEFAULT NULL::text,
  p_vehicle_features text[] DEFAULT '{}'::text[],
  p_driver_gender text DEFAULT NULL::text,
  p_comment text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_credits INTEGER;
  v_report_id UUID;
  v_recent_count INTEGER;
  v_dup_today INTEGER;
  v_plate TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_plate := upper(btrim(p_plate_number));

  -- One report per plate per reporter per 24h
  SELECT COUNT(*) INTO v_dup_today
  FROM reports
  WHERE reporter_id = v_user_id
    AND upper(plate_number) = v_plate
    AND created_at > now() - interval '24 hours';

  IF v_dup_today >= 1 THEN
    RAISE EXCEPTION 'DUPLICATE_REPORT: You already reported this plate in the last 24 hours.';
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
  VALUES (v_plate, p_infraction, p_location, v_user_id, p_latitude, p_longitude, p_vehicle_type, p_vehicle_color, p_vehicle_make, p_vehicle_model, p_vehicle_features, p_driver_gender, p_comment)
  RETURNING id INTO v_report_id;

  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (v_user_id, -1, 'report_spent', 'Report on ' || v_plate);

  UPDATE profiles SET total_reports = total_reports + 1 WHERE user_id = v_user_id;

  RETURN v_report_id;
END;
$function$;