-- Migration 0071: Enterprise Invoice Engine & Generic Automation Engine
-- 1. Decouples Invoices from strict property requirements (supports standalone billing)
-- 2. Adds normalized line items, multi-currency, snapshots, templates, documents
-- 3. Adds atomic sequence generator function
-- 4. Creates generic, reusable Automation Engine (triggers, conditions, actions, executions)
-- 5. Configures private storage bucket for invoice documents

-- ==========================================
-- 1. UPDATE INVOICES TABLE
-- ==========================================

-- 1.1 Add workspace_id to invoices if not present
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Backfill workspace_id from property if null
UPDATE public.invoices i
SET workspace_id = p.workspace_id
FROM public.properties p
WHERE i.property_id = p.id AND i.workspace_id IS NULL;

-- If any still null, assign to first workspace if exists
UPDATE public.invoices
SET workspace_id = (SELECT id FROM public.workspaces LIMIT 1)
WHERE workspace_id IS NULL;

-- 1.2 Make property_id NULLABLE to support independent invoices
ALTER TABLE public.invoices ALTER COLUMN property_id DROP NOT NULL;

-- Drop dependent composite foreign key from payments table if present
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS fk_payments_invoice_prop;

-- Re-add standard foreign key from payments to invoices
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS fk_payments_invoice_id;
ALTER TABLE public.payments ADD CONSTRAINT fk_payments_invoice_id FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;

-- Drop constraints requiring property_id on invoices
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS uq_invoices_id_property CASCADE;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS fk_invoices_lease_prop;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS fk_invoices_tenant_prop;

-- Add independent foreign keys
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS fk_invoices_lease_id;
ALTER TABLE public.invoices ADD CONSTRAINT fk_invoices_lease_id FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE SET NULL;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS fk_invoices_tenant_id;
ALTER TABLE public.invoices ADD CONSTRAINT fk_invoices_tenant_id FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

-- 1.3 Add accounting, snapshot, and standalone customer fields
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'AUD',
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_address TEXT,
ADD COLUMN IF NOT EXISTS snapshot JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS template_id UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS payment_instructions TEXT,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS billing_period_start DATE,
ADD COLUMN IF NOT EXISTS billing_period_end DATE,
ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- 1.4 Update status check constraint
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'issued', 'viewed', 'paid', 'partially_paid', 'overdue', 'cancelled', 'void'));

CREATE INDEX IF NOT EXISTS idx_invoices_workspace_id ON public.invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_email ON public.invoices(customer_email);

-- ==========================================
-- 2. UPDATE INVOICE_ITEMS TABLE
-- ==========================================
ALTER TABLE public.invoice_items
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
ADD COLUMN IF NOT EXISTS line_total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (line_total >= 0),
ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Backfill line_total if amount exists
UPDATE public.invoice_items
SET line_total = amount
WHERE line_total = 0 AND amount > 0;

-- ==========================================
-- 3. INVOICE SEQUENCES & NUMBER GENERATOR
-- ==========================================
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  prefix TEXT NOT NULL DEFAULT 'INV',
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_invoice_sequence UNIQUE (workspace_id, prefix, year)
);

CREATE INDEX IF NOT EXISTS idx_invoice_sequences_lookup ON public.invoice_sequences(workspace_id, prefix, year);

ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can access sequences"
  ON public.invoice_sequences
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = invoice_sequences.workspace_id AND wm.user_id = auth.uid()
    ) OR public.is_platform_admin()
  );

-- Atomic sequence generator function
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(
  p_workspace_id UUID,
  p_prefix TEXT DEFAULT 'INV',
  p_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_num INT;
  v_formatted TEXT;
BEGIN
  INSERT INTO public.invoice_sequences (workspace_id, prefix, year, last_number, updated_at)
  VALUES (p_workspace_id, p_prefix, p_year, 1, NOW())
  ON CONFLICT (workspace_id, prefix, year)
  DO UPDATE SET
    last_number = public.invoice_sequences.last_number + 1,
    updated_at = NOW()
  RETURNING last_number INTO v_next_num;

  v_formatted := p_prefix || '-' || p_year::TEXT || '-' || LPAD(v_next_num::TEXT, 6, '0');
  RETURN v_formatted;
END;
$$;

-- ==========================================
-- 4. INVOICE TEMPLATES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  layout_style TEXT NOT NULL DEFAULT 'classic' CHECK (layout_style IN ('classic', 'modern', 'minimalist', 'corporate', 'creative', 'elegant', 'monochrome')),
  brand_color TEXT DEFAULT '#22333b',
  accent_color TEXT DEFAULT '#a9927d',
  logo_url TEXT,
  header_text TEXT,
  footer_text TEXT,
  payment_instructions TEXT,
  tax_name TEXT DEFAULT 'GST',
  notes TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_templates_workspace ON public.invoice_templates(workspace_id);

ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view invoice templates"
  ON public.invoice_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = invoice_templates.workspace_id AND wm.user_id = auth.uid()
    ) OR public.is_platform_admin()
  );

CREATE POLICY "Workspace members can manage invoice templates"
  ON public.invoice_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = invoice_templates.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'member')
    ) OR public.is_platform_admin()
  );

-- ==========================================
-- 5. INVOICE DOCUMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.invoice_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('pdf', 'docx')),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_documents_invoice ON public.invoice_documents(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_documents_workspace ON public.invoice_documents(workspace_id);

ALTER TABLE public.invoice_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can access invoice documents"
  ON public.invoice_documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = invoice_documents.workspace_id AND wm.user_id = auth.uid()
    ) OR public.is_platform_admin()
  );

-- ==========================================
-- 6. GENERIC AUTOMATIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('schedule', 'event', 'source')),
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automations_workspace ON public.automations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_automations_is_active ON public.automations(is_active);
CREATE INDEX IF NOT EXISTS idx_automations_next_run ON public.automations(next_run_at);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view automations"
  ON public.automations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = automations.workspace_id AND wm.user_id = auth.uid()
    ) OR public.is_platform_admin()
  );

CREATE POLICY "Workspace members can manage automations"
  ON public.automations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = automations.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'member')
    ) OR public.is_platform_admin()
  );

-- ==========================================
-- 7. AUTOMATION EXECUTIONS (LOGS & IDEMPOTENCY)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  trigger_source TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'skipped')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  result_summary JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_automation_idempotency UNIQUE (automation_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_automation_executions_auto ON public.automation_executions(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_workspace ON public.automation_executions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_status ON public.automation_executions(status);

ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can access automation executions"
  ON public.automation_executions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = automation_executions.workspace_id AND wm.user_id = auth.uid()
    ) OR public.is_platform_admin()
  );

-- ==========================================
-- 8. UPDATE INVOICE RLS POLICIES FOR WORKSPACES
-- ==========================================
-- Allow access to invoices via workspace membership (works for independent invoices too!)
DROP POLICY IF EXISTS "Users can view invoices in authorized properties" ON public.invoices;
CREATE POLICY "Users can view invoices in authorized workspaces or properties"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = invoices.workspace_id AND wm.user_id = auth.uid()
    ) OR
    (invoices.property_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = invoices.property_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.property_members pm
          WHERE pm.property_id = p.id AND pm.user_id = auth.uid() AND pm.status = 'active'
        )
      )
    )) OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can manage invoices in authorized properties" ON public.invoices;
CREATE POLICY "Users can manage invoices in authorized workspaces or properties"
  ON public.invoices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = invoices.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'member')
    ) OR
    (invoices.property_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = invoices.property_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.property_members pm
          WHERE pm.property_id = p.id AND pm.user_id = auth.uid() AND pm.status = 'active' AND pm.role IN ('owner', 'manager', 'agent')
        )
      )
    )) OR
    public.is_platform_admin()
  );

-- Invoice items policy update
DROP POLICY IF EXISTS "Users can view invoice items for authorized properties" ON public.invoice_items;
CREATE POLICY "Users can view invoice items in authorized workspaces"
  ON public.invoice_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.workspace_members wm ON wm.workspace_id = i.workspace_id
      WHERE i.id = invoice_items.invoice_id AND wm.user_id = auth.uid()
    ) OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can manage invoice items for authorized properties" ON public.invoice_items;
CREATE POLICY "Users can manage invoice items in authorized workspaces"
  ON public.invoice_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.workspace_members wm ON wm.workspace_id = i.workspace_id
      WHERE i.id = invoice_items.invoice_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'member')
    ) OR
    public.is_platform_admin()
  );

-- ==========================================
-- 9. CREATE STORAGE BUCKET FOR INVOICE DOCUMENTS
-- ==========================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoice-documents',
  'invoice-documents',
  false,
  15728640, -- 15MB limit
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS policy for service role and authenticated users
DROP POLICY IF EXISTS "Allow authenticated users to read invoice documents" ON storage.objects;
CREATE POLICY "Allow authenticated users to read invoice documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'invoice-documents');

DROP POLICY IF EXISTS "Allow service role full access to invoice documents" ON storage.objects;
CREATE POLICY "Allow service role full access to invoice documents"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'invoice-documents')
  WITH CHECK (bucket_id = 'invoice-documents');
