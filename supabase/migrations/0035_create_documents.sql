-- Migration 0035: Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('lease_agreement', 'inspection_report', 'insurance', 'council_notice', 'invoice', 'receipt', 'property_document', 'tenant_document', 'other')),
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_docs_lease_prop FOREIGN KEY (lease_id, property_id) REFERENCES public.leases(id, property_id) ON DELETE SET NULL,
  CONSTRAINT fk_docs_tenant_prop FOREIGN KEY (tenant_id, property_id) REFERENCES public.tenants(id, property_id) ON DELETE SET NULL,
  CONSTRAINT fk_docs_unit_prop FOREIGN KEY (unit_id, property_id) REFERENCES public.units(id, property_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_property_id ON public.documents(property_id);
CREATE INDEX IF NOT EXISTS idx_documents_unit_id ON public.documents(unit_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_lease_id ON public.documents(lease_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view documents in authorized properties" ON public.documents;
CREATE POLICY "Users can view documents in authorized properties"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.property_members pm
          WHERE pm.property_id = p.id AND pm.user_id = auth.uid() AND pm.status = 'active'
        )
      )
    ) OR
    uploaded_by = auth.uid() OR
    tenant_id IN (
      SELECT id FROM public.tenants WHERE user_id = auth.uid()
    ) OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can manage documents in authorized properties" ON public.documents;
CREATE POLICY "Users can manage documents in authorized properties"
  ON public.documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.property_members pm
          WHERE pm.property_id = p.id AND pm.user_id = auth.uid() AND pm.status = 'active' AND pm.role IN ('owner', 'manager', 'agent')
        )
      )
    ) OR
    public.is_platform_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.property_members pm
          WHERE pm.property_id = p.id AND pm.user_id = auth.uid() AND pm.status = 'active' AND pm.role IN ('owner', 'manager', 'agent')
        )
      )
    ) OR
    public.is_platform_admin()
  );