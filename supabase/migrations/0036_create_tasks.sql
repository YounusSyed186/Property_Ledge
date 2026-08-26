-- Migration 0036: Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_property_id ON public.tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view tasks in authorized properties" ON public.tasks;
CREATE POLICY "Users can view tasks in authorized properties"
  ON public.tasks
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
    assigned_to = auth.uid() OR
    created_by = auth.uid() OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can manage tasks in authorized properties" ON public.tasks;
CREATE POLICY "Users can manage tasks in authorized properties"
  ON public.tasks
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