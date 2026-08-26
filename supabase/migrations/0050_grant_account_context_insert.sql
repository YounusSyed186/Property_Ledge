-- Allow users to insert their own account_context row when missing (upsert during onboarding)
GRANT SELECT, INSERT, UPDATE ON public.account_context TO authenticated;

DROP POLICY IF EXISTS "account_insert_own" ON public.account_context;

CREATE POLICY "account_insert_own"
  ON public.account_context
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
