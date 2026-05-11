CREATE TABLE public.data_deletion_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NULL,
  email text NOT NULL,
  reason text NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL
);

ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can submit a deletion request
CREATE POLICY "Anyone can submit deletion request"
ON public.data_deletion_requests
FOR INSERT
WITH CHECK (true);

-- Users can view their own requests
CREATE POLICY "Users can view own deletion requests"
ON public.data_deletion_requests
FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Admins can view and update everything
CREATE POLICY "Admins can view all deletion requests"
ON public.data_deletion_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update deletion requests"
ON public.data_deletion_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));