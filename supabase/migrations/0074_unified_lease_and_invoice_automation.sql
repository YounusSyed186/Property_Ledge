-- Migration 0074: Unified Lease and Standalone Invoice Automation
-- 1. Adds automation_type column to automations table ('lease' | 'invoice')
-- 2. Adds invoice_template_id column to automations table for invoice reference templates
-- 3. Adds metadata column for standalone customer/recipient and custom configuration
-- 4. Updates indexes and grants

-- 1. Extend Automations Table
ALTER TABLE public.automations
ADD COLUMN IF NOT EXISTS automation_type TEXT DEFAULT 'lease' CHECK (automation_type IN ('lease', 'invoice')),
ADD COLUMN IF NOT EXISTS invoice_template_id UUID REFERENCES public.invoice_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Update existing rows without automation_type based on presence of lease_id
UPDATE public.automations
SET automation_type = CASE WHEN lease_id IS NOT NULL THEN 'lease' ELSE 'invoice' END
WHERE automation_type IS NULL;

-- 3. Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_automations_type ON public.automations(automation_type);
CREATE INDEX IF NOT EXISTS idx_automations_template ON public.automations(invoice_template_id);

-- 4. Ensure table privileges are active
GRANT ALL ON public.automations TO authenticated;
GRANT ALL ON public.automations TO service_role;
GRANT ALL ON public.automation_executions TO authenticated;
GRANT ALL ON public.automation_executions TO service_role;
