-- Community privacy: never expose real names (full_name / name) from OAuth providers.
-- Users who provide a username get that; everyone else gets a random Driver#XXXXX handle.
-- Also adds a unique constraint on display_name so collisions are retried.

-- Add unique constraint if it doesn't exist yet (idempotent)
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_display_name_key UNIQUE (display_name);
EXCEPTION WHEN duplicate_table THEN NULL;
          WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_terms_accepted_at timestamptz;
  v_terms_version     text;
  v_provider          text;
  v_portal_mode       public.portal_mode;
  v_display_name      text;
  v_attempts          int := 0;
BEGIN
  BEGIN
    v_terms_accepted_at := (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamptz;
  EXCEPTION WHEN others THEN
    v_terms_accepted_at := NULL;
  END;

  v_terms_version := NEW.raw_user_meta_data->>'terms_version';
  v_provider      := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

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

  -- Only use an explicitly chosen username — never pull full_name / name from OAuth provider.
  -- An empty string means "assign me a random handle".
  v_display_name := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'display_name', '')), '');

  -- Generate a random Driver#XXXXX handle (up to 10 tries to avoid collisions)
  WHILE v_display_name IS NULL AND v_attempts < 10 LOOP
    v_display_name := 'Driver#' || LPAD((floor(random() * 99999 + 1)::int)::text, 5, '0');
    IF EXISTS (SELECT 1 FROM public.profiles WHERE display_name = v_display_name) THEN
      v_display_name := NULL;
    END IF;
    v_attempts := v_attempts + 1;
  END LOOP;

  -- Absolute fallback (astronomically unlikely)
  IF v_display_name IS NULL THEN
    v_display_name := 'Driver#' || LPAD((EXTRACT(EPOCH FROM now())::bigint % 99999 + 1)::text, 5, '0');
  END IF;

  BEGIN
    INSERT INTO public.profiles (user_id, display_name, terms_accepted_at, terms_version, portal_mode)
    VALUES (
      NEW.id,
      v_display_name,
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
