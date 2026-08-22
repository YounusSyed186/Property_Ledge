-- Migration 0012: Enable RLS and security policies for Phase 2 tables

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public and users can view active subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Authenticated users can view entitlements" ON public.entitlements;
DROP POLICY IF EXISTS "Authenticated users can view plan entitlements" ON public.plan_entitlements;
DROP POLICY IF EXISTS "Users can view own account subscription" ON public.subscriptions;

-- subscription_plans policies
CREATE POLICY "Public and users can view active subscription plans"
  ON public.subscription_plans
  FOR SELECT
  USING (status = 'active' OR auth.role() = 'service_role');

-- entitlements policies
CREATE POLICY "Authenticated users can view entitlements"
  ON public.entitlements
  FOR SELECT
  TO authenticated
  USING (true);

-- plan_entitlements policies
CREATE POLICY "Authenticated users can view plan entitlements"
  ON public.plan_entitlements
  FOR SELECT
  TO authenticated
  USING (true);

-- subscriptions policies
CREATE POLICY "Users can view own account subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = account_id);
