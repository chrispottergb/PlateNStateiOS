CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_terms_accepted_at timestamptz;
  v_terms_version text;
  v_provider text;
BEGIN
  BEGIN
    v_terms_accepted_at := (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamptz;
  EXCEPTION WHEN others THEN
    v_terms_accepted_at := NULL;
  END;
  v_terms_version := NEW.raw_user_meta_data->>'terms_version';
  v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

  -- Never block signup. Default missing terms to now() with a provider-tagged version.
  IF v_terms_accepted_at IS NULL THEN
    v_terms_accepted_at := now();
  END IF;
  IF v_terms_version IS NULL OR length(btrim(v_terms_version)) = 0 THEN
    v_terms_version := '2026-05-13-' || v_provider;
  END IF;

  BEGIN
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
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN others THEN
    -- Swallow any error so auth signup never fails on profile creation
    RAISE WARNING 'handle_new_user: profile insert failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;