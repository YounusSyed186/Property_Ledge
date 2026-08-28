-- Sync workspace team members to property_members so managers/agents can see properties.

CREATE OR REPLACE FUNCTION public.map_team_role_to_property_role(p_team_role_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  CASE lower(COALESCE(p_team_role_name, ''))
    WHEN 'owner' THEN RETURN 'manager';
    WHEN 'admin' THEN RETURN 'manager';
    WHEN 'manager' THEN RETURN 'manager';
    WHEN 'leasing agent' THEN RETURN 'agent';
    WHEN 'staff' THEN RETURN 'staff';
    WHEN 'landlord' THEN RETURN 'viewer';
    ELSE RETURN 'viewer';
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_workspace_member_property_access(
  p_workspace_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member RECORD;
  v_property_role TEXT;
BEGIN
  SELECT wm.role_id, tr.name AS role_name
  INTO v_member
  FROM public.workspace_members wm
  LEFT JOIN public.team_roles tr ON tr.id = wm.role_id
  WHERE wm.workspace_id = p_workspace_id
    AND wm.user_id = p_user_id
    AND wm.status = 'active';

  IF v_member IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.has_workspace_permission(p_workspace_id, 'property.view', p_user_id) THEN
    RETURN;
  END IF;

  v_property_role := public.map_team_role_to_property_role(v_member.role_name);

  INSERT INTO public.property_members (property_id, user_id, role, status, joined_at)
  SELECT p.id, p_user_id, v_property_role, 'active', NOW()
  FROM public.properties p
  WHERE p.workspace_id = p_workspace_id
    AND p.status = 'active'
    AND p.owner_id IS DISTINCT FROM p_user_id
  ON CONFLICT (property_id, user_id) DO UPDATE
  SET role = EXCLUDED.role,
      status = 'active',
      updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_workspace_member_property_access(
  p_workspace_id UUID,
  p_user_id UUID,
  p_status TEXT DEFAULT 'removed'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.property_members pm
  SET status = p_status,
      updated_at = NOW()
  FROM public.properties p
  WHERE pm.property_id = p.id
    AND p.workspace_id = p_workspace_id
    AND pm.user_id = p_user_id
    AND p.owner_id IS DISTINCT FROM p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_property_workspace_team_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member RECORD;
BEGIN
  FOR v_member IN
    SELECT wm.user_id
    FROM public.workspace_members wm
    WHERE wm.workspace_id = NEW.workspace_id
      AND wm.status = 'active'
  LOOP
    PERFORM public.sync_workspace_member_property_access(NEW.workspace_id, v_member.user_id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_property_workspace_team_access ON public.properties;
CREATE TRIGGER trg_sync_property_workspace_team_access
  AFTER INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.sync_property_workspace_team_access();

-- Patch team RPCs to sync/revoke property access.

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
#variable_conflict use_column
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

  SELECT p.id INTO v_target_user FROM public.profiles p WHERE p.public_id = p_public_id;
  IF v_target_user IS NULL THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id AND wm.user_id = v_target_user AND wm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'ALREADY_MEMBER';
  END IF;

  SELECT tr.workspace_id, tr.name INTO v_role_workspace, v_role_name FROM public.team_roles tr WHERE tr.id = p_role_id;
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
    (SELECT CASE lower(tr.name)
      WHEN 'owner' THEN 'owner' WHEN 'admin' THEN 'admin' WHEN 'manager' THEN 'manager'
      WHEN 'leasing agent' THEN 'agent' WHEN 'staff' THEN 'staff' ELSE 'viewer' END
     FROM public.team_roles tr WHERE tr.id = p_role_id),
    'active', v_caller, NOW()
  )
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role_id = EXCLUDED.role_id, role = EXCLUDED.role, status = 'active', joined_at = NOW(), updated_at = NOW()
  RETURNING id INTO v_member_id;

  PERFORM public.sync_workspace_member_property_access(p_workspace_id, v_target_user);

  PERFORM public.log_activity(
    p_action := 'member.added',
    p_entity_type := 'workspace_member',
    p_entity_id := v_member_id,
    p_workspace_id := p_workspace_id,
    p_metadata := jsonb_build_object('target_user_id', v_target_user, 'role_id', p_role_id)
  );

  RETURN QUERY SELECT v_member_id, v_target_user, v_role_name;
END;
$$;

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
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = v_inv.workspace_id AND wm.user_id = v_user AND wm.status = 'active'
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

  PERFORM public.sync_workspace_member_property_access(v_inv.workspace_id, v_user);

  PERFORM public.log_activity(
    p_action := 'member.invite_accepted',
    p_entity_type := 'workspace_member',
    p_entity_id := v_member_id,
    p_workspace_id := v_inv.workspace_id,
    p_metadata := jsonb_build_object('invitation_id', v_inv.id, 'role_id', v_inv.role_id)
  );

  v_role_name := v_inv.role_name_text;
  RETURN QUERY SELECT v_inv.workspace_id, v_member_id, v_role_name;
END;
$$;

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
  v_target_user UUID;
  v_old_role_id UUID;
BEGIN
  v_user := auth.uid();
  SELECT wm.workspace_id, wm.user_id, wm.role_id
  INTO v_ws, v_target_user, v_old_role_id
  FROM public.workspace_members wm WHERE wm.id = p_member_id;

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

  PERFORM public.sync_workspace_member_property_access(v_ws, v_target_user);

  PERFORM public.log_activity(
    p_action := 'member.role_changed',
    p_entity_type := 'workspace_member',
    p_entity_id := p_member_id,
    p_workspace_id := v_ws,
    p_metadata := jsonb_build_object('previous_role_id', v_old_role_id, 'new_role_id', p_role_id)
  );
END;
$$;

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
  PERFORM public.revoke_workspace_member_property_access(v_ws, v_target_user, 'removed');

  PERFORM public.log_activity(
    p_action := 'member.removed',
    p_entity_type := 'workspace_member',
    p_entity_id := p_member_id,
    p_workspace_id := v_ws,
    p_metadata := '{}'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.suspend_workspace_member(p_member_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_ws UUID;
  v_target_user UUID;
BEGIN
  v_user := auth.uid();
  SELECT wm.workspace_id, wm.user_id INTO v_ws, v_target_user
  FROM public.workspace_members wm WHERE wm.id = p_member_id;

  IF v_ws IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT public.has_workspace_permission(v_ws, 'team.member.update', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.workspace_members SET status = 'suspended', updated_at = NOW() WHERE id = p_member_id;
  PERFORM public.revoke_workspace_member_property_access(v_ws, v_target_user, 'suspended');

  PERFORM public.log_activity(
    p_action := 'member.suspended',
    p_entity_type := 'workspace_member',
    p_entity_id := p_member_id,
    p_workspace_id := v_ws,
    p_metadata := '{}'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.map_team_role_to_property_role(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_workspace_member_property_access(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_workspace_member_property_access(UUID, UUID, TEXT) TO authenticated, service_role;

-- Backfill existing workspace members.
DO $$
DECLARE
  v_member RECORD;
BEGIN
  FOR v_member IN
    SELECT wm.workspace_id, wm.user_id
    FROM public.workspace_members wm
    WHERE wm.status = 'active'
  LOOP
    PERFORM public.sync_workspace_member_property_access(v_member.workspace_id, v_member.user_id);
  END LOOP;
END;
$$;
