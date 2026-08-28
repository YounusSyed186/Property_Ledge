-- Fix ambiguous user_id in add_workspace_member_by_profile_id.
-- RETURNS TABLE(member_id, user_id, role_name) shadows workspace_members.user_id in SQL.

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

  SELECT tr.workspace_id, tr.name INTO v_role_workspace, v_role_name
  FROM public.team_roles tr WHERE tr.id = p_role_id;
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
