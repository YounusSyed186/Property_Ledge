-- ====================================================================
-- RLS Policy and Composite Index Optimization
-- Migration: 20260923000000_optimize_rls_and_indexes.sql
-- Description:
--   1. Adds composite indexes on high-frequency query patterns:
--      - invoices(workspace_id, created_at DESC)
--      - invoices(workspace_id, status)
--      - properties(workspace_id, status)
--   2. Optimizes RLS policy on invoices to eliminate ::text casting on UUID columns,
--      allowing PostgreSQL B-tree index scans on workspace_members(user_id)
--      and properties(owner_id).
-- ====================================================================

DO $$
BEGIN
  -- 1. Composite Indexes
  IF to_regclass('public.invoices') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoices_ws_created ON public.invoices (workspace_id, created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoices_ws_status ON public.invoices (workspace_id, status)';
  END IF;

  IF to_regclass('public.properties') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_properties_ws_status ON public.properties (workspace_id, status)';
  END IF;

  IF to_regclass('public.workspace_invitations') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workspace_invitations_ws_status ON public.workspace_invitations (workspace_id, status)';
  END IF;

  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_subscriptions_acc_status ON public.subscriptions (account_id, status)';
  END IF;

  -- 2. Optimize RLS on Invoices (Remove ::text casting on native UUID columns)
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'invoices' AND policyname = 'Users can view invoices in authorized workspaces or properties'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view invoices in authorized workspaces or properties" ON public.invoices';
    EXECUTE $policy$
      CREATE POLICY "Users can view invoices in authorized workspaces or properties" ON public.invoices
        FOR SELECT
        TO authenticated
        USING (
          (EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = invoices.workspace_id
              AND wm.user_id = auth.uid()
          ))
          OR
          (property_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.properties p
            WHERE p.id = invoices.property_id
              AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                  SELECT 1 FROM public.property_members pm
                  WHERE pm.property_id = p.id
                    AND pm.user_id = auth.uid()
                    AND pm.status = 'active'
                )
              )
          ))
          OR public.is_platform_admin()
        );
    $policy$;
  END IF;

  -- 3. Optimize RLS on Workspace Members (Remove ::text casting, reorder fast-path checks)
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workspace_members' AND policyname = 'wsm_select'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "wsm_select" ON public.workspace_members';
    EXECUTE $policy$
      CREATE POLICY "wsm_select" ON public.workspace_members
        FOR SELECT
        TO authenticated
        USING (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.workspaces w
            WHERE w.id = workspace_members.workspace_id
              AND w.owner_id = auth.uid()
          )
          OR public.has_workspace_permission(workspace_id, 'team.member.view')
          OR public.has_platform_permission('team.data.view')
        );
    $policy$;
  END IF;

END $$;

