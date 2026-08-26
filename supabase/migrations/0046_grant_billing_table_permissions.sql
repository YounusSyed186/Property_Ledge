-- Grant table-level permissions for billing tables (RLS enforces row scope).
-- Without these GRANTs, queries fail with "permission denied for table subscriptions".

REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.subscription_payments FROM authenticated, anon;

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT SELECT ON public.subscription_payments TO authenticated;
GRANT SELECT, INSERT ON public.payment_proofs TO authenticated;
GRANT SELECT ON public.entitlements TO authenticated;
GRANT SELECT ON public.plan_entitlements TO authenticated;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

-- Ensure user can read own subscription (idempotent with 0042 subs_select_own)
DROP POLICY IF EXISTS "Users can view own account subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "subs_select_own" ON public.subscriptions;

CREATE POLICY "subs_select_own"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = account_id OR public.is_platform_admin());

DROP POLICY IF EXISTS "Public and users can view active subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "plans_select_active" ON public.subscription_plans;

CREATE POLICY "plans_select_active"
  ON public.subscription_plans
  FOR SELECT
  TO authenticated
  USING (status = 'active' OR public.is_platform_admin());

DROP POLICY IF EXISTS "Users can view own subscription payments" ON public.subscription_payments;
DROP POLICY IF EXISTS "subpay_select_own" ON public.subscription_payments;

CREATE POLICY "subpay_select_own"
  ON public.subscription_payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = account_id OR public.is_platform_admin());
