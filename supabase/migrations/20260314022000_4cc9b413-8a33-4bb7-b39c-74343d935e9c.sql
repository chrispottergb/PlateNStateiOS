
-- Companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  contact_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Fleet vehicles table
CREATE TABLE public.fleet_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plate_number text NOT NULL UNIQUE,
  vehicle_label text,
  added_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check company ownership
CREATE OR REPLACE FUNCTION public.is_company_owner(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies
    WHERE id = p_company_id AND owner_id = auth.uid()
  )
$$;

-- Companies RLS
CREATE POLICY "Anyone can view companies" ON public.companies
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create a company" ON public.companies
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their company" ON public.companies
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their company" ON public.companies
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Fleet vehicles RLS
CREATE POLICY "Anyone can view fleet vehicles" ON public.fleet_vehicles
  FOR SELECT USING (true);

CREATE POLICY "Company owners can add vehicles" ON public.fleet_vehicles
  FOR INSERT TO authenticated WITH CHECK (public.is_company_owner(company_id));

CREATE POLICY "Company owners can update vehicles" ON public.fleet_vehicles
  FOR UPDATE TO authenticated USING (public.is_company_owner(company_id));

CREATE POLICY "Company owners can delete vehicles" ON public.fleet_vehicles
  FOR DELETE TO authenticated USING (public.is_company_owner(company_id));
