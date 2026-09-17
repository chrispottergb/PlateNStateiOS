-- claimed_plates: canonical plate identity + paid-ownership protection (2026-09-18)
--
-- 1. plate_number is always stored canonical: upper-case, alphanumerics only
--    ("abc-123", "ABC 123", "abc123" → "ABC123"). Enforced by trigger so every
--    writer (Stripe webhook, Apple receipt, checkout, legacy edge functions)
--    shares one identity regardless of what it sends.
-- 2. A PAID claim can never have its user_id changed. Service-role upserts
--    bypass RLS but not triggers, so this closes the "second buyer overwrites
--    the owner" hole at the database, independent of application code.
-- 3. Existing rows are normalized where doing so does not collide with an
--    already-canonical row (collisions are left for manual review).
--
-- The identity model stays UNIQUE(plate_number); no (state, plate) key here.

CREATE OR REPLACE FUNCTION public.normalize_claimed_plate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.plate_number := upper(regexp_replace(NEW.plate_number, '[^A-Za-z0-9]', '', 'g'));
  IF NEW.plate_number = '' THEN
    RAISE EXCEPTION 'claimed_plates.plate_number must contain at least one alphanumeric character';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_claimed_plate ON public.claimed_plates;
CREATE TRIGGER normalize_claimed_plate
  BEFORE INSERT OR UPDATE OF plate_number ON public.claimed_plates
  FOR EACH ROW EXECUTE FUNCTION public.normalize_claimed_plate();

CREATE OR REPLACE FUNCTION public.protect_paid_claim_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.paid AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'claimed_plates: plate % is already claimed by another user', OLD.plate_number
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_paid_claim_owner ON public.claimed_plates;
CREATE TRIGGER protect_paid_claim_owner
  BEFORE UPDATE ON public.claimed_plates
  FOR EACH ROW EXECUTE FUNCTION public.protect_paid_claim_owner();

-- Backfill: canonicalize rows that are not already canonical, skipping any
-- whose canonical form is already taken by a different row.
UPDATE public.claimed_plates c
SET plate_number = upper(regexp_replace(c.plate_number, '[^A-Za-z0-9]', '', 'g'))
WHERE c.plate_number <> upper(regexp_replace(c.plate_number, '[^A-Za-z0-9]', '', 'g'))
  AND NOT EXISTS (
    SELECT 1 FROM public.claimed_plates o
    WHERE o.id <> c.id
      AND o.plate_number = upper(regexp_replace(c.plate_number, '[^A-Za-z0-9]', '', 'g'))
  );
