-- Property INSERT can fail when RETURNING cannot pass SELECT RLS.
-- Also consolidate duplicate INSERT policies from partial migrations.

CREATE OR REPLACE FUNCTION public.user_owns_or_member_workspace(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = p_workspace_id
      AND (
        w.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.workspace_members wm
          WHERE wm.workspace_id = w.id
            AND wm.user_id = (SELECT auth.uid())
            AND wm.status = 'active'
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_owns_or_member_workspace(UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can view authorized properties" ON public.properties;
DROP POLICY IF EXISTS "prop_select" ON public.properties;

CREATE POLICY "prop_select"
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR public.can_access_property(id)
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can insert properties in their workspace" ON public.properties;
DROP POLICY IF EXISTS "Users can insert properties in their org" ON public.properties;
DROP POLICY IF EXISTS "prop_insert" ON public.properties;

CREATE POLICY "prop_insert"
  ON public.properties
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND public.user_owns_or_member_workspace(workspace_id)
  );

-- Allow property owner membership bootstrap from trigger
DROP POLICY IF EXISTS "pm_insert" ON public.property_members;
DROP POLICY IF EXISTS "Property owners can insert members" ON public.property_members;

CREATE POLICY "pm_insert"
  ON public.property_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR public.owns_property(property_id)
    OR public.can_write_property(property_id, 'team.manage_members')
    OR EXISTS (
      SELECT 1
      FROM public.properties p
      WHERE p.id = property_id
        AND p.owner_id = (SELECT auth.uid())
    )
  );
