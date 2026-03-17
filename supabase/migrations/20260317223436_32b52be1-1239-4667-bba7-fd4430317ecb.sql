
CREATE TYPE public.fleet_tier AS ENUM ('starter', 'business', 'premium');

ALTER TABLE public.companies ADD COLUMN tier fleet_tier NOT NULL DEFAULT 'starter';
