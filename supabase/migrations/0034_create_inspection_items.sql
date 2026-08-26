-- Migration 0034: Create inspection_items table
CREATE TABLE IF NOT EXISTS public.inspection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed', 'needs_attention')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection_id ON public.inspection_items(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_items_status ON public.inspection_items(status);

-- Enable RLS
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view inspection items for authorized properties" ON public.inspection_items;
CREATE POLICY "Users can view inspection items for authorized properties"
  ON public.inspection_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.properties p ON i.property_id = p.id
      WHERE i.id = inspection_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.property_members pm
          WHERE pm.property_id = p.id AND pm.user_id = auth.uid() AND pm.status = 'active'
        )
      )
    ) OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can manage inspection items for authorized properties" ON public.inspection_items;
CREATE POLICY "Users can manage inspection items for authorized properties"
  ON public.inspection_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.properties p ON i.property_id = p.id
      WHERE i.id = inspection_id AND (
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
      SELECT 1 FROM public.inspections i
      JOIN public.properties p ON i.property_id = p.id
      WHERE i.id = inspection_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.property_members pm
          WHERE pm.property_id = p.id AND pm.user_id = auth.uid() AND pm.status = 'active' AND pm.role IN ('owner', 'manager', 'agent')
        )
      )
    ) OR
    public.is_platform_admin()
  );