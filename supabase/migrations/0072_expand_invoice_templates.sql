-- Migration 0072: Expand Invoice Templates to full blueprint definitions
-- Supports recurring billing definition, line items, schedule, email delivery, late fees, and lifecycle statuses

ALTER TABLE public.invoice_templates
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'AUD',
ADD COLUMN IF NOT EXISTS invoice_type TEXT NOT NULL DEFAULT 'rent',
ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER NOT NULL DEFAULT 14,
ADD COLUMN IF NOT EXISTS late_fee_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (late_fee_amount >= 0),
ADD COLUMN IF NOT EXISTS late_fee_days INTEGER NOT NULL DEFAULT 0 CHECK (late_fee_days >= 0),
ADD COLUMN IF NOT EXISTS linked_property_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS default_customer_name TEXT,
ADD COLUMN IF NOT EXISTS default_customer_email TEXT,
ADD COLUMN IF NOT EXISTS automation_config JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS email_config JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_invoice_templates_status ON public.invoice_templates(status);
CREATE INDEX IF NOT EXISTS idx_invoice_templates_next_run ON public.invoice_templates(next_run_at);
