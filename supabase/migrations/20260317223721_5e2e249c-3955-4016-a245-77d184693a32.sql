
CREATE TYPE public.le_tier AS ENUM ('department', 'precinct', 'agency');

CREATE TABLE public.law_enforcement_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  department_name text NOT NULL,
  badge_number text,
  contact_email text NOT NULL,
  tier le_tier NOT NULL DEFAULT 'department',
  approved boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.law_enforcement_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create LE account" ON public.law_enforcement_accounts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own LE account" ON public.law_enforcement_accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all LE accounts" ON public.law_enforcement_accounts
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update LE accounts" ON public.law_enforcement_accounts
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
