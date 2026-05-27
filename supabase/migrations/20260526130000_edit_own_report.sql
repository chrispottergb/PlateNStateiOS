
-- Allow reporters to correct their own reports within 24 hours of submission.
-- Editable: plate_number, state (plate registration), infraction, comment,
--           vehicle_type/color/make/model/features, driver_gender
-- Immutable: location, incident_state, created_at, reporter_id, upvote_count,
--            flag status, latitude/longitude

-- 1. Track when a report was last edited
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- 2. RPC callable by the reporter only, within the 24-hour window
CREATE OR REPLACE FUNCTION public.edit_own_report(
  p_report_id       uuid,
  p_plate_number    text,
  p_state           text,
  p_infraction      text,
  p_comment         text,
  p_vehicle_type    text,
  p_vehicle_color   text,
  p_vehicle_make    text,
  p_vehicle_model   text,
  p_vehicle_features text[],
  p_driver_gender   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_reporter   uuid;
  v_created_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT reporter_id, created_at
    INTO v_reporter, v_created_at
    FROM public.reports
   WHERE id = p_report_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REPORT_NOT_FOUND';
  END IF;

  IF v_reporter IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'NOT_YOUR_REPORT';
  END IF;

  IF v_created_at < now() - interval '24 hours' THEN
    RAISE EXCEPTION 'EDIT_WINDOW_EXPIRED';
  END IF;

  IF length(trim(p_plate_number)) < 2 OR length(trim(p_plate_number)) > 10 THEN
    RAISE EXCEPTION 'INVALID_PLATE';
  END IF;

  UPDATE public.reports SET
    plate_number     = upper(trim(p_plate_number)),
    state            = nullif(trim(p_state), ''),
    infraction       = COALESCE(nullif(trim(p_infraction), ''), 'unspecified'),
    comment          = nullif(trim(p_comment), ''),
    vehicle_type     = nullif(trim(p_vehicle_type), ''),
    vehicle_color    = nullif(trim(p_vehicle_color), ''),
    vehicle_make     = nullif(trim(p_vehicle_make), ''),
    vehicle_model    = nullif(trim(p_vehicle_model), ''),
    vehicle_features = p_vehicle_features,
    driver_gender    = nullif(trim(p_driver_gender), ''),
    edited_at        = now()
  WHERE id = p_report_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.edit_own_report FROM anon;
GRANT  EXECUTE ON FUNCTION public.edit_own_report TO authenticated;
