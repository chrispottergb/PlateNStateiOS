
-- Batch screening function: accepts an array of plate numbers and returns risk data
CREATE OR REPLACE FUNCTION public.batch_plate_screening(p_plates text[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_result json;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT json_agg(plate_data ORDER BY plate_data->>'risk_score' DESC)
  INTO v_result
  FROM (
    SELECT json_build_object(
      'plate_number', p.plate,
      'total_reports', COALESCE(COUNT(r.id), 0),
      'verified_reports', COALESCE(COUNT(r.id) FILTER (WHERE r.upvote_count >= 3), 0),
      'risk_score', LEAST(100, COALESCE(
        SUM(
          CASE r.infraction
            WHEN 'reckless_driving' THEN 25
            WHEN 'road_rage' THEN 20
            WHEN 'speeding' THEN 15
            WHEN 'distracted_driving' THEN 15
            WHEN 'illegal_parking' THEN 5
            WHEN 'lane_violation' THEN 10
            ELSE 10
          END
        ), 0
      )),
      'top_infraction', (
        SELECT r2.infraction FROM reports r2
        WHERE r2.plate_number = p.plate
        GROUP BY r2.infraction
        ORDER BY COUNT(*) DESC
        LIMIT 1
      ),
      'last_reported', MAX(r.created_at)
    ) as plate_data
    FROM unnest(p_plates) AS p(plate)
    LEFT JOIN reports r ON r.plate_number = p.plate
    GROUP BY p.plate
  ) sub;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- Saved screenings table
CREATE TABLE public.saved_screenings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  plates text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_screenings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own screenings" ON public.saved_screenings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create screenings" ON public.saved_screenings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own screenings" ON public.saved_screenings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
