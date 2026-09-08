-- Migration 0073: Lease-Centric Automation V2 Extensions & Permissions
-- 1. Adds lease_id foreign key to automations table
-- 2. Adds schedule_type, schedule_config, and status lifecycle state to automations
-- 3. Adds lease_id and execution_type to automation_executions log table
-- 4. Adds indexes for fast cron execution queries
-- 5. Grants table privileges and updates RLS policies for automations

-- 1. Extend Automations Table
ALTER TABLE public.automations
ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS schedule_type TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS schedule_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed'));

-- Create indexes for fast lookup and cron evaluation
CREATE INDEX IF NOT EXISTS idx_automations_lease_id ON public.automations(lease_id);
CREATE INDEX IF NOT EXISTS idx_automations_status_next_run ON public.automations(status, next_run_at) WHERE status = 'active';

-- 2. Extend Automation Executions Table
ALTER TABLE public.automation_executions
ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS execution_type TEXT DEFAULT 'scheduled' CHECK (execution_type IN ('scheduled', 'manual'));

CREATE INDEX IF NOT EXISTS idx_automation_executions_lease ON public.automation_executions(lease_id);

-- 3. Table Level Grants for Authenticated and Service Roles
GRANT ALL ON public.automations TO authenticated;
GRANT ALL ON public.automations TO service_role;
GRANT ALL ON public.automation_executions TO authenticated;
GRANT ALL ON public.automation_executions TO service_role;

-- 4. Enable & Refresh RLS Policies
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view automations" ON public.automations;
DROP POLICY IF EXISTS "Workspace members can manage automations" ON public.automations;
DROP POLICY IF EXISTS "Workspace members can select automations" ON public.automations;
DROP POLICY IF EXISTS "Workspace members can insert automations" ON public.automations;
DROP POLICY IF EXISTS "Workspace members can update automations" ON public.automations;
DROP POLICY IF EXISTS "Workspace members can delete automations" ON public.automations;

CREATE POLICY "Workspace members can select automations"
  ON public.automations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = automations.workspace_id AND wm.user_id = auth.uid()
    ) OR public.is_platform_admin()
  );

CREATE POLICY "Workspace members can insert automations"
  ON public.automations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = automations.workspace_id AND wm.user_id = auth.uid()
    ) OR public.is_platform_admin()
  );

CREATE POLICY "Workspace members can update automations"
  ON public.automations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = automations.workspace_id AND wm.user_id = auth.uid()
    ) OR public.is_platform_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = automations.workspace_id AND wm.user_id = auth.uid()
    ) OR public.is_platform_admin()
  );

CREATE POLICY "Workspace members can delete automations"
  ON public.automations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = automations.workspace_id AND wm.user_id = auth.uid()
    ) OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Workspace members can access automation executions" ON public.automation_executions;
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
