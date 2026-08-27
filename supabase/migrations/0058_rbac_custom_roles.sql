-- Custom team role CRUD RPCs

CREATE OR REPLACE FUNCTION public.create_workspace_team_role(
  p_workspace_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_permission_keys TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_role_id UUID;
  v_key TEXT;
  v_perm_id UUID;
BEGIN
  v_user := auth.uid();
  IF NOT public.has_workspace_permission(p_workspace_id, 'team.role.create', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  INSERT INTO public.team_roles (workspace_id, name, description, is_system_role, created_by)
  VALUES (p_workspace_id, p_name, p_description, false, v_user)
  RETURNING id INTO v_role_id;

  FOREACH v_key IN ARRAY p_permission_keys LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.get_effective_workspace_permissions(p_workspace_id, v_user) AS perm
      WHERE perm = v_key
    ) THEN
      RAISE EXCEPTION 'FORBIDDEN: cannot grant permission %', v_key;
    END IF;
    SELECT id INTO v_perm_id FROM public.permissions WHERE key = v_key AND scope = 'TEAM';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO public.team_role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  PERFORM public.log_activity('team_role.created', 'team_role', v_role_id, p_workspace_id, NULL,
    jsonb_build_object('name', p_name, 'permission_count', array_length(p_permission_keys, 1)));

  RETURN v_role_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_workspace_team_role(
  p_role_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_permission_keys TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_ws UUID;
  v_key TEXT;
  v_perm_id UUID;
BEGIN
  v_user := auth.uid();
  SELECT workspace_id INTO v_ws FROM public.team_roles WHERE id = p_role_id AND is_system_role = false;
  IF v_ws IS NULL THEN RAISE EXCEPTION 'NOT_FOUND or system role'; END IF;
  IF NOT public.has_workspace_permission(v_ws, 'team.role.update', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.team_roles SET name = p_name, description = p_description, updated_at = NOW()
  WHERE id = p_role_id;

  DELETE FROM public.team_role_permissions WHERE role_id = p_role_id;

  FOREACH v_key IN ARRAY p_permission_keys LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.get_effective_workspace_permissions(v_ws, v_user) AS perm WHERE perm = v_key
    ) THEN
      RAISE EXCEPTION 'FORBIDDEN: cannot grant permission %', v_key;
    END IF;
    SELECT id INTO v_perm_id FROM public.permissions WHERE key = v_key AND scope = 'TEAM';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO public.team_role_permissions (role_id, permission_id) VALUES (p_role_id, v_perm_id);
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_workspace_team_role(p_role_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ws UUID;
  v_member_count INTEGER;
BEGIN
  SELECT workspace_id INTO v_ws FROM public.team_roles WHERE id = p_role_id AND is_system_role = false;
  IF v_ws IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT public.has_workspace_permission(v_ws, 'team.role.delete', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT COUNT(*) INTO v_member_count FROM public.workspace_members WHERE role_id = p_role_id AND status = 'active';
  IF v_member_count > 0 THEN
    RAISE EXCEPTION 'ROLE_IN_USE: % members assigned', v_member_count;
  END IF;

  DELETE FROM public.team_roles WHERE id = p_role_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_team_roles(p_workspace_id UUID)
RETURNS TABLE(
  id UUID, name TEXT, description TEXT, is_system_role BOOLEAN,
  workspace_id UUID, member_count BIGINT, permission_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_workspace_permission(p_workspace_id, 'team.role.view', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
  SELECT
    tr.id, tr.name, tr.description, tr.is_system_role, tr.workspace_id,
    (SELECT COUNT(*) FROM public.workspace_members wm WHERE wm.role_id = tr.id AND wm.status = 'active'),
    (SELECT COUNT(*) FROM public.team_role_permissions trp WHERE trp.role_id = tr.id)
  FROM public.team_roles tr
  WHERE tr.workspace_id IS NULL OR tr.workspace_id = p_workspace_id
  ORDER BY tr.is_system_role DESC, tr.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_workspace_team_role(UUID, TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_workspace_team_role(UUID, TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_workspace_team_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_team_roles(UUID) TO authenticated;
