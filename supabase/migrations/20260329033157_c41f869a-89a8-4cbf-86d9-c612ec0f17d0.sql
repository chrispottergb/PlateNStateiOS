
-- New tables for bulk plate uploads
CREATE TABLE public.uploaded_plate_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type text NOT NULL CHECK (account_type IN ('law_enforcement', 'insurance')),
  account_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  file_name text NOT NULL,
  plate_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'complete', 'error')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.uploaded_plates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.uploaded_plate_lists(id) ON DELETE CASCADE,
  plate_number text NOT NULL,
  label text,
  total_reports integer NOT NULL DEFAULT 0,
  verified_reports integer NOT NULL DEFAULT 0,
  risk_score integer NOT NULL DEFAULT 0,
  last_scanned_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.uploaded_plate_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_plates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lists" ON public.uploaded_plate_lists
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lists" ON public.uploaded_plate_lists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own lists" ON public.uploaded_plate_lists
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role can update lists" ON public.uploaded_plate_lists
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view own plates" ON public.uploaded_plates
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.uploaded_plate_lists l WHERE l.id = list_id AND l.user_id = auth.uid()));

CREATE POLICY "Users can insert own plates" ON public.uploaded_plates
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.uploaded_plate_lists l WHERE l.id = list_id AND l.user_id = auth.uid()));

-- Storage bucket for CSV uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('plate-uploads', 'plate-uploads', false, 5242880);

-- Storage RLS: only uploader can access their files
CREATE POLICY "Users can upload plate files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'plate-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own plate files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'plate-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Function to re-scan uploaded plates against current reports
CREATE OR REPLACE FUNCTION public.scan_uploaded_plates(p_list_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  
  -- Verify ownership
  IF NOT EXISTS (SELECT 1 FROM uploaded_plate_lists WHERE id = p_list_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Update each plate's risk data from reports
  UPDATE uploaded_plates up SET
    total_reports = sub.total_reports,
    verified_reports = sub.verified_reports,
    risk_score = sub.risk_score,
    last_scanned_at = now()
  FROM (
    SELECT
      up2.id as plate_id,
      COALESCE(COUNT(r.id), 0)::integer as total_reports,
      COALESCE(COUNT(r.id) FILTER (WHERE r.upvote_count >= 3), 0)::integer as verified_reports,
      LEAST(100, COALESCE(SUM(
        CASE r.infraction
          WHEN 'tailgating' THEN 20
          WHEN 'ran_red_light' THEN 25
          WHEN 'speeding' THEN 15
          WHEN 'distracted_driving' THEN 15
          WHEN 'bad_parking' THEN 5
          WHEN 'aggressive_lane_change' THEN 10
          ELSE 10
        END
      ), 0))::integer as risk_score
    FROM uploaded_plates up2
    LEFT JOIN reports r ON r.plate_number = up2.plate_number
    WHERE up2.list_id = p_list_id
    GROUP BY up2.id
  ) sub
  WHERE up.id = sub.plate_id;

  UPDATE uploaded_plate_lists SET status = 'complete' WHERE id = p_list_id;
END;
$$;
