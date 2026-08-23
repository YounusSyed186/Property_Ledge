-- Migration 0018: Add RLS policies for users to insert/update their own subscriptions and payments

-- 1. subscriptions policies for users
DROP POLICY IF EXISTS "Users can view own account subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own account subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own account subscription" ON public.subscriptions;

CREATE POLICY "Users can view own account subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = account_id OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

CREATE POLICY "Users can insert own account subscription"
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = account_id OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

CREATE POLICY "Users can update own account subscription"
  ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = account_id OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  )
  WITH CHECK (
    auth.uid() = account_id OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

-- 2. subscription_payments policies for users
DROP POLICY IF EXISTS "Users can view own subscription payments" ON public.subscription_payments;
DROP POLICY IF EXISTS "Users can insert own subscription payments" ON public.subscription_payments;
DROP POLICY IF EXISTS "Users can update own subscription payments" ON public.subscription_payments;

CREATE POLICY "Users can view own subscription payments"
  ON public.subscription_payments
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = account_id OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

CREATE POLICY "Users can insert own subscription payments"
  ON public.subscription_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = account_id OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

CREATE POLICY "Users can update own subscription payments"
  ON public.subscription_payments
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = account_id OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  )
  WITH CHECK (
    auth.uid() = account_id OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

-- 3. payment_proofs policies for users
DROP POLICY IF EXISTS "Users can view own payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Users can insert payment proofs" ON public.payment_proofs;

CREATE POLICY "Users can view own payment proofs"
  ON public.payment_proofs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert payment proofs"
  ON public.payment_proofs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. account_context policies for users
DROP POLICY IF EXISTS "Users can manage own account context" ON public.account_context;
CREATE POLICY "Users can manage own account context"
  ON public.account_context
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  )
  WITH CHECK (
    auth.uid() = user_id OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );
