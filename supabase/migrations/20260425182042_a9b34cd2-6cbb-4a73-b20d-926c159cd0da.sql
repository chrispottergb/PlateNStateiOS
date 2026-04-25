-- Add free dispute tracking to claimed plates
ALTER TABLE public.claimed_plates
  ADD COLUMN IF NOT EXISTS free_dispute_used boolean NOT NULL DEFAULT false;

-- Disputes table
CREATE TABLE public.report_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  plate_number text NOT NULL,
  disputer_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('not_my_vehicle','inaccurate_details','duplicate','harassment_or_abuse','other')),
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','upheld','denied')),
  paid boolean NOT NULL DEFAULT false,
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  CONSTRAINT report_disputes_unique_per_user UNIQUE (report_id, disputer_id),
  CONSTRAINT report_disputes_note_len CHECK (note IS NULL OR length(note) <= 280)
);

CREATE INDEX idx_report_disputes_report ON public.report_disputes(report_id);
CREATE INDEX idx_report_disputes_plate_status ON public.report_disputes(plate_number, status);
CREATE INDEX idx_report_disputes_disputer ON public.report_disputes(disputer_id, created_at DESC);

ALTER TABLE public.report_disputes ENABLE ROW LEVEL SECURITY;

-- Private: only disputer or admin can read. Public has no access.
CREATE POLICY "Disputers can view own disputes"
  ON public.report_disputes FOR SELECT
  TO authenticated
  USING (auth.uid() = disputer_id);

CREATE POLICY "Admins can view all disputes"
  ON public.report_disputes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- No direct INSERT/UPDATE/DELETE policies — must go through SECURITY DEFINER RPCs.

-- RPC: submit a dispute. Returns json with dispute_id and whether payment is required.
CREATE OR REPLACE FUNCTION public.submit_dispute(
  p_report_id uuid,
  p_reason text,
  p_note text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_plate text;
  v_claim_id uuid;
  v_free_used boolean;
  v_dispute_id uuid;
  v_existing uuid;
  v_clean_note text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF p_reason NOT IN ('not_my_vehicle','inaccurate_details','duplicate','harassment_or_abuse','other') THEN
    RAISE EXCEPTION 'Invalid reason';
  END IF;

  -- Sanitize note: trim, cap at 280, treat empty as NULL
  v_clean_note := NULLIF(btrim(COALESCE(p_note, '')), '');
  IF v_clean_note IS NOT NULL AND length(v_clean_note) > 280 THEN
    v_clean_note := substr(v_clean_note, 1, 280);
  END IF;

  -- Get the plate number from the report
  SELECT plate_number INTO v_plate FROM reports WHERE id = p_report_id;
  IF v_plate IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;

  -- Verify caller owns the active claim on that plate
  SELECT id, free_dispute_used INTO v_claim_id, v_free_used
  FROM claimed_plates
  WHERE user_id = v_user_id
    AND plate_number = v_plate
    AND paid = true
  ORDER BY claimed_at DESC
  LIMIT 1;

  IF v_claim_id IS NULL THEN
    RAISE EXCEPTION 'Only the verified plate owner can dispute reports on this plate';
  END IF;

  -- Prevent duplicate dispute for same report by same user
  SELECT id INTO v_existing FROM report_disputes
  WHERE report_id = p_report_id AND disputer_id = v_user_id;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'You have already disputed this report';
  END IF;

  IF NOT v_free_used THEN
    -- Free dispute path
    INSERT INTO report_disputes (report_id, plate_number, disputer_id, reason, note, paid)
    VALUES (p_report_id, v_plate, v_user_id, p_reason, v_clean_note, true)
    RETURNING id INTO v_dispute_id;

    UPDATE claimed_plates SET free_dispute_used = true WHERE id = v_claim_id;

    RETURN json_build_object('dispute_id', v_dispute_id, 'requires_payment', false);
  ELSE
    -- Paid path: create unpaid pending dispute, frontend opens Stripe checkout
    INSERT INTO report_disputes (report_id, plate_number, disputer_id, reason, note, paid)
    VALUES (p_report_id, v_plate, v_user_id, p_reason, v_clean_note, false)
    RETURNING id INTO v_dispute_id;

    RETURN json_build_object('dispute_id', v_dispute_id, 'requires_payment', true);
  END IF;
END;
$$;

-- RPC: admin resolves a dispute. If upheld, deletes the report.
CREATE OR REPLACE FUNCTION public.resolve_dispute(
  p_dispute_id uuid,
  p_decision text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_report_id uuid;
  v_disputer uuid;
  v_paid boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(v_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF p_decision NOT IN ('upheld','denied') THEN
    RAISE EXCEPTION 'Invalid decision';
  END IF;

  SELECT report_id, disputer_id, paid INTO v_report_id, v_disputer, v_paid
  FROM report_disputes WHERE id = p_dispute_id;
  IF v_report_id IS NULL THEN RAISE EXCEPTION 'Dispute not found'; END IF;

  IF NOT v_paid THEN
    RAISE EXCEPTION 'Dispute has not been paid yet';
  END IF;

  UPDATE report_disputes
  SET status = p_decision, resolved_at = now(), resolved_by = v_user_id
  WHERE id = p_dispute_id;

  IF p_decision = 'upheld' THEN
    DELETE FROM reports WHERE id = v_report_id;
    INSERT INTO notifications (user_id, plate_number, infraction, location)
    SELECT v_disputer, rd.plate_number, 'dispute_upheld', 'Report removed'
    FROM report_disputes rd WHERE rd.id = p_dispute_id;
  ELSE
    INSERT INTO notifications (user_id, plate_number, infraction, location)
    SELECT v_disputer, rd.plate_number, 'dispute_denied', 'Dispute denied'
    FROM report_disputes rd WHERE rd.id = p_dispute_id;
  END IF;
END;
$$;

-- RPC: helper for frontend eligibility/preview
CREATE OR REPLACE FUNCTION public.dispute_eligibility(p_report_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_plate text;
  v_claim_id uuid;
  v_free_used boolean;
  v_already uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('can_dispute', false, 'reason', 'not_authenticated');
  END IF;
  SELECT plate_number INTO v_plate FROM reports WHERE id = p_report_id;
  IF v_plate IS NULL THEN
    RETURN json_build_object('can_dispute', false, 'reason', 'report_not_found');
  END IF;
  SELECT id, free_dispute_used INTO v_claim_id, v_free_used
  FROM claimed_plates
  WHERE user_id = v_user_id AND plate_number = v_plate AND paid = true
  ORDER BY claimed_at DESC LIMIT 1;
  IF v_claim_id IS NULL THEN
    RETURN json_build_object('can_dispute', false, 'reason', 'not_owner');
  END IF;
  SELECT id INTO v_already FROM report_disputes
  WHERE report_id = p_report_id AND disputer_id = v_user_id;
  IF v_already IS NOT NULL THEN
    RETURN json_build_object('can_dispute', false, 'reason', 'already_disputed');
  END IF;
  RETURN json_build_object(
    'can_dispute', true,
    'is_free', NOT v_free_used,
    'price_cents', 599
  );
END;
$$;