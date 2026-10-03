DROP POLICY IF EXISTS "Workspace members can access automation executions" ON public.automation_executions;
CREATE POLICY "Workspace settings viewers can read automation executions"
  ON public.automation_executions
  FOR SELECT
  TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.settings.view')
    OR public.is_platform_admin()
  );
CREATE POLICY "Workspace settings managers can insert automation executions"
  ON public.automation_executions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  );
CREATE POLICY "Workspace settings managers can update automation executions"
  ON public.automation_executions
  FOR UPDATE
  TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  )
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  );
CREATE POLICY "Workspace settings managers can delete automation executions"
  ON public.automation_executions
  FOR DELETE
  TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Workspace members can delete automations" ON public.automations;
DROP POLICY IF EXISTS "Workspace members can insert automations" ON public.automations;
DROP POLICY IF EXISTS "Workspace members can select automations" ON public.automations;
DROP POLICY IF EXISTS "Workspace members can update automations" ON public.automations;
CREATE POLICY "Workspace settings viewers can read automations"
  ON public.automations
  FOR SELECT
  TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.settings.view')
    OR public.is_platform_admin()
  );
CREATE POLICY "Workspace settings managers can insert automations"
  ON public.automations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  );
CREATE POLICY "Workspace settings managers can update automations"
  ON public.automations
  FOR UPDATE
  TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  )
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  );
CREATE POLICY "Workspace settings managers can delete automations"
  ON public.automations
  FOR DELETE
  TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  );