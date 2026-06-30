-- Username v2: friendly random handles, server-side uniqueness, profanity + impersonation filter.
-- Privacy: every existing account whose display_name looks like a real name gets reassigned
-- a random handle (RoamingFalcon482). Users can rename themselves anytime from Profile.

-- ──────────────────────────────────────────────────────────────────────────
-- Word lists for random handle generation (kept in SQL so the DB trigger
-- can call generate_random_handle() without a network round-trip).
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._handle_adjectives() RETURNS text[] LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT ARRAY[
    'Roaming','Silent','Swift','Brave','Clever','Bold','Wild','Sneaky',
    'Quiet','Loyal','Quick','Sharp','Curious','Daring','Eager','Fierce',
    'Gentle','Happy','Honest','Humble','Jolly','Keen','Lively','Lucky',
    'Mighty','Nimble','Noble','Plucky','Proud','Rapid','Ready','Restless',
    'Rugged','Savvy','Smart','Snappy','Spicy','Steady','Stoic','Stormy',
    'Sturdy','Sunny','Tough','Tricky','Vivid','Watchful','Witty','Zesty',
    'Cosmic','Dapper'
  ]
$$;

CREATE OR REPLACE FUNCTION public._handle_nouns() RETURNS text[] LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT ARRAY[
    'Falcon','Otter','Badger','Lynx','Hawk','Wolf','Fox','Owl',
    'Raven','Bear','Tiger','Panther','Cheetah','Cobra','Coyote','Eagle',
    'Heron','Jackal','Jaguar','Kestrel','Leopard','Marlin','Mongoose','Mustang',
    'Ocelot','Osprey','Penguin','Puma','Raccoon','Rhino','Salmon','Sparrow',
    'Stallion','Swan','Tortoise','Viper','Walrus','Wasp','Weasel','Wolverine',
    'Zebra','Comet','Driver','Patrol','Pilot','Ranger','Rider','Scout',
    'Tracker','Watchman'
  ]
$$;

-- Reserved / impersonation-blocked names (case-insensitive; substring match).
-- Anything LIKE these patterns is rejected.
CREATE OR REPLACE FUNCTION public._handle_reserved_patterns() RETURNS text[] LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT ARRAY[
    'admin','administrator','mod','moderator','support','staff','official',
    'system','root','owner','ceo','founder','team','help','helpdesk',
    'security','abuse','anthropic','claude','platenstate','plate.n.state',
    'plateandstate','plate_n_state','plate-n-state'
  ]
$$;

-- Minimal profanity list — kept short to avoid false positives.
-- Pure slurs / unambiguous obscenities only. Extend cautiously.
CREATE OR REPLACE FUNCTION public._handle_profanity() RETURNS text[] LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT ARRAY[
    'fuck','shit','bitch','cunt','dick','asshole','bastard',
    'nigger','nigga','faggot','retard','tranny','whore','slut'
  ]
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- Reserved / profanity check
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._is_username_reserved(_u text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_norm text := lower(regexp_replace(_u, '[^a-z0-9]', '', 'g'));
  v_pat text;
BEGIN
  -- Impersonation: substring match against reserved patterns
  FOREACH v_pat IN ARRAY public._handle_reserved_patterns() LOOP
    IF v_norm LIKE '%' || regexp_replace(v_pat, '[^a-z0-9]', '', 'g') || '%' THEN
      RETURN TRUE;
    END IF;
  END LOOP;
  -- Profanity: substring match
  FOREACH v_pat IN ARRAY public._handle_profanity() LOOP
    IF v_norm LIKE '%' || v_pat || '%' THEN
      RETURN TRUE;
    END IF;
  END LOOP;
  RETURN FALSE;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- Random handle generator: <Adjective><Noun><3-digit number>, unique.
-- Retries on collision; falls back to a numeric-suffix scheme after 20 tries.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_random_handle()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_adj text[]   := public._handle_adjectives();
  v_noun text[]  := public._handle_nouns();
  v_handle text;
  v_attempts int := 0;
BEGIN
  LOOP
    v_handle := v_adj[1 + floor(random() * array_length(v_adj, 1))::int]
              || v_noun[1 + floor(random() * array_length(v_noun, 1))::int]
              || LPAD(floor(random() * 999 + 1)::int::text, 3, '0');

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE lower(display_name) = lower(v_handle)
    );

    v_attempts := v_attempts + 1;
    EXIT WHEN v_attempts >= 20;
  END LOOP;

  -- Astronomically unlikely fallback: append epoch suffix to guarantee uniqueness
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(display_name) = lower(v_handle)) THEN
    v_handle := v_handle || EXTRACT(EPOCH FROM now())::bigint::text;
  END IF;

  RETURN v_handle;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- handle_new_user: use the new generator when no username chosen
-- ──────────────────────────────────────────────────────────────────────────
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

  -- Only use a user-chosen username; otherwise generate a random handle.
  -- Never pull full_name / name from OAuth provider.
  v_display_name := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'display_name', '')), '');

  -- Reject chosen names that fail validation; fall back to random handle.
  IF v_display_name IS NOT NULL THEN
    IF length(v_display_name) < 2
       OR length(v_display_name) > 40
       OR v_display_name !~ '^[a-zA-Z0-9_\-#]+$'
       OR public._is_username_reserved(v_display_name)
       OR EXISTS (SELECT 1 FROM public.profiles WHERE lower(display_name) = lower(v_display_name)) THEN
      v_display_name := NULL;
    END IF;
  END IF;

  IF v_display_name IS NULL THEN
    v_display_name := public.generate_random_handle();
  END IF;

  BEGIN
    INSERT INTO public.profiles (user_id, display_name, terms_accepted_at, terms_version, portal_mode)
    VALUES (NEW.id, v_display_name, v_terms_accepted_at, v_terms_version, v_portal_mode)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'handle_new_user: profile insert failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

-- ──────────────────────────────────────────────────────────────────────────
-- Backfill: every account whose display_name looks like a real name
-- (i.e. is neither a Driver#XXXXX legacy handle nor a new-style random handle)
-- gets reassigned a fresh random handle. Users can change it from Profile.
-- ──────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
  new_handle text;
BEGIN
  FOR r IN
    SELECT id, display_name
    FROM public.profiles
    WHERE display_name IS NULL
       OR (
         display_name !~ '^Driver#[0-9]{5}$'
         AND display_name !~ '^[A-Z][a-z]+[A-Z][a-z]+[0-9]{3,5}$'
       )
  LOOP
    new_handle := public.generate_random_handle();
    UPDATE public.profiles SET display_name = new_handle WHERE id = r.id;
  END LOOP;
END $$;

-- ──────────────────────────────────────────────────────────────────────────
-- Now that all display_names are random + collision-free, enforce uniqueness.
-- Case-insensitive unique index so "Foo123" and "foo123" don't both exist.
-- ──────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS profiles_display_name_lower_key;
CREATE UNIQUE INDEX profiles_display_name_lower_key
  ON public.profiles (lower(display_name));

-- ──────────────────────────────────────────────────────────────────────────
-- update_profile_display_name RPC: server-side authoritative rename.
-- Validates length, chars, reserved/profanity, uniqueness. Returns void.
-- Throws named exceptions the client can show as friendly errors.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_profile_display_name(p_display_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_trimmed text := btrim(p_display_name);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF length(v_trimmed) < 2 THEN
    RAISE EXCEPTION 'USERNAME_TOO_SHORT';
  END IF;

  IF length(v_trimmed) > 40 THEN
    RAISE EXCEPTION 'USERNAME_TOO_LONG';
  END IF;

  IF v_trimmed !~ '^[a-zA-Z0-9_\-#]+$' THEN
    RAISE EXCEPTION 'USERNAME_INVALID_CHARS';
  END IF;

  IF public._is_username_reserved(v_trimmed) THEN
    RAISE EXCEPTION 'USERNAME_RESERVED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(display_name) = lower(v_trimmed)
      AND user_id <> v_user_id
  ) THEN
    RAISE EXCEPTION 'USERNAME_TAKEN';
  END IF;

  UPDATE public.profiles SET display_name = v_trimmed WHERE user_id = v_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_profile_display_name FROM anon;
GRANT  EXECUTE ON FUNCTION public.update_profile_display_name TO authenticated;

-- RPC to suggest random handles for the signup/edit UI (preview before commit)
CREATE OR REPLACE FUNCTION public.suggest_usernames(_count int DEFAULT 3)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_out text[] := ARRAY[]::text[];
  i int;
BEGIN
  _count := LEAST(GREATEST(_count, 1), 10);
  FOR i IN 1.._count LOOP
    v_out := array_append(v_out, public.generate_random_handle());
  END LOOP;
  RETURN v_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.suggest_usernames TO authenticated, anon;
