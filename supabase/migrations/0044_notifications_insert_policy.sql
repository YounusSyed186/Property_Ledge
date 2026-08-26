-- Migration 0044: Notifications INSERT policy for property managers
-- Allows workspace/property managers to create notifications for users on their properties.

DROP POLICY IF EXISTS "notif_insert_managers" ON public.notifications;
CREATE POLICY "notif_insert_managers"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR (
      property_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_id
          AND (
            p.owner_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.property_members pm
              WHERE pm.property_id = p.id
                AND pm.user_id = auth.uid()
                AND pm.status = 'active'
                AND pm.role IN ('owner', 'manager', 'agent')
            )
            OR EXISTS (
              SELECT 1 FROM public.workspace_members wm
              WHERE wm.workspace_id = p.workspace_id
                AND wm.user_id = auth.uid()
                AND wm.status = 'active'
                AND wm.role IN ('owner', 'admin', 'manager')
            )
          )
      )
    )
  );

-- Service role inserts (e.g. edge functions) bypass RLS; this policy covers authenticated app users.
