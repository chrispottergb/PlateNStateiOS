
-- Insurance accounts table with admin approval
CREATE TABLE public.insurance_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  company_name text NOT NULL,
  contact_email text NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view their own account
CREATE POLICY "Users can view own insurance account" ON public.insurance_accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can apply (insert their own)
CREATE POLICY "Users can create insurance account" ON public.insurance_accounts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Security definer function: check if user is approved insurance account
CREATE OR REPLACE FUNCTION public.is_approved_insurance(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.insurance_accounts
    WHERE user_id = p_user_id AND approved = true
  )
$$;

-- Function: plate risk lookup for approved insurance users
CREATE OR REPLACE FUNCTION public.insurance_plate_lookup(p_plate_number text)
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

  IF NOT is_approved_insurance(v_user_id) THEN
    RAISE EXCEPTION 'Not authorized: insurance account not approved';
  END IF;

  SELECT json_build_object(
    'plate_number', p_plate_number,
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
    'infractions', COALESCE(
      json_agg(
        json_build_object(
          'id', r.id,
          'infraction', r.infraction,
          'location', r.location,
          'created_at', r.created_at,
          'upvote_count', r.upvote_count,
          'verified', r.upvote_count >= 3
        ) ORDER BY r.created_at DESC
      ) FILTER (WHERE r.id IS NOT NULL),
      '[]'::json
    )
  ) INTO v_result
  FROM reports r
  WHERE r.plate_number = p_plate_number;

  RETURN v_result;
END;
$$;
