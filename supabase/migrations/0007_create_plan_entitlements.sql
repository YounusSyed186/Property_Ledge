-- Migration 0007: Create plan_entitlements junction table
CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  entitlement_id UUID NOT NULL REFERENCES public.entitlements(id) ON DELETE CASCADE,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_plan_entitlement UNIQUE (plan_id, entitlement_id)
);

-- Indexes for plan_entitlements queries
CREATE INDEX IF NOT EXISTS idx_plan_entitlements_plan_id ON public.plan_entitlements(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_entitlements_entitlement_id ON public.plan_entitlements(entitlement_id);
