DROP POLICY IF EXISTS "Workspace members can view documents" ON public.documents;
DROP POLICY IF EXISTS "Workspace members can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Workspace members can update documents" ON public.documents;
DROP POLICY IF EXISTS "Workspace members can delete documents" ON public.documents;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;

CREATE POLICY "Workspace access can view documents"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_workspace(workspace_id)
    OR public.is_platform_admin()
  );

CREATE POLICY "Workspace access can insert documents"
  ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      public.can_access_workspace(workspace_id)
      AND (
        property_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.properties p
          WHERE p.id = documents.property_id
            AND p.workspace_id = documents.workspace_id
        )
      )
    )
    OR public.is_platform_admin()
  );

CREATE POLICY "Workspace access can update documents"
  ON public.documents
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_workspace(workspace_id)
    OR public.is_platform_admin()
  )
  WITH CHECK (
    (
      public.can_access_workspace(workspace_id)
      AND (
        property_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.properties p
          WHERE p.id = documents.property_id
            AND p.workspace_id = documents.workspace_id
        )
      )
    )
    OR public.is_platform_admin()
  );

CREATE POLICY "Workspace access can delete documents"
  ON public.documents
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_workspace(workspace_id)
    OR public.is_platform_admin()
  );