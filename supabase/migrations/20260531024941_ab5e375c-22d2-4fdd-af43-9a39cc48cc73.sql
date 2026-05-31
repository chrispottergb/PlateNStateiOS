
CREATE TABLE public.blocked_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('email','domain')),
  value text NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, value)
);

GRANT SELECT, INSERT, DELETE ON public.blocked_emails TO authenticated;
GRANT ALL ON public.blocked_emails TO service_role;

ALTER TABLE public.blocked_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view blocklist" ON public.blocked_emails
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins add blocklist" ON public.blocked_emails
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete blocklist" ON public.blocked_emails
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Normalize value to lowercase, trimmed
CREATE OR REPLACE FUNCTION public.normalize_blocked_email()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.value := lower(btrim(NEW.value));
  IF NEW.kind = 'email' AND position('@' in NEW.value) = 0 THEN
    RAISE EXCEPTION 'Invalid email value: %', NEW.value;
  END IF;
  IF NEW.kind = 'domain' AND position('@' in NEW.value) > 0 THEN
    RAISE EXCEPTION 'Domain entries must not contain @';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER blocked_emails_normalize
  BEFORE INSERT OR UPDATE ON public.blocked_emails
  FOR EACH ROW EXECUTE FUNCTION public.normalize_blocked_email();

-- Lookup function
CREATE OR REPLACE FUNCTION public.is_email_blocked(_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_domain text;
BEGIN
  IF _email IS NULL OR length(btrim(_email)) = 0 THEN
    RETURN false;
  END IF;
  v_email := lower(btrim(_email));
  v_domain := split_part(v_email, '@', 2);
  RETURN EXISTS (
    SELECT 1 FROM public.blocked_emails
    WHERE (kind = 'email' AND value = v_email)
       OR (kind = 'domain' AND value = v_domain)
  );
END;
$$;

-- Update handle_new_user to reject blocked emails
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
  IF public.is_email_blocked(NEW.email) THEN
    RAISE EXCEPTION 'EMAIL_BLOCKED: This email address is not permitted.';
  END IF;

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
