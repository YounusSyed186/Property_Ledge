-- Migration 0009: Create subscription_events table
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.account_context(user_id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('received', 'processed', 'failed')),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for subscription events
CREATE INDEX IF NOT EXISTS idx_subscription_events_account_id ON public.subscription_events(account_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_id ON public.subscription_events(provider_event_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON public.subscription_events(created_at DESC);
