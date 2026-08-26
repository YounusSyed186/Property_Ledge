-- Migration 0018 (V3.1): Users may SELECT own billing rows. Writes are server/admin only.

DROP POLICY IF EXISTS "Users can view own account subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own account subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own account subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription payments" ON public.subscription_payments;
DROP POLICY IF EXISTS "Users can insert own subscription payments" ON public.subscription_payments;
DROP POLICY IF EXISTS "Users can update own subscription payments" ON public.subscription_payments;
DROP POLICY IF EXISTS "Users can view own payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Users can insert payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Users can manage own account context" ON public.account_context;

CREATE POLICY "Users can view own account subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = account_id);

CREATE POLICY "Users can view own subscription payments"
  ON public.subscription_payments FOR SELECT TO authenticated
  USING (auth.uid() = account_id);

CREATE POLICY "Users can view own payment proofs"
  ON public.payment_proofs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.subscription_payments p
      WHERE p.id = payment_id AND p.account_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own payment proofs"
  ON public.payment_proofs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.subscription_payments p
      WHERE p.id = payment_id AND p.account_id = auth.uid()
    )
  );
