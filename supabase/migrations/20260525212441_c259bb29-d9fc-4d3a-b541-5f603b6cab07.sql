-- 1. Add incident_state column
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS incident_state text;

-- 2. Validation trigger for incident_state (mirrors validate_state_code)
CREATE OR REPLACE FUNCTION public.validate_incident_state_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.incident_state IS NOT NULL THEN
    NEW.incident_state := upper(NEW.incident_state);
    IF NEW.incident_state !~ '^[A-Z]{2}$' THEN
      RAISE EXCEPTION 'Invalid incident_state code: %, must be 2-letter US state code', NEW.incident_state;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS reports_validate_incident_state ON public.reports;
CREATE TRIGGER reports_validate_incident_state
BEFORE INSERT OR UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.validate_incident_state_code();

-- 3. New overload of spend_credit_on_report that accepts p_incident_state
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
  p_comment text DEFAULT NULL,
  p_state text DEFAULT 'WI',
  p_incident_state text DEFAULT NULL,
  p_ip text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid; v_credits integer; v_report_id uuid; v_dup_today integer;
  v_plate text; v_state text; v_incident_state text;
  v_valid_states text[] := ARRAY[
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
    'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
    'VA','WA','WV','WI','WY','DC'
  ];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  v_state := upper(coalesce(p_state, 'WI'));
  IF v_state !~ '^[A-Z]{2}$' OR NOT (v_state = ANY(v_valid_states)) THEN
    RAISE EXCEPTION 'INVALID_STATE: %', v_state;
  END IF;

  IF p_incident_state IS NOT NULL THEN
    v_incident_state := upper(p_incident_state);
    IF v_incident_state !~ '^[A-Z]{2}$' OR NOT (v_incident_state = ANY(v_valid_states)) THEN
      RAISE EXCEPTION 'INVALID_INCIDENT_STATE: %', v_incident_state;
    END IF;
  END IF;

  v_plate := upper(btrim(p_plate_number));

  IF NOT public.check_rate_limit('reporter:' || v_user_id::text, 10, 10.0/60.0) THEN
    RAISE EXCEPTION 'RATE_LIMITED: Too many requests, slow down';
  END IF;

  IF p_ip IS NOT NULL AND length(p_ip) > 0 THEN
    IF NOT public.check_rate_limit('report_ip:' || p_ip, 60, 60.0/60.0) THEN
      RAISE EXCEPTION 'RATE_LIMITED: Too many requests from this network';
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_dup_today FROM reports
  WHERE reporter_id = v_user_id AND upper(plate_number) = v_plate
    AND created_at > now() - interval '24 hours';
  IF v_dup_today >= 1 THEN
    RAISE EXCEPTION 'DUPLICATE_REPORT: You already reported this plate in the last 24 hours.';
  END IF;

  SELECT credits INTO v_credits FROM profiles WHERE user_id = v_user_id FOR UPDATE;
  IF v_credits IS NULL OR v_credits < 1 THEN RAISE EXCEPTION 'Insufficient credits'; END IF;

  UPDATE profiles SET credits = credits - 1 WHERE user_id = v_user_id;

  INSERT INTO reports (
    plate_number, infraction, location, reporter_id, latitude, longitude,
    vehicle_type, vehicle_color, vehicle_make, vehicle_model,
    vehicle_features, driver_gender, comment, state, incident_state
  ) VALUES (
    v_plate, p_infraction, p_location, v_user_id, p_latitude, p_longitude,
    p_vehicle_type, p_vehicle_color, p_vehicle_make, p_vehicle_model,
    p_vehicle_features, p_driver_gender, p_comment, v_state, v_incident_state
  ) RETURNING id INTO v_report_id;

  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (v_user_id, -1, 'report_spent', 'Report on ' || v_plate);

  UPDATE profiles SET total_reports = total_reports + 1 WHERE user_id = v_user_id;

  RETURN v_report_id;
END;
$function$;