-- Migration 0023: Create property_members table
CREATE TABLE IF NOT EXISTS public.property_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'manager', 'agent', 'staff', 'viewer')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_property_members_prop_user UNIQUE (property_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_property_members_prop_id ON public.property_members(property_id);
CREATE INDEX IF NOT EXISTS idx_property_members_user_id ON public.property_members(user_id);
CREATE INDEX IF NOT EXISTS idx_property_members_status ON public.property_members(status);

-- Enable RLS
ALTER TABLE public.property_members ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view property memberships" ON public.property_members;
CREATE POLICY "Users can view property memberships"
  ON public.property_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.property_id = property_id AND pm.user_id = auth.uid() AND pm.status = 'active' AND pm.role IN ('owner', 'admin', 'manager')
    ) OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Property owners can manage members" ON public.property_members;
CREATE POLICY "Property owners can manage members"
  ON public.property_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.property_id = property_id AND pm.user_id = auth.uid() AND pm.status = 'active' AND pm.role IN ('owner', 'admin')
    ) OR
    public.is_platform_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.property_id = property_id AND pm.user_id = auth.uid() AND pm.status = 'active' AND pm.role IN ('owner', 'admin')
    ) OR
    public.is_platform_admin()
  );