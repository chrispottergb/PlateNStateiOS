-- Allow a claimer of a plate to file a dispute on a report against that plate
CREATE POLICY "Claimers can create disputes"
ON public.report_disputes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = disputer_id
  AND EXISTS (
    SELECT 1 FROM public.claimed_plates cp
    WHERE cp.user_id = auth.uid()
      AND cp.plate_number = report_disputes.plate_number
  )
);

-- Admins can resolve disputes
CREATE POLICY "Admins can update disputes"
ON public.report_disputes
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Helpful index for admin queue lookups
CREATE INDEX IF NOT EXISTS idx_report_disputes_status_created
  ON public.report_disputes (status, created_at DESC);