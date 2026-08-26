-- Migration 0016: Create email_events table to track email log state
CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for email events
CREATE INDEX IF NOT EXISTS idx_email_events_recipient ON public.email_events(recipient);
CREATE INDEX IF NOT EXISTS idx_email_events_status ON public.email_events(status);
CREATE INDEX IF NOT EXISTS idx_email_events_created_at ON public.email_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Policies for email_events
DROP POLICY IF EXISTS "Admins can view all email events" ON public.email_events;
CREATE POLICY "Admins can view all email events"
  ON public.email_events
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can view own email events" ON public.email_events;
CREATE POLICY "Users can view own email events"
  ON public.email_events
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = recipient
  );
