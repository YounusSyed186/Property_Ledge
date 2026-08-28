-- Fix log_activity parameter order: workspace_id before property_id.
-- Migration 0042 defined (entity_id, property_id, workspace_id) but RBAC RPCs
-- pass (entity_id, workspace_id, property_id), causing workspace UUIDs to be
-- checked as properties ("Forbidden: no access to property").
--
-- PostgreSQL cannot rename parameters via CREATE OR REPLACE, so drop first.

DROP FUNCTION IF EXISTS public.log_activity(TEXT, TEXT, UUID, UUID, UUID, JSONB);

CREATE FUNCTION public.log_activity(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_workspace_id UUID DEFAULT NULL,
  p_property_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_property_id IS NOT NULL AND NOT public.can_access_property(p_property_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden: no access to property';
  END IF;
  IF p_workspace_id IS NOT NULL AND NOT public.can_access_workspace(p_workspace_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden: no access to workspace';
  END IF;

  INSERT INTO public.activity_logs (workspace_id, property_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (p_workspace_id, p_property_id, auth.uid(), p_action, p_entity_type, p_entity_id, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_activity(TEXT, TEXT, UUID, UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_activity(TEXT, TEXT, UUID, UUID, UUID, JSONB) TO authenticated, service_role;

-- Patch team RPC to use named log_activity args (safe with any parameter order).
CREATE OR REPLACE FUNCTION public.remove_workspace_member(p_member_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_ws UUID;
  v_target_user UUID;
  v_owner_id UUID;
BEGIN
  v_user := auth.uid();
  SELECT wm.workspace_id, wm.user_id INTO v_ws, v_target_user
  FROM public.workspace_members wm WHERE wm.id = p_member_id;
  SELECT owner_id INTO v_owner_id FROM public.workspaces WHERE id = v_ws;

  IF v_ws IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_target_user = v_owner_id THEN RAISE EXCEPTION 'CANNOT_REMOVE_OWNER'; END IF;
  IF NOT public.has_workspace_permission(v_ws, 'team.member.remove', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.workspace_members SET status = 'removed', updated_at = NOW() WHERE id = p_member_id;
  PERFORM public.log_activity(
    p_action := 'member.removed',
    p_entity_type := 'workspace_member',
    p_entity_id := p_member_id,
    p_workspace_id := v_ws,
    p_metadata := '{}'::jsonb
  );
END;
$$;
