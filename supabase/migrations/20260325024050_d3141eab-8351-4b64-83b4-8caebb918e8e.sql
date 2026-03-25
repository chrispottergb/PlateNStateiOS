
ALTER TABLE public.reports
  ADD COLUMN vehicle_type text,
  ADD COLUMN vehicle_color text,
  ADD COLUMN vehicle_make text,
  ADD COLUMN vehicle_model text,
  ADD COLUMN vehicle_features text[] DEFAULT '{}',
  ADD COLUMN driver_gender text,
  ADD COLUMN comment text;

-- Update the spend_credit_on_report function to accept new fields
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
  p_vehicle_features text[] DEFAULT '{}',
  p_driver_gender text DEFAULT NULL,
  p_comment text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_credits INTEGER;
  v_report_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
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
$$;
