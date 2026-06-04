
-- 1) Fix privilege escalation on user_badges: only service_role can insert
DROP POLICY IF EXISTS "System can insert badges" ON public.user_badges;
DROP POLICY IF EXISTS "Users can insert their own badges" ON public.user_badges;
REVOKE INSERT, UPDATE, DELETE ON public.user_badges FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_badges FROM anon;
GRANT ALL ON public.user_badges TO service_role;

-- 2) Hide materialized view from PostgREST API (function get_wall_of_shame still reads it)
REVOKE ALL ON public.wall_of_shame_mv FROM anon, authenticated;

-- 3) Set search_path on remaining function
CREATE OR REPLACE FUNCTION public._is_username_reserved(_u text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT lower(_u) = ANY(ARRAY[
    'admin','administrator','support','help','mod','moderator','root','system',
    'staff','official','platenstate','plate','owner','api','www','null','undefined',
    'security','abuse','contact','info','team','everyone','anonymous','me','you'
  ]);
$function$;
