-- Grant read access on materialized view to API roles
grant select on public.wall_of_shame_mv to anon, authenticated;
