-- 1. Update handle_new_user to require terms acceptance metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_terms_accepted_at timestamptz;
  v_terms_version text;
BEGIN
  -- Parse terms acceptance from signup metadata
  BEGIN
    v_terms_accepted_at := (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamptz;
  EXCEPTION WHEN others THEN
    v_terms_accepted_at := NULL;
  END;
  v_terms_version := NEW.raw_user_meta_data->>'terms_version';

  -- Enforce consent server-side
  IF v_terms_accepted_at IS NULL OR v_terms_version IS NULL OR length(btrim(v_terms_version)) = 0 THEN
    RAISE EXCEPTION 'TERMS_REQUIRED: You must accept the Terms of Service and Privacy Policy to sign up.'
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.profiles (user_id, display_name, terms_accepted_at, terms_version)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Driver'),
    v_terms_accepted_at,
    v_terms_version
  );
  RETURN NEW;
END;
$function$;

-- 2. Prevent users from clearing their own Terms acceptance once recorded
CREATE OR REPLACE FUNCTION public.protect_terms_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.terms_accepted_at IS NOT NULL AND NEW.terms_accepted_at IS NULL THEN
    RAISE EXCEPTION 'Terms acceptance cannot be cleared.';
  END IF;
  IF OLD.terms_version IS NOT NULL AND (NEW.terms_version IS NULL OR length(btrim(NEW.terms_version)) = 0) THEN
    RAISE EXCEPTION 'Terms version cannot be cleared.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_terms_acceptance_trg ON public.profiles;
CREATE TRIGGER protect_terms_acceptance_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_terms_acceptance();