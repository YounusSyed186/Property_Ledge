-- Fix property INSERT RLS for onboarding: use direct workspace ownership check
-- instead of can_access_workspace() which can fail in SECURITY DEFINER context.

DROP POLICY IF EXISTS "Users can insert properties in their workspace" ON public.properties;
DROP POLICY IF EXISTS "Users can insert properties in their org" ON public.properties;
DROP POLICY IF EXISTS "prop_insert" ON public.properties;

CREATE POLICY "prop_insert"
  ON public.properties
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND (
      EXISTS (
        SELECT 1
        FROM public.workspaces w
        WHERE w.id = workspace_id
          AND w.owner_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1
        FROM public.workspace_members wm
        WHERE wm.workspace_id = workspace_id
          AND wm.user_id = (SELECT auth.uid())
          AND wm.status = 'active'
      )
      OR public.is_platform_admin()
    )
  );

-- Harden can_access_workspace for callers that still use it
CREATE OR REPLACE FUNCTION public.can_access_workspace(p_workspace_id UUID)
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

GRANT EXECUTE ON FUNCTION public.can_access_workspace(UUID) TO authenticated, service_role;
