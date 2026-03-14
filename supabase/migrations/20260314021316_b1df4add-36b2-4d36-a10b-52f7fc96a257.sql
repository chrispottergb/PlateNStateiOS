
-- Add credits column to profiles
ALTER TABLE public.profiles ADD COLUMN credits INTEGER NOT NULL DEFAULT 20;

-- Track credit purchase history
CREATE TABLE public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'monthly_refresh', 'report_spent', 'purchase'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert transactions" ON public.credit_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to spend a credit when reporting
CREATE OR REPLACE FUNCTION public.spend_credit_on_report(p_plate_number TEXT, p_infraction TEXT, p_location TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_credits INTEGER;
  v_report_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT credits INTO v_credits FROM profiles WHERE user_id = v_user_id FOR UPDATE;
  
  IF v_credits IS NULL OR v_credits < 1 THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Deduct credit
  UPDATE profiles SET credits = credits - 1 WHERE user_id = v_user_id;

  -- Create report
  INSERT INTO reports (plate_number, infraction, location, reporter_id)
  VALUES (p_plate_number, p_infraction, p_location, v_user_id)
  RETURNING id INTO v_report_id;

  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (v_user_id, -1, 'report_spent', 'Report on ' || p_plate_number);

  -- Update reporter total
  UPDATE profiles SET total_reports = total_reports + 1 WHERE user_id = v_user_id;

  RETURN v_report_id;
END;
$$;
