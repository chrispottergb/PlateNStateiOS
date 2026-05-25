
DO $$ BEGIN
  CREATE TYPE public.portal_mode AS ENUM ('consumer', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS portal_mode public.portal_mode NOT NULL DEFAULT 'consumer';

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
  v_portal_mode public.portal_mode;
BEGIN
  BEGIN
    v_terms_accepted_at := (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamptz;
  EXCEPTION WHEN others THEN
    v_terms_accepted_at := NULL;
  END;
  v_terms_version := NEW.raw_user_meta_data->>'terms_version';
  v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

  BEGIN
    v_portal_mode := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'portal_mode', '')::public.portal_mode,
      'consumer'::public.portal_mode
    );
  EXCEPTION WHEN others THEN
    v_portal_mode := 'consumer'::public.portal_mode;
  END;

  IF v_terms_accepted_at IS NULL THEN
    v_terms_accepted_at := now();
  END IF;
  IF v_terms_version IS NULL OR length(btrim(v_terms_version)) = 0 THEN
    v_terms_version := '2026-05-13-' || v_provider;
  END IF;

  BEGIN
    INSERT INTO public.profiles (user_id, display_name, terms_accepted_at, terms_version, portal_mode)
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        'Driver'
      ),
      v_terms_accepted_at,
      v_terms_version,
      v_portal_mode
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'handle_new_user: profile insert failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
