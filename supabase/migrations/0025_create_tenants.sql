-- Migration 0025: Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived', 'prospect')),
  date_of_birth DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tenants_id_property UNIQUE (id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON public.tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON public.tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON public.tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view tenants in authorized properties" ON public.tenants;
CREATE POLICY "Users can view tenants in authorized properties"
  ON public.tenants
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
    user_id = auth.uid() OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can manage tenants in authorized properties" ON public.tenants;
CREATE POLICY "Users can manage tenants in authorized properties"
  ON public.tenants
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