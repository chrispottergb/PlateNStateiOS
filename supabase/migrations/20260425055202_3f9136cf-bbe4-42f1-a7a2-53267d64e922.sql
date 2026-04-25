DROP VIEW IF EXISTS public.reports_public;

CREATE VIEW public.reports_public
WITH (security_invoker = true)
AS
SELECT
  r.id,
  public.plate_display(r.plate_number) AS plate_number,
  r.infraction,
  r.location,
  r.latitude,
  r.longitude,
  r.created_at,
  r.reporter_id,
  r.upvote_count,
  r.downvote_count,
  r.comment,
  r.tags,
  r.hot_take,
  r.vehicle_make,
  r.vehicle_model,
  r.vehicle_color,
  r.vehicle_type,
  r.vehicle_features,
  r.driver_gender,
  public.plate_blacklist_tier(r.plate_number) AS blacklist_tier
FROM public.reports r
WHERE public.plate_blacklist_tier(r.plate_number) IS DISTINCT FROM 'total_block';

GRANT SELECT ON public.reports_public TO anon, authenticated;