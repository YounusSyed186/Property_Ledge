-- Migration 0027: Create lease_tenants table
CREATE TABLE IF NOT EXISTS public.lease_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  role TEXT NOT NULL DEFAULT 'primary' CHECK (role IN ('primary', 'co-tenant', 'guarantor')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lease_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_lease_tenants_lease_id ON public.lease_tenants(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_tenants_tenant_id ON public.lease_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lease_tenants_property_id ON public.lease_tenants(property_id);

-- Unique constraint for primary tenant per lease
CREATE UNIQUE INDEX IF NOT EXISTS uq_lease_primary_tenant
  ON public.lease_tenants (lease_id)
  WHERE is_primary = true;

-- Enable RLS
ALTER TABLE public.lease_tenants ENABLE ROW LEVEL SECURITY;

-- Policies - Authorization through lease/property access
DROP POLICY IF EXISTS "Users can view lease tenants in authorized properties" ON public.lease_tenants;
CREATE POLICY "Users can view lease tenants in authorized properties"
  ON public.lease_tenants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leases l
      JOIN public.properties p ON l.property_id = p.id
      WHERE l.id = lease_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.property_members pm
          WHERE pm.property_id = p.id AND pm.user_id = auth.uid() AND pm.status = 'active'
        )
      )
    ) OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can manage lease tenants in authorized properties" ON public.lease_tenants;
CREATE POLICY "Users can manage lease tenants in authorized properties"
  ON public.lease_tenants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leases l
      JOIN public.properties p ON l.property_id = p.id
      WHERE l.id = lease_id AND (
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
      SELECT 1 FROM public.leases l
      JOIN public.properties p ON l.property_id = p.id
      WHERE l.id = lease_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.property_members pm
          WHERE pm.property_id = p.id AND pm.user_id = auth.uid() AND pm.status = 'active' AND pm.role IN ('owner', 'manager', 'agent')
        )
      )
    ) OR
    public.is_platform_admin()
  );