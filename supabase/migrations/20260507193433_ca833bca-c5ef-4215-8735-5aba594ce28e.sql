CREATE OR REPLACE FUNCTION public.batch_plate_screening(p_plates text[])
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid; v_result json;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT json_agg(plate_data ORDER BY plate_data->>'risk_score' DESC) INTO v_result
  FROM (
    SELECT json_build_object(
      'plate_number', p.plate,
      'total_reports', COALESCE(COUNT(r.id), 0),
      'verified_reports', COALESCE(COUNT(r.id) FILTER (WHERE r.upvote_count >= 3), 0),
      'risk_score', LEAST(100, COALESCE(SUM(
        CASE r.infraction
          WHEN 'road_rage' THEN 30
          WHEN 'ran_red_light' THEN 25
          WHEN 'tailgating' THEN 20
          WHEN 'speeding' THEN 15
          WHEN 'distracted_driving' THEN 15
          WHEN 'bad_parking' THEN 5
          WHEN 'aggressive_lane_change' THEN 10
          ELSE 10
        END), 0)),
      'top_infraction', (SELECT r2.infraction FROM reports r2 WHERE r2.plate_number = p.plate GROUP BY r2.infraction ORDER BY COUNT(*) DESC LIMIT 1),
      'last_reported', MAX(r.created_at)
    ) as plate_data
    FROM unnest(p_plates) AS p(plate)
    LEFT JOIN reports r ON r.plate_number = p.plate
    GROUP BY p.plate
  ) sub;
  RETURN COALESCE(v_result, '[]'::json);
END;
$function$;

CREATE OR REPLACE FUNCTION public.insurance_plate_lookup(p_plate_number text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid; v_result json; v_tier text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT is_approved_insurance(v_user_id) THEN RAISE EXCEPTION 'Not authorized: insurance account not approved'; END IF;

  v_tier := public.plate_blacklist_tier(p_plate_number);
  IF v_tier = 'total_block' THEN
    RETURN json_build_object('plate_number', p_plate_number, 'protected', true,
      'message', 'This plate is protected by the owner and unavailable for lookup.');
  END IF;

  SELECT json_build_object(
    'plate_number', p_plate_number,
    'total_reports', COALESCE(COUNT(r.id), 0),
    'verified_reports', COALESCE(COUNT(r.id) FILTER (WHERE r.upvote_count >= 3), 0),
    'risk_score', LEAST(100, COALESCE(SUM(
      CASE r.infraction
        WHEN 'road_rage' THEN 30
        WHEN 'ran_red_light' THEN 25
        WHEN 'tailgating' THEN 20
        WHEN 'speeding' THEN 15
        WHEN 'distracted_driving' THEN 15
        WHEN 'bad_parking' THEN 5
        WHEN 'aggressive_lane_change' THEN 10
        ELSE 10
      END), 0)),
    'infractions', COALESCE(json_agg(json_build_object(
      'id', r.id, 'infraction', r.infraction, 'location', r.location,
      'created_at', r.created_at, 'upvote_count', r.upvote_count,
      'verified', r.upvote_count >= 3
    ) ORDER BY r.created_at DESC) FILTER (WHERE r.id IS NOT NULL), '[]'::json)
  ) INTO v_result FROM reports r WHERE r.plate_number = p_plate_number;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.scan_uploaded_plates(p_list_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM uploaded_plate_lists WHERE id = p_list_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE uploaded_plates up SET
    total_reports = sub.total_reports,
    verified_reports = sub.verified_reports,
    risk_score = sub.risk_score,
    last_scanned_at = now()
  FROM (
    SELECT up2.id as plate_id,
      COALESCE(COUNT(r.id), 0)::integer as total_reports,
      COALESCE(COUNT(r.id) FILTER (WHERE r.upvote_count >= 3), 0)::integer as verified_reports,
      LEAST(100, COALESCE(SUM(
        CASE r.infraction
          WHEN 'road_rage' THEN 30
          WHEN 'ran_red_light' THEN 25
          WHEN 'tailgating' THEN 20
          WHEN 'speeding' THEN 15
          WHEN 'distracted_driving' THEN 15
          WHEN 'bad_parking' THEN 5
          WHEN 'aggressive_lane_change' THEN 10
          ELSE 10
        END), 0))::integer as risk_score
    FROM uploaded_plates up2
    LEFT JOIN reports r ON r.plate_number = up2.plate_number
    WHERE up2.list_id = p_list_id
    GROUP BY up2.id
  ) sub WHERE up.id = sub.plate_id;

  UPDATE uploaded_plate_lists SET status = 'complete' WHERE id = p_list_id;
END;
$function$;