-- Migration 0075: Invoice to Automation Traceability
-- Adds automation_id foreign key to public.invoices table for end-to-end traceability

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS automation_id UUID REFERENCES public.automations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_automation_id ON public.invoices(automation_id);
