-- RBAC: Invitation RPCs, member management RPCs, RLS policies

-- -----------------------------------------------------------------------------
-- create_workspace_invitation
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_workspace_invitation(
  p_workspace_id UUID,
  p_role_id UUID,
  p_invite_type TEXT DEFAULT 'LINK',
  p_profile_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_expiry_days INTEGER DEFAULT 7
)
RETURNS TABLE(invitation_id UUID, raw_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_token TEXT;
  v_token_hash TEXT;
  v_inv_id UUID;
  v_role_workspace UUID;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;

  IF NOT public.has_workspace_permission(p_workspace_id, 'team.member.invite', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN: missing team.member.invite';
  END IF;

  PERFORM public.assert_workspace_seat_available(p_workspace_id);

  SELECT workspace_id INTO v_role_workspace FROM public.team_roles WHERE id = p_role_id;
  IF v_role_workspace IS NOT NULL AND v_role_workspace != p_workspace_id THEN
    RAISE EXCEPTION 'INVALID_ROLE: role does not belong to workspace';
  END IF;

  IF NOT public.can_assign_team_role(p_workspace_id, p_role_id, v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN: cannot assign role with permissions you do not have';
  END IF;

  v_token := encode(gen_random_bytes(32), 'base64');
  v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');
  v_token_hash := public.hash_invitation_token(v_token);

  INSERT INTO public.workspace_invitations (
    workspace_id, invited_by, email, profile_id, role_id, token_hash,
    invite_type, status, expires_at
  ) VALUES (
    p_workspace_id, v_user, p_email, p_profile_id, p_role_id, v_token_hash,
    p_invite_type, 'pending', NOW() + (p_expiry_days || ' days')::INTERVAL
  )
  RETURNING id INTO v_inv_id;

  PERFORM public.log_activity(
    'member.invite_created', 'workspace_invitation', v_inv_id,
    p_workspace_id, NULL,
    jsonb_build_object('invitation_id', v_inv_id, 'role_id', p_role_id, 'invite_type', p_invite_type)
  );

  RETURN QUERY SELECT v_inv_id, v_token;
END;
$$;

-- -----------------------------------------------------------------------------
-- resolve_invitation_by_token (safe preview)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_invitation_by_token(p_token TEXT)
RETURNS TABLE(
  invitation_id UUID,
  status TEXT,
  workspace_id UUID,
  workspace_name TEXT,
  inviter_name TEXT,
  role_name TEXT,
  role_id UUID,
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  v_hash := public.hash_invitation_token(p_token);

  RETURN QUERY
  SELECT
    wi.id,
    wi.status,
    w.id,
    w.name,
    COALESCE(p.full_name, 'A team member'),
    tr.name,
    tr.id,
    wi.expires_at,
    (wi.expires_at < NOW() OR wi.status = 'expired')
  FROM public.workspace_invitations wi
  JOIN public.workspaces w ON w.id = wi.workspace_id
  JOIN public.team_roles tr ON tr.id = wi.role_id
  LEFT JOIN public.profiles p ON p.id = wi.invited_by
  WHERE wi.token_hash = v_hash;
END;
$$;

-- -----------------------------------------------------------------------------
-- accept_workspace_invitation
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(p_token TEXT)
RETURNS TABLE(workspace_id UUID, member_id UUID, role_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_hash TEXT;
  v_inv RECORD;
  v_member_id UUID;
  v_role_name TEXT;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;

  v_hash := public.hash_invitation_token(p_token);

  SELECT wi.*, tr.name AS role_name_text
  INTO v_inv
  FROM public.workspace_invitations wi
  JOIN public.team_roles tr ON tr.id = wi.role_id
  WHERE wi.token_hash = v_hash
  FOR UPDATE;

  IF v_inv IS NULL THEN RAISE EXCEPTION 'INVALID_INVITATION'; END IF;
  IF v_inv.status = 'revoked' THEN RAISE EXCEPTION 'INVITATION_REVOKED'; END IF;
  IF v_inv.status = 'accepted' THEN RAISE EXCEPTION 'INVITATION_ALREADY_ACCEPTED'; END IF;
  IF v_inv.expires_at < NOW() OR v_inv.status = 'expired' THEN
    UPDATE public.workspace_invitations SET status = 'expired', updated_at = NOW() WHERE id = v_inv.id;
    RAISE EXCEPTION 'INVITATION_EXPIRED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = v_inv.workspace_id AND user_id = v_user AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'ALREADY_MEMBER';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.team_roles WHERE id = v_inv.role_id) THEN
    RAISE EXCEPTION 'ROLE_UNAVAILABLE';
  END IF;

  PERFORM public.assert_workspace_seat_available(v_inv.workspace_id);

  INSERT INTO public.workspace_members (workspace_id, user_id, role_id, role, status, invited_by, joined_at)
  VALUES (
    v_inv.workspace_id, v_user, v_inv.role_id,
    (SELECT CASE lower(name)
      WHEN 'owner' THEN 'owner' WHEN 'admin' THEN 'admin' WHEN 'manager' THEN 'manager'
      WHEN 'leasing agent' THEN 'agent' WHEN 'staff' THEN 'staff' ELSE 'viewer' END
     FROM public.team_roles WHERE id = v_inv.role_id),
    'active', v_inv.invited_by, NOW()
  )
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role_id = EXCLUDED.role_id, role = EXCLUDED.role, status = 'active', joined_at = NOW(), updated_at = NOW()
  RETURNING id INTO v_member_id;

  UPDATE public.workspace_invitations
  SET status = 'accepted', accepted_at = NOW(), accepted_by = v_user, updated_at = NOW()
  WHERE id = v_inv.id;

  PERFORM public.log_activity(
    'member.invite_accepted', 'workspace_member', v_member_id,
    v_inv.workspace_id, NULL,
    jsonb_build_object('invitation_id', v_inv.id, 'role_id', v_inv.role_id)
  );

  v_role_name := v_inv.role_name_text;
  RETURN QUERY SELECT v_inv.workspace_id, v_member_id, v_role_name;
END;
$$;

-- -----------------------------------------------------------------------------
-- add_workspace_member_by_profile_id
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_workspace_member_by_profile_id(
  p_workspace_id UUID,
  p_public_id TEXT,
  p_role_id UUID
)
RETURNS TABLE(member_id UUID, user_id UUID, role_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID;
  v_target_user UUID;
  v_member_id UUID;
  v_role_name TEXT;
  v_role_workspace UUID;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;

  IF NOT public.has_workspace_permission(p_workspace_id, 'team.member.invite', v_caller) THEN
    RAISE EXCEPTION 'FORBIDDEN: missing team.member.invite';
  END IF;

  SELECT id INTO v_target_user FROM public.profiles WHERE public_id = p_public_id;
  IF v_target_user IS NULL THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = v_target_user AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'ALREADY_MEMBER';
  END IF;

  SELECT workspace_id, name INTO v_role_workspace, v_role_name FROM public.team_roles WHERE id = p_role_id;
  IF v_role_workspace IS NOT NULL AND v_role_workspace != p_workspace_id THEN
    RAISE EXCEPTION 'INVALID_ROLE';
  END IF;

  IF NOT public.can_assign_team_role(p_workspace_id, p_role_id, v_caller) THEN
    RAISE EXCEPTION 'FORBIDDEN: cannot assign role';
  END IF;

  PERFORM public.assert_workspace_seat_available(p_workspace_id);

  INSERT INTO public.workspace_members (workspace_id, user_id, role_id, role, status, invited_by, joined_at)
  VALUES (
    p_workspace_id, v_target_user, p_role_id,
    (SELECT CASE lower(name)
      WHEN 'owner' THEN 'owner' WHEN 'admin' THEN 'admin' WHEN 'manager' THEN 'manager'
      WHEN 'leasing agent' THEN 'agent' WHEN 'staff' THEN 'staff' ELSE 'viewer' END
     FROM public.team_roles WHERE id = p_role_id),
    'active', v_caller, NOW()
  )
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role_id = EXCLUDED.role_id, role = EXCLUDED.role, status = 'active', joined_at = NOW(), updated_at = NOW()
  RETURNING id INTO v_member_id;

  PERFORM public.log_activity(
    'member.added', 'workspace_member', v_member_id,
    p_workspace_id, NULL,
    jsonb_build_object('target_user_id', v_target_user, 'role_id', p_role_id)
  );

  RETURN QUERY SELECT v_member_id, v_target_user, v_role_name;
END;
$$;

-- -----------------------------------------------------------------------------
-- revoke_workspace_invitation
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_workspace_invitation(p_invitation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_ws UUID;
BEGIN
  v_user := auth.uid();
  SELECT workspace_id INTO v_ws FROM public.workspace_invitations WHERE id = p_invitation_id;
  IF v_ws IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT public.has_workspace_permission(v_ws, 'team.member.invite', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  UPDATE public.workspace_invitations
  SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
  WHERE id = p_invitation_id AND status = 'pending';
  PERFORM public.log_activity('member.invite_revoked', 'workspace_invitation', p_invitation_id, v_ws, NULL, '{}'::jsonb);
END;
$$;

-- -----------------------------------------------------------------------------
-- change_workspace_member_role
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.change_workspace_member_role(
  p_member_id UUID,
  p_role_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_ws UUID;
  v_old_role_id UUID;
BEGIN
  v_user := auth.uid();
  SELECT workspace_id, role_id INTO v_ws, v_old_role_id
  FROM public.workspace_members WHERE id = p_member_id;

  IF v_ws IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT public.has_workspace_permission(v_ws, 'team.member.update', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF NOT public.can_assign_team_role(v_ws, p_role_id, v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN: cannot assign role';
  END IF;

  UPDATE public.workspace_members
  SET role_id = p_role_id,
      role = (SELECT CASE lower(name)
        WHEN 'owner' THEN 'owner' WHEN 'admin' THEN 'admin' WHEN 'manager' THEN 'manager'
        WHEN 'leasing agent' THEN 'agent' WHEN 'staff' THEN 'staff' ELSE 'viewer' END
       FROM public.team_roles WHERE id = p_role_id),
      updated_at = NOW()
  WHERE id = p_member_id;

  PERFORM public.log_activity('member.role_changed', 'workspace_member', p_member_id, v_ws, NULL,
    jsonb_build_object('previous_role_id', v_old_role_id, 'new_role_id', p_role_id));
END;
$$;

-- -----------------------------------------------------------------------------
-- remove_workspace_member
-- -----------------------------------------------------------------------------
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
  PERFORM public.log_activity('member.removed', 'workspace_member', p_member_id, v_ws, NULL, '{}'::jsonb);
END;
$$;

-- -----------------------------------------------------------------------------
-- suspend_workspace_member
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.suspend_workspace_member(p_member_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_ws UUID;
BEGIN
  v_user := auth.uid();
  SELECT workspace_id INTO v_ws FROM public.workspace_members WHERE id = p_member_id;
  IF v_ws IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT public.has_workspace_permission(v_ws, 'team.member.update', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  UPDATE public.workspace_members SET status = 'suspended', updated_at = NOW() WHERE id = p_member_id;
  PERFORM public.log_activity('member.suspended', 'workspace_member', p_member_id, v_ws, NULL, '{}'::jsonb);
END;
$$;

-- -----------------------------------------------------------------------------
-- get_assignable_team_roles
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_assignable_team_roles(
  p_workspace_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(role_id UUID, name TEXT, description TEXT, is_system_role BOOLEAN, permission_count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
BEGIN
  v_user := COALESCE(p_user_id, auth.uid());
  RETURN QUERY
  SELECT tr.id, tr.name, tr.description, tr.is_system_role,
    (SELECT COUNT(*) FROM public.team_role_permissions trp WHERE trp.role_id = tr.id)
  FROM public.team_roles tr
  WHERE (tr.workspace_id IS NULL OR tr.workspace_id = p_workspace_id)
    AND public.can_assign_team_role(p_workspace_id, tr.id, v_user)
  ORDER BY tr.is_system_role DESC, tr.name;
END;
$$;

-- -----------------------------------------------------------------------------
-- get_role_permissions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_role_permissions(p_role_id UUID)
RETURNS TABLE(key TEXT, name TEXT, resource TEXT, action TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.key, p.name, p.resource, p.action
  FROM public.team_role_permissions trp
  JOIN public.permissions p ON p.id = trp.permission_id
  WHERE trp.role_id = p_role_id AND p.scope = 'TEAM'
  ORDER BY p.resource, p.action;
$$;

-- -----------------------------------------------------------------------------
-- lookup_profile_by_public_id
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lookup_profile_by_public_id(p_public_id TEXT)
RETURNS TABLE(id UUID, public_id TEXT, full_name TEXT, avatar_url TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.public_id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.public_id = p_public_id;
$$;

GRANT EXECUTE ON FUNCTION public.create_workspace_invitation(UUID, UUID, TEXT, UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_invitation_by_token(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_workspace_member_by_profile_id(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_workspace_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_workspace_member_role(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_workspace_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.suspend_workspace_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_assignable_team_roles(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_role_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_profile_by_public_id(TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- permissions: readable by authenticated
CREATE POLICY "permissions_select" ON public.permissions FOR SELECT TO authenticated USING (true);

-- platform roles: admins only for write, authenticated read for platform role viewers
CREATE POLICY "platform_roles_select" ON public.platform_roles FOR SELECT TO authenticated
  USING (public.has_platform_permission('platform_role.view') OR public.is_platform_admin());
CREATE POLICY "platform_role_perms_select" ON public.platform_role_permissions FOR SELECT TO authenticated
  USING (public.has_platform_permission('platform_role.view') OR public.is_platform_admin());
CREATE POLICY "platform_user_roles_select" ON public.platform_user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_platform_permission('user.view') OR public.is_platform_admin());

-- team roles: system roles + workspace custom roles visible to workspace members
CREATE POLICY "team_roles_select" ON public.team_roles FOR SELECT TO authenticated
  USING (
    workspace_id IS NULL
    OR public.can_access_workspace(workspace_id)
    OR public.has_platform_permission('team_role.view')
  );
CREATE POLICY "team_role_perms_select" ON public.team_role_permissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_roles tr
      WHERE tr.id = role_id
        AND (tr.workspace_id IS NULL OR public.can_access_workspace(tr.workspace_id))
    )
  );

-- workspace_invitations: no direct client access (RPC only)
CREATE POLICY "workspace_invitations_deny" ON public.workspace_invitations FOR ALL TO authenticated
  USING (false);

-- Update workspace_members RLS
DROP POLICY IF EXISTS "wsm_select" ON public.workspace_members;
DROP POLICY IF EXISTS "wsm_insert" ON public.workspace_members;
DROP POLICY IF EXISTS "wsm_update" ON public.workspace_members;
DROP POLICY IF EXISTS "wsm_delete" ON public.workspace_members;

CREATE POLICY "wsm_select" ON public.workspace_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_workspace_permission(workspace_id, 'team.member.view')
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
    OR public.has_platform_permission('team.data.view')
  );

CREATE POLICY "wsm_insert" ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (false); -- RPC only

CREATE POLICY "wsm_update" ON public.workspace_members FOR UPDATE TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.member.update')
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  )
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'team.member.update')
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  );

CREATE POLICY "wsm_delete" ON public.workspace_members FOR DELETE TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.member.remove')
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  );

GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT ON public.platform_roles TO authenticated;
GRANT SELECT ON public.platform_role_permissions TO authenticated;
GRANT SELECT ON public.platform_user_roles TO authenticated;
GRANT SELECT ON public.team_roles TO authenticated;
GRANT SELECT ON public.team_role_permissions TO authenticated;
