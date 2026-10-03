DROP POLICY IF EXISTS "Users can view attachments in their workspace"
  ON public.transaction_attachments;
DROP POLICY IF EXISTS "Users can manage attachments in their workspace"
  ON public.transaction_attachments;
DROP POLICY IF EXISTS "Workspace access can view transaction attachments"
  ON public.transaction_attachments;
DROP POLICY IF EXISTS "Workspace access can manage transaction attachments"
  ON public.transaction_attachments;

GRANT ALL ON public.transaction_attachments TO authenticated, service_role;

CREATE POLICY "Workspace access can view transaction attachments"
  ON public.transaction_attachments
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_workspace(workspace_id)
    OR public.is_platform_admin()
  );

CREATE POLICY "Workspace access can manage transaction attachments"
  ON public.transaction_attachments
  FOR ALL
  TO authenticated
  USING (
    public.can_access_workspace(workspace_id)
    OR public.is_platform_admin()
  )
  WITH CHECK (
    public.can_access_workspace(workspace_id)
    OR public.is_platform_admin()
  );

NOTIFY pgrst, 'reload schema';