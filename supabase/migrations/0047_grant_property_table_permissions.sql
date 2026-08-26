-- Grant table-level permissions for property-domain tables (RLS enforces row scope).
-- Without these GRANTs, queries fail with "permission denied for table ...".

-- Auth / account (upsert during onboarding needs INSERT)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.account_context TO authenticated;

-- Workspaces
GRANT SELECT, INSERT, UPDATE ON public.workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;

-- Properties and members
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_members TO authenticated;

-- Core property entities
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lease_tenants TO authenticated;

-- Financial
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;

-- Operations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Recreate workspace policies if missing (idempotent with 0042)
DROP POLICY IF EXISTS "Users can view own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can insert own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "ws_select" ON public.workspaces;
DROP POLICY IF EXISTS "ws_insert" ON public.workspaces;
DROP POLICY IF EXISTS "ws_update" ON public.workspaces;

CREATE POLICY "ws_select"
  ON public.workspaces
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR public.can_access_workspace(id) OR public.is_platform_admin());

CREATE POLICY "ws_insert"
  ON public.workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "ws_update"
  ON public.workspaces
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_platform_admin());
