-- Migration 0004: Enable RLS and setup strict security policies

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Enable RLS on account_context
ALTER TABLE public.account_context ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own account context" ON public.account_context;
DROP POLICY IF EXISTS "Users can update own onboarding status" ON public.account_context;

-- Create policies for account_context
CREATE POLICY "Users can view own account context"
  ON public.account_context
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding status"
  ON public.account_context
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
