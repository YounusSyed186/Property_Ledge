-- Admin configuration RPCs: platform roles, system team roles, role impact, Leasing Agent/Staff demotion

-- -----------------------------------------------------------------------------
-- admin_get_role_impact
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_role_impact(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.has_platform_permission('platform_role.view', auth.uid())
     AND NOT public.has_platform_permission('team_role.view', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_entity_type = 'platform_role' THEN
    SELECT jsonb_build_object(
      'user_count', (SELECT COUNT(*) FROM public.platform_user_roles WHERE role_id = p_entity_id),
      'permission_count', (SELECT COUNT(*) FROM public.platform_role_permissions WHERE role_id = p_entity_id)
    ) INTO v_result;
  ELSIF p_entity_type = 'team_role' THEN
    SELECT jsonb_build_object(
      'member_count', (SELECT COUNT(*) FROM public.workspace_members WHERE role_id = p_entity_id AND status = 'active'),
      'workspace_count', (SELECT COUNT(DISTINCT workspace_id) FROM public.workspace_members WHERE role_id = p_entity_id AND status = 'active'),
      'permission_count', (SELECT COUNT(*) FROM public.team_role_permissions WHERE role_id = p_entity_id)
    ) INTO v_result;
  ELSIF p_entity_type = 'entitlement' THEN
    SELECT jsonb_build_object(
      'plan_count', (SELECT COUNT(*) FROM public.plan_entitlements WHERE entitlement_id = p_entity_id)
    ) INTO v_result;
  ELSE
    RAISE EXCEPTION 'INVALID_ENTITY_TYPE';
  END IF;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- -----------------------------------------------------------------------------
-- admin_upsert_platform_role
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_upsert_platform_role(
  p_role_id UUID,
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
  v_is_system BOOLEAN;
  v_key TEXT;
  v_perm_id UUID;
BEGIN
  v_user := auth.uid();

  IF p_role_id IS NULL THEN
    IF NOT public.has_platform_permission('platform_role.create', v_user) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
    INSERT INTO public.platform_roles (name, description, is_system_role, created_by)
    VALUES (p_name, p_description, false, v_user)
    RETURNING id INTO v_role_id;
  ELSE
    IF NOT public.has_platform_permission('platform_role.update', v_user) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
    SELECT is_system_role INTO v_is_system FROM public.platform_roles WHERE id = p_role_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

    UPDATE public.platform_roles
    SET name = p_name, description = p_description, updated_at = NOW()
    WHERE id = p_role_id;
    v_role_id := p_role_id;

    DELETE FROM public.platform_role_permissions WHERE role_id = p_role_id;
  END IF;

  FOREACH v_key IN ARRAY p_permission_keys LOOP
    SELECT id INTO v_perm_id FROM public.permissions WHERE key = v_key AND scope = 'PLATFORM';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO public.platform_role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN v_role_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- admin_delete_platform_role
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_platform_role(p_role_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_system BOOLEAN;
  v_user_count INTEGER;
BEGIN
  IF NOT public.has_platform_permission('platform_role.delete', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT is_system_role INTO v_is_system FROM public.platform_roles WHERE id = p_role_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_is_system THEN RAISE EXCEPTION 'SYSTEM_ROLE: System roles cannot be deleted'; END IF;

  SELECT COUNT(*) INTO v_user_count FROM public.platform_user_roles WHERE role_id = p_role_id;
  IF v_user_count > 0 THEN
    RAISE EXCEPTION 'ROLE_IN_USE: % users assigned', v_user_count;
  END IF;

  DELETE FROM public.platform_roles WHERE id = p_role_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- admin_update_system_team_role
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_system_team_role(
  p_role_id UUID,
  p_description TEXT,
  p_permission_keys TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
  v_perm_id UUID;
BEGIN
  IF NOT public.has_platform_permission('team_role.update', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.team_roles
    WHERE id = p_role_id AND workspace_id IS NULL AND is_system_role = true
  ) THEN
    RAISE EXCEPTION 'NOT_FOUND or not a system role';
  END IF;

  UPDATE public.team_roles SET description = p_description, updated_at = NOW()
  WHERE id = p_role_id;

  DELETE FROM public.team_role_permissions WHERE role_id = p_role_id;

  FOREACH v_key IN ARRAY p_permission_keys LOOP
    SELECT id INTO v_perm_id FROM public.permissions WHERE key = v_key AND scope = 'TEAM';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO public.team_role_permissions (role_id, permission_id)
      VALUES (p_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- admin_get_platform_roles_with_stats
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_platform_roles_with_stats()
RETURNS TABLE(
  id UUID, name TEXT, description TEXT, is_system_role BOOLEAN,
  permission_count BIGINT, user_count BIGINT, updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_platform_permission('platform_role.view', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
  SELECT
    pr.id, pr.name, pr.description, pr.is_system_role,
    (SELECT COUNT(*) FROM public.platform_role_permissions prp WHERE prp.role_id = pr.id),
    (SELECT COUNT(*) FROM public.platform_user_roles pur WHERE pur.role_id = pr.id),
    pr.updated_at
  FROM public.platform_roles pr
  ORDER BY pr.is_system_role DESC, pr.name;
END;
$$;

-- -----------------------------------------------------------------------------
-- admin_get_system_team_roles_with_stats
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_system_team_roles_with_stats()
RETURNS TABLE(
  id UUID, name TEXT, description TEXT, is_system_role BOOLEAN,
  permission_count BIGINT, member_count BIGINT, workspace_count BIGINT, updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_platform_permission('team_role.view', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
  SELECT
    tr.id, tr.name, tr.description, tr.is_system_role,
    (SELECT COUNT(*) FROM public.team_role_permissions trp WHERE trp.role_id = tr.id),
    (SELECT COUNT(*) FROM public.workspace_members wm WHERE wm.role_id = tr.id AND wm.status = 'active'),
    (SELECT COUNT(DISTINCT wm.workspace_id) FROM public.workspace_members wm WHERE wm.role_id = tr.id AND wm.status = 'active'),
    tr.updated_at
  FROM public.team_roles tr
  WHERE tr.workspace_id IS NULL AND tr.is_system_role = true
  ORDER BY tr.name;
END;
$$;

-- -----------------------------------------------------------------------------
-- Demote Leasing Agent & Staff from global system roles to workspace custom roles
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_role_name TEXT;
  v_old_role_id UUID;
  v_new_role_id UUID;
  v_ws UUID;
BEGIN
  FOREACH v_role_name IN ARRAY ARRAY['Leasing Agent', 'Staff'] LOOP
    SELECT id INTO v_old_role_id
    FROM public.team_roles
    WHERE workspace_id IS NULL AND lower(name) = lower(v_role_name);

    IF v_old_role_id IS NULL THEN CONTINUE; END IF;

    FOR v_ws IN
      SELECT DISTINCT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.role_id = v_old_role_id AND wm.status = 'active'
    LOOP
      SELECT id INTO v_new_role_id
      FROM public.team_roles
      WHERE workspace_id = v_ws AND lower(name) = lower(v_role_name);

      IF v_new_role_id IS NULL THEN
        INSERT INTO public.team_roles (workspace_id, name, description, is_system_role)
        SELECT v_ws, tr.name, tr.description, false
        FROM public.team_roles tr WHERE tr.id = v_old_role_id
        RETURNING id INTO v_new_role_id;

        INSERT INTO public.team_role_permissions (role_id, permission_id)
        SELECT v_new_role_id, trp.permission_id
        FROM public.team_role_permissions trp
        WHERE trp.role_id = v_old_role_id
        ON CONFLICT DO NOTHING;
      END IF;

      UPDATE public.workspace_members
      SET role_id = v_new_role_id
      WHERE role_id = v_old_role_id AND workspace_id = v_ws;
    END LOOP;

    -- Reassign pending invitations per workspace
    FOR v_ws IN
      SELECT DISTINCT wi.workspace_id
      FROM public.workspace_invitations wi
      WHERE wi.role_id = v_old_role_id AND wi.status = 'pending'
    LOOP
      SELECT id INTO v_new_role_id
      FROM public.team_roles
      WHERE workspace_id = v_ws AND lower(name) = lower(v_role_name);

      IF v_new_role_id IS NULL THEN
        INSERT INTO public.team_roles (workspace_id, name, description, is_system_role)
        SELECT v_ws, tr.name, tr.description, false
        FROM public.team_roles tr WHERE tr.id = v_old_role_id
        RETURNING id INTO v_new_role_id;

        INSERT INTO public.team_role_permissions (role_id, permission_id)
        SELECT v_new_role_id, trp.permission_id
        FROM public.team_role_permissions trp
        WHERE trp.role_id = v_old_role_id
        ON CONFLICT DO NOTHING;
      END IF;

      UPDATE public.workspace_invitations
      SET role_id = v_new_role_id
      WHERE role_id = v_old_role_id AND workspace_id = v_ws AND status = 'pending';
    END LOOP;

    DELETE FROM public.team_role_permissions WHERE role_id = v_old_role_id;
    DELETE FROM public.team_roles WHERE id = v_old_role_id;
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_get_role_impact(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_platform_role(UUID, TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_platform_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_system_team_role(UUID, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_platform_roles_with_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_system_team_roles_with_stats() TO authenticated;
