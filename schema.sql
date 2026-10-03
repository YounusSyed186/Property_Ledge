-- ====================================================================
-- PropertyLedge Database Schema
-- Generated: 2026-09-15T19:22:30.696Z
-- Project: oyupwjqrctcszmgzsurf.supabase.co
-- ====================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- Default Privileges & Schema Settings
-- --------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLES TO "service_role";


-- ====================================================================
-- FUNCTIONS & STORED PROCEDURES
-- ====================================================================

-- Function: accept_workspace_invitation
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation (
  p_token text
)
  RETURNS TABLE (
    workspace_id uuid,
    member_id    uuid,
    role_name    text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."accept_workspace_invitation"(text) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: add_workspace_member_by_profile_id
CREATE OR REPLACE FUNCTION public.add_workspace_member_by_profile_id (
  p_workspace_id uuid,
  p_public_id    text,
  p_role_id      uuid
)
  RETURNS TABLE (
    member_id uuid,
    user_id   uuid,
    role_name text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."add_workspace_member_by_profile_id"(uuid, text, uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: admin_delete_platform_role
CREATE OR REPLACE FUNCTION public.admin_delete_platform_role (
  p_role_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_delete_platform_role"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: admin_get_platform_roles_with_stats
CREATE OR REPLACE FUNCTION public.admin_get_platform_roles_with_stats()
  RETURNS TABLE (
    id               uuid,
    name             text,
    description      text,
    is_system_role   boolean,
    permission_count bigint,
    user_count       bigint,
    updated_at       timestamp with time zone
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_get_platform_roles_with_stats"() TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: admin_get_role_impact
CREATE OR REPLACE FUNCTION public.admin_get_role_impact (
  p_entity_type text,
  p_entity_id   uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_get_role_impact"(text, uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: admin_get_system_team_roles_with_stats
CREATE OR REPLACE FUNCTION public.admin_get_system_team_roles_with_stats()
  RETURNS TABLE (
    id               uuid,
    name             text,
    description      text,
    is_system_role   boolean,
    permission_count bigint,
    member_count     bigint,
    workspace_count  bigint,
    updated_at       timestamp with time zone
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_get_system_team_roles_with_stats"() TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: admin_update_system_team_role
CREATE OR REPLACE FUNCTION public.admin_update_system_team_role (
  p_role_id         uuid,
  p_description     text,
  p_permission_keys text[]
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_update_system_team_role"(uuid, text, text[]) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: admin_upsert_platform_role
CREATE OR REPLACE FUNCTION public.admin_upsert_platform_role (
  p_role_id         uuid,
  p_name            text,
  p_description     text,
  p_permission_keys text[]
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_upsert_platform_role"(uuid, text, text, text[]) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: assert_workspace_seat_available
CREATE OR REPLACE FUNCTION public.assert_workspace_seat_available (
  p_workspace_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_current INTEGER;
  v_limit INTEGER;
BEGIN
  v_current := public.count_workspace_seats(p_workspace_id);
  v_limit := public.get_workspace_seat_limit(p_workspace_id);
  IF v_current >= v_limit THEN
    RAISE EXCEPTION 'SEAT_LIMIT_EXCEEDED: Workspace has reached its team member limit (% of %)', v_current, v_limit;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."assert_workspace_seat_available"(uuid) TO PUBLIC, "postgres", "service_role";


-- Function: auth_is_service_role
CREATE OR REPLACE FUNCTION public.auth_is_service_role()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SET search_path TO 'public'
  AS $function$
  SELECT COALESCE(auth.role(), '') = 'service_role';
$function$;

GRANT EXECUTE ON FUNCTION "public"."auth_is_service_role"() TO PUBLIC, "postgres", "service_role";


-- Function: can_access_organization
CREATE OR REPLACE FUNCTION public.can_access_organization (
  p_organization_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT public.can_access_workspace(p_organization_id);
$function$;

GRANT EXECUTE ON FUNCTION "public"."can_access_organization"(uuid) TO PUBLIC, "postgres", "service_role";


-- Function: can_access_property
CREATE OR REPLACE FUNCTION public.can_access_property (
  p_property_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT public.owns_property(p_property_id) OR EXISTS (
    SELECT 1 FROM public.property_members
    WHERE property_id = p_property_id AND user_id = auth.uid() AND status = 'active'
  );
$function$;

GRANT EXECUTE ON FUNCTION "public"."can_access_property"(uuid) TO PUBLIC, "postgres", "service_role";


-- Function: can_access_workspace
CREATE OR REPLACE FUNCTION public.can_access_workspace (
  p_workspace_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."can_access_workspace"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: can_assign_team_role
CREATE OR REPLACE FUNCTION public.can_assign_team_role (
  p_workspace_id uuid,
  p_role_id      uuid,
  p_assigner_id  uuid DEFAULT NULL::uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_assigner UUID;
  v_role_workspace UUID;
BEGIN
  v_assigner := COALESCE(p_assigner_id, auth.uid());
  IF v_assigner IS NULL THEN RETURN FALSE; END IF;

  SELECT workspace_id INTO v_role_workspace FROM public.team_roles WHERE id = p_role_id;
  IF v_role_workspace IS NOT NULL AND v_role_workspace != p_workspace_id THEN
    RETURN FALSE;
  END IF;

  -- Every permission in target role must be held by assigner
  RETURN NOT EXISTS (
    SELECT 1
    FROM public.team_role_permissions trp
    JOIN public.permissions p ON p.id = trp.permission_id
    WHERE trp.role_id = p_role_id
      AND p.scope = 'TEAM'
      AND p.key NOT IN (
        SELECT perm FROM public.get_effective_workspace_permissions(p_workspace_id, v_assigner) AS perm
      )
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."can_assign_team_role"(uuid, uuid, uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: can_write_property
CREATE OR REPLACE FUNCTION public.can_write_property (
  p_property_id uuid,
  p_permission  text
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT public.is_platform_admin() OR public.owns_property(p_property_id)
      OR public.has_property_permission(p_property_id, p_permission);
$function$;

GRANT EXECUTE ON FUNCTION "public"."can_write_property"(uuid, text) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: change_workspace_member_role
CREATE OR REPLACE FUNCTION public.change_workspace_member_role (
  p_member_id uuid,
  p_role_id   uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."change_workspace_member_role"(uuid, uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: count_workspace_custom_roles
CREATE OR REPLACE FUNCTION public.count_workspace_custom_roles (
  p_workspace_id uuid
)
  RETURNS integer
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT COUNT(*)::INTEGER
  FROM public.team_roles
  WHERE workspace_id = p_workspace_id AND is_system_role = false;
$function$;

GRANT EXECUTE ON FUNCTION "public"."count_workspace_custom_roles"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: count_workspace_seats
CREATE OR REPLACE FUNCTION public.count_workspace_seats (
  p_workspace_id uuid
)
  RETURNS integer
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT (
    (SELECT COUNT(*)::INTEGER FROM public.workspace_members
     WHERE workspace_id = p_workspace_id AND status = 'active')
    +
    (SELECT COUNT(*)::INTEGER FROM public.workspace_invitations
     WHERE workspace_id = p_workspace_id AND status = 'pending' AND expires_at > NOW())
  );
$function$;

GRANT EXECUTE ON FUNCTION "public"."count_workspace_seats"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: create_workspace_invitation
CREATE OR REPLACE FUNCTION public.create_workspace_invitation (
  p_workspace_id uuid,
  p_role_id      uuid,
  p_invite_type  text    DEFAULT 'LINK'::text,
  p_profile_id   uuid    DEFAULT NULL::uuid,
  p_email        text    DEFAULT NULL::text,
  p_expiry_days  integer DEFAULT 7
)
  RETURNS TABLE (
    invitation_id uuid,
    raw_token     text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."create_workspace_invitation"(uuid, uuid, text, uuid, text, integer) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: create_workspace_team_role
CREATE OR REPLACE FUNCTION public.create_workspace_team_role (
  p_workspace_id    uuid,
  p_name            text,
  p_description     text,
  p_permission_keys text[]
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."create_workspace_team_role"(uuid, text, text, text[]) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: current_user_id
CREATE OR REPLACE FUNCTION public.current_user_id()
  RETURNS uuid
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  RETURN auth.uid();
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."current_user_id"() TO PUBLIC, "postgres", "service_role";


-- Function: delete_workspace_team_role
CREATE OR REPLACE FUNCTION public.delete_workspace_team_role (
  p_role_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."delete_workspace_team_role"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: enforce_property_owner_in_workspace
CREATE OR REPLACE FUNCTION public.enforce_property_owner_in_workspace()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = NEW.workspace_id AND (
      w.owner_id = NEW.owner_id OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = NEW.workspace_id AND wm.user_id = NEW.owner_id AND wm.status = 'active'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Property owner must belong to the workspace';
  END IF;
  RETURN NEW;
END; $function$;

GRANT EXECUTE ON FUNCTION "public"."enforce_property_owner_in_workspace"() TO PUBLIC, "postgres", "service_role";


-- Function: enforce_rent_payment_lifecycle
CREATE OR REPLACE FUNCTION public.enforce_rent_payment_lifecycle()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF public.auth_is_service_role() OR public.is_platform_admin() THEN RETURN NEW; END IF;
  IF NEW.property_id IS DISTINCT FROM OLD.property_id OR NEW.invoice_id IS DISTINCT FROM OLD.invoice_id
     OR NEW.lease_id IS DISTINCT FROM OLD.lease_id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Forbidden: payment ownership fields are not client-writable';
  END IF;
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF OLD.status = 'pending' AND NEW.status IN ('completed','failed') THEN RETURN NEW; END IF;
  IF OLD.status = 'failed' AND NEW.status = 'pending' THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Forbidden: invalid payment status transition % → %', OLD.status, NEW.status;
END; $function$;

GRANT EXECUTE ON FUNCTION "public"."enforce_rent_payment_lifecycle"() TO PUBLIC, "postgres", "service_role";


-- Function: ensure_single_current_subscription
CREATE OR REPLACE FUNCTION public.ensure_single_current_subscription()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF NEW.status IN ('trialing','active','past_due','paused') THEN
    UPDATE public.subscriptions SET status = 'expired', updated_at = NOW()
    WHERE account_id = NEW.account_id AND id IS DISTINCT FROM NEW.id
      AND status IN ('trialing','active','past_due','paused');
  ELSIF NEW.status IN ('pending_payment','under_review') THEN
    UPDATE public.subscriptions SET status = 'canceled', canceled_at = COALESCE(canceled_at, NOW()), updated_at = NOW()
    WHERE account_id = NEW.account_id AND id IS DISTINCT FROM NEW.id
      AND status IN ('pending_payment','under_review');
  END IF;
  RETURN NEW;
END; $function$;

GRANT EXECUTE ON FUNCTION "public"."ensure_single_current_subscription"() TO PUBLIC, "postgres", "service_role";


-- Function: ensure_workspace_owner_membership
CREATE OR REPLACE FUNCTION public.ensure_workspace_owner_membership (
  p_workspace_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_owner_id UUID;
  v_owner_role_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id FROM public.workspaces WHERE id = p_workspace_id;
  IF v_owner_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_owner_role_id
  FROM public.team_roles
  WHERE workspace_id IS NULL AND lower(name) = 'owner'
  LIMIT 1;

  IF v_owner_role_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.workspace_members (
    workspace_id, user_id, role_id, role, status, joined_at
  ) VALUES (
    p_workspace_id, v_owner_id, v_owner_role_id, 'owner', 'active', NOW()
  )
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role_id = v_owner_role_id,
      role = 'owner',
      status = 'active',
      joined_at = COALESCE(public.workspace_members.joined_at, NOW()),
      updated_at = NOW();
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."ensure_workspace_owner_membership"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: generate_profile_public_id
CREATE OR REPLACE FUNCTION public.generate_profile_public_id()
  RETURNS text
  LANGUAGE plpgsql
  AS $function$
DECLARE
  v_id TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_id := 'PL-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE public_id = v_id) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."generate_profile_public_id"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";


-- Function: get_assignable_team_roles
CREATE OR REPLACE FUNCTION public.get_assignable_team_roles (
  p_workspace_id uuid,
  p_user_id      uuid DEFAULT NULL::uuid
)
  RETURNS TABLE (
    role_id          uuid,
    name             text,
    description      text,
    is_system_role   boolean,
    permission_count bigint
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_assignable_team_roles"(uuid, uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: get_effective_workspace_permissions
CREATE OR REPLACE FUNCTION public.get_effective_workspace_permissions (
  p_workspace_id uuid,
  p_user_id      uuid DEFAULT NULL::uuid
)
  RETURNS SETOF text
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user UUID;
  v_role_id UUID;
BEGIN
  v_user := COALESCE(p_user_id, auth.uid());
  IF v_user IS NULL THEN RETURN; END IF;

  -- Platform admin with team.data.view gets all TEAM permissions for workspace
  IF public.has_platform_permission('team.data.view', v_user)
     OR public.has_platform_permission('team.admin_access', v_user) THEN
    RETURN QUERY SELECT key FROM public.permissions WHERE scope = 'TEAM';
    RETURN;
  END IF;

  SELECT wm.role_id INTO v_role_id
  FROM public.workspace_members wm
  WHERE wm.workspace_id = p_workspace_id
    AND wm.user_id = v_user
    AND wm.status = 'active';

  IF v_role_id IS NULL THEN
    -- Workspace owner without membership row still gets owner role permissions
    IF EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p_workspace_id AND w.owner_id = v_user) THEN
      SELECT tr.id INTO v_role_id
      FROM public.team_roles tr
      WHERE tr.is_system_role = true AND lower(tr.name) = 'owner'
      LIMIT 1;
    END IF;
  END IF;

  IF v_role_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT p.key
  FROM public.team_role_permissions trp
  JOIN public.permissions p ON p.id = trp.permission_id
  WHERE trp.role_id = v_role_id AND p.scope = 'TEAM';
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_effective_workspace_permissions"(uuid, uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: get_next_invoice_number
CREATE OR REPLACE FUNCTION public.get_next_invoice_number (
  p_workspace_id uuid,
  p_prefix       text    DEFAULT 'INV'::text,
  p_year         integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  v_next_num INT;
  v_formatted TEXT;
BEGIN
  INSERT INTO public.invoice_sequences (workspace_id, prefix, year, last_number, updated_at)
  VALUES (p_workspace_id, p_prefix, p_year, 1, NOW())
  ON CONFLICT (workspace_id, prefix, year)
  DO UPDATE SET
    last_number = public.invoice_sequences.last_number + 1,
    updated_at = NOW()
  RETURNING last_number INTO v_next_num;

  v_formatted := p_prefix || '-' || p_year::TEXT || '-' || LPAD(v_next_num::TEXT, 6, '0');
  RETURN v_formatted;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_next_invoice_number"(uuid, text, integer) TO PUBLIC, "postgres", "service_role";


-- Function: get_role_permissions
CREATE OR REPLACE FUNCTION public.get_role_permissions (
  p_role_id uuid
)
  RETURNS TABLE (
    key      text,
    name     text,
    resource text,
    action   text
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT p.key, p.name, p.resource, p.action
  FROM public.team_role_permissions trp
  JOIN public.permissions p ON p.id = trp.permission_id
  WHERE trp.role_id = p_role_id AND p.scope = 'TEAM'
  ORDER BY p.resource, p.action;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_role_permissions"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: get_user_accessible_organization_ids
CREATE OR REPLACE FUNCTION public.get_user_accessible_organization_ids (
  p_user_id uuid DEFAULT NULL::uuid
)
  RETURNS SETOF uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT public.get_user_accessible_workspace_ids(p_user_id);
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_user_accessible_organization_ids"(uuid) TO PUBLIC, "postgres", "service_role";


-- Function: get_user_accessible_property_ids
CREATE OR REPLACE FUNCTION public.get_user_accessible_property_ids (
  p_user_id uuid DEFAULT NULL::uuid
)
  RETURNS SETOF uuid
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE v_user UUID := COALESCE(p_user_id, auth.uid());
BEGIN
  IF v_user IS NULL THEN RETURN; END IF;
  IF v_user IS DISTINCT FROM auth.uid() AND NOT public.auth_is_service_role() AND NOT public.is_platform_admin() THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.id FROM public.properties p WHERE p.owner_id = v_user AND p.status = 'active'
  UNION
  SELECT pm.property_id FROM public.property_members pm
  JOIN public.properties p ON pm.property_id = p.id
  WHERE pm.user_id = v_user AND pm.status = 'active' AND p.status = 'active';
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_user_accessible_property_ids"(uuid) TO PUBLIC, "postgres", "service_role";


-- Function: get_user_accessible_workspace_ids
CREATE OR REPLACE FUNCTION public.get_user_accessible_workspace_ids (
  p_user_id uuid DEFAULT NULL::uuid
)
  RETURNS SETOF uuid
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE v_user UUID := COALESCE(p_user_id, auth.uid());
BEGIN
  IF v_user IS NULL THEN RETURN; END IF;
  IF v_user IS DISTINCT FROM auth.uid() AND NOT public.auth_is_service_role() AND NOT public.is_platform_admin() THEN RETURN; END IF;
  RETURN QUERY
  SELECT w.id FROM public.workspaces w WHERE w.owner_id = v_user AND w.status = 'active'
  UNION
  SELECT wm.workspace_id FROM public.workspace_members wm
  JOIN public.workspaces w ON wm.workspace_id = w.id
  WHERE wm.user_id = v_user AND wm.status = 'active' AND w.status = 'active';
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_user_accessible_workspace_ids"(uuid) TO PUBLIC, "postgres", "service_role";


-- Function: get_workspace_pending_invitations
CREATE OR REPLACE FUNCTION public.get_workspace_pending_invitations (
  p_workspace_id uuid
)
  RETURNS TABLE (
    id           uuid,
    role_name    text,
    invite_type  text,
    status       text,
    expires_at   timestamp with time zone,
    created_at   timestamp with time zone,
    inviter_name text
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF NOT public.has_workspace_permission(p_workspace_id, 'team.member.view') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
  SELECT
    wi.id,
    tr.name,
    wi.invite_type,
    wi.status,
    wi.expires_at,
    wi.created_at,
    COALESCE(p.full_name, 'Unknown')
  FROM public.workspace_invitations wi
  JOIN public.team_roles tr ON tr.id = wi.role_id
  LEFT JOIN public.profiles p ON p.id = wi.invited_by
  WHERE wi.workspace_id = p_workspace_id
    AND wi.status = 'pending'
  ORDER BY wi.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_workspace_pending_invitations"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: get_workspace_seat_limit
CREATE OR REPLACE FUNCTION public.get_workspace_seat_limit (
  p_workspace_id uuid
)
  RETURNS integer
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_owner_id UUID;
  v_limit INTEGER;
BEGIN
  SELECT owner_id INTO v_owner_id FROM public.workspaces WHERE id = p_workspace_id;
  IF v_owner_id IS NULL THEN RETURN 0; END IF;

  SELECT (pe.value::TEXT)::INTEGER INTO v_limit
  FROM public.subscriptions s
  JOIN public.plan_entitlements pe ON pe.plan_id = s.plan_id
  JOIN public.entitlements e ON e.id = pe.entitlement_id
  WHERE s.account_id = v_owner_id
    AND s.status IN ('active', 'trialing')
    AND e.key = 'team_members.max'
  ORDER BY s.created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_limit, 1);
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_workspace_seat_limit"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: get_workspace_team_roles
CREATE OR REPLACE FUNCTION public.get_workspace_team_roles (
  p_workspace_id uuid
)
  RETURNS TABLE (
    id               uuid,
    name             text,
    description      text,
    is_system_role   boolean,
    workspace_id     uuid,
    member_count     bigint,
    permission_count bigint
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_workspace_team_roles"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  INSERT INTO public.account_context (user_id, status, onboarding_status, created_at, updated_at)
  VALUES (
    NEW.id,
    'active',
    'not_started',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "postgres", "service_role";


-- Function: has_platform_permission
CREATE OR REPLACE FUNCTION public.has_platform_permission (
  p_permission_key text,
  p_user_id        uuid DEFAULT NULL::uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user UUID;
BEGIN
  v_user := COALESCE(p_user_id, auth.uid());
  IF v_user IS NULL THEN RETURN FALSE; END IF;

  -- Legacy platform_admins compatibility
  IF EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = v_user AND status = 'active') THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.platform_user_roles pur
    JOIN public.platform_role_permissions prp ON prp.role_id = pur.role_id
    JOIN public.permissions p ON p.id = prp.permission_id
    WHERE pur.user_id = v_user AND p.key = p_permission_key AND p.scope = 'PLATFORM'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."has_platform_permission"(text, uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: has_property_permission
CREATE OR REPLACE FUNCTION public.has_property_permission (
  p_property_id uuid,
  p_permission  text,
  p_user_id     uuid DEFAULT NULL::uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE v_owner UUID; v_role TEXT; v_user UUID;
BEGIN
  v_user := COALESCE(p_user_id, auth.uid());
  IF v_user IS NULL THEN RETURN FALSE; END IF;
  IF v_user IS DISTINCT FROM auth.uid() AND NOT public.auth_is_service_role() AND NOT public.is_platform_admin() THEN
    RETURN FALSE;
  END IF;
  SELECT owner_id INTO v_owner FROM public.properties WHERE id = p_property_id;
  IF v_owner IS NULL THEN RETURN FALSE; END IF;
  IF v_owner = v_user THEN RETURN TRUE; END IF;
  SELECT role INTO v_role FROM public.property_members
  WHERE property_id = p_property_id AND user_id = v_user AND status = 'active';
  IF v_role IS NULL THEN RETURN FALSE; END IF;
  CASE p_permission
    WHEN 'property.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'property.update' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'property.delete' THEN RETURN v_role = 'owner';
    WHEN 'team.invite' THEN RETURN v_role IN ('owner','manager');
    WHEN 'team.manage_members' THEN RETURN v_role IN ('owner','manager');
    WHEN 'team.remove' THEN RETURN v_role IN ('owner','manager');
    WHEN 'team.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'tenant.create' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'tenant.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'tenant.update' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'lease.create' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'lease.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'lease.update' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'financial.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'financial.manage' THEN RETURN v_role IN ('owner','manager');
    WHEN 'maintenance.create' THEN RETURN v_role IN ('owner','manager','agent','staff');
    WHEN 'maintenance.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'maintenance.manage' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'inspection.create' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'inspection.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'document.create' THEN RETURN v_role IN ('owner','manager','agent','staff');
    WHEN 'document.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'task.create' THEN RETURN v_role IN ('owner','manager','agent','staff');
    WHEN 'task.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'reports.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    ELSE RETURN FALSE;
  END CASE;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."has_property_permission"(uuid, text, uuid) TO PUBLIC, "postgres", "service_role";


-- Function: has_workspace_permission
CREATE OR REPLACE FUNCTION public.has_workspace_permission (
  p_workspace_id   uuid,
  p_permission_key text,
  p_user_id        uuid DEFAULT NULL::uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user UUID;
BEGIN
  v_user := COALESCE(p_user_id, auth.uid());
  IF v_user IS NULL THEN RETURN FALSE; END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.get_effective_workspace_permissions(p_workspace_id, v_user) AS perm
    WHERE perm = p_permission_key
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."has_workspace_permission"(uuid, text, uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: hash_invitation_token
CREATE OR REPLACE FUNCTION public.hash_invitation_token (
  p_token text
)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  AS $function$
  SELECT encode(sha256(p_token::bytea), 'hex');
$function$;

GRANT EXECUTE ON FUNCTION "public"."hash_invitation_token"(text) TO PUBLIC, "postgres", "service_role";


-- Function: is_platform_admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  IF EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid() AND status = 'active') THEN
    RETURN TRUE;
  END IF;
  RETURN public.has_platform_permission('team.admin_access');
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."is_platform_admin"() TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: log_activity
CREATE OR REPLACE FUNCTION public.log_activity (
  p_action       text,
  p_entity_type  text,
  p_entity_id    uuid  DEFAULT NULL::uuid,
  p_workspace_id uuid  DEFAULT NULL::uuid,
  p_property_id  uuid  DEFAULT NULL::uuid,
  p_metadata     jsonb DEFAULT '{}'::jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."log_activity"(text, text, uuid, uuid, uuid, jsonb) TO "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."log_activity"(text, text, uuid, uuid, uuid, jsonb) FROM PUBLIC;


-- Function: lookup_profile_by_public_id
CREATE OR REPLACE FUNCTION public.lookup_profile_by_public_id (
  p_public_id text
)
  RETURNS TABLE (
    id         uuid,
    public_id  text,
    full_name  text,
    avatar_url text
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT p.id, p.public_id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.public_id = p_public_id;
$function$;

GRANT EXECUTE ON FUNCTION "public"."lookup_profile_by_public_id"(text) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: map_team_role_to_property_role
CREATE OR REPLACE FUNCTION public.map_team_role_to_property_role (
  p_team_role_name text
)
  RETURNS text
  LANGUAGE plpgsql
  IMMUTABLE
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."map_team_role_to_property_role"(text) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: owns_property
CREATE OR REPLACE FUNCTION public.owns_property (
  p_property_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT EXISTS (SELECT 1 FROM public.properties WHERE id = p_property_id AND owner_id = auth.uid());
$function$;

GRANT EXECUTE ON FUNCTION "public"."owns_property"(uuid) TO PUBLIC, "postgres", "service_role";


-- Function: owns_subscription_payment
CREATE OR REPLACE FUNCTION public.owns_subscription_payment (
  p_payment_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscription_payments WHERE id = p_payment_id AND account_id = auth.uid()
  );
$function$;

GRANT EXECUTE ON FUNCTION "public"."owns_subscription_payment"(uuid) TO PUBLIC, "postgres", "service_role";


-- Function: payment_id_from_storage_path
CREATE OR REPLACE FUNCTION public.payment_id_from_storage_path (
  p_name text
)
  RETURNS uuid
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE part1 TEXT; part2 TEXT; candidate TEXT;
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' THEN RETURN NULL; END IF;
  part1 := split_part(p_name, '/', 1); part2 := split_part(p_name, '/', 2);
  IF part2 IS NULL OR part2 = '' THEN RETURN NULL; END IF;
  IF part1 = 'receipts' THEN
    IF split_part(p_name, '/', 3) = '' THEN RETURN NULL; END IF;
    candidate := part2;
  ELSE candidate := part1; END IF;
  BEGIN RETURN candidate::uuid; EXCEPTION WHEN invalid_text_representation THEN RETURN NULL; END;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."payment_id_from_storage_path"(text) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: prevent_activity_log_modification
CREATE OR REPLACE FUNCTION public.prevent_activity_log_modification()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
BEGIN
  -- Allow service_role, postgres, supabase_admin, or admin context
  IF (SELECT current_user) IN ('postgres', 'service_role', 'supabase_admin') OR public.auth_is_service_role() THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Allow setting foreign keys to NULL during parent entity deletion
  IF TG_OP = 'UPDATE' AND (
    (OLD.property_id IS NOT NULL AND NEW.property_id IS NULL) OR
    (OLD.workspace_id IS NOT NULL AND NEW.workspace_id IS NULL)
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Forbidden: Activity logs are append-only and cannot be updated or deleted';
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."prevent_activity_log_modification"() TO PUBLIC, "postgres", "service_role";


-- Function: protect_account_context_fields
CREATE OR REPLACE FUNCTION public.protect_account_context_fields()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF public.auth_is_service_role() OR public.is_platform_admin() THEN NEW.updated_at := NOW(); RETURN NEW; END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.first_login_at IS DISTINCT FROM OLD.first_login_at
     OR NEW.last_login_at IS DISTINCT FROM OLD.last_login_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Forbidden: account_context server fields are not client-writable';
  END IF;
  NEW.updated_at := NOW(); RETURN NEW;
END; $function$;

GRANT EXECUTE ON FUNCTION "public"."protect_account_context_fields"() TO PUBLIC, "postgres", "service_role";


-- Function: protect_child_property_id
CREATE OR REPLACE FUNCTION public.protect_child_property_id()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.property_id IS DISTINCT FROM OLD.property_id
     AND NOT public.auth_is_service_role() AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden: property_id cannot be changed by clients';
  END IF;
  RETURN NEW;
END; $function$;

GRANT EXECUTE ON FUNCTION "public"."protect_child_property_id"() TO PUBLIC, "postgres", "service_role";


-- Function: protect_created_by
CREATE OR REPLACE FUNCTION public.protect_created_by()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF public.auth_is_service_role() OR public.is_platform_admin() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid();
    ELSIF NEW.created_by IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Forbidden: created_by must equal the authenticated user';
    END IF;
  ELSIF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Forbidden: created_by is immutable';
  END IF;
  RETURN NEW;
END; $function$;

GRANT EXECUTE ON FUNCTION "public"."protect_created_by"() TO PUBLIC, "postgres", "service_role";


-- Function: protect_notifications_read_state
CREATE OR REPLACE FUNCTION public.protect_notifications_read_state()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF public.auth_is_service_role() OR public.is_platform_admin() THEN RETURN NEW; END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.property_id IS DISTINCT FROM OLD.property_id
     OR NEW.type IS DISTINCT FROM OLD.type OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.message IS DISTINCT FROM OLD.message OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Forbidden: only notification read_at may be updated by clients';
  END IF;
  RETURN NEW;
END; $function$;

GRANT EXECUTE ON FUNCTION "public"."protect_notifications_read_state"() TO PUBLIC, "postgres", "service_role";


-- Function: protect_platform_admins_mutations
CREATE OR REPLACE FUNCTION public.protect_platform_admins_mutations()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF public.auth_is_service_role() OR current_user IN ('postgres','supabase_admin') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'Forbidden: platform_admins may only be changed via service_role';
END; $function$;

GRANT EXECUTE ON FUNCTION "public"."protect_platform_admins_mutations"() TO PUBLIC, "postgres", "service_role";


-- Function: protect_subscription_payment_client
CREATE OR REPLACE FUNCTION public.protect_subscription_payment_client()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF public.auth_is_service_role() OR public.is_platform_admin() THEN RETURN COALESCE(NEW, OLD); END IF;
  RAISE EXCEPTION 'Forbidden: subscription_payments may only be mutated by trusted server/admin paths';
END; $function$;

GRANT EXECUTE ON FUNCTION "public"."protect_subscription_payment_client"() TO PUBLIC, "postgres", "service_role";


-- Function: receipt_payment_id_from_path
CREATE OR REPLACE FUNCTION public.receipt_payment_id_from_path (
  p_name text
)
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SET search_path TO 'public'
  AS $function$
  SELECT public.payment_id_from_storage_path(p_name);
$function$;

GRANT EXECUTE ON FUNCTION "public"."receipt_payment_id_from_path"(text) TO PUBLIC, "postgres", "service_role";


-- Function: record_payment_and_allocate_rpc
CREATE OR REPLACE FUNCTION public.record_payment_and_allocate_rpc (
  p_workspace_id    uuid,
  p_property_id     uuid,
  p_amount          numeric,
  p_payment_date    date,
  p_payment_method  text,
  p_lease_id        uuid    DEFAULT NULL::uuid,
  p_tenant_id       uuid    DEFAULT NULL::uuid,
  p_reference       text    DEFAULT NULL::text,
  p_notes           text    DEFAULT NULL::text,
  p_allocations     jsonb   DEFAULT '[]'::jsonb,
  p_idempotency_key text    DEFAULT NULL::text,
  p_user_id         uuid    DEFAULT NULL::uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user_id UUID;
  v_payment_id UUID;
  v_tx_id UUID;
  v_alloc_item JSONB;
  v_alloc_amount NUMERIC(12, 2);
  v_total_allocated NUMERIC(12, 2) := 0;
  v_rent_period_id UUID;
  v_invoice_id UUID;
  v_inv_total NUMERIC(12, 2);
  v_inv_paid NUMERIC(12, 2);
  v_inv_bal NUMERIC(12, 2);
  v_rp_due NUMERIC(12, 2);
  v_existing_payment_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- 1. Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_payment_id
    FROM public.payments
    WHERE workspace_id = p_workspace_id AND idempotency_key = p_idempotency_key;
    
    IF v_existing_payment_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent', true,
        'payment_id', v_existing_payment_id
      );
    END IF;
  END IF;

  -- 2. Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero.';
  END IF;

  -- Normalize allocations parameter (supports JSONB array, stringified array, or null)
  IF p_allocations IS NOT NULL AND jsonb_typeof(p_allocations) = 'string' THEN
    BEGIN
      p_allocations := (p_allocations #>> '{}')::JSONB;
    EXCEPTION WHEN OTHERS THEN
      p_allocations := '[]'::JSONB;
    END;
  END IF;
  IF p_allocations IS NULL OR jsonb_typeof(p_allocations) != 'array' THEN
    p_allocations := '[]'::JSONB;
  END IF;

  -- 3. Calculate total allocated and validate targets
  IF jsonb_array_length(p_allocations) > 0 THEN
    FOR v_alloc_item IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
      v_alloc_amount := (v_alloc_item->>'amount')::NUMERIC(12, 2);
      IF v_alloc_amount <= 0 THEN
        RAISE EXCEPTION 'Allocation amount must be greater than zero.';
      END IF;
      v_total_allocated := v_total_allocated + v_alloc_amount;
    END LOOP;

    IF v_total_allocated > p_amount THEN
      RAISE EXCEPTION 'Total allocated amount (%) exceeds payment amount (%).', v_total_allocated, p_amount;
    END IF;
  END IF;

  -- 4. Insert Payment record
  INSERT INTO public.payments (
    workspace_id,
    property_id,
    lease_id,
    tenant_id,
    amount,
    payment_date,
    payment_method,
    status,
    reference,
    notes,
    idempotency_key,
    created_by
  ) VALUES (
    p_workspace_id,
    p_property_id,
    p_lease_id,
    p_tenant_id,
    p_amount,
    p_payment_date,
    p_payment_method,
    'completed',
    p_reference,
    p_notes,
    p_idempotency_key,
    v_user_id
  ) RETURNING id INTO v_payment_id;

  -- 5. Process Allocations
  IF jsonb_array_length(p_allocations) > 0 THEN
    FOR v_alloc_item IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
      v_alloc_amount := (v_alloc_item->>'amount')::NUMERIC(12, 2);
      v_rent_period_id := NULLIF(v_alloc_item->>'rent_period_id', '')::UUID;
      v_invoice_id := NULLIF(v_alloc_item->>'invoice_id', '')::UUID;

      -- Insert allocation
      INSERT INTO public.payment_allocations (
        payment_id,
        rent_period_id,
        invoice_id,
        amount_allocated,
        allocated_by
      ) VALUES (
        v_payment_id,
        v_rent_period_id,
        v_invoice_id,
        v_alloc_amount,
        v_user_id
      );

      -- Update invoice if present (with row lock)
      IF v_invoice_id IS NOT NULL THEN
        SELECT total_amount, COALESCE(paid_amount, 0), balance_due
        INTO v_inv_total, v_inv_paid, v_inv_bal
        FROM public.invoices
        WHERE id = v_invoice_id
        FOR UPDATE;

        UPDATE public.invoices
        SET 
          paid_amount = LEAST(v_inv_total, v_inv_paid + v_alloc_amount),
          balance_due = GREATEST(0, v_inv_bal - v_alloc_amount),
          status = CASE 
            WHEN (v_inv_bal - v_alloc_amount) <= 0 THEN 'paid'
            ELSE 'partially_paid'
          END,
          updated_at = NOW()
        WHERE id = v_invoice_id;
      END IF;

      -- Update rent_period if present (with row lock)
      IF v_rent_period_id IS NOT NULL THEN
        SELECT amount_due INTO v_rp_due
        FROM public.rent_periods
        WHERE id = v_rent_period_id
        FOR UPDATE;

        -- Sum total allocations for this rent period
        SELECT COALESCE(SUM(amount_allocated), 0) INTO v_alloc_amount
        FROM public.payment_allocations
        WHERE rent_period_id = v_rent_period_id;

        UPDATE public.rent_periods
        SET 
          status = CASE 
            WHEN v_alloc_amount >= v_rp_due THEN 'paid'
            WHEN v_alloc_amount > 0 THEN 'partially_paid'
            ELSE status
          END,
          updated_at = NOW()
        WHERE id = v_rent_period_id;
      END IF;
    END LOOP;
  END IF;

  -- 6. Insert normalized Ledger transaction (Single credit for full bank receipt)
  INSERT INTO public.transactions (
    workspace_id,
    property_id,
    lease_id,
    transaction_date,
    transaction_type,
    description,
    reference,
    debit_amount,
    credit_amount,
    source_type,
    source_id,
    status,
    idempotency_key,
    created_by
  ) VALUES (
    p_workspace_id,
    p_property_id,
    p_lease_id,
    p_payment_date,
    'rent_payment',
    COALESCE(p_reference, 'Tenant Rent Payment'),
    p_reference,
    0.00,
    p_amount,
    'payment',
    v_payment_id,
    'posted',
    p_idempotency_key,
    v_user_id
  ) RETURNING id INTO v_tx_id;

  -- 7. Audit log entry
  INSERT INTO public.activity_logs (
    workspace_id,
    property_id,
    user_id,
    action,
    entity_type,
    entity_id,
    description,
    metadata
  ) VALUES (
    p_workspace_id,
    p_property_id,
    v_user_id,
    'allocate',
    'payments',
    v_payment_id,
    format('Recorded payment of $%s with %s allocations', p_amount, jsonb_array_length(p_allocations)),
    jsonb_build_object(
      'amount', p_amount,
      'payment_method', p_payment_method,
      'allocations_count', jsonb_array_length(p_allocations),
      'transaction_id', v_tx_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'transaction_id', v_tx_id,
    'amount', p_amount,
    'total_allocated', v_total_allocated,
    'unallocated', p_amount - v_total_allocated
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_payment_and_allocate_rpc (
  p_workspace_id   uuid,
  p_property_id    uuid,
  p_amount         numeric,
  p_payment_date   date,
  p_payment_method text,
  p_lease_id       uuid    DEFAULT NULL::uuid,
  p_tenant_id      uuid    DEFAULT NULL::uuid,
  p_reference      text    DEFAULT NULL::text,
  p_notes          text    DEFAULT NULL::text,
  p_allocations    jsonb   DEFAULT '[]'::jsonb,
  p_user_id        uuid    DEFAULT NULL::uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user_id UUID;
  v_payment_id UUID;
  v_alloc_item JSONB;
  v_alloc_amount NUMERIC(12, 2);
  v_total_allocated NUMERIC(12, 2) := 0;
  v_rent_period_id UUID;
  v_invoice_id UUID;
  v_inv_total NUMERIC(12, 2);
  v_inv_paid NUMERIC(12, 2);
  v_inv_bal NUMERIC(12, 2);
  v_rp_due NUMERIC(12, 2);
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- 1. Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero.';
  END IF;

  -- Normalize allocations parameter
  IF p_allocations IS NOT NULL AND jsonb_typeof(p_allocations) = 'string' THEN
    BEGIN
      p_allocations := (p_allocations #>> '{}')::JSONB;
    EXCEPTION WHEN OTHERS THEN
      p_allocations := '[]'::JSONB;
    END;
  END IF;
  IF p_allocations IS NULL OR jsonb_typeof(p_allocations) != 'array' THEN
    p_allocations := '[]'::JSONB;
  END IF;

  -- 2. Calculate total allocated and validate targets
  IF jsonb_array_length(p_allocations) > 0 THEN
    FOR v_alloc_item IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
      v_alloc_amount := (v_alloc_item->>'amount')::NUMERIC(12, 2);
      IF v_alloc_amount <= 0 THEN
        RAISE EXCEPTION 'Allocation amount must be greater than zero.';
      END IF;
      v_total_allocated := v_total_allocated + v_alloc_amount;
    END LOOP;

    IF v_total_allocated > p_amount THEN
      RAISE EXCEPTION 'Total allocated amount (%) exceeds payment amount (%).', v_total_allocated, p_amount;
    END IF;
  END IF;

  -- 3. Insert single unified Payment record (payment_type = 'rent', direction = 'in')
  INSERT INTO public.payments (
    workspace_id,
    property_id,
    lease_id,
    tenant_id,
    payment_type,
    direction,
    amount,
    currency,
    payment_date,
    payment_method,
    status,
    reference,
    description,
    notes,
    created_by
  ) VALUES (
    p_workspace_id,
    p_property_id,
    p_lease_id,
    p_tenant_id,
    'rent',
    'in',
    p_amount,
    'AUD',
    p_payment_date,
    p_payment_method,
    'completed',
    p_reference,
    COALESCE(p_reference, 'Tenant Rent Payment'),
    p_notes,
    v_user_id
  ) RETURNING id INTO v_payment_id;

  -- 4. Process Allocations
  IF jsonb_array_length(p_allocations) > 0 THEN
    FOR v_alloc_item IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
      v_alloc_amount := (v_alloc_item->>'amount')::NUMERIC(12, 2);
      v_rent_period_id := NULLIF(v_alloc_item->>'rent_period_id', '')::UUID;
      v_invoice_id := NULLIF(v_alloc_item->>'invoice_id', '')::UUID;

      -- Insert allocation
      INSERT INTO public.payment_allocations (
        payment_id,
        rent_period_id,
        invoice_id,
        amount_allocated,
        allocated_by
      ) VALUES (
        v_payment_id,
        v_rent_period_id,
        v_invoice_id,
        v_alloc_amount,
        v_user_id
      );

      -- Update invoice if present (with row lock)
      IF v_invoice_id IS NOT NULL THEN
        SELECT total_amount, COALESCE(paid_amount, 0), balance_due
        INTO v_inv_total, v_inv_paid, v_inv_bal
        FROM public.invoices
        WHERE id = v_invoice_id
        FOR UPDATE;

        UPDATE public.invoices
        SET 
          paid_amount = LEAST(v_inv_total, v_inv_paid + v_alloc_amount),
          balance_due = GREATEST(0, v_inv_bal - v_alloc_amount),
          status = CASE 
            WHEN (v_inv_bal - v_alloc_amount) <= 0 THEN 'paid'
            ELSE 'partially_paid'
          END,
          updated_at = NOW()
        WHERE id = v_invoice_id;
      END IF;

      -- Update rent_period if present (with row lock)
      IF v_rent_period_id IS NOT NULL THEN
        SELECT amount_due INTO v_rp_due
        FROM public.rent_periods
        WHERE id = v_rent_period_id
        FOR UPDATE;

        -- Sum total allocations for this rent period
        SELECT COALESCE(SUM(amount_allocated), 0) INTO v_alloc_amount
        FROM public.payment_allocations
        WHERE rent_period_id = v_rent_period_id;

        UPDATE public.rent_periods
        SET 
          status = CASE 
            WHEN v_alloc_amount >= v_rp_due THEN 'paid'
            WHEN v_alloc_amount > 0 THEN 'partially_paid'
            ELSE status
          END,
          updated_at = NOW()
        WHERE id = v_rent_period_id;
      END IF;
    END LOOP;
  END IF;

  -- 5. Audit log entry
  INSERT INTO public.activity_logs (
    workspace_id,
    property_id,
    user_id,
    action,
    entity_type,
    entity_id,
    description,
    metadata
  ) VALUES (
    p_workspace_id,
    p_property_id,
    v_user_id,
    'allocate',
    'payments',
    v_payment_id,
    format('Recorded rent payment of $%s with %s allocations', p_amount, jsonb_array_length(p_allocations)),
    jsonb_build_object(
      'payment_type', 'rent',
      'direction', 'in',
      'amount', p_amount,
      'payment_method', p_payment_method,
      'allocations_count', jsonb_array_length(p_allocations)
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'amount', p_amount,
    'total_allocated', v_total_allocated,
    'unallocated', p_amount - v_total_allocated
  );
END;
$function$;

GRANT EXECUTE
  ON FUNCTION "public"."record_payment_and_allocate_rpc"(uuid, uuid, numeric, date, text, uuid, uuid, text, text, jsonb, text, uuid)
  TO PUBLIC, "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."record_payment_and_allocate_rpc"(uuid, uuid, numeric, date, text, uuid, uuid, text, text, jsonb, uuid) TO PUBLIC, "postgres", "service_role";


-- Function: remove_workspace_member
CREATE OR REPLACE FUNCTION public.remove_workspace_member (
  p_member_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."remove_workspace_member"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: resolve_invitation_by_token
CREATE OR REPLACE FUNCTION public.resolve_invitation_by_token (
  p_token text
)
  RETURNS TABLE (
    invitation_id  uuid,
    status         text,
    workspace_id   uuid,
    workspace_name text,
    inviter_name   text,
    role_name      text,
    role_id        uuid,
    expires_at     timestamp with time zone,
    is_expired     boolean
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."resolve_invitation_by_token"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";


-- Function: reverse_payment_rpc
CREATE OR REPLACE FUNCTION public.reverse_payment_rpc (
  p_payment_id uuid,
  p_reason     text,
  p_user_id    uuid DEFAULT NULL::uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user_id UUID;
  v_payment RECORD;
  v_alloc RECORD;
  v_reversal_payment_id UUID;
  v_rev_direction TEXT;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- 1. Fetch & lock payment
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment record % not found.', p_payment_id;
  END IF;

  IF v_payment.status = 'reversed' THEN
    RAISE EXCEPTION 'Payment % is already reversed.', p_payment_id;
  END IF;

  -- 2. Reverse all allocations on invoices & rent periods if any
  FOR v_alloc IN 
    SELECT * FROM public.payment_allocations 
    WHERE payment_id = p_payment_id
    FOR UPDATE
  LOOP
    -- Restore invoice balance
    IF v_alloc.invoice_id IS NOT NULL THEN
      UPDATE public.invoices
      SET 
        paid_amount = GREATEST(0, COALESCE(paid_amount, 0) - v_alloc.amount_allocated),
        balance_due = LEAST(total_amount, COALESCE(balance_due, 0) + v_alloc.amount_allocated),
        status = CASE 
          WHEN (COALESCE(paid_amount, 0) - v_alloc.amount_allocated) <= 0 THEN 'unpaid'
          ELSE 'partially_paid'
        END,
        updated_at = NOW()
      WHERE id = v_alloc.invoice_id;
    END IF;

    -- Restore rent period status
    IF v_alloc.rent_period_id IS NOT NULL THEN
      UPDATE public.rent_periods
      SET 
        status = 'due',
        updated_at = NOW()
      WHERE id = v_alloc.rent_period_id;
    END IF;
  END LOOP;

  -- 3. Mark original payment status as reversed
  UPDATE public.payments
  SET status = 'reversed', updated_at = NOW()
  WHERE id = p_payment_id;

  -- 4. Determine compensating reversal direction:
  -- If original was 'in' (rent/income), compensating payment direction is 'out'.
  -- If original was 'out' (expense/refund), compensating payment direction is 'in'.
  IF v_payment.direction = 'in' THEN
    v_rev_direction := 'out';
  ELSE
    v_rev_direction := 'in';
  END IF;

  -- 5. Insert compensating reversal payment entry in payments table
  INSERT INTO public.payments (
    workspace_id,
    property_id,
    lease_id,
    tenant_id,
    category_id,
    payment_type,
    direction,
    amount,
    currency,
    payment_date,
    payment_method,
    status,
    reference,
    description,
    reverses_payment_id,
    created_by
  ) VALUES (
    v_payment.workspace_id,
    v_payment.property_id,
    v_payment.lease_id,
    v_payment.tenant_id,
    v_payment.category_id,
    'adjustment',
    v_rev_direction,
    v_payment.amount,
    COALESCE(v_payment.currency, 'AUD'),
    CURRENT_DATE,
    v_payment.payment_method,
    'completed',
    format('REV-%s', COALESCE(v_payment.reference, substring(p_payment_id::text, 1, 8))),
    format('Reversal of %s Payment (%s) - %s', v_payment.payment_type, COALESCE(v_payment.reference, p_payment_id::text), p_reason),
    p_payment_id,
    v_user_id
  ) RETURNING id INTO v_reversal_payment_id;

  -- 6. Activity log
  INSERT INTO public.activity_logs (
    workspace_id,
    property_id,
    user_id,
    action,
    entity_type,
    entity_id,
    description,
    metadata
  ) VALUES (
    v_payment.workspace_id,
    v_payment.property_id,
    v_user_id,
    'reverse',
    'payments',
    p_payment_id,
    format('Reversed %s payment of $%s. Reason: %s', v_payment.payment_type, v_payment.amount, p_reason),
    jsonb_build_object(
      'payment_type', v_payment.payment_type,
      'amount', v_payment.amount,
      'reason', p_reason,
      'reversal_payment_id', v_reversal_payment_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'reversal_payment_id', v_reversal_payment_id
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."reverse_payment_rpc"(uuid, text, uuid) TO PUBLIC, "postgres", "service_role";


-- Function: revoke_workspace_invitation
CREATE OR REPLACE FUNCTION public.revoke_workspace_invitation (
  p_invitation_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."revoke_workspace_invitation"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: revoke_workspace_member_property_access
CREATE OR REPLACE FUNCTION public.revoke_workspace_member_property_access (
  p_workspace_id uuid,
  p_user_id      uuid,
  p_status       text DEFAULT 'removed'::text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."revoke_workspace_member_property_access"(uuid, uuid, text) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: seed_default_expense_categories
CREATE OR REPLACE FUNCTION public.seed_default_expense_categories (
  p_workspace_id uuid,
  p_user_id      uuid DEFAULT NULL::uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  INSERT INTO public.expense_categories (workspace_id, name, code, description, created_by)
  VALUES
    (p_workspace_id, 'Repairs & Maintenance', 'REP', 'Plumbing, electrical, handyman, general maintenance', p_user_id),
    (p_workspace_id, 'Council Rates & Taxes', 'RATES', 'Local council rates, land tax, emergency services levies', p_user_id),
    (p_workspace_id, 'Water & Utilities', 'UTIL', 'Water usage, electricity, gas, internet', p_user_id),
    (p_workspace_id, 'Building & Landlord Insurance', 'INS', 'Property insurance premiums, landlord protection cover', p_user_id),
    (p_workspace_id, 'Property Management Fees', 'MGMT', 'Management commission, letting fees, admin charges', p_user_id),
    (p_workspace_id, 'Mortgage Interest', 'MORT', 'Interest paid on investment property loans', p_user_id),
    (p_workspace_id, 'Capital Improvements', 'CAPEX', 'Major renovations, structural upgrades, asset additions', p_user_id),
    (p_workspace_id, 'Cleaning & Gardening', 'CLEAN', 'End of lease cleaning, lawn care, pest control', p_user_id),
    (p_workspace_id, 'Legal & Professional Fees', 'LEGAL', 'Accountant fees, legal representation, tribunal costs', p_user_id)
  ON CONFLICT (workspace_id, lower(name)) DO NOTHING;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."seed_default_expense_categories"(uuid, uuid) TO PUBLIC, "postgres", "service_role";


-- Function: suspend_workspace_member
CREATE OR REPLACE FUNCTION public.suspend_workspace_member (
  p_member_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."suspend_workspace_member"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: sync_property_workspace_team_access
CREATE OR REPLACE FUNCTION public.sync_property_workspace_team_access()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."sync_property_workspace_team_access"() TO PUBLIC, "postgres", "service_role";


-- Function: sync_workspace_member_property_access
CREATE OR REPLACE FUNCTION public.sync_workspace_member_property_access (
  p_workspace_id uuid,
  p_user_id      uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."sync_workspace_member_property_access"(uuid, uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: sync_workspace_member_role_text
CREATE OR REPLACE FUNCTION public.sync_workspace_member_role_text()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_role_name TEXT;
BEGIN
  IF NEW.role_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT lower(name) INTO v_role_name FROM public.team_roles WHERE id = NEW.role_id;
  IF v_role_name IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.role := CASE v_role_name
    WHEN 'owner' THEN 'owner'
    WHEN 'admin' THEN 'admin'
    WHEN 'manager' THEN 'manager'
    WHEN 'leasing agent' THEN 'agent'
    WHEN 'staff' THEN 'staff'
    ELSE 'viewer'
  END;

  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."sync_workspace_member_role_text"() TO PUBLIC, "postgres", "service_role";


-- Function: tenant_can_read_lease
CREATE OR REPLACE FUNCTION public.tenant_can_read_lease (
  p_lease_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.lease_tenants lt
    INNER JOIN public.tenants t ON t.id = lt.tenant_id
    WHERE lt.lease_id = p_lease_id
      AND t.user_id::text = auth.uid()::text
  );
$function$;

GRANT EXECUTE ON FUNCTION "public"."tenant_can_read_lease"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: tenant_can_read_unit
CREATE OR REPLACE FUNCTION public.tenant_can_read_unit (
  p_unit_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT false;
$function$;

GRANT EXECUTE ON FUNCTION "public"."tenant_can_read_unit"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: transfer_workspace_ownership
CREATE OR REPLACE FUNCTION public.transfer_workspace_ownership (
  p_workspace_id      uuid,
  p_new_owner_user_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_actor UUID;
  v_old_owner UUID;
  v_owner_role_id UUID;
  v_admin_role_id UUID;
  v_new_member_id UUID;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  IF NOT public.has_workspace_permission(p_workspace_id, 'team.settings.update', v_actor) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  SELECT owner_id INTO v_old_owner FROM public.workspaces WHERE id = p_workspace_id FOR UPDATE;
  IF v_old_owner IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_old_owner = p_new_owner_user_id THEN RETURN; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = p_new_owner_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'TARGET_NOT_MEMBER';
  END IF;

  SELECT id INTO v_owner_role_id FROM public.team_roles WHERE workspace_id IS NULL AND lower(name) = 'owner' LIMIT 1;
  SELECT id INTO v_admin_role_id FROM public.team_roles WHERE workspace_id IS NULL AND lower(name) = 'admin' LIMIT 1;

  UPDATE public.workspaces SET owner_id = p_new_owner_user_id, updated_at = NOW() WHERE id = p_workspace_id;

  UPDATE public.workspace_members
  SET role_id = v_owner_role_id, updated_at = NOW()
  WHERE workspace_id = p_workspace_id AND user_id = p_new_owner_user_id;

  IF v_admin_role_id IS NOT NULL AND v_old_owner IS NOT NULL THEN
    UPDATE public.workspace_members
    SET role_id = v_admin_role_id, updated_at = NOW()
    WHERE workspace_id = p_workspace_id AND user_id = v_old_owner;
  END IF;

  PERFORM public.log_activity(
    'workspace.ownership_transferred', 'workspace', p_workspace_id, p_workspace_id, NULL,
    jsonb_build_object('previous_owner_id', v_old_owner, 'new_owner_id', p_new_owner_user_id)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."transfer_workspace_ownership"(uuid, uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: trg_profiles_set_public_id
CREATE OR REPLACE FUNCTION public.trg_profiles_set_public_id()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  IF NEW.public_id IS NULL OR NEW.public_id = '' THEN
    NEW.public_id := public.generate_profile_public_id();
  END IF;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."trg_profiles_set_public_id"() TO PUBLIC, "postgres", "service_role";


-- Function: trg_workspaces_ensure_owner_membership
CREATE OR REPLACE FUNCTION public.trg_workspaces_ensure_owner_membership()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
BEGIN
  PERFORM public.ensure_workspace_owner_membership(NEW.id);
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."trg_workspaces_ensure_owner_membership"() TO PUBLIC, "postgres", "service_role";


-- Function: update_workspace_team_role
CREATE OR REPLACE FUNCTION public.update_workspace_team_role (
  p_role_id         uuid,
  p_name            text,
  p_description     text,
  p_permission_keys text[]
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."update_workspace_team_role"(uuid, text, text, text[]) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: user_owns_or_member_workspace
CREATE OR REPLACE FUNCTION public.user_owns_or_member_workspace (
  p_workspace_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = p_workspace_id
      AND (
        w.owner_id::text = (SELECT auth.uid())::text
        OR EXISTS (
          SELECT 1
          FROM public.workspace_members wm
          WHERE wm.workspace_id = w.id
            AND wm.user_id::text = (SELECT auth.uid())::text
            AND wm.status = 'active'
        )
      )
  );
$function$;

GRANT EXECUTE ON FUNCTION "public"."user_owns_or_member_workspace"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- ====================================================================
-- TABLES, COLUMNS, INDEXES & RLS POLICIES
-- ====================================================================

-- Table: account_context
CREATE TABLE "public"."account_context" (
  "user_id"           uuid                     NOT NULL,
  "status"            text                     NOT NULL DEFAULT 'active'::text,
  "onboarding_status" text                     NOT NULL DEFAULT 'completed'::text,
  "first_login_at"    timestamp with time zone,
  "last_login_at"     timestamp with time zone,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "account_context_onboarding_status_check" CHECK ((onboarding_status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text]))),
  CONSTRAINT "account_context_pkey" PRIMARY KEY (user_id),
  CONSTRAINT "account_context_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'deactivated'::text]))),
  CONSTRAINT "account_context_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE "public"."account_context"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_account_context_user_id ON public.account_context USING btree (user_id);

CREATE TRIGGER trg_protect_account_context
  BEFORE UPDATE ON public.account_context
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_account_context_fields();

CREATE POLICY "account_insert_own" ON "public"."account_context"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "account_select_admin" ON "public"."account_context"
  FOR SELECT
  TO "authenticated"
  USING (public.is_platform_admin());

CREATE POLICY "account_select_own" ON "public"."account_context"
  FOR SELECT
  TO "authenticated"
  USING ((auth.uid() = user_id));

CREATE POLICY "account_update_admin" ON "public"."account_context"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "account_update_own" ON "public"."account_context"
  FOR UPDATE
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."account_context" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."account_context" TO "postgres", "service_role";


-- Table: activity_logs
CREATE TABLE "public"."activity_logs" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid,
  "property_id"  uuid,
  "user_id"      uuid,
  "action"       text                     NOT NULL,
  "entity_type"  text                     NOT NULL,
  "entity_id"    uuid,
  "metadata"     jsonb                    DEFAULT '{}'::jsonb,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "description"  text,
  CONSTRAINT "activity_logs_pkey" PRIMARY KEY (id),
  CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "activity_logs_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL,
  CONSTRAINT "activity_logs_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."activity_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_activity_logs_action ON public.activity_logs USING btree (action);

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC);

CREATE INDEX idx_activity_logs_entity ON public.activity_logs USING btree (entity_type, entity_id);

CREATE INDEX idx_activity_logs_property_created ON public.activity_logs USING btree (property_id, created_at DESC);

CREATE INDEX idx_activity_logs_property_id ON public.activity_logs USING btree (property_id);

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs USING btree (user_id);

CREATE INDEX idx_activity_logs_workspace_created ON public.activity_logs USING btree (workspace_id, created_at DESC);

CREATE INDEX idx_activity_logs_workspace_id ON public.activity_logs USING btree (workspace_id);

CREATE TRIGGER trg_prevent_activity_log_modification
  BEFORE DELETE OR UPDATE ON public.activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_activity_log_modification();

CREATE POLICY "act_insert_admin" ON "public"."activity_logs"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "act_select" ON "public"."activity_logs"
  FOR SELECT
  TO "authenticated"
  USING (((user_id = auth.uid()) OR ((property_id IS NOT NULL) AND public.can_access_property(property_id)) OR ((workspace_id IS
    NOT NULL) AND public.can_access_workspace(workspace_id)) OR public.is_platform_admin()));

GRANT SELECT ON TABLE "public"."activity_logs" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."activity_logs" TO "postgres", "service_role";


-- Table: automation_executions
CREATE TABLE "public"."automation_executions" (
  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "automation_id"         uuid                     NOT NULL,
  "workspace_id"          uuid                     NOT NULL,
  "idempotency_key"       text                     NOT NULL,
  "trigger_source"        text,
  "status"                text                     NOT NULL DEFAULT 'pending'::text,
  "started_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "completed_at"          timestamp with time zone,
  "retry_count"           integer                  NOT NULL DEFAULT 0,
  "error_message"         text,
  "result_summary"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "lease_id"              uuid,
  "execution_type"        text                     DEFAULT 'scheduled'::text,
  "source_entity_type"    text,
  "source_entity_id"      text,
  "conditions_evaluated"  jsonb                    DEFAULT '{}'::jsonb,
  "actions_executed"      jsonb                    DEFAULT '[]'::jsonb,
  "execution_duration_ms" integer,
  CONSTRAINT "automation_executions_execution_type_check" CHECK ((execution_type = ANY (ARRAY['scheduled'::text, 'manual'::text]))),
  CONSTRAINT "automation_executions_pkey" PRIMARY KEY (id),
  CONSTRAINT "automation_executions_status_check"
    CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'succeeded'::text, 'failed'::text, 'skipped'::text]))),
  CONSTRAINT "uq_automation_idempotency" UNIQUE (automation_id, idempotency_key),
  CONSTRAINT "automation_executions_automation_id_fkey" FOREIGN KEY (automation_id) REFERENCES public.automations(id) ON DELETE CASCADE,
  CONSTRAINT "automation_executions_lease_id_fkey" FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE CASCADE,
  CONSTRAINT "automation_executions_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."automation_executions"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_automation_executions_auto_created ON public.automation_executions USING btree (automation_id, created_at DESC);

CREATE INDEX idx_automation_executions_auto ON public.automation_executions USING btree (automation_id);

CREATE INDEX idx_automation_executions_idempotency ON public.automation_executions USING btree (idempotency_key)
  WHERE (idempotency_key IS NOT NULL);

CREATE INDEX idx_automation_executions_lease ON public.automation_executions USING btree (lease_id);

CREATE INDEX idx_automation_executions_source ON public.automation_executions USING btree (source_entity_type, source_entity_id);

CREATE INDEX idx_automation_executions_status ON public.automation_executions USING btree (status);

CREATE INDEX idx_automation_executions_workspace ON public.automation_executions USING btree (workspace_id);

CREATE POLICY "Workspace settings viewers can read automation executions"
  ON public.automation_executions
  FOR SELECT
  TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.settings.view')
    OR public.is_platform_admin()
  );
CREATE POLICY "Workspace settings managers can insert automation executions"
  ON public.automation_executions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  );
CREATE POLICY "Workspace settings managers can update automation executions"
  ON public.automation_executions
  FOR UPDATE
  TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  )
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  );
CREATE POLICY "Workspace settings managers can delete automation executions"
  ON public.automation_executions
  FOR DELETE
  TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  );

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."automation_executions" TO "authenticated", "postgres", "service_role";


-- Table: automations
CREATE TABLE "public"."automations" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id"        uuid                     NOT NULL,
  "name"                text                     NOT NULL,
  "description"         text,
  "trigger_type"        text                     NOT NULL,
  "trigger_config"      jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "conditions"          jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "actions"             jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "is_active"           boolean                  NOT NULL DEFAULT true,
  "last_run_at"         timestamp with time zone,
  "next_run_at"         timestamp with time zone,
  "created_by"          uuid,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "lease_id"            uuid,
  "schedule_type"       text                     DEFAULT 'monthly'::text,
  "schedule_config"     jsonb                    DEFAULT '{}'::jsonb,
  "status"              text                     DEFAULT 'active'::text,
  "automation_type"     text                     DEFAULT 'lease'::text,
  "invoice_template_id" uuid,
  "metadata"            jsonb                    DEFAULT '{}'::jsonb,
  CONSTRAINT "automations_automation_type_check" CHECK ((automation_type = ANY (ARRAY['lease'::text, 'invoice'::text, 'finance'::text]))),
  CONSTRAINT "automations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "automations_pkey" PRIMARY KEY (id),
  CONSTRAINT "automations_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'completed'::text, 'failed'::text]))),
  CONSTRAINT "automations_trigger_type_check" CHECK ((trigger_type = ANY (ARRAY['schedule'::text, 'event'::text, 'source'::text]))),
  CONSTRAINT "automations_invoice_template_id_fkey" FOREIGN KEY (invoice_template_id) REFERENCES public.invoice_templates(id) ON DELETE SET NULL,
  CONSTRAINT "automations_lease_id_fkey" FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE CASCADE,
  CONSTRAINT "automations_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."automations"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_automations_is_active ON public.automations USING btree (is_active);

CREATE INDEX idx_automations_lease_id ON public.automations USING btree (lease_id);

CREATE INDEX idx_automations_next_run_active ON public.automations USING btree (next_run_at)
  WHERE (status = 'active'::text);

CREATE INDEX idx_automations_next_run ON public.automations USING btree (next_run_at);

CREATE INDEX idx_automations_status_next_run ON public.automations USING btree (status, next_run_at)
  WHERE (status = 'active'::text);

CREATE INDEX idx_automations_template ON public.automations USING btree (invoice_template_id);

CREATE INDEX idx_automations_type ON public.automations USING btree (automation_type);

CREATE INDEX idx_automations_workspace_status ON public.automations USING btree (workspace_id, status);

CREATE INDEX idx_automations_workspace ON public.automations USING btree (workspace_id);

CREATE POLICY "Workspace settings viewers can read automations"
  ON public.automations
  FOR SELECT
  TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.settings.view')
    OR public.is_platform_admin()
  );
CREATE POLICY "Workspace settings managers can insert automations"
  ON public.automations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  );
CREATE POLICY "Workspace settings managers can update automations"
  ON public.automations
  FOR UPDATE
  TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  )
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  );
CREATE POLICY "Workspace settings managers can delete automations"
  ON public.automations
  FOR DELETE
  TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  );

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."automations" TO "authenticated", "postgres", "service_role";


-- Table: categories
CREATE TABLE "public"."categories" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "transaction_type" text                     NOT NULL,
  "name"             text                     NOT NULL,
  "description"      text,
  "is_active"        boolean                  NOT NULL DEFAULT true,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "categories_pkey" PRIMARY KEY (id),
  CONSTRAINT "categories_transaction_type_check" CHECK ((transaction_type = ANY (ARRAY['income'::text, 'expense'::text]))),
  CONSTRAINT "uq_categories_id_type" UNIQUE (id, transaction_type),
  CONSTRAINT "uq_categories_type_name" UNIQUE (transaction_type, name)
);

ALTER TABLE "public"."categories"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage categories" ON "public"."categories"
  FOR ALL
  TO "authenticated"
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Authenticated users can read categories" ON "public"."categories"
  FOR SELECT
  TO "authenticated"
  USING (((is_active = true) OR public.is_platform_admin()));

GRANT SELECT ON TABLE "public"."categories" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "postgres", "service_role";


-- Table: email_events
CREATE TABLE "public"."email_events" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "recipient"           text                     NOT NULL,
  "subject"             text                     NOT NULL,
  "template_type"       text                     NOT NULL,
  "variables"           jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "provider_message_id" text,
  "status"              text                     NOT NULL DEFAULT 'pending'::text,
  "error_message"       text,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "email_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "email_events_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])))
);

ALTER TABLE "public"."email_events"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_email_events_created_at ON public.email_events USING btree (created_at DESC);

CREATE INDEX idx_email_events_recipient ON public.email_events USING btree (recipient);

CREATE INDEX idx_email_events_status ON public.email_events USING btree (status);

CREATE POLICY "email_admin" ON "public"."email_events"
  FOR SELECT
  TO "authenticated"
  USING (public.is_platform_admin());

CREATE POLICY "email_own" ON "public"."email_events"
  FOR SELECT
  TO "authenticated"
  USING (((auth.jwt() ->> 'email'::text) = recipient));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."email_events" TO "postgres", "service_role";


-- Table: entitlements
CREATE TABLE "public"."entitlements" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "key"         text                     NOT NULL,
  "name"        text                     NOT NULL,
  "description" text,
  "value_type"  text                     NOT NULL,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "entitlements_key_key" UNIQUE (key),
  CONSTRAINT "entitlements_pkey" PRIMARY KEY (id),
  CONSTRAINT "entitlements_value_type_check" CHECK ((value_type = ANY (ARRAY['boolean'::text, 'number'::text, 'string'::text])))
);

ALTER TABLE "public"."entitlements"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_entitlements_key ON public.entitlements USING btree (key);

CREATE POLICY "entitlements_admin_del" ON "public"."entitlements"
  FOR DELETE
  TO "authenticated"
  USING (public.is_platform_admin());

CREATE POLICY "entitlements_admin_ins" ON "public"."entitlements"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "entitlements_admin_upd" ON "public"."entitlements"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "entitlements_select" ON "public"."entitlements"
  FOR SELECT
  TO "authenticated"
  USING (true);

GRANT SELECT ON TABLE "public"."entitlements" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."entitlements" TO "postgres", "service_role";


-- Table: invoice_documents
CREATE TABLE "public"."invoice_documents" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "invoice_id"      uuid                     NOT NULL,
  "workspace_id"    uuid                     NOT NULL,
  "document_type"   text                     NOT NULL,
  "storage_path"    text                     NOT NULL,
  "file_name"       text                     NOT NULL,
  "mime_type"       text                     NOT NULL,
  "file_size_bytes" bigint                   NOT NULL DEFAULT 0,
  "checksum"        text,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "invoice_documents_document_type_check" CHECK ((document_type = ANY (ARRAY['pdf'::text, 'docx'::text]))),
  CONSTRAINT "invoice_documents_pkey" PRIMARY KEY (id),
  CONSTRAINT "invoice_documents_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE,
  CONSTRAINT "invoice_documents_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."invoice_documents"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_invoice_documents_invoice ON public.invoice_documents USING btree (invoice_id);

CREATE INDEX idx_invoice_documents_workspace ON public.invoice_documents USING btree (workspace_id);

CREATE POLICY "Workspace members can access invoice documents" ON "public"."invoice_documents"
  FOR ALL
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.workspace_members wm
  WHERE ((wm.workspace_id = invoice_documents.workspace_id) AND ((wm.user_id)::text = (auth.uid())::text)))) OR public.is_platform_admin()));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."invoice_documents" TO "postgres", "service_role";


-- Table: invoice_items
CREATE TABLE "public"."invoice_items" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "invoice_id"  uuid                     NOT NULL,
  "description" text                     NOT NULL,
  "quantity"    numeric(10,2)            NOT NULL DEFAULT 1,
  "unit_price"  numeric(10,2)            NOT NULL,
  "amount"      numeric(10,2)            NOT NULL,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "tax_rate"    numeric(5,2)             NOT NULL DEFAULT 0,
  "tax_amount"  numeric(12,2)            NOT NULL DEFAULT 0,
  "line_total"  numeric(12,2)            NOT NULL DEFAULT 0,
  "sort_order"  integer                  NOT NULL DEFAULT 0,
  CONSTRAINT "chk_invoice_item_amount" CHECK ((amount = round((quantity * unit_price), 2))),
  CONSTRAINT "invoice_items_amount_check" CHECK ((amount >= (0)::numeric)),
  CONSTRAINT "invoice_items_line_total_check" CHECK ((line_total >= (0)::numeric)),
  CONSTRAINT "invoice_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "invoice_items_quantity_check" CHECK ((quantity > (0)::numeric)),
  CONSTRAINT "invoice_items_tax_amount_check" CHECK ((tax_amount >= (0)::numeric)),
  CONSTRAINT "invoice_items_tax_rate_check" CHECK ((tax_rate >= (0)::numeric)),
  CONSTRAINT "invoice_items_unit_price_check" CHECK ((unit_price >= (0)::numeric)),
  CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE
);

ALTER TABLE "public"."invoice_items"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items USING btree (invoice_id);

CREATE POLICY "Users can manage invoice items in authorized workspaces" ON "public"."invoice_items"
  FOR ALL
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM (public.invoices i
     JOIN public.workspace_members wm ON ((wm.workspace_id = i.workspace_id)))
  WHERE ((i.id = invoice_items.invoice_id) AND ((wm.user_id)::text = (auth.uid())::text) AND (wm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text]))))) OR
    public.is_platform_admin()));

CREATE POLICY "Users can view invoice items in authorized workspaces" ON "public"."invoice_items"
  FOR SELECT
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM (public.invoices i
     JOIN public.workspace_members wm ON ((wm.workspace_id = i.workspace_id)))
  WHERE ((i.id = invoice_items.invoice_id) AND ((wm.user_id)::text = (auth.uid())::text)))) OR public.is_platform_admin()));

CREATE POLICY "invitem_delete_draft" ON "public"."invoice_items"
  FOR DELETE
  TO "authenticated"
  USING ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.invoices i
  WHERE ((i.id = invoice_items.invoice_id) AND (i.status = 'draft'::text) AND public.can_write_property(i.property_id, 'financial.manage'::text))))));

CREATE POLICY "invitem_insert" ON "public"."invoice_items"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.invoices i
  WHERE ((i.id = invoice_items.invoice_id) AND public.can_write_property(i.property_id, 'financial.manage'::text))))));

CREATE POLICY "invitem_select" ON "public"."invoice_items"
  FOR SELECT
  TO "authenticated"
  USING ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.invoices i
  WHERE ((i.id = invoice_items.invoice_id) AND public.can_access_property(i.property_id))))));

CREATE POLICY "invitem_update" ON "public"."invoice_items"
  FOR UPDATE
  TO "authenticated"
  USING ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.invoices i
  WHERE ((i.id = invoice_items.invoice_id) AND public.can_write_property(i.property_id, 'financial.manage'::text))))))
  WITH CHECK ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.invoices i
  WHERE ((i.id = invoice_items.invoice_id) AND public.can_write_property(i.property_id, 'financial.manage'::text))))));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."invoice_items" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."invoice_items" TO "postgres", "service_role";


-- Table: invoice_sequences
CREATE TABLE "public"."invoice_sequences" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid                     NOT NULL,
  "prefix"       text                     NOT NULL DEFAULT 'INV'::text,
  "year"         integer                  NOT NULL,
  "last_number"  integer                  NOT NULL DEFAULT 0,
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_invoice_sequence" UNIQUE (workspace_id, prefix, year),
  CONSTRAINT "invoice_sequences_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."invoice_sequences"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_invoice_sequences_lookup ON public.invoice_sequences USING btree (workspace_id, prefix, year);

CREATE POLICY "Workspace members can access sequences" ON "public"."invoice_sequences"
  FOR ALL
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.workspace_members wm
  WHERE ((wm.workspace_id = invoice_sequences.workspace_id) AND ((wm.user_id)::text = (auth.uid())::text)))) OR public.is_platform_admin()));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."invoice_sequences" TO "postgres", "service_role";


-- Table: invoice_templates
CREATE TABLE "public"."invoice_templates" (
  "id"                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id"           uuid                     NOT NULL,
  "name"                   text                     NOT NULL,
  "layout_style"           text                     NOT NULL DEFAULT 'classic'::text,
  "brand_color"            text                     DEFAULT '#22333b'::text,
  "accent_color"           text                     DEFAULT '#a9927d'::text,
  "logo_url"               text,
  "header_text"            text,
  "footer_text"            text,
  "payment_instructions"   text,
  "tax_name"               text                     DEFAULT 'GST'::text,
  "notes"                  text,
  "is_default"             boolean                  NOT NULL DEFAULT false,
  "created_by"             uuid,
  "created_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "description"            text,
  "status"                 text                     NOT NULL DEFAULT 'active'::text,
  "currency"               text                     NOT NULL DEFAULT 'AUD'::text,
  "invoice_type"           text                     NOT NULL DEFAULT 'rent'::text,
  "items"                  jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "payment_terms_days"     integer                  NOT NULL DEFAULT 14,
  "late_fee_amount"        numeric(10,2)            NOT NULL DEFAULT 0,
  "late_fee_days"          integer                  NOT NULL DEFAULT 0,
  "linked_property_ids"    jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "default_customer_name"  text,
  "default_customer_email" text,
  "automation_config"      jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "email_config"           jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "last_run_at"            timestamp with time zone,
  "next_run_at"            timestamp with time zone,
  "metadata"               jsonb                    DEFAULT '{}'::jsonb,
  "is_system"              boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "invoice_templates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "invoice_templates_late_fee_amount_check" CHECK ((late_fee_amount >= (0)::numeric)),
  CONSTRAINT "invoice_templates_late_fee_days_check" CHECK ((late_fee_days >= 0)),
  CONSTRAINT "invoice_templates_layout_style_check"
    CHECK ((layout_style = ANY (ARRAY['classic'::text, 'modern'::text, 'minimalist'::text, 'corporate'::text, 'creative'::text, 'elegant'::text, 'monochrome'::text]))),
  CONSTRAINT "invoice_templates_pkey" PRIMARY KEY (id),
  CONSTRAINT "invoice_templates_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'archived'::text]))),
  CONSTRAINT "invoice_templates_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."invoice_templates"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_invoice_templates_is_default ON public.invoice_templates USING btree (is_default);

CREATE INDEX idx_invoice_templates_is_system ON public.invoice_templates USING btree (is_system);

CREATE INDEX idx_invoice_templates_next_run ON public.invoice_templates USING btree (next_run_at);

CREATE INDEX idx_invoice_templates_status ON public.invoice_templates USING btree (status);

CREATE INDEX idx_invoice_templates_workspace ON public.invoice_templates USING btree (workspace_id);

CREATE POLICY "Workspace members can manage invoice templates" ON "public"."invoice_templates"
  FOR ALL
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.workspace_members wm
  WHERE
    ((wm.workspace_id = invoice_templates.workspace_id) AND ((wm.user_id)::text = (auth.uid())::text) AND (wm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])))))
    OR public.is_platform_admin()));

CREATE POLICY "Workspace members can view invoice templates" ON "public"."invoice_templates"
  FOR SELECT
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.workspace_members wm
  WHERE ((wm.workspace_id = invoice_templates.workspace_id) AND ((wm.user_id)::text = (auth.uid())::text)))) OR public.is_platform_admin()));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."invoice_templates" TO "postgres", "service_role";


-- Table: invoices
CREATE TABLE "public"."invoices" (
  "id"                   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id"          uuid,
  "unit_id"              uuid,
  "lease_id"             uuid,
  "tenant_id"            uuid,
  "invoice_number"       text                     NOT NULL,
  "status"               text                     NOT NULL DEFAULT 'draft'::text,
  "issue_date"           date                     NOT NULL DEFAULT CURRENT_DATE,
  "due_date"             date                     NOT NULL,
  "subtotal"             numeric(10,2)            NOT NULL DEFAULT 0,
  "tax_amount"           numeric(10,2)            NOT NULL DEFAULT 0,
  "total_amount"         numeric(10,2)            NOT NULL DEFAULT 0,
  "balance_due"          numeric(10,2)            NOT NULL DEFAULT 0,
  "description"          text,
  "created_by"           uuid,
  "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "workspace_id"         uuid,
  "currency"             text                     NOT NULL DEFAULT 'AUD'::text,
  "customer_name"        text,
  "customer_email"       text,
  "customer_address"     text,
  "snapshot"             jsonb,
  "template_id"          uuid,
  "notes"                text,
  "payment_instructions" text,
  "cancellation_reason"  text,
  "issued_at"            timestamp with time zone,
  "paid_at"              timestamp with time zone,
  "automation_id"        uuid,
  "paid_amount"          numeric(10,2)            NOT NULL DEFAULT 0,
  "billing_period_start" date,
  "billing_period_end"   date,
  CONSTRAINT "chk_invoice_balance" CHECK ((balance_due <= total_amount)),
  CONSTRAINT "chk_invoice_dates" CHECK ((due_date >= issue_date)),
  CONSTRAINT "chk_invoice_totals" CHECK ((total_amount = (subtotal + tax_amount))),
  CONSTRAINT "invoices_automation_id_fkey" FOREIGN KEY (automation_id) REFERENCES public.automations(id) ON DELETE SET NULL,
  CONSTRAINT "invoices_balance_due_check" CHECK ((balance_due >= (0)::numeric)),
  CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "invoices_invoice_number_key" UNIQUE (invoice_number),
  CONSTRAINT "invoices_pkey" PRIMARY KEY (id),
  CONSTRAINT "invoices_status_check"
    CHECK ((status = ANY (ARRAY['draft'::text, 'issued'::text, 'viewed'::text, 'paid'::text, 'partially_paid'::text, 'overdue'::text, 'cancelled'::text, 'void'::text]))),
  CONSTRAINT "invoices_subtotal_check" CHECK ((subtotal >= (0)::numeric)),
  CONSTRAINT "invoices_tax_amount_check" CHECK ((tax_amount >= (0)::numeric)),
  CONSTRAINT "invoices_total_amount_check" CHECK ((total_amount >= (0)::numeric)),
  CONSTRAINT "fk_invoices_lease_id" FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE SET NULL,
  CONSTRAINT "invoices_lease_id_fkey" FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE SET NULL,
  CONSTRAINT "invoices_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT "fk_invoices_tenant_id" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL,
  CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL,
  CONSTRAINT "invoices_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."invoices"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_invoices_automation_id ON public.invoices USING btree (automation_id);

CREATE INDEX idx_invoices_customer_email ON public.invoices USING btree (customer_email);

CREATE INDEX idx_invoices_due_date ON public.invoices USING btree (due_date);

CREATE INDEX idx_invoices_lease_id ON public.invoices USING btree (lease_id);

CREATE INDEX idx_invoices_number ON public.invoices USING btree (invoice_number);

CREATE INDEX idx_invoices_property_created ON public.invoices USING btree (property_id, created_at DESC);

CREATE INDEX idx_invoices_property_id ON public.invoices USING btree (property_id);

CREATE INDEX idx_invoices_property_issue_date ON public.invoices USING btree (property_id, issue_date DESC);

CREATE INDEX idx_invoices_property_status ON public.invoices USING btree (property_id, status);

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);

CREATE INDEX idx_invoices_tenant_id ON public.invoices USING btree (tenant_id);

CREATE INDEX idx_invoices_workspace_created_at ON public.invoices USING btree (workspace_id, created_at DESC);

CREATE INDEX idx_invoices_workspace_id ON public.invoices USING btree (workspace_id);

CREATE INDEX idx_invoices_workspace_issue_date ON public.invoices USING btree (workspace_id, issue_date DESC);

CREATE INDEX idx_invoices_workspace_status ON public.invoices USING btree (workspace_id, status);

CREATE TRIGGER trg_invoices_created_by
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_created_by();

CREATE TRIGGER trg_protect_invoices_property
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_child_property_id();

CREATE POLICY "Users can manage invoices in authorized workspaces or propertie" ON "public"."invoices"
  FOR ALL
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.workspace_members wm
  WHERE ((wm.workspace_id = invoices.workspace_id) AND ((wm.user_id)::text = (auth.uid())::text) AND (wm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text]))))) OR
    ((property_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.properties p
  WHERE (((p.id)::text = (invoices.property_id)::text) AND (((p.owner_id)::text = (auth.uid())::text) OR (EXISTS ( SELECT 1
           FROM public.property_members pm
          WHERE
            (((pm.property_id)::text = (p.id)::text) AND ((pm.user_id)::text = (auth.uid())::text) AND (pm.status = 'active'::text) AND (pm.role = ANY (ARRAY['owner'::text,
            'manager'::text, 'agent'::text])))))))))) OR public.is_platform_admin()));

CREATE POLICY "Users can view invoices in authorized workspaces or properties" ON "public"."invoices"
  FOR SELECT
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.workspace_members wm
  WHERE ((wm.workspace_id = invoices.workspace_id) AND ((wm.user_id)::text = (auth.uid())::text)))) OR ((property_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.properties p
  WHERE (((p.id)::text = (invoices.property_id)::text) AND (((p.owner_id)::text = (auth.uid())::text) OR (EXISTS ( SELECT 1
           FROM public.property_members pm
          WHERE (((pm.property_id)::text = (p.id)::text) AND ((pm.user_id)::text = (auth.uid())::text) AND (pm.status = 'active'::text))))))))) OR public.is_platform_admin()));

CREATE POLICY "inv_delete_draft" ON "public"."invoices"
  FOR DELETE
  TO "authenticated"
  USING (((status = 'draft'::text) AND public.can_write_property(property_id, 'financial.manage'::text)));

CREATE POLICY "inv_insert" ON "public"."invoices"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.can_write_property(property_id, 'financial.manage'::text));

CREATE POLICY "inv_select" ON "public"."invoices"
  FOR SELECT
  TO "authenticated"
  USING ((public.can_access_property(property_id) OR (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE ((tenants.user_id)::text = (auth.uid())::text))) OR public.is_platform_admin()));

CREATE POLICY "inv_update" ON "public"."invoices"
  FOR UPDATE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'financial.manage'::text))
  WITH CHECK (public.can_write_property(property_id, 'financial.manage'::text));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."invoices" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."invoices" TO "postgres", "service_role";


-- Table: lease_tenants
CREATE TABLE "public"."lease_tenants" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "lease_id"    uuid                     NOT NULL,
  "tenant_id"   uuid                     NOT NULL,
  "property_id" uuid                     NOT NULL,
  "role"        text                     NOT NULL DEFAULT 'primary'::text,
  "is_primary"  boolean                  NOT NULL DEFAULT false,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "lease_tenants_lease_id_tenant_id_key" UNIQUE (lease_id, tenant_id),
  CONSTRAINT "lease_tenants_pkey" PRIMARY KEY (id),
  CONSTRAINT "lease_tenants_role_check" CHECK ((role = ANY (ARRAY['primary'::text, 'co-tenant'::text, 'guarantor'::text]))),
  CONSTRAINT "lease_tenants_lease_id_fkey" FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE CASCADE,
  CONSTRAINT "fk_lease_tenants_lease_prop" FOREIGN KEY (lease_id, property_id) REFERENCES public.leases(id, property_id) ON DELETE CASCADE,
  CONSTRAINT "lease_tenants_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT "lease_tenants_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT "fk_lease_tenants_tenant_prop" FOREIGN KEY (tenant_id, property_id) REFERENCES public.tenants(id, property_id) ON DELETE CASCADE
);

ALTER TABLE "public"."lease_tenants"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_lease_tenants_lease_id ON public.lease_tenants USING btree (lease_id);

CREATE INDEX idx_lease_tenants_property_id ON public.lease_tenants USING btree (property_id);

CREATE INDEX idx_lease_tenants_tenant_id ON public.lease_tenants USING btree (tenant_id);

CREATE UNIQUE INDEX uq_lease_primary_tenant ON public.lease_tenants USING btree (lease_id)
  WHERE (is_primary = true);

CREATE POLICY "lt_delete" ON "public"."lease_tenants"
  FOR DELETE
  TO "authenticated"
  USING ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.leases l
  WHERE ((l.id = lease_tenants.lease_id) AND public.can_write_property(l.property_id, 'lease.update'::text))))));

CREATE POLICY "lt_insert" ON "public"."lease_tenants"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.leases l
  WHERE ((l.id = lease_tenants.lease_id) AND public.can_write_property(l.property_id, 'lease.update'::text))))));

CREATE POLICY "lt_select" ON "public"."lease_tenants"
  FOR SELECT
  TO "authenticated"
  USING ((public.is_platform_admin() OR public.can_access_property(property_id) OR (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE ((tenants.user_id)::text = (auth.uid())::text)))));

CREATE POLICY "lt_update" ON "public"."lease_tenants"
  FOR UPDATE
  TO "authenticated"
  USING ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.leases l
  WHERE ((l.id = lease_tenants.lease_id) AND public.can_write_property(l.property_id, 'lease.update'::text))))))
  WITH CHECK ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.leases l
  WHERE ((l.id = lease_tenants.lease_id) AND public.can_write_property(l.property_id, 'lease.update'::text))))));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."lease_tenants" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."lease_tenants" TO "postgres", "service_role";


-- Table: leases
CREATE TABLE "public"."leases" (
  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id"           uuid                     NOT NULL,
  "status"                text                     NOT NULL DEFAULT 'draft'::text,
  "start_date"            date                     NOT NULL,
  "end_date"              date,
  "rent_amount"           numeric(10,2)            NOT NULL,
  "security_deposit"      numeric(10,2)            NOT NULL DEFAULT 0,
  "payment_due_day"       integer                  NOT NULL DEFAULT 1,
  "rent_frequency"        text                     NOT NULL DEFAULT 'monthly'::text,
  "notes"                 text,
  "created_by"            uuid,
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "renewed_from_lease_id" uuid,
  CONSTRAINT "chk_lease_dates" CHECK (((end_date IS NULL) OR (end_date >= start_date))),
  CONSTRAINT "leases_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "leases_payment_due_day_check" CHECK (((payment_due_day >= 1) AND (payment_due_day <= 31))),
  CONSTRAINT "leases_pkey" PRIMARY KEY (id),
  CONSTRAINT "leases_renewed_from_lease_id_fkey" FOREIGN KEY (renewed_from_lease_id) REFERENCES public.leases(id) ON DELETE SET NULL,
  CONSTRAINT "leases_rent_amount_check" CHECK ((rent_amount >= (0)::numeric)),
  CONSTRAINT "leases_rent_frequency_check" CHECK ((rent_frequency = ANY (ARRAY['weekly'::text, 'fortnightly'::text, 'monthly'::text, 'yearly'::text]))),
  CONSTRAINT "leases_security_deposit_check" CHECK ((security_deposit >= (0)::numeric)),
  CONSTRAINT "leases_status_check"
    CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'active'::text, 'expired'::text, 'terminated'::text, 'cancelled'::text, 'renewed'::text]))),
  CONSTRAINT "uq_leases_id_property" UNIQUE (id, property_id),
  CONSTRAINT "leases_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE
);

ALTER TABLE "public"."leases"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_leases_dates ON public.leases USING btree (start_date, end_date);

CREATE INDEX idx_leases_property_created_at ON public.leases USING btree (property_id, created_at DESC);

CREATE INDEX idx_leases_property_id ON public.leases USING btree (property_id);

CREATE INDEX idx_leases_property_status ON public.leases USING btree (property_id, status);

CREATE INDEX idx_leases_renewed_from ON public.leases USING btree (renewed_from_lease_id);

CREATE INDEX idx_leases_status ON public.leases USING btree (status);

CREATE TRIGGER trg_leases_created_by
  BEFORE INSERT OR UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_created_by();

CREATE TRIGGER trg_protect_leases_property
  BEFORE UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_child_property_id();

CREATE POLICY "leases_delete" ON "public"."leases"
  FOR DELETE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'lease.update'::text));

CREATE POLICY "leases_insert" ON "public"."leases"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.can_write_property(property_id, 'lease.update'::text));

CREATE POLICY "leases_select" ON "public"."leases"
  FOR SELECT
  TO "authenticated"
  USING ((public.can_access_property(property_id) OR public.tenant_can_read_lease(id) OR public.is_platform_admin()));

CREATE POLICY "leases_update" ON "public"."leases"
  FOR UPDATE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'lease.update'::text))
  WITH CHECK (public.can_write_property(property_id, 'lease.update'::text));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."leases" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."leases" TO "postgres", "service_role";


-- Table: maintenance_requests
CREATE TABLE "public"."maintenance_requests" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id"  uuid                     NOT NULL,
  "tenant_id"    uuid,
  "assigned_to"  uuid,
  "title"        text                     NOT NULL,
  "description"  text                     NOT NULL,
  "priority"     text                     NOT NULL DEFAULT 'medium'::text,
  "status"       text                     NOT NULL DEFAULT 'open'::text,
  "category"     text,
  "scheduled_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_by"   uuid,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "maintenance_requests_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "maintenance_requests_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY (id),
  CONSTRAINT "maintenance_requests_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
  CONSTRAINT "maintenance_requests_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'scheduled'::text, 'completed'::text, 'cancelled'::text]))),
  CONSTRAINT "maintenance_requests_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT "maintenance_requests_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL,
  CONSTRAINT "fk_maintenance_tenant_prop" FOREIGN KEY (tenant_id, property_id) REFERENCES public.tenants(id, property_id) ON DELETE SET NULL
);

ALTER TABLE "public"."maintenance_requests"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_maintenance_assigned_to ON public.maintenance_requests USING btree (assigned_to);

CREATE INDEX idx_maintenance_priority ON public.maintenance_requests USING btree (priority);

CREATE INDEX idx_maintenance_property_id ON public.maintenance_requests USING btree (property_id);

CREATE INDEX idx_maintenance_status ON public.maintenance_requests USING btree (status);

CREATE INDEX idx_maintenance_tenant_id ON public.maintenance_requests USING btree (tenant_id);

CREATE TRIGGER trg_protect_maintenance_requests_property
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_child_property_id();

CREATE POLICY "mnt_delete" ON "public"."maintenance_requests"
  FOR DELETE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'maintenance.manage'::text));

CREATE POLICY "mnt_insert" ON "public"."maintenance_requests"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.can_write_property(property_id, 'maintenance.manage'::text));

CREATE POLICY "mnt_select" ON "public"."maintenance_requests"
  FOR SELECT
  TO "authenticated"
  USING ((public.can_access_property(property_id) OR (assigned_to = auth.uid()) OR (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (tenants.user_id = auth.uid()))) OR public.is_platform_admin()));

CREATE POLICY "mnt_update" ON "public"."maintenance_requests"
  FOR UPDATE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'maintenance.manage'::text))
  WITH CHECK (public.can_write_property(property_id, 'maintenance.manage'::text));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."maintenance_requests" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."maintenance_requests" TO "postgres", "service_role";


-- Table: notifications
CREATE TABLE "public"."notifications" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"     uuid                     NOT NULL,
  "property_id" uuid,
  "type"        text                     NOT NULL,
  "title"       text                     NOT NULL,
  "message"     text                     NOT NULL,
  "read_at"     timestamp with time zone,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "notifications_pkey" PRIMARY KEY (id),
  CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "notifications_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE
);

ALTER TABLE "public"."notifications"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);

CREATE INDEX idx_notifications_property_id ON public.notifications USING btree (property_id);

CREATE INDEX idx_notifications_read_at ON public.notifications USING btree (read_at);

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

CREATE TRIGGER trg_protect_notifications
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_notifications_read_state();

CREATE POLICY "notif_insert_managers" ON "public"."notifications"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((public.is_platform_admin() OR ((property_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.properties p
  WHERE (((p.id)::text = p.property_id) AND (((p.owner_id)::text = (auth.uid())::text) OR (EXISTS ( SELECT 1
           FROM public.property_members pm
          WHERE
            (((pm.property_id)::text = (p.id)::text) AND ((pm.user_id)::text = (auth.uid())::text) AND (pm.status = 'active'::text) AND (pm.role = ANY (ARRAY['owner'::text,
            'manager'::text, 'agent'::text]))))) OR (EXISTS ( SELECT 1
           FROM public.workspace_members wm
          WHERE
            (((wm.workspace_id)::text = (p.workspace_id)::text) AND ((wm.user_id)::text = (auth.uid())::text) AND (wm.status = 'active'::text) AND (wm.role = ANY
            (ARRAY['owner'::text, 'admin'::text, 'manager'::text]))))))))))));

CREATE POLICY "notif_select" ON "public"."notifications"
  FOR SELECT
  TO "authenticated"
  USING ((user_id = auth.uid()));

CREATE POLICY "notif_update_read" ON "public"."notifications"
  FOR UPDATE
  TO "authenticated"
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

GRANT SELECT, UPDATE ON TABLE "public"."notifications" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notifications" TO "postgres", "service_role";


-- Table: payment_proofs
CREATE TABLE "public"."payment_proofs" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "payment_id"       uuid                     NOT NULL,
  "storage_path"     text                     NOT NULL,
  "file_name"        text                     NOT NULL,
  "mime_type"        text                     NOT NULL,
  "file_size"        integer                  NOT NULL,
  "file_preview_url" text,
  "uploaded_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "chk_payment_proofs_mime" CHECK ((mime_type = ANY (ARRAY['application/pdf'::text, 'image/png'::text, 'image/jpeg'::text, 'image/jpg'::text]))),
  CONSTRAINT "chk_payment_proofs_size" CHECK (((file_size > 0) AND (file_size <= 5242880))),
  CONSTRAINT "payment_proofs_pkey" PRIMARY KEY (id),
  CONSTRAINT "payment_proofs_payment_id_fkey" FOREIGN KEY (payment_id) REFERENCES public.subscription_payments(id) ON DELETE CASCADE
);

ALTER TABLE "public"."payment_proofs"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_payment_proofs_payment_id ON public.payment_proofs USING btree (payment_id);

CREATE POLICY "proofs_insert_own" ON "public"."payment_proofs"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.subscription_payments sp
  WHERE ((sp.id = payment_proofs.payment_id) AND (sp.account_id = auth.uid()))))));

CREATE POLICY "proofs_select_own" ON "public"."payment_proofs"
  FOR SELECT
  TO "authenticated"
  USING ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.subscription_payments sp
  WHERE ((sp.id = payment_proofs.payment_id) AND (sp.account_id = auth.uid()))))));

GRANT INSERT, SELECT ON TABLE "public"."payment_proofs" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."payment_proofs" TO "postgres", "service_role";


-- Table: permissions
CREATE TABLE "public"."permissions" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "key"         text                     NOT NULL,
  "name"        text                     NOT NULL,
  "description" text,
  "scope"       text                     NOT NULL,
  "resource"    text                     NOT NULL,
  "action"      text                     NOT NULL,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "permissions_key_key" UNIQUE (key),
  CONSTRAINT "permissions_pkey" PRIMARY KEY (id),
  CONSTRAINT "permissions_scope_check" CHECK ((scope = ANY (ARRAY['PLATFORM'::text, 'TEAM'::text])))
);

ALTER TABLE "public"."permissions"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_permissions_key ON public.permissions USING btree (key);

CREATE INDEX idx_permissions_scope ON public.permissions USING btree (scope);

CREATE POLICY "permissions_select" ON "public"."permissions"
  FOR SELECT
  TO "authenticated"
  USING (true);

GRANT SELECT ON TABLE "public"."permissions" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."permissions" TO "postgres", "service_role";


-- Table: plan_entitlements
CREATE TABLE "public"."plan_entitlements" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "plan_id"        uuid                     NOT NULL,
  "entitlement_id" uuid                     NOT NULL,
  "value"          jsonb                    NOT NULL,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "plan_entitlements_entitlement_id_fkey" FOREIGN KEY (entitlement_id) REFERENCES public.entitlements(id) ON DELETE CASCADE,
  CONSTRAINT "plan_entitlements_pkey" PRIMARY KEY (id),
  CONSTRAINT "unique_plan_entitlement" UNIQUE (plan_id, entitlement_id),
  CONSTRAINT "plan_entitlements_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE CASCADE
);

ALTER TABLE "public"."plan_entitlements"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_plan_entitlements_entitlement_id ON public.plan_entitlements USING btree (entitlement_id);

CREATE INDEX idx_plan_entitlements_plan_id ON public.plan_entitlements USING btree (plan_id);

CREATE POLICY "plan_entitlements_admin_del" ON "public"."plan_entitlements"
  FOR DELETE
  TO "authenticated"
  USING (public.is_platform_admin());

CREATE POLICY "plan_entitlements_admin_ins" ON "public"."plan_entitlements"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "plan_entitlements_admin_upd" ON "public"."plan_entitlements"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "plan_entitlements_select" ON "public"."plan_entitlements"
  FOR SELECT
  TO "authenticated"
  USING (true);

GRANT SELECT ON TABLE "public"."plan_entitlements" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plan_entitlements" TO "postgres", "service_role";


-- Table: platform_admins
CREATE TABLE "public"."platform_admins" (
  "user_id"    uuid                     NOT NULL,
  "status"     text                     NOT NULL DEFAULT 'active'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "notes"      text,
  CONSTRAINT "platform_admins_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "platform_admins_pkey" PRIMARY KEY (user_id),
  CONSTRAINT "platform_admins_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'revoked'::text]))),
  CONSTRAINT "platform_admins_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE "public"."platform_admins"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."platform_admins"
  FORCE ROW LEVEL SECURITY;

CREATE INDEX idx_platform_admins_status ON public.platform_admins USING btree (status);

CREATE TRIGGER trg_protect_platform_admins
  BEFORE INSERT OR DELETE OR UPDATE ON public.platform_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_platform_admins_mutations();

CREATE POLICY "platform_admins_select_admin" ON "public"."platform_admins"
  FOR SELECT
  TO "authenticated"
  USING (public.is_platform_admin());

CREATE POLICY "platform_admins_select_own" ON "public"."platform_admins"
  FOR SELECT
  TO "authenticated"
  USING ((user_id = auth.uid()));

GRANT SELECT ON TABLE "public"."platform_admins" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."platform_admins" TO "postgres", "service_role";


-- Table: platform_role_permissions
CREATE TABLE "public"."platform_role_permissions" (
  "id"            uuid NOT NULL DEFAULT gen_random_uuid(),
  "role_id"       uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  CONSTRAINT "platform_role_permissions_permission_id_fkey" FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE,
  CONSTRAINT "platform_role_permissions_pkey" PRIMARY KEY (id),
  CONSTRAINT "platform_role_permissions_role_id_permission_id_key" UNIQUE (role_id, permission_id),
  CONSTRAINT "platform_role_permissions_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.platform_roles(id) ON DELETE CASCADE
);

ALTER TABLE "public"."platform_role_permissions"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_platform_role_permissions_perm ON public.platform_role_permissions USING btree (permission_id);

CREATE INDEX idx_platform_role_permissions_role ON public.platform_role_permissions USING btree (role_id);

CREATE POLICY "platform_role_perms_select" ON "public"."platform_role_permissions"
  FOR SELECT
  TO "authenticated"
  USING ((public.has_platform_permission('platform_role.view'::text) OR public.is_platform_admin()));

GRANT SELECT ON TABLE "public"."platform_role_permissions" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."platform_role_permissions" TO "postgres", "service_role";


-- Table: platform_roles
CREATE TABLE "public"."platform_roles" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"           text                     NOT NULL,
  "description"    text,
  "is_system_role" boolean                  NOT NULL DEFAULT false,
  "created_by"     uuid,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "platform_roles_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "platform_roles_name_key" UNIQUE (name),
  CONSTRAINT "platform_roles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."platform_roles"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_roles_select" ON "public"."platform_roles"
  FOR SELECT
  TO "authenticated"
  USING ((public.has_platform_permission('platform_role.view'::text) OR public.is_platform_admin()));

GRANT SELECT ON TABLE "public"."platform_roles" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."platform_roles" TO "postgres", "service_role";


-- Table: platform_user_roles
CREATE TABLE "public"."platform_user_roles" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid                     NOT NULL,
  "role_id"    uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "platform_user_roles_pkey" PRIMARY KEY (id),
  CONSTRAINT "platform_user_roles_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.platform_roles(id) ON DELETE CASCADE,
  CONSTRAINT "platform_user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "platform_user_roles_user_id_role_id_key" UNIQUE (user_id, role_id)
);

ALTER TABLE "public"."platform_user_roles"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_platform_user_roles_user ON public.platform_user_roles USING btree (user_id);

CREATE POLICY "platform_user_roles_select" ON "public"."platform_user_roles"
  FOR SELECT
  TO "authenticated"
  USING ((((user_id)::text = (auth.uid())::text) OR public.has_platform_permission('user.view'::text) OR public.is_platform_admin()));

GRANT SELECT ON TABLE "public"."platform_user_roles" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."platform_user_roles" TO "postgres", "service_role";


-- Table: profiles
CREATE TABLE "public"."profiles" (
  "id"         uuid                     NOT NULL,
  "full_name"  text,
  "phone"      text,
  "avatar_url" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "public_id"  text                     NOT NULL,
  CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_profiles_id ON public.profiles USING btree (id);

CREATE UNIQUE INDEX uq_profiles_public_id ON public.profiles USING btree (public_id);

CREATE TRIGGER trg_profiles_set_public_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_profiles_set_public_id();

CREATE POLICY "Public profiles are viewable by authenticated" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Users can insert own profile" ON "public"."profiles"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((auth.uid() = id));

CREATE POLICY "profiles_select_admin" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (public.is_platform_admin());

CREATE POLICY "profiles_select_own" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING ((auth.uid() = id));

CREATE POLICY "profiles_update_own" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ((auth.uid() = id))
  WITH CHECK ((auth.uid() = id));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."profiles" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "postgres", "service_role";

COMMENT ON COLUMN "public"."profiles"."avatar_url" IS 'URL or seed reference for user avatar image. Defaults to deterministic DiceBear avatar if NULL.';


-- Table: properties
CREATE TABLE "public"."properties" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id"      uuid                     NOT NULL,
  "owner_id"          uuid                     NOT NULL,
  "name"              text                     NOT NULL,
  "property_type"     text,
  "status"            text                     NOT NULL DEFAULT 'active'::text,
  "address_line_1"    text                     NOT NULL,
  "address_line_2"    text,
  "city"              text                     NOT NULL,
  "state"             text                     NOT NULL,
  "postal_code"       text                     NOT NULL,
  "country"           text                     NOT NULL DEFAULT 'Australia'::text,
  "latitude"          numeric(10,8),
  "longitude"         numeric(11,8),
  "description"       text,
  "image_url"         text,
  "bedrooms"          integer,
  "bathrooms"         numeric(3,1),
  "parking_spaces"    integer,
  "square_feet"       numeric(10,2),
  "purchase_price"    numeric(12,2),
  "purchase_date"     date,
  "notes"             text,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "property_category" text,
  "rent_amount"       numeric(10,2),
  "payment_frequency" text                     DEFAULT 'Weekly'::text,
  "property_id"       text,
  "suburb"            text,
  "postcode"          text,
  "car_spaces"        integer                  DEFAULT 0,
  "tenant_name"       text,
  "tenant_email"      text,
  "lease_start"       date,
  "lease_duration"    text,
  "deleted_at"        timestamp with time zone,
  CONSTRAINT "properties_bathrooms_check" CHECK ((bathrooms >= (0)::numeric)),
  CONSTRAINT "properties_bedrooms_check" CHECK ((bedrooms >= 0)),
  CONSTRAINT "properties_car_spaces_check" CHECK ((car_spaces >= 0)),
  CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT "properties_parking_spaces_check" CHECK ((parking_spaces >= 0)),
  CONSTRAINT "properties_pkey" PRIMARY KEY (id),
  CONSTRAINT "properties_property_category_check" CHECK ((property_category = ANY (ARRAY['Residential'::text, 'Commercial'::text]))),
  CONSTRAINT "properties_purchase_price_check" CHECK ((purchase_price >= (0)::numeric)),
  CONSTRAINT "properties_rent_amount_check" CHECK ((rent_amount >= (0)::numeric)),
  CONSTRAINT "properties_square_feet_check" CHECK ((square_feet >= (0)::numeric)),
  CONSTRAINT "properties_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text, 'maintenance'::text]))),
  CONSTRAINT "uq_properties_id_workspace" UNIQUE (id, workspace_id),
  CONSTRAINT "properties_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."properties"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_properties_owner_id ON public.properties USING btree (owner_id);

CREATE INDEX idx_properties_status ON public.properties USING btree (status);

CREATE INDEX idx_properties_workspace_created ON public.properties USING btree (workspace_id, created_at DESC);

CREATE INDEX idx_properties_workspace_id ON public.properties USING btree (workspace_id);

CREATE INDEX idx_properties_workspace_status ON public.properties USING btree (workspace_id, status);

CREATE TRIGGER trg_property_owner_in_workspace
  BEFORE INSERT OR UPDATE OF workspace_id, owner_id ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_property_owner_in_workspace();

CREATE TRIGGER trg_sync_property_workspace_team_access
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_property_workspace_team_access();

CREATE POLICY "prop_delete" ON "public"."properties"
  FOR DELETE
  TO "authenticated"
  USING ((public.owns_property(id) OR public.is_platform_admin()));

CREATE POLICY "prop_insert" ON "public"."properties"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((((owner_id)::text = (( SELECT auth.uid() AS uid))::text) AND public.user_owns_or_member_workspace(workspace_id)));

CREATE POLICY "prop_select" ON "public"."properties"
  FOR SELECT
  TO "authenticated"
  USING ((public.can_access_property(id) OR (id IN ( SELECT tenants.property_id
   FROM public.tenants
  WHERE ((tenants.user_id)::text = (auth.uid())::text))) OR public.is_platform_admin()));

CREATE POLICY "prop_update" ON "public"."properties"
  FOR UPDATE
  TO "authenticated"
  USING (public.can_write_property(id, 'property.update'::text))
  WITH CHECK (public.can_write_property(id, 'property.update'::text));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."properties" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."properties" TO "postgres", "service_role";

COMMENT ON COLUMN "public"."properties"."car_spaces" IS 'Car parking spaces';

COMMENT ON COLUMN "public"."properties"."payment_frequency" IS 'Rent payment frequency: Weekly, Fortnightly, or Monthly';

COMMENT ON COLUMN "public"."properties"."property_category" IS 'Property category: Residential or Commercial';

COMMENT ON COLUMN "public"."properties"."property_id" IS 'Custom identifier string e.g. PL-1024';

COMMENT ON COLUMN "public"."properties"."rent_amount" IS 'Advertised rent amount';


-- Table: property_members
CREATE TABLE "public"."property_members" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id" uuid                     NOT NULL,
  "user_id"     uuid                     NOT NULL,
  "role"        text                     NOT NULL DEFAULT 'viewer'::text,
  "status"      text                     NOT NULL DEFAULT 'invited'::text,
  "invited_by"  uuid,
  "joined_at"   timestamp with time zone,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "property_members_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "property_members_pkey" PRIMARY KEY (id),
  CONSTRAINT "property_members_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT "property_members_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'manager'::text, 'agent'::text, 'staff'::text, 'viewer'::text]))),
  CONSTRAINT "property_members_status_check" CHECK ((status = ANY (ARRAY['invited'::text, 'active'::text, 'suspended'::text, 'removed'::text]))),
  CONSTRAINT "property_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "uq_property_members_prop_user" UNIQUE (property_id, user_id)
);

ALTER TABLE "public"."property_members"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_property_members_prop_id ON public.property_members USING btree (property_id);

CREATE INDEX idx_property_members_status ON public.property_members USING btree (status);

CREATE INDEX idx_property_members_user_id ON public.property_members USING btree (user_id);

CREATE POLICY "pm_delete" ON "public"."property_members"
  FOR DELETE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'team.manage_members'::text));

CREATE POLICY "pm_insert" ON "public"."property_members"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((public.is_platform_admin() OR public.owns_property(property_id) OR public.can_write_property(property_id, 'team.manage_members'::text) OR (EXISTS ( SELECT 1
   FROM public.properties p
  WHERE (((p.id)::text = p.property_id) AND ((p.owner_id)::text = (( SELECT auth.uid() AS uid))::text))))));

CREATE POLICY "pm_select" ON "public"."property_members"
  FOR SELECT
  TO "authenticated"
  USING (((user_id = auth.uid()) OR public.owns_property(property_id) OR public.has_property_permission(property_id, 'team.view'::text) OR public.is_platform_admin()));

CREATE POLICY "pm_update" ON "public"."property_members"
  FOR UPDATE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'team.manage_members'::text))
  WITH CHECK (public.can_write_property(property_id, 'team.manage_members'::text));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."property_members" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."property_members" TO "postgres", "service_role";


-- Table: subscription_events
CREATE TABLE "public"."subscription_events" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "account_id"        uuid,
  "provider"          text                     NOT NULL DEFAULT 'stripe'::text,
  "provider_event_id" text                     NOT NULL,
  "event_type"        text                     NOT NULL,
  "payload"           jsonb                    NOT NULL,
  "status"            text                     NOT NULL DEFAULT 'processed'::text,
  "processed_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "subscription_events_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.account_context(user_id) ON DELETE SET NULL,
  CONSTRAINT "subscription_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "subscription_events_provider_event_id_key" UNIQUE (provider_event_id),
  CONSTRAINT "subscription_events_status_check" CHECK ((status = ANY (ARRAY['received'::text, 'processed'::text, 'failed'::text])))
);

ALTER TABLE "public"."subscription_events"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_subscription_events_account_id ON public.subscription_events USING btree (account_id);

CREATE INDEX idx_subscription_events_created_at ON public.subscription_events USING btree (created_at DESC);

CREATE INDEX idx_subscription_events_event_id ON public.subscription_events USING btree (provider_event_id);

CREATE POLICY "sub_events_admin" ON "public"."subscription_events"
  FOR SELECT
  TO "authenticated"
  USING (public.is_platform_admin());

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."subscription_events" TO "postgres", "service_role";


-- Table: subscription_payments
CREATE TABLE "public"."subscription_payments" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "subscription_id"  uuid                     NOT NULL,
  "account_id"       uuid                     NOT NULL,
  "reference"        text                     NOT NULL,
  "expected_amount"  numeric(10,2)            NOT NULL,
  "submitted_amount" numeric(10,2),
  "currency"         text                     NOT NULL DEFAULT 'AUD'::text,
  "payment_date"     date,
  "transaction_id"   text,
  "status"           text                     NOT NULL DEFAULT 'pending'::text,
  "submitted_at"     timestamp with time zone,
  "verified_at"      timestamp with time zone,
  "verified_by"      uuid,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "subscription_payments_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.account_context(user_id) ON DELETE CASCADE,
  CONSTRAINT "subscription_payments_pkey" PRIMARY KEY (id),
  CONSTRAINT "subscription_payments_reference_key" UNIQUE (reference),
  CONSTRAINT "subscription_payments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'under_review'::text, 'verified'::text, 'rejected'::text]))),
  CONSTRAINT "subscription_payments_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES auth.users(id),
  CONSTRAINT "subscription_payments_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  CONSTRAINT "fk_subscription_payments_sub_account" FOREIGN KEY (subscription_id, account_id) REFERENCES public.subscriptions(id, account_id) ON DELETE CASCADE
);

ALTER TABLE "public"."subscription_payments"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_subscription_payments_account_id ON public.subscription_payments USING btree (account_id);

CREATE INDEX idx_subscription_payments_reference ON public.subscription_payments USING btree (reference);

CREATE INDEX idx_subscription_payments_status ON public.subscription_payments USING btree (status);

CREATE INDEX idx_subscription_payments_subscription_id ON public.subscription_payments USING btree (subscription_id);

CREATE TRIGGER trg_protect_subscription_payments
  BEFORE DELETE OR UPDATE ON public.subscription_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_subscription_payment_client();

CREATE POLICY "subpay_admin_ins" ON "public"."subscription_payments"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "subpay_admin_upd" ON "public"."subscription_payments"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "subpay_select_own" ON "public"."subscription_payments"
  FOR SELECT
  TO "authenticated"
  USING (((auth.uid() = account_id) OR public.is_platform_admin()));

GRANT SELECT ON TABLE "public"."subscription_payments" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."subscription_payments" TO "postgres", "service_role";


-- Table: subscription_plans
CREATE TABLE "public"."subscription_plans" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"              text                     NOT NULL,
  "slug"              text                     NOT NULL,
  "description"       text,
  "status"            text                     NOT NULL DEFAULT 'active'::text,
  "display_order"     integer                  NOT NULL DEFAULT 0,
  "price_cents"       integer                  NOT NULL DEFAULT 0,
  "billing_interval"  text                     NOT NULL DEFAULT 'monthly'::text,
  "provider_price_id" text,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "subscription_plans_billing_interval_check" CHECK ((billing_interval = ANY (ARRAY['monthly'::text, 'yearly'::text]))),
  CONSTRAINT "subscription_plans_pkey" PRIMARY KEY (id),
  CONSTRAINT "subscription_plans_slug_key" UNIQUE (slug),
  CONSTRAINT "subscription_plans_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])))
);

ALTER TABLE "public"."subscription_plans"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_subscription_plans_slug ON public.subscription_plans USING btree (slug);

CREATE INDEX idx_subscription_plans_status ON public.subscription_plans USING btree (status);

CREATE POLICY "plans_admin_del" ON "public"."subscription_plans"
  FOR DELETE
  TO "authenticated"
  USING (public.is_platform_admin());

CREATE POLICY "plans_admin_ins" ON "public"."subscription_plans"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "plans_admin_upd" ON "public"."subscription_plans"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "plans_select_active" ON "public"."subscription_plans"
  FOR SELECT
  TO "authenticated"
  USING (((status = 'active'::text) OR public.is_platform_admin()));

GRANT SELECT ON TABLE "public"."subscription_plans" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."subscription_plans" TO "postgres", "service_role";


-- Table: subscriptions
CREATE TABLE "public"."subscriptions" (
  "id"                       uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "account_id"               uuid                     NOT NULL,
  "plan_id"                  uuid                     NOT NULL,
  "status"                   text                     NOT NULL DEFAULT 'active'::text,
  "current_period_start"     timestamp with time zone,
  "current_period_end"       timestamp with time zone,
  "cancel_at_period_end"     boolean                  NOT NULL DEFAULT false,
  "canceled_at"              timestamp with time zone,
  "trial_start"              timestamp with time zone,
  "trial_end"                timestamp with time zone,
  "provider"                 text                     DEFAULT 'stripe'::text,
  "provider_customer_id"     text,
  "provider_subscription_id" text,
  "created_at"               timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"               timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "subscriptions_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.account_context(user_id) ON DELETE CASCADE,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY (id),
  CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  CONSTRAINT "subscriptions_status_check"
    CHECK
    ((status = ANY (ARRAY['draft'::text, 'pending_payment'::text, 'under_review'::text, 'trialing'::text, 'active'::text, 'past_due'::text, 'paused'::text, 'canceled'::text,
    'expired'::text]))),
  CONSTRAINT "uq_subscriptions_id_account" UNIQUE (id, account_id)
);

ALTER TABLE "public"."subscriptions"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_subscriptions_account_id ON public.subscriptions USING btree (account_id);

CREATE INDEX idx_subscriptions_plan_id ON public.subscriptions USING btree (plan_id);

CREATE INDEX idx_subscriptions_provider_sub_id ON public.subscriptions USING btree (provider_subscription_id);

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);

CREATE UNIQUE INDEX uq_subscriptions_one_checkout_current ON public.subscriptions USING btree (account_id)
  WHERE (status = ANY (ARRAY['pending_payment'::text, 'under_review'::text]));

CREATE UNIQUE INDEX uq_subscriptions_one_entitlement_current ON public.subscriptions USING btree (account_id)
  WHERE (status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'paused'::text]));

CREATE TRIGGER trg_ensure_single_current_subscription
  BEFORE INSERT OR UPDATE OF status ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_current_subscription();

CREATE POLICY "subs_admin_del" ON "public"."subscriptions"
  FOR DELETE
  TO "authenticated"
  USING (public.is_platform_admin());

CREATE POLICY "subs_admin_ins" ON "public"."subscriptions"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "subs_admin_upd" ON "public"."subscriptions"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "subs_select_own" ON "public"."subscriptions"
  FOR SELECT
  TO "authenticated"
  USING (((auth.uid() = account_id) OR public.is_platform_admin()));

GRANT SELECT ON TABLE "public"."subscriptions" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."subscriptions" TO "postgres", "service_role";


-- Table: tasks
CREATE TABLE "public"."tasks" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id"  uuid                     NOT NULL,
  "assigned_to"  uuid,
  "created_by"   uuid,
  "title"        text                     NOT NULL,
  "description"  text,
  "priority"     text                     NOT NULL DEFAULT 'medium'::text,
  "status"       text                     NOT NULL DEFAULT 'pending'::text,
  "due_date"     date,
  "completed_at" timestamp with time zone,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "tasks_pkey" PRIMARY KEY (id),
  CONSTRAINT "tasks_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
  CONSTRAINT "tasks_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT "tasks_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
);

ALTER TABLE "public"."tasks"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_tasks_assigned_to ON public.tasks USING btree (assigned_to);

CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date);

CREATE INDEX idx_tasks_property_id ON public.tasks USING btree (property_id);

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);

CREATE TRIGGER trg_protect_tasks_property
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_child_property_id();

CREATE POLICY "task_delete" ON "public"."tasks"
  FOR DELETE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'task.create'::text));

CREATE POLICY "task_insert" ON "public"."tasks"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.can_write_property(property_id, 'task.create'::text));

CREATE POLICY "task_select" ON "public"."tasks"
  FOR SELECT
  TO "authenticated"
  USING ((public.can_access_property(property_id) OR (assigned_to = auth.uid()) OR (created_by = auth.uid()) OR public.is_platform_admin()));

CREATE POLICY "task_update" ON "public"."tasks"
  FOR UPDATE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'task.create'::text))
  WITH CHECK (public.can_write_property(property_id, 'task.create'::text));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."tasks" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tasks" TO "postgres", "service_role";


-- Table: team_role_permissions
CREATE TABLE "public"."team_role_permissions" (
  "id"            uuid NOT NULL DEFAULT gen_random_uuid(),
  "role_id"       uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  CONSTRAINT "team_role_permissions_permission_id_fkey" FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE,
  CONSTRAINT "team_role_permissions_pkey" PRIMARY KEY (id),
  CONSTRAINT "team_role_permissions_role_id_permission_id_key" UNIQUE (role_id, permission_id),
  CONSTRAINT "team_role_permissions_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.team_roles(id) ON DELETE CASCADE
);

ALTER TABLE "public"."team_role_permissions"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_team_role_permissions_perm ON public.team_role_permissions USING btree (permission_id);

CREATE INDEX idx_team_role_permissions_role ON public.team_role_permissions USING btree (role_id);

CREATE POLICY "team_role_perms_select" ON "public"."team_role_permissions"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.team_roles tr
  WHERE ((tr.id = team_role_permissions.role_id) AND ((tr.workspace_id IS NULL) OR public.can_access_workspace(tr.workspace_id))))));

GRANT SELECT ON TABLE "public"."team_role_permissions" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."team_role_permissions" TO "postgres", "service_role";


-- Table: team_roles
CREATE TABLE "public"."team_roles" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id"   uuid,
  "name"           text                     NOT NULL,
  "description"    text,
  "is_system_role" boolean                  NOT NULL DEFAULT false,
  "created_by"     uuid,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "chk_team_role_scope" CHECK ((((is_system_role = true) AND (workspace_id IS NULL)) OR ((is_system_role = false) AND (workspace_id IS NOT NULL)))),
  CONSTRAINT "team_roles_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "team_roles_pkey" PRIMARY KEY (id),
  CONSTRAINT "team_roles_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."team_roles"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_team_roles_workspace_id ON public.team_roles USING btree (workspace_id);

CREATE UNIQUE INDEX uq_team_roles_system_name ON public.team_roles USING btree (lower(name))
  WHERE (workspace_id IS NULL);

CREATE UNIQUE INDEX uq_team_roles_workspace_name ON public.team_roles USING btree (workspace_id, lower(name))
  WHERE (workspace_id IS NOT NULL);

CREATE POLICY "team_roles_select" ON "public"."team_roles"
  FOR SELECT
  TO "authenticated"
  USING (((workspace_id IS NULL) OR public.can_access_workspace(workspace_id) OR public.has_platform_permission('team_role.view'::text)));

GRANT SELECT ON TABLE "public"."team_roles" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."team_roles" TO "postgres", "service_role";


-- Table: tenants
CREATE TABLE "public"."tenants" (
  "id"                      uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id"             uuid                     NOT NULL,
  "user_id"                 uuid,
  "first_name"              text                     NOT NULL,
  "last_name"               text                     NOT NULL,
  "email"                   text                     NOT NULL,
  "phone"                   text,
  "status"                  text                     NOT NULL DEFAULT 'active'::text,
  "date_of_birth"           date,
  "emergency_contact_name"  text,
  "emergency_contact_phone" text,
  "notes"                   text,
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"              timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "tenants_pkey" PRIMARY KEY (id),
  CONSTRAINT "tenants_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT "tenants_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text, 'prospect'::text]))),
  CONSTRAINT "tenants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "uq_tenants_id_property" UNIQUE (id, property_id)
);

ALTER TABLE "public"."tenants"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_tenants_email ON public.tenants USING btree (email);

CREATE INDEX idx_tenants_property_created_at ON public.tenants USING btree (property_id, created_at DESC);

CREATE INDEX idx_tenants_property_id ON public.tenants USING btree (property_id);

CREATE INDEX idx_tenants_property_status ON public.tenants USING btree (property_id, status);

CREATE INDEX idx_tenants_status ON public.tenants USING btree (status);

CREATE INDEX idx_tenants_user_id ON public.tenants USING btree (user_id);

CREATE TRIGGER trg_protect_tenants_property
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_child_property_id();

CREATE POLICY "tenants_delete" ON "public"."tenants"
  FOR DELETE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'tenant.update'::text));

CREATE POLICY "tenants_insert" ON "public"."tenants"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.can_write_property(property_id, 'tenant.update'::text));

CREATE POLICY "tenants_select" ON "public"."tenants"
  FOR SELECT
  TO "authenticated"
  USING ((public.can_access_property(property_id) OR (user_id = auth.uid()) OR public.is_platform_admin()));

CREATE POLICY "tenants_update" ON "public"."tenants"
  FOR UPDATE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'tenant.update'::text))
  WITH CHECK (public.can_write_property(property_id, 'tenant.update'::text));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."tenants" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tenants" TO "postgres", "service_role";


-- Table: transactions
CREATE TABLE "public"."transactions" (
  "id"                      uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "amount"                  numeric(12,4)            NOT NULL,
  "transaction_type"        text                     NOT NULL,
  "transaction_category_id" uuid                     NOT NULL,
  "transaction_date"        date                     NOT NULL DEFAULT CURRENT_DATE,
  "payment_method"          text,
  "description"             text,
  "reference"               text,
  "vendor_name"             text,
  "notes"                   text,
  "status"                  text                     NOT NULL DEFAULT 'completed'::text,
  "tenant_id"               uuid,
  "lease_id"                uuid,
  "invoice_id"              uuid,
  "property_id"             uuid                     NOT NULL,
  "workspace_id"            uuid                     NOT NULL,
  "created_by"              uuid,
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"              timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "fk_transactions_category_type" FOREIGN KEY (transaction_category_id, transaction_type) REFERENCES public.categories(id, transaction_type) ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT "transactions_amount_check" CHECK ((amount > (0)::numeric)),
  CONSTRAINT "transactions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT "transactions_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL,
  CONSTRAINT "transactions_lease_id_fkey" FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE SET NULL,
  CONSTRAINT "transactions_pkey" PRIMARY KEY (id),
  CONSTRAINT "transactions_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT "transactions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'reversed'::text, 'refunded'::text]))),
  CONSTRAINT "transactions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL,
  CONSTRAINT "transactions_transaction_type_check" CHECK ((transaction_type = ANY (ARRAY['income'::text, 'expense'::text]))),
  CONSTRAINT "transactions_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."transactions"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_transactions_category ON public.transactions USING btree (transaction_category_id);

CREATE INDEX idx_transactions_invoice ON public.transactions USING btree (invoice_id)
  WHERE (invoice_id IS NOT NULL);

CREATE INDEX idx_transactions_lease ON public.transactions USING btree (lease_id)
  WHERE (lease_id IS NOT NULL);

CREATE INDEX idx_transactions_property_date ON public.transactions USING btree (property_id, transaction_date DESC);

CREATE INDEX idx_transactions_tenant ON public.transactions USING btree (tenant_id)
  WHERE (tenant_id IS NOT NULL);

CREATE INDEX idx_transactions_type_status ON public.transactions USING btree (transaction_type, status);

CREATE INDEX idx_transactions_workspace_date ON public.transactions USING btree (workspace_id, transaction_date DESC);

CREATE POLICY "Users can delete transactions for authorized properties" ON "public"."transactions"
  FOR DELETE
  TO "authenticated"
  USING ((public.can_access_workspace(workspace_id) AND public.can_write_property(property_id, 'financial.manage'::text)));

CREATE POLICY "Users can insert transactions for authorized properties" ON "public"."transactions"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((public.can_access_workspace(workspace_id) AND public.can_write_property(property_id, 'financial.manage'::text)));

CREATE POLICY "Users can read transactions for authorized properties" ON "public"."transactions"
  FOR SELECT
  TO "authenticated"
  USING (((public.can_access_workspace(workspace_id) AND public.can_access_property(property_id)) OR (tenant_id IN ( SELECT t.id
   FROM public.tenants t
  WHERE (t.user_id = auth.uid()))) OR public.is_platform_admin()));

CREATE POLICY "Users can update transactions for authorized properties" ON "public"."transactions"
  FOR UPDATE
  TO "authenticated"
  USING ((public.can_access_workspace(workspace_id) AND public.can_write_property(property_id, 'financial.manage'::text)))
  WITH CHECK ((public.can_access_workspace(workspace_id) AND public.can_write_property(property_id, 'financial.manage'::text)));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."transactions" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."transactions" TO "postgres", "service_role";


-- Table: workspace_invitations
CREATE TABLE "public"."workspace_invitations" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid                     NOT NULL,
  "invited_by"   uuid                     NOT NULL,
  "email"        text,
  "profile_id"   uuid,
  "role_id"      uuid                     NOT NULL,
  "token_hash"   text,
  "invite_type"  text                     NOT NULL,
  "status"       text                     NOT NULL DEFAULT 'pending'::text,
  "expires_at"   timestamp with time zone NOT NULL,
  "accepted_at"  timestamp with time zone,
  "accepted_by"  uuid,
  "revoked_at"   timestamp with time zone,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "workspace_invitations_accepted_by_fkey" FOREIGN KEY (accepted_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "workspace_invitations_invite_type_check" CHECK ((invite_type = ANY (ARRAY['LINK'::text, 'DIRECT_PROFILE'::text, 'EMAIL'::text]))),
  CONSTRAINT "workspace_invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY (id),
  CONSTRAINT "workspace_invitations_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT "workspace_invitations_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.team_roles(id) ON DELETE RESTRICT,
  CONSTRAINT "workspace_invitations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'revoked'::text]))),
  CONSTRAINT "workspace_invitations_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."workspace_invitations"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_workspace_invitations_expires ON public.workspace_invitations USING btree (expires_at);

CREATE INDEX idx_workspace_invitations_status ON public.workspace_invitations USING btree (status);

CREATE INDEX idx_workspace_invitations_workspace ON public.workspace_invitations USING btree (workspace_id);

CREATE UNIQUE INDEX uq_workspace_invitations_token_hash ON public.workspace_invitations USING btree (token_hash)
  WHERE (token_hash IS NOT NULL);

CREATE POLICY "workspace_invitations_deny" ON "public"."workspace_invitations"
  FOR ALL
  TO "authenticated"
  USING (false);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."workspace_invitations" TO "postgres", "service_role";


-- Table: workspace_members
CREATE TABLE "public"."workspace_members" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid                     NOT NULL,
  "user_id"      uuid                     NOT NULL,
  "role"         text                     NOT NULL DEFAULT 'viewer'::text,
  "status"       text                     NOT NULL DEFAULT 'invited'::text,
  "invited_by"   uuid,
  "joined_at"    timestamp with time zone,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "role_id"      uuid,
  CONSTRAINT "uq_workspace_members_ws_user" UNIQUE (workspace_id, user_id),
  CONSTRAINT "workspace_members_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "workspace_members_pkey" PRIMARY KEY (id),
  CONSTRAINT "workspace_members_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'agent'::text, 'staff'::text, 'viewer'::text]))),
  CONSTRAINT "workspace_members_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.team_roles(id) ON DELETE RESTRICT,
  CONSTRAINT "workspace_members_status_check" CHECK ((status = ANY (ARRAY['invited'::text, 'active'::text, 'suspended'::text, 'removed'::text]))),
  CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."workspace_members"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_workspace_members_role_id ON public.workspace_members USING btree (role_id);

CREATE INDEX idx_workspace_members_status ON public.workspace_members USING btree (status);

CREATE INDEX idx_workspace_members_user_id ON public.workspace_members USING btree (user_id);

CREATE INDEX idx_workspace_members_ws_id ON public.workspace_members USING btree (workspace_id);

CREATE TRIGGER trg_sync_workspace_member_role_text
  BEFORE INSERT OR UPDATE OF role_id ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_workspace_member_role_text();

CREATE POLICY "wsm_delete" ON "public"."workspace_members"
  FOR DELETE
  TO "authenticated"
  USING ((public.has_workspace_permission(workspace_id, 'team.member.remove'::text) OR (EXISTS ( SELECT 1
   FROM public.workspaces w
  WHERE ((w.id = workspace_members.workspace_id) AND ((w.owner_id)::text = (auth.uid())::text))))));

CREATE POLICY "wsm_insert" ON "public"."workspace_members"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (false);

CREATE POLICY "wsm_select" ON "public"."workspace_members"
  FOR SELECT
  TO "authenticated"
  USING ((((user_id)::text = (auth.uid())::text) OR public.has_workspace_permission(workspace_id, 'team.member.view'::text) OR (EXISTS ( SELECT 1
   FROM public.workspaces w
  WHERE ((w.id = workspace_members.workspace_id) AND ((w.owner_id)::text = (auth.uid())::text)))) OR public.has_platform_permission('team.data.view'::text)));

CREATE POLICY "wsm_update" ON "public"."workspace_members"
  FOR UPDATE
  TO "authenticated"
  USING ((public.has_workspace_permission(workspace_id, 'team.member.update'::text) OR (EXISTS ( SELECT 1
   FROM public.workspaces w
  WHERE ((w.id = workspace_members.workspace_id) AND ((w.owner_id)::text = (auth.uid())::text))))))
  WITH CHECK ((public.has_workspace_permission(workspace_id, 'team.member.update'::text) OR (EXISTS ( SELECT 1
   FROM public.workspaces w
  WHERE ((w.id = workspace_members.workspace_id) AND ((w.owner_id)::text = (auth.uid())::text))))));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."workspace_members" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."workspace_members" TO "postgres", "service_role";


-- Table: workspaces
CREATE TABLE "public"."workspaces" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"       text                     NOT NULL,
  "slug"       text                     NOT NULL,
  "owner_id"   uuid                     NOT NULL,
  "status"     text                     NOT NULL DEFAULT 'active'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "avatar_url" text,
  CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT "workspaces_pkey" PRIMARY KEY (id),
  CONSTRAINT "workspaces_slug_key" UNIQUE (slug),
  CONSTRAINT "workspaces_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text, 'suspended'::text])))
);

ALTER TABLE "public"."workspaces"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_workspaces_owner_id ON public.workspaces USING btree (owner_id);

CREATE INDEX idx_workspaces_slug ON public.workspaces USING btree (slug);

CREATE TRIGGER trg_workspaces_ensure_owner_membership
  AFTER INSERT OR UPDATE OF owner_id ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_workspaces_ensure_owner_membership();

CREATE POLICY "ws_insert" ON "public"."workspaces"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((owner_id = auth.uid()));

CREATE POLICY "ws_select" ON "public"."workspaces"
  FOR SELECT
  TO "authenticated"
  USING (((owner_id = auth.uid()) OR public.can_access_workspace(id) OR public.is_platform_admin()));

CREATE POLICY "ws_update" ON "public"."workspaces"
  FOR UPDATE
  TO "authenticated"
  USING (((owner_id = auth.uid()) OR public.is_platform_admin()))
  WITH CHECK (((owner_id = auth.uid()) OR public.is_platform_admin()));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."workspaces" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."workspaces" TO "postgres", "service_role";

COMMENT ON COLUMN "public"."workspaces"."avatar_url" IS 'Custom avatar or logo URL for organization/workspace branding. Defaults to deterministic DiceBear avatar if NULL.';


-- ====================================================================
-- STORAGE POLICIES & OBJECTS
-- ====================================================================

-- Storage Table/Policy: objects
CREATE POLICY "Allow authenticated users to read invoice documents" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING ((bucket_id = 'invoice-documents'::text));

CREATE POLICY "Allow service role full access to invoice documents" ON "storage"."objects"
  FOR ALL
  TO "service_role"
  USING ((bucket_id = 'invoice-documents'::text))
  WITH CHECK ((bucket_id = 'invoice-documents'::text));

CREATE POLICY "Allow users to upload receipts to their folder" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'payment-receipts'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Avatar images are publicly accessible" ON "storage"."objects"
  FOR SELECT
  TO PUBLIC
  USING ((bucket_id = 'profile-photos'::text));

CREATE POLICY "Users can delete their own avatar" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can update their own avatar" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can upload their own avatar" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "payment_proofs_upload" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((bucket_id = 'payment-proofs'::text));

CREATE POLICY "receipts_delete_own" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'payment-receipts'::text) AND (public.is_platform_admin() OR public.owns_subscription_payment(public.payment_id_from_storage_path(name)))));

CREATE POLICY "receipts_insert_own" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'payment-receipts'::text) AND (public.is_platform_admin() OR public.owns_subscription_payment(public.payment_id_from_storage_path(name)))));

CREATE POLICY "receipts_select_own" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING (((bucket_id = 'payment-receipts'::text) AND (public.is_platform_admin() OR public.owns_subscription_payment(public.payment_id_from_storage_path(name)))));

CREATE POLICY "receipts_service" ON "storage"."objects"
  FOR ALL
  TO "service_role"
  USING ((bucket_id = 'payment-receipts'::text))
  WITH CHECK ((bucket_id = 'payment-receipts'::text));

CREATE POLICY "receipts_update_own" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'payment-receipts'::text) AND (public.is_platform_admin() OR public.owns_subscription_payment(public.payment_id_from_storage_path(name)))))
  WITH CHECK (((bucket_id = 'payment-receipts'::text) AND (public.is_platform_admin() OR public.owns_subscription_payment(public.payment_id_from_storage_path(name)))));

-- ====================================================================
-- PropertyLedge Rent & Payment Schedule System Migration
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.expected_payment_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    transaction_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    schedule_name TEXT NOT NULL,
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('lease', 'independent')),
    amount NUMERIC(12,4) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly', 'custom')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled')),
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transaction_schedule_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    expected_payment_id UUID NOT NULL REFERENCES public.expected_payment_schedule(id) ON DELETE CASCADE,
    allocated_amount NUMERIC(12,4) NOT NULL CHECK (allocated_amount > 0),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_transaction_schedule_allocations UNIQUE (transaction_id, expected_payment_id)
);

CREATE INDEX IF NOT EXISTS idx_expected_schedule_workspace_due ON public.expected_payment_schedule (workspace_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_expected_schedule_property_due ON public.expected_payment_schedule (property_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_expected_schedule_lease ON public.expected_payment_schedule (lease_id) WHERE lease_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expected_schedule_status ON public.expected_payment_schedule (status);
CREATE INDEX IF NOT EXISTS idx_allocations_transaction ON public.transaction_schedule_allocations (transaction_id);
CREATE INDEX IF NOT EXISTS idx_allocations_expected_payment ON public.transaction_schedule_allocations (expected_payment_id);

ALTER TABLE public.expected_payment_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_schedule_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read expected schedules for authorized workspaces/properties" ON public.expected_payment_schedule FOR SELECT TO authenticated USING ((public.can_access_workspace(workspace_id) AND (property_id IS NULL OR public.can_access_property(property_id))) OR (tenant_id IN (SELECT t.id FROM public.tenants t WHERE t.user_id = auth.uid())) OR public.is_platform_admin());
CREATE POLICY "Users can insert expected schedules for authorized workspaces/properties" ON public.expected_payment_schedule FOR INSERT TO authenticated WITH CHECK (public.can_access_workspace(workspace_id) AND (property_id IS NULL OR public.can_write_property(property_id, 'financial.manage')));
CREATE POLICY "Users can update expected schedules for authorized workspaces/properties" ON public.expected_payment_schedule FOR UPDATE TO authenticated USING (public.can_access_workspace(workspace_id) AND (property_id IS NULL OR public.can_write_property(property_id, 'financial.manage'))) WITH CHECK (public.can_access_workspace(workspace_id) AND (property_id IS NULL OR public.can_write_property(property_id, 'financial.manage')));
CREATE POLICY "Users can delete expected schedules for authorized workspaces/properties" ON public.expected_payment_schedule FOR DELETE TO authenticated USING (public.can_access_workspace(workspace_id) AND (property_id IS NULL OR public.can_write_property(property_id, 'financial.manage')));

CREATE POLICY "Users can read transaction allocations" ON public.transaction_schedule_allocations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND public.can_access_workspace(t.workspace_id)) OR public.is_platform_admin());
CREATE POLICY "Users can insert transaction allocations" ON public.transaction_schedule_allocations FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND public.can_access_workspace(t.workspace_id) AND public.can_write_property(t.property_id, 'financial.manage')));
CREATE POLICY "Users can update transaction allocations" ON public.transaction_schedule_allocations FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND public.can_access_workspace(t.workspace_id) AND public.can_write_property(t.property_id, 'financial.manage'))) WITH CHECK (EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND public.can_access_workspace(t.workspace_id) AND public.can_write_property(t.property_id, 'financial.manage')));
CREATE POLICY "Users can delete transaction allocations" ON public.transaction_schedule_allocations FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND public.can_access_workspace(t.workspace_id) AND public.can_write_property(t.property_id, 'financial.manage')));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.expected_payment_schedule TO authenticated;
GRANT ALL ON TABLE public.expected_payment_schedule TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transaction_schedule_allocations TO authenticated;
GRANT ALL ON TABLE public.transaction_schedule_allocations TO service_role;

-- ====================================================================
-- PropertyLedge Condition Reports & Inspection System
-- Migration: 20260929000000_condition_reports.sql
-- ====================================================================

-- 1. Main Condition Reports Table
CREATE TABLE IF NOT EXISTS public.condition_reports (
  id                  UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID                     NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  property_id         UUID                     NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  lease_id            UUID                     REFERENCES public.leases(id) ON DELETE SET NULL,
  inspector_id        UUID                     REFERENCES auth.users(id) ON DELETE SET NULL,
  type                VARCHAR(50)              NOT NULL CHECK (type IN ('Move In', 'Routine', 'Move Out', 'Custom')),
  inspection_date     DATE                     NOT NULL DEFAULT CURRENT_DATE,
  inspector_name      VARCHAR(255)             NOT NULL,
  status              VARCHAR(50)              NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Completed')),
  notes               TEXT,
  signature_manager   TEXT,
  signature_tenant    TEXT,
  signature_landlord  TEXT,
  completed_at        TIMESTAMP WITH TIME ZONE,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Inspection Rooms Table
CREATE TABLE IF NOT EXISTS public.inspection_rooms (
  id                  UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id           UUID                     NOT NULL REFERENCES public.condition_reports(id) ON DELETE CASCADE,
  name                VARCHAR(255)             NOT NULL,
  status              VARCHAR(50)              NOT NULL DEFAULT 'Incomplete' CHECK (status IN ('Incomplete', 'Completed')),
  room_order          INT                      NOT NULL DEFAULT 0,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Inspection Items Table
CREATE TABLE IF NOT EXISTS public.inspection_items (
  id                  UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id             UUID                     NOT NULL REFERENCES public.inspection_rooms(id) ON DELETE CASCADE,
  name                VARCHAR(255)             NOT NULL,
  rating              VARCHAR(50)              CHECK (rating IN ('Excellent', 'Good', 'Fair', 'Needs Repair', 'Damaged', 'Not Applicable')),
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Inspection Defects Table
CREATE TABLE IF NOT EXISTS public.inspection_defects (
  id                  UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id             UUID                     NOT NULL REFERENCES public.inspection_rooms(id) ON DELETE CASCADE,
  item_name           VARCHAR(255),
  notes               TEXT                     NOT NULL,
  severity            VARCHAR(50)              NOT NULL CHECK (severity IN ('Minor', 'Moderate', 'Major', 'Urgent')),
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Inspection Photos Table
CREATE TABLE IF NOT EXISTS public.inspection_photos (
  id                  UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id             UUID                     NOT NULL REFERENCES public.inspection_rooms(id) ON DELETE CASCADE,
  photo_url           TEXT                     NOT NULL,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for optimal lookup performance
CREATE INDEX IF NOT EXISTS idx_condition_reports_workspace_id ON public.condition_reports (workspace_id);
CREATE INDEX IF NOT EXISTS idx_condition_reports_property_id ON public.condition_reports (property_id);
CREATE INDEX IF NOT EXISTS idx_condition_reports_lease_id ON public.condition_reports (lease_id);
CREATE INDEX IF NOT EXISTS idx_condition_reports_status ON public.condition_reports (status);
CREATE INDEX IF NOT EXISTS idx_condition_reports_inspection_date ON public.condition_reports (inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_rooms_report_id ON public.inspection_rooms (report_id, room_order);
CREATE INDEX IF NOT EXISTS idx_inspection_items_room_id ON public.inspection_items (room_id);
CREATE INDEX IF NOT EXISTS idx_inspection_defects_room_id ON public.inspection_defects (room_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_room_id ON public.inspection_photos (room_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.condition_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "cr_select" ON public.condition_reports;
DROP POLICY IF EXISTS "cr_insert" ON public.condition_reports;
DROP POLICY IF EXISTS "cr_update" ON public.condition_reports;
DROP POLICY IF EXISTS "cr_delete" ON public.condition_reports;

DROP POLICY IF EXISTS "ir_select" ON public.inspection_rooms;
DROP POLICY IF EXISTS "ir_insert" ON public.inspection_rooms;
DROP POLICY IF EXISTS "ir_update" ON public.inspection_rooms;
DROP POLICY IF EXISTS "ir_delete" ON public.inspection_rooms;

DROP POLICY IF EXISTS "ii_select" ON public.inspection_items;
DROP POLICY IF EXISTS "ii_insert" ON public.inspection_items;
DROP POLICY IF EXISTS "ii_update" ON public.inspection_items;
DROP POLICY IF EXISTS "ii_delete" ON public.inspection_items;

DROP POLICY IF EXISTS "id_select" ON public.inspection_defects;
DROP POLICY IF EXISTS "id_insert" ON public.inspection_defects;
DROP POLICY IF EXISTS "id_update" ON public.inspection_defects;
DROP POLICY IF EXISTS "id_delete" ON public.inspection_defects;

DROP POLICY IF EXISTS "ip_select" ON public.inspection_photos;
DROP POLICY IF EXISTS "ip_insert" ON public.inspection_photos;
DROP POLICY IF EXISTS "ip_update" ON public.inspection_photos;
DROP POLICY IF EXISTS "ip_delete" ON public.inspection_photos;

-- Condition Reports RLS Policies
CREATE POLICY "cr_select" ON public.condition_reports
  FOR SELECT TO authenticated
  USING (
    public.user_owns_or_member_workspace(workspace_id) AND (
      public.can_access_property(property_id) OR
      public.is_platform_admin() OR
      EXISTS (SELECT 1 FROM public.tenants t WHERE t.user_id = auth.uid() AND t.property_id = condition_reports.property_id)
    )
  );

CREATE POLICY "cr_insert" ON public.condition_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_owns_or_member_workspace(workspace_id) AND (
      public.can_write_property(property_id, 'inspection.create'::text) OR
      public.can_write_property(property_id, 'property.update'::text) OR
      public.owns_property(property_id) OR
      public.is_platform_admin()
    )
  );

CREATE POLICY "cr_update" ON public.condition_reports
  FOR UPDATE TO authenticated
  USING (
    public.user_owns_or_member_workspace(workspace_id) AND (
      public.can_write_property(property_id, 'inspection.update'::text) OR
      public.can_write_property(property_id, 'property.update'::text) OR
      public.owns_property(property_id) OR
      public.is_platform_admin()
    )
  )
  WITH CHECK (
    public.user_owns_or_member_workspace(workspace_id) AND (
      public.can_write_property(property_id, 'inspection.update'::text) OR
      public.can_write_property(property_id, 'property.update'::text) OR
      public.owns_property(property_id) OR
      public.is_platform_admin()
    )
  );

CREATE POLICY "cr_delete" ON public.condition_reports
  FOR DELETE TO authenticated
  USING (
    public.user_owns_or_member_workspace(workspace_id) AND (
      public.can_write_property(property_id, 'inspection.delete'::text) OR
      public.can_write_property(property_id, 'property.update'::text) OR
      public.owns_property(property_id) OR
      public.is_platform_admin()
    )
  );

-- Inspection Rooms Policies
CREATE POLICY "ir_select" ON public.inspection_rooms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.condition_reports cr
      WHERE cr.id = inspection_rooms.report_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_access_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ir_insert" ON public.inspection_rooms
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.condition_reports cr
      WHERE cr.id = inspection_rooms.report_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.create'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ir_update" ON public.inspection_rooms
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.condition_reports cr
      WHERE cr.id = inspection_rooms.report_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.update'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ir_delete" ON public.inspection_rooms
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.condition_reports cr
      WHERE cr.id = inspection_rooms.report_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.delete'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

-- Inspection Items Policies
CREATE POLICY "ii_select" ON public.inspection_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_items.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_access_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ii_insert" ON public.inspection_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_items.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.create'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ii_update" ON public.inspection_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_items.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.update'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ii_delete" ON public.inspection_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_items.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.delete'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

-- Inspection Defects Policies
CREATE POLICY "id_select" ON public.inspection_defects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_defects.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_access_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "id_insert" ON public.inspection_defects
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_defects.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.create'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "id_update" ON public.inspection_defects
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_defects.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.update'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "id_delete" ON public.inspection_defects
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_defects.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.delete'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

-- Inspection Photos Policies
CREATE POLICY "ip_select" ON public.inspection_photos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_photos.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_access_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ip_insert" ON public.inspection_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_photos.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.create'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ip_update" ON public.inspection_photos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_photos.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.update'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ip_delete" ON public.inspection_photos
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_photos.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.delete'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condition_reports TO authenticated, service_role, postgres;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.inspection_rooms TO authenticated, service_role, postgres;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.inspection_items TO authenticated, service_role, postgres;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.inspection_defects TO authenticated, service_role, postgres;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.inspection_photos TO authenticated, service_role, postgres;


-- ====================================================================
-- FINANCIAL SYSTEM & AUSTRALIAN TAX / GST (BAS)
-- ====================================================================

-- 1. category_groups table
CREATE TABLE IF NOT EXISTS public.category_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_category_groups_workspace_name UNIQUE (workspace_id, name)
);

ALTER TABLE public.category_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view category groups"
    ON public.category_groups FOR SELECT TO authenticated
    USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

CREATE POLICY "Workspace managers can manage category groups"
    ON public.category_groups FOR ALL TO authenticated
    USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin())
    WITH CHECK (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

GRANT ALL ON public.category_groups TO authenticated, service_role;

-- 2. categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_group_id UUID REFERENCES public.category_groups(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_categories_type_name UNIQUE (transaction_type, name),
    CONSTRAINT uq_categories_id_type UNIQUE (id, transaction_type)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view categories"
    ON public.categories FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Workspace managers can manage categories"
    ON public.categories FOR ALL TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

GRANT ALL ON public.categories TO authenticated, service_role;

-- 3. tax_classifications table
CREATE TABLE IF NOT EXISTS public.tax_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bas_code TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_tax_classifications_workspace_name UNIQUE (workspace_id, name)
);

ALTER TABLE public.tax_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view tax classifications"
    ON public.tax_classifications FOR SELECT TO authenticated
    USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

CREATE POLICY "Workspace managers can manage tax classifications"
    ON public.tax_classifications FOR ALL TO authenticated
    USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin())
    WITH CHECK (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

GRANT ALL ON public.tax_classifications TO authenticated, service_role;

-- 4. transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(12,4) NOT NULL CHECK (amount > 0),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    transaction_category_id UUID NOT NULL,
    tax_classification_id UUID REFERENCES public.tax_classifications(id) ON DELETE SET NULL,
    gst_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
    gst_amount NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT,
    description TEXT,
    reference TEXT,
    vendor_name TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed', 'refunded')),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    receipt_url TEXT,
    receipt_blob_path TEXT,
    receipt_file_name TEXT,
    receipt_file_size BIGINT,
    receipt_mime_type TEXT,
    receipt_uploaded_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_transactions_category_type FOREIGN KEY (transaction_category_id, transaction_type) 
        REFERENCES public.categories(id, transaction_type) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_transactions_workspace_date ON public.transactions(workspace_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_property_date ON public.transactions(property_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_lease ON public.transactions(lease_id) WHERE lease_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON public.transactions(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(transaction_category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tax_classification ON public.transactions(tax_classification_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receipt_blob ON public.transactions(receipt_blob_path) WHERE receipt_blob_path IS NOT NULL;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view transactions"
    ON public.transactions FOR SELECT TO authenticated
    USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

CREATE POLICY "Workspace members can manage transactions"
    ON public.transactions FOR ALL TO authenticated
    USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin())
    WITH CHECK (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

GRANT ALL ON public.transactions TO authenticated, service_role;

-- 5. expected_payment_schedule & allocations
CREATE TABLE IF NOT EXISTS public.expected_payment_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    transaction_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    tax_classification_id UUID REFERENCES public.tax_classifications(id) ON DELETE SET NULL,
    gst_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
    gst_amount NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
    schedule_name TEXT NOT NULL,
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('lease', 'independent')),
    amount NUMERIC(12,4) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly', 'custom')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled')),
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expected_schedule_workspace_due ON public.expected_payment_schedule (workspace_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_expected_schedule_property_due ON public.expected_payment_schedule (property_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_expected_schedule_lease ON public.expected_payment_schedule (lease_id) WHERE lease_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expected_schedule_status ON public.expected_payment_schedule (status);

ALTER TABLE public.expected_payment_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view expected schedules"
    ON public.expected_payment_schedule FOR SELECT TO authenticated
    USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

CREATE POLICY "Workspace members can manage expected schedules"
    ON public.expected_payment_schedule FOR ALL TO authenticated
    USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin())
    WITH CHECK (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

GRANT ALL ON public.expected_payment_schedule TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.transaction_schedule_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    expected_payment_id UUID NOT NULL REFERENCES public.expected_payment_schedule(id) ON DELETE CASCADE,
    allocated_amount NUMERIC(12,4) NOT NULL CHECK (allocated_amount > 0),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_transaction_schedule_allocations UNIQUE (transaction_id, expected_payment_id)
);

CREATE INDEX IF NOT EXISTS idx_allocations_transaction ON public.transaction_schedule_allocations (transaction_id);
CREATE INDEX IF NOT EXISTS idx_allocations_expected_payment ON public.transaction_schedule_allocations (expected_payment_id);

ALTER TABLE public.transaction_schedule_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view allocations"
    ON public.transaction_schedule_allocations FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_schedule_allocations.transaction_id
              AND (public.can_access_workspace(t.workspace_id) OR public.is_platform_admin())
        )
    );

CREATE POLICY "Workspace members can manage allocations"
    ON public.transaction_schedule_allocations FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_schedule_allocations.transaction_id
              AND (public.can_access_workspace(t.workspace_id) OR public.is_platform_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_schedule_allocations.transaction_id
              AND (public.can_access_workspace(t.workspace_id) OR public.is_platform_admin())
        )
    );

GRANT ALL ON public.transaction_schedule_allocations TO authenticated, service_role;

-- ====================================================================
-- TRANSACTION ATTACHMENTS (Multi-file Expense Receipts & Invoices)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.transaction_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    blob_url TEXT NOT NULL,
    blob_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    source_path TEXT,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaction_attachments_tx ON public.transaction_attachments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_attachments_workspace ON public.transaction_attachments(workspace_id);

ALTER TABLE public.transaction_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access can view transaction attachments"
    ON public.transaction_attachments FOR SELECT TO authenticated
    USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

CREATE POLICY "Workspace access can manage transaction attachments"
    ON public.transaction_attachments FOR ALL TO authenticated
    USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin())
    WITH CHECK (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

GRANT ALL ON public.transaction_attachments TO authenticated, service_role;

-- ====================================================================
-- DOCUMENTS SYSTEM (Agreements, Insurance, Compliance, Notices)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  document_type VARCHAR(50) NOT NULL DEFAULT 'other' CHECK (
    document_type IN (
      'lease_agreement',
      'condition_report',
      'receipt',
      'insurance_policy',
      'strata_notice',
      'compliance_certificate',
      'council_notice',
      'photo',
      'other'
    )
  ),
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  blob_path TEXT,
  file_size BIGINT,
  mime_type VARCHAR(100),
  description TEXT,
  tags TEXT[] DEFAULT '{}'::TEXT[],
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON public.documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_property_id ON public.documents(property_id);
CREATE INDEX IF NOT EXISTS idx_documents_lease_id ON public.documents(lease_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access can view documents"
  ON public.documents FOR SELECT TO authenticated
  USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

CREATE POLICY "Workspace access can insert documents"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    (
      public.can_access_workspace(workspace_id)
      AND (
        property_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.properties p
          WHERE p.id = documents.property_id
            AND p.workspace_id = documents.workspace_id
        )
      )
    )
    OR public.is_platform_admin()
  );

CREATE POLICY "Workspace access can update documents"
  ON public.documents FOR UPDATE TO authenticated
  USING (
    public.can_access_workspace(workspace_id)
    OR public.is_platform_admin()
  )
  WITH CHECK (
    (
      public.can_access_workspace(workspace_id)
      AND (
        property_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.properties p
          WHERE p.id = documents.property_id
            AND p.workspace_id = documents.workspace_id
        )
      )
    )
    OR public.is_platform_admin()
  );

CREATE POLICY "Workspace access can delete documents"
  ON public.documents FOR DELETE TO authenticated
  USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.set_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_documents_updated_at ON public.documents;
CREATE TRIGGER trigger_set_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_documents_updated_at();

GRANT ALL ON public.documents TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';




