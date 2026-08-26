-- Grant table-level permissions required for authenticated users to read/update
-- their own profile and account context (RLS policies enforce row scope).
-- Without these GRANTs, queries fail with "permission denied for table ...".

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, UPDATE ON public.account_context TO authenticated;

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_context ENABLE ROW LEVEL SECURITY;

-- Recreate user-facing policies if missing (e.g. after partial V3.1 apply)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own account context" ON public.account_context;
DROP POLICY IF EXISTS "Users can update own onboarding status" ON public.account_context;
DROP POLICY IF EXISTS "account_select_own" ON public.account_context;
DROP POLICY IF EXISTS "account_update_own" ON public.account_context;

CREATE POLICY "account_select_own"
  ON public.account_context
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "account_update_own"
  ON public.account_context
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
