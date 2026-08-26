-- Migration 0017: Comprehensive Admin RLS permissions for Phase 2 tables

-- Helper policy definitions for admin write and view access

-- profiles admin view policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_admin()
  );

-- account_context admin view policy
DROP POLICY IF EXISTS "Admins can view all account contexts" ON public.account_context;
CREATE POLICY "Admins can view all account contexts"
  ON public.account_context
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_admin()
  );

-- subscription_plans admin write policy
DROP POLICY IF EXISTS "Admins can manage subscription plans" ON public.subscription_plans;
CREATE POLICY "Admins can manage subscription plans"
  ON public.subscription_plans
  FOR ALL
  TO authenticated
  USING (
    public.is_platform_admin()
  )
  WITH CHECK (
    public.is_platform_admin()
  );

-- entitlements admin write policy
DROP POLICY IF EXISTS "Admins can manage entitlements" ON public.entitlements;
CREATE POLICY "Admins can manage entitlements"
  ON public.entitlements
  FOR ALL
  TO authenticated
  USING (
    public.is_platform_admin()
  )
  WITH CHECK (
    public.is_platform_admin()
  );

-- plan_entitlements admin write policy
DROP POLICY IF EXISTS "Admins can manage plan entitlements" ON public.plan_entitlements;
CREATE POLICY "Admins can manage plan entitlements"
  ON public.plan_entitlements
  FOR ALL
  TO authenticated
  USING (
    public.is_platform_admin()
  )
  WITH CHECK (
    public.is_platform_admin()
  );

-- subscriptions admin access policy
DROP POLICY IF EXISTS "Admins can view and manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can view and manage all subscriptions"
  ON public.subscriptions
  FOR ALL
  TO authenticated
  USING (
    public.is_platform_admin()
  )
  WITH CHECK (
    public.is_platform_admin()
  );

-- subscription_payments admin access policy
DROP POLICY IF EXISTS "Admins can view and manage all subscription payments" ON public.subscription_payments;
CREATE POLICY "Admins can view and manage all subscription payments"
  ON public.subscription_payments
  FOR ALL
  TO authenticated
  USING (
    public.is_platform_admin()
  )
  WITH CHECK (
    public.is_platform_admin()
  );

-- payment_proofs admin access policy
DROP POLICY IF EXISTS "Admins can view all payment proofs" ON public.payment_proofs;
CREATE POLICY "Admins can view all payment proofs"
  ON public.payment_proofs
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_admin()
  );

-- admin_audit_logs admin access policy
DROP POLICY IF EXISTS "Admins can view and insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view and insert audit logs"
  ON public.admin_audit_logs
  FOR ALL
  TO authenticated
  USING (
    public.is_platform_admin()
  )
  WITH CHECK (
    public.is_platform_admin()
  );

-- subscription_events admin access policy
DROP POLICY IF EXISTS "Admins can view subscription events" ON public.subscription_events;
CREATE POLICY "Admins can view subscription events"
  ON public.subscription_events
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_admin()
  );
