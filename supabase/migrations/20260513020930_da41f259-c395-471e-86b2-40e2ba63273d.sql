CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_terms_accepted_at timestamptz;
  v_terms_version text;
  v_is_oauth boolean;
BEGIN
  BEGIN
    v_terms_accepted_at := (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamptz;
  EXCEPTION WHEN others THEN
    v_terms_accepted_at := NULL;
  END;
  v_terms_version := NEW.raw_user_meta_data->>'terms_version';

  -- Detect OAuth / social signup (provider other than email)
  v_is_oauth := COALESCE(NEW.raw_app_meta_data->>'provider', 'email') <> 'email';

  IF v_is_oauth THEN
    -- Auto-accept for social logins (UI ToS link still shown)
    IF v_terms_accepted_at IS NULL THEN v_terms_accepted_at := now(); END IF;
    IF v_terms_version IS NULL OR length(btrim(v_terms_version)) = 0 THEN
      v_terms_version := '2026-05-11-oauth';
    END IF;
  ELSE
    -- Email/password: require explicit consent
    IF v_terms_accepted_at IS NULL OR v_terms_version IS NULL OR length(btrim(v_terms_version)) = 0 THEN
      RAISE EXCEPTION 'TERMS_REQUIRED: You must accept the Terms of Service and Privacy Policy to sign up.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, display_name, terms_accepted_at, terms_version)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'Driver'
    ),
    v_terms_accepted_at,
    v_terms_version
  );
  RETURN NEW;
END;
$function$;