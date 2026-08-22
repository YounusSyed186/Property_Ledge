-- Migration 0002: Create account_context table for account status and onboarding tracking
CREATE TABLE IF NOT EXISTS public.account_context (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
  onboarding_status TEXT NOT NULL DEFAULT 'completed' CHECK (onboarding_status IN ('not_started', 'in_progress', 'completed')),
  first_login_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for account context queries
CREATE INDEX IF NOT EXISTS idx_account_context_user_id ON public.account_context(user_id);
