-- Migration 0013: Create subscription_payments and payment_proofs for V2 Manual Bank Transfer Flow

-- Drop existing status check constraint on subscriptions and recreate with pending_payment and under_review
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check 
  CHECK (status IN ('draft', 'pending_payment', 'under_review', 'trialing', 'active', 'past_due', 'paused', 'canceled', 'expired'));

-- Create subscription_payments table
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_context(user_id) ON DELETE CASCADE,
  reference TEXT UNIQUE NOT NULL,
  expected_amount NUMERIC(10, 2) NOT NULL,
  submitted_amount NUMERIC(10, 2),
  currency TEXT NOT NULL DEFAULT 'AUD',
  payment_date DATE,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'verified', 'rejected')),
  submitted_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for subscription_payments
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id ON public.subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_account_id ON public.subscription_payments(account_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_reference ON public.subscription_payments(reference);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON public.subscription_payments(status);

-- Create payment_proofs table
CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.subscription_payments(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_preview_url TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for payment_proofs
CREATE INDEX IF NOT EXISTS idx_payment_proofs_payment_id ON public.payment_proofs(payment_id);

-- Enable RLS
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_payments
DROP POLICY IF EXISTS "Users can view own account payments" ON public.subscription_payments;
CREATE POLICY "Users can view own account payments"
  ON public.subscription_payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = account_id);

-- RLS Policies for payment_proofs
DROP POLICY IF EXISTS "Users can view own payment proofs" ON public.payment_proofs;
CREATE POLICY "Users can view own payment proofs"
  ON public.payment_proofs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.subscription_payments p
      WHERE p.id = payment_id AND p.account_id = auth.uid()
    )
  );
