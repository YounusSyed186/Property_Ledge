


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."accept_workspace_invitation"("p_token" "text") RETURNS TABLE("workspace_id" "uuid", "member_id" "uuid", "role_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."accept_workspace_invitation"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_workspace_member_by_profile_id"("p_workspace_id" "uuid", "p_public_id" "text", "p_role_id" "uuid") RETURNS TABLE("member_id" "uuid", "user_id" "uuid", "role_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."add_workspace_member_by_profile_id"("p_workspace_id" "uuid", "p_public_id" "text", "p_role_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_delete_platform_role"("p_role_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."admin_delete_platform_role"("p_role_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_get_platform_roles_with_stats"() RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "is_system_role" boolean, "permission_count" bigint, "user_count" bigint, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."admin_get_platform_roles_with_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_get_role_impact"("p_entity_type" "text", "p_entity_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."admin_get_role_impact"("p_entity_type" "text", "p_entity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_get_system_team_roles_with_stats"() RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "is_system_role" boolean, "permission_count" bigint, "member_count" bigint, "workspace_count" bigint, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."admin_get_system_team_roles_with_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_system_team_role"("p_role_id" "uuid", "p_description" "text", "p_permission_keys" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."admin_update_system_team_role"("p_role_id" "uuid", "p_description" "text", "p_permission_keys" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_upsert_platform_role"("p_role_id" "uuid", "p_name" "text", "p_description" "text", "p_permission_keys" "text"[]) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."admin_upsert_platform_role"("p_role_id" "uuid", "p_name" "text", "p_description" "text", "p_permission_keys" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assert_workspace_seat_available"("p_workspace_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."assert_workspace_seat_available"("p_workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_is_service_role"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(auth.role(), '') = 'service_role';
$$;


ALTER FUNCTION "public"."auth_is_service_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_organization"("p_organization_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.can_access_workspace(p_organization_id);
$$;


ALTER FUNCTION "public"."can_access_organization"("p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_property"("p_property_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.owns_property(p_property_id) OR EXISTS (
    SELECT 1 FROM public.property_members
    WHERE property_id = p_property_id AND user_id = auth.uid() AND status = 'active'
  );
$$;


ALTER FUNCTION "public"."can_access_property"("p_property_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_workspace"("p_workspace_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."can_access_workspace"("p_workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_assign_team_role"("p_workspace_id" "uuid", "p_role_id" "uuid", "p_assigner_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."can_assign_team_role"("p_workspace_id" "uuid", "p_role_id" "uuid", "p_assigner_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_write_property"("p_property_id" "uuid", "p_permission" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.is_platform_admin() OR public.owns_property(p_property_id)
      OR public.has_property_permission(p_property_id, p_permission);
$$;


ALTER FUNCTION "public"."can_write_property"("p_property_id" "uuid", "p_permission" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."change_workspace_member_role"("p_member_id" "uuid", "p_role_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."change_workspace_member_role"("p_member_id" "uuid", "p_role_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_workspace_custom_roles"("p_workspace_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.team_roles
  WHERE workspace_id = p_workspace_id AND is_system_role = false;
$$;


ALTER FUNCTION "public"."count_workspace_custom_roles"("p_workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_workspace_seats"("p_workspace_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT (
    (SELECT COUNT(*)::INTEGER FROM public.workspace_members
     WHERE workspace_id = p_workspace_id AND status = 'active')
    +
    (SELECT COUNT(*)::INTEGER FROM public.workspace_invitations
     WHERE workspace_id = p_workspace_id AND status = 'pending' AND expires_at > NOW())
  );
$$;


ALTER FUNCTION "public"."count_workspace_seats"("p_workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_workspace_invitation"("p_workspace_id" "uuid", "p_role_id" "uuid", "p_invite_type" "text" DEFAULT 'LINK'::"text", "p_profile_id" "uuid" DEFAULT NULL::"uuid", "p_email" "text" DEFAULT NULL::"text", "p_expiry_days" integer DEFAULT 7) RETURNS TABLE("invitation_id" "uuid", "raw_token" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_workspace_invitation"("p_workspace_id" "uuid", "p_role_id" "uuid", "p_invite_type" "text", "p_profile_id" "uuid", "p_email" "text", "p_expiry_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_workspace_team_role"("p_workspace_id" "uuid", "p_name" "text", "p_description" "text", "p_permission_keys" "text"[]) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_workspace_team_role"("p_workspace_id" "uuid", "p_name" "text", "p_description" "text", "p_permission_keys" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN auth.uid();
END;
$$;


ALTER FUNCTION "public"."current_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_workspace_team_role"("p_role_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."delete_workspace_team_role"("p_role_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_property_owner_in_workspace"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
END; $$;


ALTER FUNCTION "public"."enforce_property_owner_in_workspace"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_rent_payment_lifecycle"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
END; $$;


ALTER FUNCTION "public"."enforce_rent_payment_lifecycle"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_single_current_subscription"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
END; $$;


ALTER FUNCTION "public"."ensure_single_current_subscription"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_workspace_owner_membership"("p_workspace_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."ensure_workspace_owner_membership"("p_workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_profile_public_id"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."generate_profile_public_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_assignable_team_roles"("p_workspace_id" "uuid", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("role_id" "uuid", "name" "text", "description" "text", "is_system_role" boolean, "permission_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_assignable_team_roles"("p_workspace_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_effective_workspace_permissions"("p_workspace_id" "uuid", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS SETOF "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_effective_workspace_permissions"("p_workspace_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_role_permissions"("p_role_id" "uuid") RETURNS TABLE("key" "text", "name" "text", "resource" "text", "action" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT p.key, p.name, p.resource, p.action
  FROM public.team_role_permissions trp
  JOIN public.permissions p ON p.id = trp.permission_id
  WHERE trp.role_id = p_role_id AND p.scope = 'TEAM'
  ORDER BY p.resource, p.action;
$$;


ALTER FUNCTION "public"."get_role_permissions"("p_role_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_accessible_organization_ids"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.get_user_accessible_workspace_ids(p_user_id);
$$;


ALTER FUNCTION "public"."get_user_accessible_organization_ids"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_accessible_property_ids"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS SETOF "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_user_accessible_property_ids"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_accessible_workspace_ids"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS SETOF "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_user_accessible_workspace_ids"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_workspace_pending_invitations"("p_workspace_id" "uuid") RETURNS TABLE("id" "uuid", "role_name" "text", "invite_type" "text", "status" "text", "expires_at" timestamp with time zone, "created_at" timestamp with time zone, "inviter_name" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_workspace_pending_invitations"("p_workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_workspace_seat_limit"("p_workspace_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_workspace_seat_limit"("p_workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_workspace_team_roles"("p_workspace_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "is_system_role" boolean, "workspace_id" "uuid", "member_count" bigint, "permission_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_workspace_team_roles"("p_workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_platform_permission"("p_permission_key" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."has_platform_permission"("p_permission_key" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_property_permission"("p_property_id" "uuid", "p_permission" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."has_property_permission"("p_property_id" "uuid", "p_permission" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_workspace_permission"("p_workspace_id" "uuid", "p_permission_key" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."has_workspace_permission"("p_workspace_id" "uuid", "p_permission_key" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hash_invitation_token"("p_token" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT encode(sha256(p_token::bytea), 'hex');
$$;


ALTER FUNCTION "public"."hash_invitation_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_platform_admin"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  IF EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid() AND status = 'active') THEN
    RETURN TRUE;
  END IF;
  RETURN public.has_platform_permission('team.admin_access');
END;
$$;


ALTER FUNCTION "public"."is_platform_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_activity"("p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid" DEFAULT NULL::"uuid", "p_workspace_id" "uuid" DEFAULT NULL::"uuid", "p_property_id" "uuid" DEFAULT NULL::"uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."log_activity"("p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_workspace_id" "uuid", "p_property_id" "uuid", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lookup_profile_by_public_id"("p_public_id" "text") RETURNS TABLE("id" "uuid", "public_id" "text", "full_name" "text", "avatar_url" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT p.id, p.public_id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.public_id = p_public_id;
$$;


ALTER FUNCTION "public"."lookup_profile_by_public_id"("p_public_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."map_team_role_to_property_role"("p_team_role_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."map_team_role_to_property_role"("p_team_role_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."owns_property"("p_property_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.properties WHERE id = p_property_id AND owner_id = auth.uid());
$$;


ALTER FUNCTION "public"."owns_property"("p_property_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."owns_subscription_payment"("p_payment_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscription_payments WHERE id = p_payment_id AND account_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."owns_subscription_payment"("p_payment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."payment_id_from_storage_path"("p_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."payment_id_from_storage_path"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_activity_log_modification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."prevent_activity_log_modification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_account_context_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF public.auth_is_service_role() OR public.is_platform_admin() THEN NEW.updated_at := NOW(); RETURN NEW; END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.first_login_at IS DISTINCT FROM OLD.first_login_at
     OR NEW.last_login_at IS DISTINCT FROM OLD.last_login_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Forbidden: account_context server fields are not client-writable';
  END IF;
  NEW.updated_at := NOW(); RETURN NEW;
END; $$;


ALTER FUNCTION "public"."protect_account_context_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_child_property_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.property_id IS DISTINCT FROM OLD.property_id
     AND NOT public.auth_is_service_role() AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden: property_id cannot be changed by clients';
  END IF;
  RETURN NEW;
END; $$;


ALTER FUNCTION "public"."protect_child_property_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_created_by"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
END; $$;


ALTER FUNCTION "public"."protect_created_by"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_notifications_read_state"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF public.auth_is_service_role() OR public.is_platform_admin() THEN RETURN NEW; END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.property_id IS DISTINCT FROM OLD.property_id
     OR NEW.type IS DISTINCT FROM OLD.type OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.message IS DISTINCT FROM OLD.message OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Forbidden: only notification read_at may be updated by clients';
  END IF;
  RETURN NEW;
END; $$;


ALTER FUNCTION "public"."protect_notifications_read_state"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_platform_admins_mutations"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF public.auth_is_service_role() OR current_user IN ('postgres','supabase_admin') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'Forbidden: platform_admins may only be changed via service_role';
END; $$;


ALTER FUNCTION "public"."protect_platform_admins_mutations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_subscription_payment_client"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF public.auth_is_service_role() OR public.is_platform_admin() THEN RETURN COALESCE(NEW, OLD); END IF;
  RAISE EXCEPTION 'Forbidden: subscription_payments may only be mutated by trusted server/admin paths';
END; $$;


ALTER FUNCTION "public"."protect_subscription_payment_client"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."receipt_payment_id_from_path"("p_name" "text") RETURNS "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT public.payment_id_from_storage_path(p_name);
$$;


ALTER FUNCTION "public"."receipt_payment_id_from_path"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_workspace_member"("p_member_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."remove_workspace_member"("p_member_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_invitation_by_token"("p_token" "text") RETURNS TABLE("invitation_id" "uuid", "status" "text", "workspace_id" "uuid", "workspace_name" "text", "inviter_name" "text", "role_name" "text", "role_id" "uuid", "expires_at" timestamp with time zone, "is_expired" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."resolve_invitation_by_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_workspace_invitation"("p_invitation_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."revoke_workspace_invitation"("p_invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_workspace_member_property_access"("p_workspace_id" "uuid", "p_user_id" "uuid", "p_status" "text" DEFAULT 'removed'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."revoke_workspace_member_property_access"("p_workspace_id" "uuid", "p_user_id" "uuid", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."suspend_workspace_member"("p_member_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."suspend_workspace_member"("p_member_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_property_workspace_team_access"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."sync_property_workspace_team_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_workspace_member_property_access"("p_workspace_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."sync_workspace_member_property_access"("p_workspace_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_workspace_member_role_text"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_workspace_member_role_text"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tenant_can_read_lease"("p_lease_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lease_tenants lt
    INNER JOIN public.tenants t ON t.id = lt.tenant_id
    WHERE lt.lease_id = p_lease_id
      AND t.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."tenant_can_read_lease"("p_lease_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tenant_can_read_unit"("p_unit_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lease_tenants lt
    INNER JOIN public.tenants t ON t.id = lt.tenant_id
    INNER JOIN public.leases l ON l.id = lt.lease_id AND l.property_id = lt.property_id
    WHERE l.unit_id = p_unit_id
      AND t.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."tenant_can_read_unit"("p_unit_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transfer_workspace_ownership"("p_workspace_id" "uuid", "p_new_owner_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."transfer_workspace_ownership"("p_workspace_id" "uuid", "p_new_owner_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_profiles_set_public_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.public_id IS NULL OR NEW.public_id = '' THEN
    NEW.public_id := public.generate_profile_public_id();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_profiles_set_public_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_workspaces_ensure_owner_membership"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM public.ensure_workspace_owner_membership(NEW.id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_workspaces_ensure_owner_membership"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_workspace_team_role"("p_role_id" "uuid", "p_name" "text", "p_description" "text", "p_permission_keys" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."update_workspace_team_role"("p_role_id" "uuid", "p_name" "text", "p_description" "text", "p_permission_keys" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_owns_or_member_workspace"("p_workspace_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."user_owns_or_member_workspace"("p_workspace_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."account_context" (
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "onboarding_status" "text" DEFAULT 'completed'::"text" NOT NULL,
    "first_login_at" timestamp with time zone,
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "account_context_onboarding_status_check" CHECK (("onboarding_status" = ANY (ARRAY['not_started'::"text", 'in_progress'::"text", 'completed'::"text"]))),
    CONSTRAINT "account_context_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'deactivated'::"text"])))
);


ALTER TABLE "public"."account_context" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "property_id" "uuid",
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "tenant_id" "uuid",
    "lease_id" "uuid",
    "document_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "documents_document_type_check" CHECK (("document_type" = ANY (ARRAY['lease_agreement'::"text", 'inspection_report'::"text", 'insurance'::"text", 'council_notice'::"text", 'invoice'::"text", 'receipt'::"text", 'property_document'::"text", 'tenant_document'::"text", 'other'::"text"]))),
    CONSTRAINT "documents_file_size_check" CHECK (("file_size" > 0))
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "template_type" "text" NOT NULL,
    "variables" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "provider_message_id" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "email_events_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."email_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entitlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "value_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "entitlements_value_type_check" CHECK (("value_type" = ANY (ARRAY['boolean'::"text", 'number'::"text", 'string'::"text"])))
);


ALTER TABLE "public"."entitlements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "expense_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "vendor_name" "text",
    "description" "text",
    "status" "text" DEFAULT 'paid'::"text" NOT NULL,
    "receipt_url" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "expenses_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "expenses_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inspection_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inspection_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inspection_items_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'passed'::"text", 'failed'::"text", 'needs_attention'::"text"])))
);


ALTER TABLE "public"."inspection_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inspections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "inspector_id" "uuid",
    "inspection_type" "text" DEFAULT 'routine'::"text" NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "scheduled_at" timestamp with time zone NOT NULL,
    "completed_at" timestamp with time zone,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inspections_inspection_type_check" CHECK (("inspection_type" = ANY (ARRAY['move_in'::"text", 'routine'::"text", 'move_out'::"text", 'damage'::"text", 'final'::"text"]))),
    CONSTRAINT "inspections_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."inspections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "quantity" numeric(10,2) DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_invoice_item_amount" CHECK (("amount" = "round"(("quantity" * "unit_price"), 2))),
    CONSTRAINT "invoice_items_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "invoice_items_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "invoice_items_unit_price_check" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."invoice_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "unit_id" "uuid",
    "lease_id" "uuid",
    "tenant_id" "uuid",
    "invoice_number" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "issue_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "due_date" "date" NOT NULL,
    "subtotal" numeric(10,2) DEFAULT 0 NOT NULL,
    "tax_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "balance_due" numeric(10,2) DEFAULT 0 NOT NULL,
    "description" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_invoice_balance" CHECK (("balance_due" <= "total_amount")),
    CONSTRAINT "chk_invoice_dates" CHECK (("due_date" >= "issue_date")),
    CONSTRAINT "chk_invoice_totals" CHECK (("total_amount" = ("subtotal" + "tax_amount"))),
    CONSTRAINT "invoices_balance_due_check" CHECK (("balance_due" >= (0)::numeric)),
    CONSTRAINT "invoices_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'issued'::"text", 'partially_paid'::"text", 'paid'::"text", 'overdue'::"text", 'void'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "invoices_subtotal_check" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "invoices_tax_amount_check" CHECK (("tax_amount" >= (0)::numeric)),
    CONSTRAINT "invoices_total_amount_check" CHECK (("total_amount" >= (0)::numeric))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lease_tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lease_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'primary'::"text" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "lease_tenants_role_check" CHECK (("role" = ANY (ARRAY['primary'::"text", 'co-tenant'::"text", 'guarantor'::"text"])))
);


ALTER TABLE "public"."lease_tenants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "rent_amount" numeric(10,2) NOT NULL,
    "security_deposit" numeric(10,2) DEFAULT 0 NOT NULL,
    "payment_due_day" integer DEFAULT 1 NOT NULL,
    "rent_frequency" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "renewed_from_lease_id" "uuid",
    CONSTRAINT "chk_lease_dates" CHECK ((("end_date" IS NULL) OR ("end_date" >= "start_date"))),
    CONSTRAINT "leases_payment_due_day_check" CHECK ((("payment_due_day" >= 1) AND ("payment_due_day" <= 31))),
    CONSTRAINT "leases_rent_amount_check" CHECK (("rent_amount" >= (0)::numeric)),
    CONSTRAINT "leases_rent_frequency_check" CHECK (("rent_frequency" = ANY (ARRAY['weekly'::"text", 'fortnightly'::"text", 'monthly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "leases_security_deposit_check" CHECK (("security_deposit" >= (0)::numeric)),
    CONSTRAINT "leases_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending'::"text", 'active'::"text", 'expired'::"text", 'terminated'::"text", 'cancelled'::"text", 'renewed'::"text"])))
);


ALTER TABLE "public"."leases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."maintenance_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "tenant_id" "uuid",
    "assigned_to" "uuid",
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "category" "text",
    "scheduled_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "maintenance_requests_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "maintenance_requests_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'scheduled'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."maintenance_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "property_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_proofs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "file_size" integer NOT NULL,
    "file_preview_url" "text",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_payment_proofs_mime" CHECK (("mime_type" = ANY (ARRAY['application/pdf'::"text", 'image/png'::"text", 'image/jpeg'::"text", 'image/jpg'::"text"]))),
    CONSTRAINT "chk_payment_proofs_size" CHECK ((("file_size" > 0) AND ("file_size" <= 5242880)))
);


ALTER TABLE "public"."payment_proofs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "invoice_id" "uuid",
    "lease_id" "uuid",
    "tenant_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "payment_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "payment_method" "text" DEFAULT 'bank_transfer'::"text" NOT NULL,
    "status" "text" DEFAULT 'completed'::"text" NOT NULL,
    "reference" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payments_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "payments_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['bank_transfer'::"text", 'direct_debit'::"text", 'card'::"text", 'cash'::"text", 'cheque'::"text", 'other'::"text"]))),
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'failed'::"text", 'reversed'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "scope" "text" NOT NULL,
    "resource" "text" NOT NULL,
    "action" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "permissions_scope_check" CHECK (("scope" = ANY (ARRAY['PLATFORM'::"text", 'TEAM'::"text"])))
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plan_entitlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "entitlement_id" "uuid" NOT NULL,
    "value" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."plan_entitlements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_admins" (
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "notes" "text",
    CONSTRAINT "platform_admins_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'revoked'::"text"])))
);

ALTER TABLE ONLY "public"."platform_admins" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL
);


ALTER TABLE "public"."platform_role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_system_role" boolean DEFAULT false NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."platform_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."platform_user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "phone" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "public_id" "text" NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."avatar_url" IS 'URL or seed reference for user avatar image. Defaults to deterministic DiceBear avatar if NULL.';



CREATE TABLE IF NOT EXISTS "public"."properties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "property_type" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "address_line_1" "text" NOT NULL,
    "address_line_2" "text",
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "postal_code" "text" NOT NULL,
    "country" "text" DEFAULT 'Australia'::"text" NOT NULL,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "description" "text",
    "image_url" "text",
    "bedrooms" integer,
    "bathrooms" numeric(3,1),
    "parking_spaces" integer,
    "square_feet" numeric(10,2),
    "purchase_price" numeric(12,2),
    "purchase_date" "date",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "property_category" "text",
    "rent_amount" numeric(10,2),
    "payment_frequency" "text" DEFAULT 'Weekly'::"text",
    "property_id" "text",
    "suburb" "text",
    "postcode" "text",
    "car_spaces" integer DEFAULT 0,
    "tenant_name" "text",
    "tenant_email" "text",
    "lease_start" "date",
    "lease_duration" "text",
    "deleted_at" timestamp with time zone,
    CONSTRAINT "properties_bathrooms_check" CHECK (("bathrooms" >= (0)::numeric)),
    CONSTRAINT "properties_bedrooms_check" CHECK (("bedrooms" >= 0)),
    CONSTRAINT "properties_car_spaces_check" CHECK (("car_spaces" >= 0)),
    CONSTRAINT "properties_parking_spaces_check" CHECK (("parking_spaces" >= 0)),
    CONSTRAINT "properties_property_category_check" CHECK (("property_category" = ANY (ARRAY['Residential'::"text", 'Commercial'::"text"]))),
    CONSTRAINT "properties_purchase_price_check" CHECK (("purchase_price" >= (0)::numeric)),
    CONSTRAINT "properties_rent_amount_check" CHECK (("rent_amount" >= (0)::numeric)),
    CONSTRAINT "properties_square_feet_check" CHECK (("square_feet" >= (0)::numeric)),
    CONSTRAINT "properties_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'archived'::"text", 'maintenance'::"text"])))
);


ALTER TABLE "public"."properties" OWNER TO "postgres";


COMMENT ON COLUMN "public"."properties"."property_category" IS 'Property category: Residential or Commercial';



COMMENT ON COLUMN "public"."properties"."rent_amount" IS 'Advertised rent amount';



COMMENT ON COLUMN "public"."properties"."payment_frequency" IS 'Rent payment frequency: Weekly, Fortnightly, or Monthly';



COMMENT ON COLUMN "public"."properties"."property_id" IS 'Custom identifier string e.g. PL-1024';



COMMENT ON COLUMN "public"."properties"."car_spaces" IS 'Car parking spaces';



CREATE TABLE IF NOT EXISTS "public"."property_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'viewer'::"text" NOT NULL,
    "status" "text" DEFAULT 'invited'::"text" NOT NULL,
    "invited_by" "uuid",
    "joined_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "property_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'manager'::"text", 'agent'::"text", 'staff'::"text", 'viewer'::"text"]))),
    CONSTRAINT "property_members_status_check" CHECK (("status" = ANY (ARRAY['invited'::"text", 'active'::"text", 'suspended'::"text", 'removed'::"text"])))
);


ALTER TABLE "public"."property_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid",
    "provider" "text" DEFAULT 'stripe'::"text" NOT NULL,
    "provider_event_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'processed'::"text" NOT NULL,
    "processed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscription_events_status_check" CHECK (("status" = ANY (ARRAY['received'::"text", 'processed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."subscription_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "reference" "text" NOT NULL,
    "expected_amount" numeric(10,2) NOT NULL,
    "submitted_amount" numeric(10,2),
    "currency" "text" DEFAULT 'AUD'::"text" NOT NULL,
    "payment_date" "date",
    "transaction_id" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "submitted_at" timestamp with time zone,
    "verified_at" timestamp with time zone,
    "verified_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscription_payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'under_review'::"text", 'verified'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."subscription_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "price_cents" integer DEFAULT 0 NOT NULL,
    "billing_interval" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "provider_price_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscription_plans_billing_interval_check" CHECK (("billing_interval" = ANY (ARRAY['monthly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "subscription_plans_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "canceled_at" timestamp with time zone,
    "trial_start" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "provider" "text" DEFAULT 'stripe'::"text",
    "provider_customer_id" "text",
    "provider_subscription_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending_payment'::"text", 'under_review'::"text", 'trialing'::"text", 'active'::"text", 'past_due'::"text", 'paused'::"text", 'canceled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "assigned_to" "uuid",
    "created_by" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "due_date" "date",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tasks_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "tasks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL
);


ALTER TABLE "public"."team_role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "is_system_role" boolean DEFAULT false NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_team_role_scope" CHECK (((("is_system_role" = true) AND ("workspace_id" IS NULL)) OR (("is_system_role" = false) AND ("workspace_id" IS NOT NULL))))
);


ALTER TABLE "public"."team_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "date_of_birth" "date",
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tenants_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'archived'::"text", 'prospect'::"text"])))
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "email" "text",
    "profile_id" "uuid",
    "role_id" "uuid" NOT NULL,
    "token_hash" "text",
    "invite_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "accepted_by" "uuid",
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workspace_invitations_invite_type_check" CHECK (("invite_type" = ANY (ARRAY['LINK'::"text", 'DIRECT_PROFILE'::"text", 'EMAIL'::"text"]))),
    CONSTRAINT "workspace_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."workspace_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'viewer'::"text" NOT NULL,
    "status" "text" DEFAULT 'invited'::"text" NOT NULL,
    "invited_by" "uuid",
    "joined_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role_id" "uuid",
    CONSTRAINT "workspace_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'manager'::"text", 'agent'::"text", 'staff'::"text", 'viewer'::"text"]))),
    CONSTRAINT "workspace_members_status_check" CHECK (("status" = ANY (ARRAY['invited'::"text", 'active'::"text", 'suspended'::"text", 'removed'::"text"])))
);


ALTER TABLE "public"."workspace_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "avatar_url" "text",
    CONSTRAINT "workspaces_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'archived'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."workspaces" OWNER TO "postgres";


COMMENT ON COLUMN "public"."workspaces"."avatar_url" IS 'Custom avatar or logo URL for organization/workspace branding. Defaults to deterministic DiceBear avatar if NULL.';



ALTER TABLE ONLY "public"."account_context"
    ADD CONSTRAINT "account_context_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_events"
    ADD CONSTRAINT "email_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entitlements"
    ADD CONSTRAINT "entitlements_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."entitlements"
    ADD CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inspection_items"
    ADD CONSTRAINT "inspection_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inspections"
    ADD CONSTRAINT "inspections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_invoice_number_key" UNIQUE ("invoice_number");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lease_tenants"
    ADD CONSTRAINT "lease_tenants_lease_id_tenant_id_key" UNIQUE ("lease_id", "tenant_id");



ALTER TABLE ONLY "public"."lease_tenants"
    ADD CONSTRAINT "lease_tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leases"
    ADD CONSTRAINT "leases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."maintenance_requests"
    ADD CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_proofs"
    ADD CONSTRAINT "payment_proofs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_entitlements"
    ADD CONSTRAINT "plan_entitlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."platform_role_permissions"
    ADD CONSTRAINT "platform_role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_role_permissions"
    ADD CONSTRAINT "platform_role_permissions_role_id_permission_id_key" UNIQUE ("role_id", "permission_id");



ALTER TABLE ONLY "public"."platform_roles"
    ADD CONSTRAINT "platform_roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."platform_roles"
    ADD CONSTRAINT "platform_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_user_roles"
    ADD CONSTRAINT "platform_user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_user_roles"
    ADD CONSTRAINT "platform_user_roles_user_id_role_id_key" UNIQUE ("user_id", "role_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_members"
    ADD CONSTRAINT "property_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_events"
    ADD CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_events"
    ADD CONSTRAINT "subscription_events_provider_event_id_key" UNIQUE ("provider_event_id");



ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_reference_key" UNIQUE ("reference");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_role_permissions"
    ADD CONSTRAINT "team_role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_role_permissions"
    ADD CONSTRAINT "team_role_permissions_role_id_permission_id_key" UNIQUE ("role_id", "permission_id");



ALTER TABLE ONLY "public"."team_roles"
    ADD CONSTRAINT "team_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_entitlements"
    ADD CONSTRAINT "unique_plan_entitlement" UNIQUE ("plan_id", "entitlement_id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "uq_invoices_id_property" UNIQUE ("id", "property_id");



ALTER TABLE ONLY "public"."leases"
    ADD CONSTRAINT "uq_leases_id_property" UNIQUE ("id", "property_id");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "uq_properties_id_workspace" UNIQUE ("id", "workspace_id");



ALTER TABLE ONLY "public"."property_members"
    ADD CONSTRAINT "uq_property_members_prop_user" UNIQUE ("property_id", "user_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "uq_subscriptions_id_account" UNIQUE ("id", "account_id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "uq_tenants_id_property" UNIQUE ("id", "property_id");



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "uq_workspace_members_ws_user" UNIQUE ("workspace_id", "user_id");



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_slug_key" UNIQUE ("slug");



CREATE INDEX "idx_account_context_user_id" ON "public"."account_context" USING "btree" ("user_id");



CREATE INDEX "idx_activity_logs_action" ON "public"."activity_logs" USING "btree" ("action");



CREATE INDEX "idx_activity_logs_created_at" ON "public"."activity_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activity_logs_entity" ON "public"."activity_logs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_activity_logs_property_id" ON "public"."activity_logs" USING "btree" ("property_id");



CREATE INDEX "idx_activity_logs_user_id" ON "public"."activity_logs" USING "btree" ("user_id");



CREATE INDEX "idx_activity_logs_workspace_id" ON "public"."activity_logs" USING "btree" ("workspace_id");



CREATE INDEX "idx_admin_audit_logs_action" ON "public"."admin_audit_logs" USING "btree" ("action");



CREATE INDEX "idx_admin_audit_logs_admin" ON "public"."admin_audit_logs" USING "btree" ("admin_user_id");



CREATE INDEX "idx_admin_audit_logs_created_at" ON "public"."admin_audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_documents_lease_id" ON "public"."documents" USING "btree" ("lease_id");



CREATE INDEX "idx_documents_property_id" ON "public"."documents" USING "btree" ("property_id");



CREATE INDEX "idx_documents_tenant_id" ON "public"."documents" USING "btree" ("tenant_id");



CREATE INDEX "idx_documents_type" ON "public"."documents" USING "btree" ("document_type");



CREATE INDEX "idx_email_events_created_at" ON "public"."email_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_email_events_recipient" ON "public"."email_events" USING "btree" ("recipient");



CREATE INDEX "idx_email_events_status" ON "public"."email_events" USING "btree" ("status");



CREATE INDEX "idx_entitlements_key" ON "public"."entitlements" USING "btree" ("key");



CREATE INDEX "idx_expenses_category" ON "public"."expenses" USING "btree" ("category_id");



CREATE INDEX "idx_expenses_date" ON "public"."expenses" USING "btree" ("expense_date");



CREATE INDEX "idx_expenses_property_id" ON "public"."expenses" USING "btree" ("property_id");



CREATE INDEX "idx_expenses_status" ON "public"."expenses" USING "btree" ("status");



CREATE INDEX "idx_inspection_items_inspection_id" ON "public"."inspection_items" USING "btree" ("inspection_id");



CREATE INDEX "idx_inspection_items_status" ON "public"."inspection_items" USING "btree" ("status");



CREATE INDEX "idx_inspections_inspector_id" ON "public"."inspections" USING "btree" ("inspector_id");



CREATE INDEX "idx_inspections_property_id" ON "public"."inspections" USING "btree" ("property_id");



CREATE INDEX "idx_inspections_scheduled_at" ON "public"."inspections" USING "btree" ("scheduled_at");



CREATE INDEX "idx_inspections_status" ON "public"."inspections" USING "btree" ("status");



CREATE INDEX "idx_invoice_items_invoice_id" ON "public"."invoice_items" USING "btree" ("invoice_id");



CREATE INDEX "idx_invoices_due_date" ON "public"."invoices" USING "btree" ("due_date");



CREATE INDEX "idx_invoices_lease_id" ON "public"."invoices" USING "btree" ("lease_id");



CREATE INDEX "idx_invoices_number" ON "public"."invoices" USING "btree" ("invoice_number");



CREATE INDEX "idx_invoices_property_id" ON "public"."invoices" USING "btree" ("property_id");



CREATE INDEX "idx_invoices_status" ON "public"."invoices" USING "btree" ("status");



CREATE INDEX "idx_invoices_tenant_id" ON "public"."invoices" USING "btree" ("tenant_id");



CREATE INDEX "idx_lease_tenants_lease_id" ON "public"."lease_tenants" USING "btree" ("lease_id");



CREATE INDEX "idx_lease_tenants_property_id" ON "public"."lease_tenants" USING "btree" ("property_id");



CREATE INDEX "idx_lease_tenants_tenant_id" ON "public"."lease_tenants" USING "btree" ("tenant_id");



CREATE INDEX "idx_leases_dates" ON "public"."leases" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_leases_property_id" ON "public"."leases" USING "btree" ("property_id");



CREATE INDEX "idx_leases_renewed_from" ON "public"."leases" USING "btree" ("renewed_from_lease_id");



CREATE INDEX "idx_leases_status" ON "public"."leases" USING "btree" ("status");



CREATE INDEX "idx_maintenance_assigned_to" ON "public"."maintenance_requests" USING "btree" ("assigned_to");



CREATE INDEX "idx_maintenance_priority" ON "public"."maintenance_requests" USING "btree" ("priority");



CREATE INDEX "idx_maintenance_property_id" ON "public"."maintenance_requests" USING "btree" ("property_id");



CREATE INDEX "idx_maintenance_status" ON "public"."maintenance_requests" USING "btree" ("status");



CREATE INDEX "idx_maintenance_tenant_id" ON "public"."maintenance_requests" USING "btree" ("tenant_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_property_id" ON "public"."notifications" USING "btree" ("property_id");



CREATE INDEX "idx_notifications_read_at" ON "public"."notifications" USING "btree" ("read_at");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_payment_proofs_payment_id" ON "public"."payment_proofs" USING "btree" ("payment_id");



CREATE INDEX "idx_payments_date" ON "public"."payments" USING "btree" ("payment_date");



CREATE INDEX "idx_payments_invoice_id" ON "public"."payments" USING "btree" ("invoice_id");



CREATE INDEX "idx_payments_property_id" ON "public"."payments" USING "btree" ("property_id");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "idx_payments_tenant_id" ON "public"."payments" USING "btree" ("tenant_id");



CREATE INDEX "idx_permissions_key" ON "public"."permissions" USING "btree" ("key");



CREATE INDEX "idx_permissions_scope" ON "public"."permissions" USING "btree" ("scope");



CREATE INDEX "idx_plan_entitlements_entitlement_id" ON "public"."plan_entitlements" USING "btree" ("entitlement_id");



CREATE INDEX "idx_plan_entitlements_plan_id" ON "public"."plan_entitlements" USING "btree" ("plan_id");



CREATE INDEX "idx_platform_admins_status" ON "public"."platform_admins" USING "btree" ("status");



CREATE INDEX "idx_platform_role_permissions_perm" ON "public"."platform_role_permissions" USING "btree" ("permission_id");



CREATE INDEX "idx_platform_role_permissions_role" ON "public"."platform_role_permissions" USING "btree" ("role_id");



CREATE INDEX "idx_platform_user_roles_user" ON "public"."platform_user_roles" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_id" ON "public"."profiles" USING "btree" ("id");



CREATE INDEX "idx_properties_owner_id" ON "public"."properties" USING "btree" ("owner_id");



CREATE INDEX "idx_properties_status" ON "public"."properties" USING "btree" ("status");



CREATE INDEX "idx_properties_workspace_id" ON "public"."properties" USING "btree" ("workspace_id");



CREATE INDEX "idx_property_members_prop_id" ON "public"."property_members" USING "btree" ("property_id");



CREATE INDEX "idx_property_members_status" ON "public"."property_members" USING "btree" ("status");



CREATE INDEX "idx_property_members_user_id" ON "public"."property_members" USING "btree" ("user_id");



CREATE INDEX "idx_subscription_events_account_id" ON "public"."subscription_events" USING "btree" ("account_id");



CREATE INDEX "idx_subscription_events_created_at" ON "public"."subscription_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_subscription_events_event_id" ON "public"."subscription_events" USING "btree" ("provider_event_id");



CREATE INDEX "idx_subscription_payments_account_id" ON "public"."subscription_payments" USING "btree" ("account_id");



CREATE INDEX "idx_subscription_payments_reference" ON "public"."subscription_payments" USING "btree" ("reference");



CREATE INDEX "idx_subscription_payments_status" ON "public"."subscription_payments" USING "btree" ("status");



CREATE INDEX "idx_subscription_payments_subscription_id" ON "public"."subscription_payments" USING "btree" ("subscription_id");



CREATE INDEX "idx_subscription_plans_slug" ON "public"."subscription_plans" USING "btree" ("slug");



CREATE INDEX "idx_subscription_plans_status" ON "public"."subscription_plans" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_account_id" ON "public"."subscriptions" USING "btree" ("account_id");



CREATE INDEX "idx_subscriptions_plan_id" ON "public"."subscriptions" USING "btree" ("plan_id");



CREATE INDEX "idx_subscriptions_provider_sub_id" ON "public"."subscriptions" USING "btree" ("provider_subscription_id");



CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");



CREATE INDEX "idx_tasks_assigned_to" ON "public"."tasks" USING "btree" ("assigned_to");



CREATE INDEX "idx_tasks_due_date" ON "public"."tasks" USING "btree" ("due_date");



CREATE INDEX "idx_tasks_property_id" ON "public"."tasks" USING "btree" ("property_id");



CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("status");



CREATE INDEX "idx_team_role_permissions_perm" ON "public"."team_role_permissions" USING "btree" ("permission_id");



CREATE INDEX "idx_team_role_permissions_role" ON "public"."team_role_permissions" USING "btree" ("role_id");



CREATE INDEX "idx_team_roles_workspace_id" ON "public"."team_roles" USING "btree" ("workspace_id");



CREATE INDEX "idx_tenants_email" ON "public"."tenants" USING "btree" ("email");



CREATE INDEX "idx_tenants_property_id" ON "public"."tenants" USING "btree" ("property_id");



CREATE INDEX "idx_tenants_status" ON "public"."tenants" USING "btree" ("status");



CREATE INDEX "idx_tenants_user_id" ON "public"."tenants" USING "btree" ("user_id");



CREATE INDEX "idx_workspace_invitations_expires" ON "public"."workspace_invitations" USING "btree" ("expires_at");



CREATE INDEX "idx_workspace_invitations_status" ON "public"."workspace_invitations" USING "btree" ("status");



CREATE INDEX "idx_workspace_invitations_workspace" ON "public"."workspace_invitations" USING "btree" ("workspace_id");



CREATE INDEX "idx_workspace_members_role_id" ON "public"."workspace_members" USING "btree" ("role_id");



CREATE INDEX "idx_workspace_members_status" ON "public"."workspace_members" USING "btree" ("status");



CREATE INDEX "idx_workspace_members_user_id" ON "public"."workspace_members" USING "btree" ("user_id");



CREATE INDEX "idx_workspace_members_ws_id" ON "public"."workspace_members" USING "btree" ("workspace_id");



CREATE INDEX "idx_workspaces_owner_id" ON "public"."workspaces" USING "btree" ("owner_id");



CREATE INDEX "idx_workspaces_slug" ON "public"."workspaces" USING "btree" ("slug");



CREATE UNIQUE INDEX "uq_lease_primary_tenant" ON "public"."lease_tenants" USING "btree" ("lease_id") WHERE ("is_primary" = true);



CREATE UNIQUE INDEX "uq_profiles_public_id" ON "public"."profiles" USING "btree" ("public_id");



CREATE UNIQUE INDEX "uq_subscriptions_one_checkout_current" ON "public"."subscriptions" USING "btree" ("account_id") WHERE ("status" = ANY (ARRAY['pending_payment'::"text", 'under_review'::"text"]));



CREATE UNIQUE INDEX "uq_subscriptions_one_entitlement_current" ON "public"."subscriptions" USING "btree" ("account_id") WHERE ("status" = ANY (ARRAY['trialing'::"text", 'active'::"text", 'past_due'::"text", 'paused'::"text"]));



CREATE UNIQUE INDEX "uq_team_roles_system_name" ON "public"."team_roles" USING "btree" ("lower"("name")) WHERE ("workspace_id" IS NULL);



CREATE UNIQUE INDEX "uq_team_roles_workspace_name" ON "public"."team_roles" USING "btree" ("workspace_id", "lower"("name")) WHERE ("workspace_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_workspace_invitations_token_hash" ON "public"."workspace_invitations" USING "btree" ("token_hash") WHERE ("token_hash" IS NOT NULL);



CREATE OR REPLACE TRIGGER "trg_ensure_single_current_subscription" BEFORE INSERT OR UPDATE OF "status" ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_single_current_subscription"();



CREATE OR REPLACE TRIGGER "trg_expenses_created_by" BEFORE INSERT OR UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."protect_created_by"();



CREATE OR REPLACE TRIGGER "trg_invoices_created_by" BEFORE INSERT OR UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."protect_created_by"();



CREATE OR REPLACE TRIGGER "trg_leases_created_by" BEFORE INSERT OR UPDATE ON "public"."leases" FOR EACH ROW EXECUTE FUNCTION "public"."protect_created_by"();



CREATE OR REPLACE TRIGGER "trg_payments_created_by" BEFORE INSERT OR UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."protect_created_by"();



CREATE OR REPLACE TRIGGER "trg_prevent_activity_log_modification" BEFORE DELETE OR UPDATE ON "public"."activity_logs" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_activity_log_modification"();



CREATE OR REPLACE TRIGGER "trg_profiles_set_public_id" BEFORE INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."trg_profiles_set_public_id"();



CREATE OR REPLACE TRIGGER "trg_property_owner_in_workspace" BEFORE INSERT OR UPDATE OF "workspace_id", "owner_id" ON "public"."properties" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_property_owner_in_workspace"();



CREATE OR REPLACE TRIGGER "trg_protect_account_context" BEFORE UPDATE ON "public"."account_context" FOR EACH ROW EXECUTE FUNCTION "public"."protect_account_context_fields"();



CREATE OR REPLACE TRIGGER "trg_protect_documents_property" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."protect_child_property_id"();



CREATE OR REPLACE TRIGGER "trg_protect_expenses_property" BEFORE UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."protect_child_property_id"();



CREATE OR REPLACE TRIGGER "trg_protect_inspections_property" BEFORE UPDATE ON "public"."inspections" FOR EACH ROW EXECUTE FUNCTION "public"."protect_child_property_id"();



CREATE OR REPLACE TRIGGER "trg_protect_invoices_property" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."protect_child_property_id"();



CREATE OR REPLACE TRIGGER "trg_protect_leases_property" BEFORE UPDATE ON "public"."leases" FOR EACH ROW EXECUTE FUNCTION "public"."protect_child_property_id"();



CREATE OR REPLACE TRIGGER "trg_protect_maintenance_requests_property" BEFORE UPDATE ON "public"."maintenance_requests" FOR EACH ROW EXECUTE FUNCTION "public"."protect_child_property_id"();



CREATE OR REPLACE TRIGGER "trg_protect_notifications" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."protect_notifications_read_state"();



CREATE OR REPLACE TRIGGER "trg_protect_payments_property" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."protect_child_property_id"();



CREATE OR REPLACE TRIGGER "trg_protect_platform_admins" BEFORE INSERT OR DELETE OR UPDATE ON "public"."platform_admins" FOR EACH ROW EXECUTE FUNCTION "public"."protect_platform_admins_mutations"();



CREATE OR REPLACE TRIGGER "trg_protect_subscription_payments" BEFORE DELETE OR UPDATE ON "public"."subscription_payments" FOR EACH ROW EXECUTE FUNCTION "public"."protect_subscription_payment_client"();



CREATE OR REPLACE TRIGGER "trg_protect_tasks_property" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."protect_child_property_id"();



CREATE OR REPLACE TRIGGER "trg_protect_tenants_property" BEFORE UPDATE ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."protect_child_property_id"();



CREATE OR REPLACE TRIGGER "trg_rent_payment_lifecycle" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_rent_payment_lifecycle"();



CREATE OR REPLACE TRIGGER "trg_sync_property_workspace_team_access" AFTER INSERT ON "public"."properties" FOR EACH ROW EXECUTE FUNCTION "public"."sync_property_workspace_team_access"();



CREATE OR REPLACE TRIGGER "trg_sync_workspace_member_role_text" BEFORE INSERT OR UPDATE OF "role_id" ON "public"."workspace_members" FOR EACH ROW EXECUTE FUNCTION "public"."sync_workspace_member_role_text"();



CREATE OR REPLACE TRIGGER "trg_workspaces_ensure_owner_membership" AFTER INSERT OR UPDATE OF "owner_id" ON "public"."workspaces" FOR EACH ROW EXECUTE FUNCTION "public"."trg_workspaces_ensure_owner_membership"();



ALTER TABLE ONLY "public"."account_context"
    ADD CONSTRAINT "account_context_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "fk_docs_lease_prop" FOREIGN KEY ("lease_id", "property_id") REFERENCES "public"."leases"("id", "property_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "fk_docs_tenant_prop" FOREIGN KEY ("tenant_id", "property_id") REFERENCES "public"."tenants"("id", "property_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "fk_invoices_lease_prop" FOREIGN KEY ("lease_id", "property_id") REFERENCES "public"."leases"("id", "property_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "fk_invoices_tenant_prop" FOREIGN KEY ("tenant_id", "property_id") REFERENCES "public"."tenants"("id", "property_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lease_tenants"
    ADD CONSTRAINT "fk_lease_tenants_lease_prop" FOREIGN KEY ("lease_id", "property_id") REFERENCES "public"."leases"("id", "property_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lease_tenants"
    ADD CONSTRAINT "fk_lease_tenants_tenant_prop" FOREIGN KEY ("tenant_id", "property_id") REFERENCES "public"."tenants"("id", "property_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_requests"
    ADD CONSTRAINT "fk_maintenance_tenant_prop" FOREIGN KEY ("tenant_id", "property_id") REFERENCES "public"."tenants"("id", "property_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "fk_payments_invoice_prop" FOREIGN KEY ("invoice_id", "property_id") REFERENCES "public"."invoices"("id", "property_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "fk_payments_lease_prop" FOREIGN KEY ("lease_id", "property_id") REFERENCES "public"."leases"("id", "property_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "fk_payments_tenant_prop" FOREIGN KEY ("tenant_id", "property_id") REFERENCES "public"."tenants"("id", "property_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "fk_subscription_payments_sub_account" FOREIGN KEY ("subscription_id", "account_id") REFERENCES "public"."subscriptions"("id", "account_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inspection_items"
    ADD CONSTRAINT "inspection_items_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inspections"
    ADD CONSTRAINT "inspections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inspections"
    ADD CONSTRAINT "inspections_inspector_id_fkey" FOREIGN KEY ("inspector_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inspections"
    ADD CONSTRAINT "inspections_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lease_tenants"
    ADD CONSTRAINT "lease_tenants_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lease_tenants"
    ADD CONSTRAINT "lease_tenants_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lease_tenants"
    ADD CONSTRAINT "lease_tenants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leases"
    ADD CONSTRAINT "leases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leases"
    ADD CONSTRAINT "leases_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leases"
    ADD CONSTRAINT "leases_renewed_from_lease_id_fkey" FOREIGN KEY ("renewed_from_lease_id") REFERENCES "public"."leases"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."maintenance_requests"
    ADD CONSTRAINT "maintenance_requests_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."maintenance_requests"
    ADD CONSTRAINT "maintenance_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."maintenance_requests"
    ADD CONSTRAINT "maintenance_requests_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_requests"
    ADD CONSTRAINT "maintenance_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_proofs"
    ADD CONSTRAINT "payment_proofs_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."subscription_payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."plan_entitlements"
    ADD CONSTRAINT "plan_entitlements_entitlement_id_fkey" FOREIGN KEY ("entitlement_id") REFERENCES "public"."entitlements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_entitlements"
    ADD CONSTRAINT "plan_entitlements_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_role_permissions"
    ADD CONSTRAINT "platform_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_role_permissions"
    ADD CONSTRAINT "platform_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."platform_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_roles"
    ADD CONSTRAINT "platform_roles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."platform_user_roles"
    ADD CONSTRAINT "platform_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."platform_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_user_roles"
    ADD CONSTRAINT "platform_user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_members"
    ADD CONSTRAINT "property_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."property_members"
    ADD CONSTRAINT "property_members_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_members"
    ADD CONSTRAINT "property_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_events"
    ADD CONSTRAINT "subscription_events_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."account_context"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."account_context"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."account_context"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_role_permissions"
    ADD CONSTRAINT "team_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_role_permissions"
    ADD CONSTRAINT "team_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."team_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_roles"
    ADD CONSTRAINT "team_roles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_roles"
    ADD CONSTRAINT "team_roles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."team_roles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."team_roles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE "public"."account_context" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "account_select_admin" ON "public"."account_context" FOR SELECT TO "authenticated" USING ("public"."is_platform_admin"());



CREATE POLICY "account_select_own" ON "public"."account_context" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "account_update_admin" ON "public"."account_context" FOR UPDATE TO "authenticated" USING ("public"."is_platform_admin"()) WITH CHECK ("public"."is_platform_admin"());



CREATE POLICY "account_update_own" ON "public"."account_context" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "act_insert_admin" ON "public"."activity_logs" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_platform_admin"());



CREATE POLICY "act_select" ON "public"."activity_logs" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (("property_id" IS NOT NULL) AND "public"."can_access_property"("property_id")) OR (("workspace_id" IS NOT NULL) AND "public"."can_access_workspace"("workspace_id")) OR "public"."is_platform_admin"()));



ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_admin_ins" ON "public"."admin_audit_logs" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_platform_admin"() AND ("admin_user_id" = "auth"."uid"())));



CREATE POLICY "audit_admin_sel" ON "public"."admin_audit_logs" FOR SELECT TO "authenticated" USING ("public"."is_platform_admin"());



CREATE POLICY "doc_delete" ON "public"."documents" FOR DELETE TO "authenticated" USING ("public"."can_write_property"("property_id", 'document.create'::"text"));



CREATE POLICY "doc_insert" ON "public"."documents" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_property"("property_id", 'document.create'::"text"));



CREATE POLICY "doc_select" ON "public"."documents" FOR SELECT TO "authenticated" USING (("public"."can_access_property"("property_id") OR ("uploaded_by" = "auth"."uid"()) OR ("tenant_id" IN ( SELECT "tenants"."id"
   FROM "public"."tenants"
  WHERE ("tenants"."user_id" = "auth"."uid"()))) OR "public"."is_platform_admin"()));



CREATE POLICY "doc_update" ON "public"."documents" FOR UPDATE TO "authenticated" USING ("public"."can_write_property"("property_id", 'document.create'::"text")) WITH CHECK ("public"."can_write_property"("property_id", 'document.create'::"text"));



ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_admin" ON "public"."email_events" FOR SELECT TO "authenticated" USING ("public"."is_platform_admin"());



ALTER TABLE "public"."email_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_own" ON "public"."email_events" FOR SELECT TO "authenticated" USING ((("auth"."jwt"() ->> 'email'::"text") = "recipient"));



ALTER TABLE "public"."entitlements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entitlements_admin_del" ON "public"."entitlements" FOR DELETE TO "authenticated" USING ("public"."is_platform_admin"());



CREATE POLICY "entitlements_admin_ins" ON "public"."entitlements" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_platform_admin"());



CREATE POLICY "entitlements_admin_upd" ON "public"."entitlements" FOR UPDATE TO "authenticated" USING ("public"."is_platform_admin"()) WITH CHECK ("public"."is_platform_admin"());



CREATE POLICY "entitlements_select" ON "public"."entitlements" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "exp_delete_pending" ON "public"."expenses" FOR DELETE TO "authenticated" USING ((("status" = ANY (ARRAY['pending'::"text", 'cancelled'::"text"])) AND "public"."can_write_property"("property_id", 'financial.manage'::"text")));



CREATE POLICY "exp_insert" ON "public"."expenses" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_property"("property_id", 'financial.manage'::"text"));



CREATE POLICY "exp_select" ON "public"."expenses" FOR SELECT TO "authenticated" USING (("public"."can_access_property"("property_id") OR "public"."is_platform_admin"()));



CREATE POLICY "exp_update" ON "public"."expenses" FOR UPDATE TO "authenticated" USING ("public"."can_write_property"("property_id", 'financial.manage'::"text")) WITH CHECK ("public"."can_write_property"("property_id", 'financial.manage'::"text"));



ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insp_delete" ON "public"."inspections" FOR DELETE TO "authenticated" USING ("public"."can_write_property"("property_id", 'inspection.create'::"text"));



CREATE POLICY "insp_insert" ON "public"."inspections" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_property"("property_id", 'inspection.create'::"text"));



CREATE POLICY "insp_select" ON "public"."inspections" FOR SELECT TO "authenticated" USING (("public"."can_access_property"("property_id") OR ("inspector_id" = "auth"."uid"()) OR "public"."is_platform_admin"()));



CREATE POLICY "insp_update" ON "public"."inspections" FOR UPDATE TO "authenticated" USING ("public"."can_write_property"("property_id", 'inspection.create'::"text")) WITH CHECK ("public"."can_write_property"("property_id", 'inspection.create'::"text"));



ALTER TABLE "public"."inspection_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inspections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inspitem_delete" ON "public"."inspection_items" FOR DELETE TO "authenticated" USING (("public"."is_platform_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."inspections" "i"
  WHERE (("i"."id" = "inspection_items"."inspection_id") AND "public"."can_write_property"("i"."property_id", 'inspection.create'::"text"))))));



CREATE POLICY "inspitem_insert" ON "public"."inspection_items" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_platform_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."inspections" "i"
  WHERE (("i"."id" = "inspection_items"."inspection_id") AND "public"."can_write_property"("i"."property_id", 'inspection.create'::"text"))))));



CREATE POLICY "inspitem_select" ON "public"."inspection_items" FOR SELECT TO "authenticated" USING (("public"."is_platform_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."inspections" "i"
  WHERE (("i"."id" = "inspection_items"."inspection_id") AND "public"."can_access_property"("i"."property_id"))))));



CREATE POLICY "inspitem_update" ON "public"."inspection_items" FOR UPDATE TO "authenticated" USING (("public"."is_platform_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."inspections" "i"
  WHERE (("i"."id" = "inspection_items"."inspection_id") AND "public"."can_write_property"("i"."property_id", 'inspection.create'::"text")))))) WITH CHECK (("public"."is_platform_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."inspections" "i"
  WHERE (("i"."id" = "inspection_items"."inspection_id") AND "public"."can_write_property"("i"."property_id", 'inspection.create'::"text"))))));



CREATE POLICY "inv_delete_draft" ON "public"."invoices" FOR DELETE TO "authenticated" USING ((("status" = 'draft'::"text") AND "public"."can_write_property"("property_id", 'financial.manage'::"text")));



CREATE POLICY "inv_insert" ON "public"."invoices" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_property"("property_id", 'financial.manage'::"text"));



CREATE POLICY "inv_select" ON "public"."invoices" FOR SELECT TO "authenticated" USING (("public"."can_access_property"("property_id") OR ("tenant_id" IN ( SELECT "tenants"."id"
   FROM "public"."tenants"
  WHERE ("tenants"."user_id" = "auth"."uid"()))) OR "public"."is_platform_admin"()));



CREATE POLICY "inv_update" ON "public"."invoices" FOR UPDATE TO "authenticated" USING ("public"."can_write_property"("property_id", 'financial.manage'::"text")) WITH CHECK ("public"."can_write_property"("property_id", 'financial.manage'::"text"));



CREATE POLICY "invitem_delete_draft" ON "public"."invoice_items" FOR DELETE TO "authenticated" USING (("public"."is_platform_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."invoices" "i"
  WHERE (("i"."id" = "invoice_items"."invoice_id") AND ("i"."status" = 'draft'::"text") AND "public"."can_write_property"("i"."property_id", 'financial.manage'::"text"))))));



CREATE POLICY "invitem_insert" ON "public"."invoice_items" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_platform_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."invoices" "i"
  WHERE (("i"."id" = "invoice_items"."invoice_id") AND "public"."can_write_property"("i"."property_id", 'financial.manage'::"text"))))));



CREATE POLICY "invitem_select" ON "public"."invoice_items" FOR SELECT TO "authenticated" USING (("public"."is_platform_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."invoices" "i"
  WHERE (("i"."id" = "invoice_items"."invoice_id") AND "public"."can_access_property"("i"."property_id"))))));



CREATE POLICY "invitem_update" ON "public"."invoice_items" FOR UPDATE TO "authenticated" USING (("public"."is_platform_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."invoices" "i"
  WHERE (("i"."id" = "invoice_items"."invoice_id") AND "public"."can_write_property"("i"."property_id", 'financial.manage'::"text")))))) WITH CHECK (("public"."is_platform_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."invoices" "i"
  WHERE (("i"."id" = "invoice_items"."invoice_id") AND "public"."can_write_property"("i"."property_id", 'financial.manage'::"text"))))));



ALTER TABLE "public"."invoice_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lease_tenants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leases" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "leases_delete" ON "public"."leases" FOR DELETE TO "authenticated" USING ("public"."can_write_property"("property_id", 'lease.update'::"text"));



CREATE POLICY "leases_insert" ON "public"."leases" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_property"("property_id", 'lease.update'::"text"));



CREATE POLICY "leases_select" ON "public"."leases" FOR SELECT TO "authenticated" USING (("public"."can_access_property"("property_id") OR "public"."tenant_can_read_lease"("id") OR "public"."is_platform_admin"()));



CREATE POLICY "leases_update" ON "public"."leases" FOR UPDATE TO "authenticated" USING ("public"."can_write_property"("property_id", 'lease.update'::"text")) WITH CHECK ("public"."can_write_property"("property_id", 'lease.update'::"text"));



CREATE POLICY "lt_delete" ON "public"."lease_tenants" FOR DELETE TO "authenticated" USING (("public"."is_platform_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."leases" "l"
  WHERE (("l"."id" = "lease_tenants"."lease_id") AND "public"."can_write_property"("l"."property_id", 'lease.update'::"text"))))));



CREATE POLICY "lt_insert" ON "public"."lease_tenants" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_platform_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."leases" "l"
  WHERE (("l"."id" = "lease_tenants"."lease_id") AND "public"."can_write_property"("l"."property_id", 'lease.update'::"text"))))));



CREATE POLICY "lt_select" ON "public"."lease_tenants" FOR SELECT TO "authenticated" USING (("public"."is_platform_admin"() OR "public"."can_access_property"("property_id") OR ("tenant_id" IN ( SELECT "tenants"."id"
   FROM "public"."tenants"
  WHERE ("tenants"."user_id" = "auth"."uid"())))));



CREATE POLICY "lt_update" ON "public"."lease_tenants" FOR UPDATE TO "authenticated" USING (("public"."is_platform_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."leases" "l"
  WHERE (("l"."id" = "lease_tenants"."lease_id") AND "public"."can_write_property"("l"."property_id", 'lease.update'::"text")))))) WITH CHECK (("public"."is_platform_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."leases" "l"
  WHERE (("l"."id" = "lease_tenants"."lease_id") AND "public"."can_write_property"("l"."property_id", 'lease.update'::"text"))))));



ALTER TABLE "public"."maintenance_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mnt_delete" ON "public"."maintenance_requests" FOR DELETE TO "authenticated" USING ("public"."can_write_property"("property_id", 'maintenance.manage'::"text"));



CREATE POLICY "mnt_insert" ON "public"."maintenance_requests" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_property"("property_id", 'maintenance.manage'::"text"));



CREATE POLICY "mnt_select" ON "public"."maintenance_requests" FOR SELECT TO "authenticated" USING (("public"."can_access_property"("property_id") OR ("assigned_to" = "auth"."uid"()) OR ("tenant_id" IN ( SELECT "tenants"."id"
   FROM "public"."tenants"
  WHERE ("tenants"."user_id" = "auth"."uid"()))) OR "public"."is_platform_admin"()));



CREATE POLICY "mnt_update" ON "public"."maintenance_requests" FOR UPDATE TO "authenticated" USING ("public"."can_write_property"("property_id", 'maintenance.manage'::"text")) WITH CHECK ("public"."can_write_property"("property_id", 'maintenance.manage'::"text"));



CREATE POLICY "notif_insert_managers" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_platform_admin"() OR (("property_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "notifications"."property_id") AND (("p"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."property_members" "pm"
          WHERE (("pm"."property_id" = "p"."id") AND ("pm"."user_id" = "auth"."uid"()) AND ("pm"."status" = 'active'::"text") AND ("pm"."role" = ANY (ARRAY['owner'::"text", 'manager'::"text", 'agent'::"text"]))))) OR (EXISTS ( SELECT 1
           FROM "public"."workspace_members" "wm"
          WHERE (("wm"."workspace_id" = "p"."workspace_id") AND ("wm"."user_id" = "auth"."uid"()) AND ("wm"."status" = 'active'::"text") AND ("wm"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'manager'::"text"]))))))))))));



CREATE POLICY "notif_select" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notif_update_read" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pay_delete_pending" ON "public"."payments" FOR DELETE TO "authenticated" USING ((("status" = 'pending'::"text") AND "public"."can_write_property"("property_id", 'financial.manage'::"text")));



CREATE POLICY "pay_insert" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_property"("property_id", 'financial.manage'::"text"));



CREATE POLICY "pay_select" ON "public"."payments" FOR SELECT TO "authenticated" USING (("public"."can_access_property"("property_id") OR ("tenant_id" IN ( SELECT "tenants"."id"
   FROM "public"."tenants"
  WHERE ("tenants"."user_id" = "auth"."uid"()))) OR "public"."is_platform_admin"()));



CREATE POLICY "pay_update" ON "public"."payments" FOR UPDATE TO "authenticated" USING ("public"."can_write_property"("property_id", 'financial.manage'::"text")) WITH CHECK ("public"."can_write_property"("property_id", 'financial.manage'::"text"));



ALTER TABLE "public"."payment_proofs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permissions_select" ON "public"."permissions" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."plan_entitlements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "plan_entitlements_admin_del" ON "public"."plan_entitlements" FOR DELETE TO "authenticated" USING ("public"."is_platform_admin"());



CREATE POLICY "plan_entitlements_admin_ins" ON "public"."plan_entitlements" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_platform_admin"());



CREATE POLICY "plan_entitlements_admin_upd" ON "public"."plan_entitlements" FOR UPDATE TO "authenticated" USING ("public"."is_platform_admin"()) WITH CHECK ("public"."is_platform_admin"());



CREATE POLICY "plan_entitlements_select" ON "public"."plan_entitlements" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "plans_admin_del" ON "public"."subscription_plans" FOR DELETE TO "authenticated" USING ("public"."is_platform_admin"());



CREATE POLICY "plans_admin_ins" ON "public"."subscription_plans" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_platform_admin"());



CREATE POLICY "plans_admin_upd" ON "public"."subscription_plans" FOR UPDATE TO "authenticated" USING ("public"."is_platform_admin"()) WITH CHECK ("public"."is_platform_admin"());



CREATE POLICY "plans_select_active" ON "public"."subscription_plans" FOR SELECT TO "authenticated" USING ((("status" = 'active'::"text") OR "public"."is_platform_admin"()));



ALTER TABLE "public"."platform_admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "platform_admins_select_admin" ON "public"."platform_admins" FOR SELECT TO "authenticated" USING ("public"."is_platform_admin"());



CREATE POLICY "platform_admins_select_own" ON "public"."platform_admins" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."platform_role_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "platform_role_perms_select" ON "public"."platform_role_permissions" FOR SELECT TO "authenticated" USING (("public"."has_platform_permission"('platform_role.view'::"text") OR "public"."is_platform_admin"()));



ALTER TABLE "public"."platform_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "platform_roles_select" ON "public"."platform_roles" FOR SELECT TO "authenticated" USING (("public"."has_platform_permission"('platform_role.view'::"text") OR "public"."is_platform_admin"()));



ALTER TABLE "public"."platform_user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "platform_user_roles_select" ON "public"."platform_user_roles" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."has_platform_permission"('user.view'::"text") OR "public"."is_platform_admin"()));



CREATE POLICY "pm_delete" ON "public"."property_members" FOR DELETE TO "authenticated" USING ("public"."can_write_property"("property_id", 'team.manage_members'::"text"));



CREATE POLICY "pm_insert" ON "public"."property_members" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_platform_admin"() OR "public"."owns_property"("property_id") OR "public"."can_write_property"("property_id", 'team.manage_members'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "property_members"."property_id") AND ("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "pm_select" ON "public"."property_members" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."owns_property"("property_id") OR "public"."has_property_permission"("property_id", 'team.view'::"text") OR "public"."is_platform_admin"()));



CREATE POLICY "pm_update" ON "public"."property_members" FOR UPDATE TO "authenticated" USING ("public"."can_write_property"("property_id", 'team.manage_members'::"text")) WITH CHECK ("public"."can_write_property"("property_id", 'team.manage_members'::"text"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_admin" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_platform_admin"());



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "proofs_insert_own" ON "public"."payment_proofs" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_platform_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."subscription_payments" "sp"
  WHERE (("sp"."id" = "payment_proofs"."payment_id") AND ("sp"."account_id" = "auth"."uid"()))))));



CREATE POLICY "proofs_select_own" ON "public"."payment_proofs" FOR SELECT TO "authenticated" USING (("public"."is_platform_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."subscription_payments" "sp"
  WHERE (("sp"."id" = "payment_proofs"."payment_id") AND ("sp"."account_id" = "auth"."uid"()))))));



CREATE POLICY "prop_delete" ON "public"."properties" FOR DELETE TO "authenticated" USING (("public"."owns_property"("id") OR "public"."is_platform_admin"()));



CREATE POLICY "prop_insert" ON "public"."properties" FOR INSERT TO "authenticated" WITH CHECK ((("owner_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."user_owns_or_member_workspace"("workspace_id")));



CREATE POLICY "prop_select" ON "public"."properties" FOR SELECT TO "authenticated" USING (("public"."can_access_property"("id") OR ("id" IN ( SELECT "tenants"."property_id"
   FROM "public"."tenants"
  WHERE ("tenants"."user_id" = "auth"."uid"()))) OR "public"."is_platform_admin"()));



CREATE POLICY "prop_update" ON "public"."properties" FOR UPDATE TO "authenticated" USING ("public"."can_write_property"("id", 'property.update'::"text")) WITH CHECK ("public"."can_write_property"("id", 'property.update'::"text"));



ALTER TABLE "public"."properties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sub_events_admin" ON "public"."subscription_events" FOR SELECT TO "authenticated" USING ("public"."is_platform_admin"());



CREATE POLICY "subpay_admin_ins" ON "public"."subscription_payments" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_platform_admin"());



CREATE POLICY "subpay_admin_upd" ON "public"."subscription_payments" FOR UPDATE TO "authenticated" USING ("public"."is_platform_admin"()) WITH CHECK ("public"."is_platform_admin"());



CREATE POLICY "subpay_select_own" ON "public"."subscription_payments" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "account_id") OR "public"."is_platform_admin"()));



CREATE POLICY "subs_admin_del" ON "public"."subscriptions" FOR DELETE TO "authenticated" USING ("public"."is_platform_admin"());



CREATE POLICY "subs_admin_ins" ON "public"."subscriptions" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_platform_admin"());



CREATE POLICY "subs_admin_upd" ON "public"."subscriptions" FOR UPDATE TO "authenticated" USING ("public"."is_platform_admin"()) WITH CHECK ("public"."is_platform_admin"());



CREATE POLICY "subs_select_own" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "account_id") OR "public"."is_platform_admin"()));



ALTER TABLE "public"."subscription_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_delete" ON "public"."tasks" FOR DELETE TO "authenticated" USING ("public"."can_write_property"("property_id", 'task.create'::"text"));



CREATE POLICY "task_insert" ON "public"."tasks" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_property"("property_id", 'task.create'::"text"));



CREATE POLICY "task_select" ON "public"."tasks" FOR SELECT TO "authenticated" USING (("public"."can_access_property"("property_id") OR ("assigned_to" = "auth"."uid"()) OR ("created_by" = "auth"."uid"()) OR "public"."is_platform_admin"()));



CREATE POLICY "task_update" ON "public"."tasks" FOR UPDATE TO "authenticated" USING ("public"."can_write_property"("property_id", 'task.create'::"text")) WITH CHECK ("public"."can_write_property"("property_id", 'task.create'::"text"));



ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_role_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_role_perms_select" ON "public"."team_role_permissions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."team_roles" "tr"
  WHERE (("tr"."id" = "team_role_permissions"."role_id") AND (("tr"."workspace_id" IS NULL) OR "public"."can_access_workspace"("tr"."workspace_id"))))));



ALTER TABLE "public"."team_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_roles_select" ON "public"."team_roles" FOR SELECT TO "authenticated" USING ((("workspace_id" IS NULL) OR "public"."can_access_workspace"("workspace_id") OR "public"."has_platform_permission"('team_role.view'::"text")));



ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenants_delete" ON "public"."tenants" FOR DELETE TO "authenticated" USING ("public"."can_write_property"("property_id", 'tenant.update'::"text"));



CREATE POLICY "tenants_insert" ON "public"."tenants" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_property"("property_id", 'tenant.update'::"text"));



CREATE POLICY "tenants_select" ON "public"."tenants" FOR SELECT TO "authenticated" USING (("public"."can_access_property"("property_id") OR ("user_id" = "auth"."uid"()) OR "public"."is_platform_admin"()));



CREATE POLICY "tenants_update" ON "public"."tenants" FOR UPDATE TO "authenticated" USING ("public"."can_write_property"("property_id", 'tenant.update'::"text")) WITH CHECK ("public"."can_write_property"("property_id", 'tenant.update'::"text"));



ALTER TABLE "public"."workspace_invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workspace_invitations_deny" ON "public"."workspace_invitations" TO "authenticated" USING (false);



ALTER TABLE "public"."workspace_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ws_insert" ON "public"."workspaces" FOR INSERT TO "authenticated" WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "ws_select" ON "public"."workspaces" FOR SELECT TO "authenticated" USING ((("owner_id" = "auth"."uid"()) OR "public"."can_access_workspace"("id") OR "public"."is_platform_admin"()));



CREATE POLICY "ws_update" ON "public"."workspaces" FOR UPDATE TO "authenticated" USING ((("owner_id" = "auth"."uid"()) OR "public"."is_platform_admin"())) WITH CHECK ((("owner_id" = "auth"."uid"()) OR "public"."is_platform_admin"()));



CREATE POLICY "wsm_delete" ON "public"."workspace_members" FOR DELETE TO "authenticated" USING (("public"."has_workspace_permission"("workspace_id", 'team.member.remove'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."workspaces" "w"
  WHERE (("w"."id" = "workspace_members"."workspace_id") AND ("w"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "wsm_insert" ON "public"."workspace_members" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "wsm_select" ON "public"."workspace_members" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."has_workspace_permission"("workspace_id", 'team.member.view'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."workspaces" "w"
  WHERE (("w"."id" = "workspace_members"."workspace_id") AND ("w"."owner_id" = "auth"."uid"())))) OR "public"."has_platform_permission"('team.data.view'::"text")));



CREATE POLICY "wsm_update" ON "public"."workspace_members" FOR UPDATE TO "authenticated" USING (("public"."has_workspace_permission"("workspace_id", 'team.member.update'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."workspaces" "w"
  WHERE (("w"."id" = "workspace_members"."workspace_id") AND ("w"."owner_id" = "auth"."uid"())))))) WITH CHECK (("public"."has_workspace_permission"("workspace_id", 'team.member.update'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."workspaces" "w"
  WHERE (("w"."id" = "workspace_members"."workspace_id") AND ("w"."owner_id" = "auth"."uid"()))))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT ALL ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."accept_workspace_invitation"("p_token" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."accept_workspace_invitation"("p_token" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."add_workspace_member_by_profile_id"("p_workspace_id" "uuid", "p_public_id" "text", "p_role_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."add_workspace_member_by_profile_id"("p_workspace_id" "uuid", "p_public_id" "text", "p_role_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."admin_delete_platform_role"("p_role_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_delete_platform_role"("p_role_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."admin_get_platform_roles_with_stats"() TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_get_platform_roles_with_stats"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."admin_get_role_impact"("p_entity_type" "text", "p_entity_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_get_role_impact"("p_entity_type" "text", "p_entity_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."admin_get_system_team_roles_with_stats"() TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_get_system_team_roles_with_stats"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."admin_update_system_team_role"("p_role_id" "uuid", "p_description" "text", "p_permission_keys" "text"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_update_system_team_role"("p_role_id" "uuid", "p_description" "text", "p_permission_keys" "text"[]) TO "authenticated";



GRANT ALL ON FUNCTION "public"."admin_upsert_platform_role"("p_role_id" "uuid", "p_name" "text", "p_description" "text", "p_permission_keys" "text"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_upsert_platform_role"("p_role_id" "uuid", "p_name" "text", "p_description" "text", "p_permission_keys" "text"[]) TO "authenticated";



GRANT ALL ON FUNCTION "public"."assert_workspace_seat_available"("p_workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auth_is_service_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_organization"("p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_property"("p_property_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_workspace"("p_workspace_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."can_access_workspace"("p_workspace_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."can_assign_team_role"("p_workspace_id" "uuid", "p_role_id" "uuid", "p_assigner_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."can_assign_team_role"("p_workspace_id" "uuid", "p_role_id" "uuid", "p_assigner_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."can_write_property"("p_property_id" "uuid", "p_permission" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."can_write_property"("p_property_id" "uuid", "p_permission" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."change_workspace_member_role"("p_member_id" "uuid", "p_role_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."change_workspace_member_role"("p_member_id" "uuid", "p_role_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."count_workspace_custom_roles"("p_workspace_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."count_workspace_custom_roles"("p_workspace_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."count_workspace_seats"("p_workspace_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."count_workspace_seats"("p_workspace_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."create_workspace_invitation"("p_workspace_id" "uuid", "p_role_id" "uuid", "p_invite_type" "text", "p_profile_id" "uuid", "p_email" "text", "p_expiry_days" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."create_workspace_invitation"("p_workspace_id" "uuid", "p_role_id" "uuid", "p_invite_type" "text", "p_profile_id" "uuid", "p_email" "text", "p_expiry_days" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."create_workspace_team_role"("p_workspace_id" "uuid", "p_name" "text", "p_description" "text", "p_permission_keys" "text"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."create_workspace_team_role"("p_workspace_id" "uuid", "p_name" "text", "p_description" "text", "p_permission_keys" "text"[]) TO "authenticated";



GRANT ALL ON FUNCTION "public"."current_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_workspace_team_role"("p_role_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."delete_workspace_team_role"("p_role_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."enforce_property_owner_in_workspace"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_rent_payment_lifecycle"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_current_subscription"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_workspace_owner_membership"("p_workspace_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."ensure_workspace_owner_membership"("p_workspace_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."generate_profile_public_id"() TO "service_role";
GRANT ALL ON FUNCTION "public"."generate_profile_public_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_profile_public_id"() TO "anon";



GRANT ALL ON FUNCTION "public"."get_assignable_team_roles"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_assignable_team_roles"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_effective_workspace_permissions"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_effective_workspace_permissions"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_role_permissions"("p_role_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_role_permissions"("p_role_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_user_accessible_organization_ids"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_accessible_property_ids"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_accessible_workspace_ids"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_workspace_pending_invitations"("p_workspace_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_workspace_pending_invitations"("p_workspace_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_workspace_seat_limit"("p_workspace_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_workspace_seat_limit"("p_workspace_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_workspace_team_roles"("p_workspace_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_workspace_team_roles"("p_workspace_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_platform_permission"("p_permission_key" "text", "p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."has_platform_permission"("p_permission_key" "text", "p_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."has_property_permission"("p_property_id" "uuid", "p_permission" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_workspace_permission"("p_workspace_id" "uuid", "p_permission_key" "text", "p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."has_workspace_permission"("p_workspace_id" "uuid", "p_permission_key" "text", "p_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."hash_invitation_token"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."log_activity"("p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_workspace_id" "uuid", "p_property_id" "uuid", "p_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_activity"("p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_workspace_id" "uuid", "p_property_id" "uuid", "p_metadata" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."log_activity"("p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_workspace_id" "uuid", "p_property_id" "uuid", "p_metadata" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."lookup_profile_by_public_id"("p_public_id" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."lookup_profile_by_public_id"("p_public_id" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."map_team_role_to_property_role"("p_team_role_name" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."map_team_role_to_property_role"("p_team_role_name" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."owns_property"("p_property_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."owns_subscription_payment"("p_payment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."payment_id_from_storage_path"("p_name" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."payment_id_from_storage_path"("p_name" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."prevent_activity_log_modification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_account_context_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_child_property_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_created_by"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_notifications_read_state"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_platform_admins_mutations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_subscription_payment_client"() TO "service_role";



GRANT ALL ON FUNCTION "public"."receipt_payment_id_from_path"("p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_workspace_member"("p_member_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."remove_workspace_member"("p_member_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."resolve_invitation_by_token"("p_token" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."resolve_invitation_by_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_invitation_by_token"("p_token" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."revoke_workspace_invitation"("p_invitation_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."revoke_workspace_invitation"("p_invitation_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."revoke_workspace_member_property_access"("p_workspace_id" "uuid", "p_user_id" "uuid", "p_status" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."revoke_workspace_member_property_access"("p_workspace_id" "uuid", "p_user_id" "uuid", "p_status" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."suspend_workspace_member"("p_member_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."suspend_workspace_member"("p_member_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."sync_property_workspace_team_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_workspace_member_property_access"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_workspace_member_property_access"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."sync_workspace_member_role_text"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tenant_can_read_lease"("p_lease_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."tenant_can_read_lease"("p_lease_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."tenant_can_read_unit"("p_unit_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."tenant_can_read_unit"("p_unit_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."transfer_workspace_ownership"("p_workspace_id" "uuid", "p_new_owner_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."transfer_workspace_ownership"("p_workspace_id" "uuid", "p_new_owner_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."trg_profiles_set_public_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_workspaces_ensure_owner_membership"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_workspace_team_role"("p_role_id" "uuid", "p_name" "text", "p_description" "text", "p_permission_keys" "text"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."update_workspace_team_role"("p_role_id" "uuid", "p_name" "text", "p_description" "text", "p_permission_keys" "text"[]) TO "authenticated";



GRANT ALL ON FUNCTION "public"."user_owns_or_member_workspace"("p_workspace_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."user_owns_or_member_workspace"("p_workspace_id" "uuid") TO "authenticated";


















GRANT ALL ON TABLE "public"."account_context" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."account_context" TO "authenticated";



GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";
GRANT SELECT ON TABLE "public"."activity_logs" TO "authenticated";



GRANT ALL ON TABLE "public"."admin_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."documents" TO "authenticated";



GRANT ALL ON TABLE "public"."email_events" TO "service_role";



GRANT ALL ON TABLE "public"."entitlements" TO "service_role";
GRANT SELECT ON TABLE "public"."entitlements" TO "authenticated";



GRANT ALL ON TABLE "public"."expenses" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."expenses" TO "authenticated";



GRANT ALL ON TABLE "public"."inspection_items" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."inspection_items" TO "authenticated";



GRANT ALL ON TABLE "public"."inspections" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."inspections" TO "authenticated";



GRANT ALL ON TABLE "public"."invoice_items" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."invoice_items" TO "authenticated";



GRANT ALL ON TABLE "public"."invoices" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."invoices" TO "authenticated";



GRANT ALL ON TABLE "public"."lease_tenants" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."lease_tenants" TO "authenticated";



GRANT ALL ON TABLE "public"."leases" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."leases" TO "authenticated";



GRANT ALL ON TABLE "public"."maintenance_requests" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."maintenance_requests" TO "authenticated";



GRANT ALL ON TABLE "public"."notifications" TO "service_role";
GRANT SELECT,UPDATE ON TABLE "public"."notifications" TO "authenticated";



GRANT ALL ON TABLE "public"."payment_proofs" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."payment_proofs" TO "authenticated";



GRANT ALL ON TABLE "public"."payments" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."payments" TO "authenticated";



GRANT ALL ON TABLE "public"."permissions" TO "service_role";
GRANT SELECT ON TABLE "public"."permissions" TO "authenticated";



GRANT ALL ON TABLE "public"."plan_entitlements" TO "service_role";
GRANT SELECT ON TABLE "public"."plan_entitlements" TO "authenticated";



GRANT ALL ON TABLE "public"."platform_admins" TO "service_role";
GRANT SELECT ON TABLE "public"."platform_admins" TO "authenticated";



GRANT ALL ON TABLE "public"."platform_role_permissions" TO "service_role";
GRANT SELECT ON TABLE "public"."platform_role_permissions" TO "authenticated";



GRANT ALL ON TABLE "public"."platform_roles" TO "service_role";
GRANT SELECT ON TABLE "public"."platform_roles" TO "authenticated";



GRANT ALL ON TABLE "public"."platform_user_roles" TO "service_role";
GRANT SELECT ON TABLE "public"."platform_user_roles" TO "authenticated";



GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."properties" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."properties" TO "authenticated";



GRANT ALL ON TABLE "public"."property_members" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."property_members" TO "authenticated";



GRANT ALL ON TABLE "public"."subscription_events" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_payments" TO "service_role";
GRANT SELECT ON TABLE "public"."subscription_payments" TO "authenticated";



GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";
GRANT SELECT ON TABLE "public"."subscription_plans" TO "authenticated";



GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";
GRANT SELECT ON TABLE "public"."subscriptions" TO "authenticated";



GRANT ALL ON TABLE "public"."tasks" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tasks" TO "authenticated";



GRANT ALL ON TABLE "public"."team_role_permissions" TO "service_role";
GRANT SELECT ON TABLE "public"."team_role_permissions" TO "authenticated";



GRANT ALL ON TABLE "public"."team_roles" TO "service_role";
GRANT SELECT ON TABLE "public"."team_roles" TO "authenticated";



GRANT ALL ON TABLE "public"."tenants" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tenants" TO "authenticated";



GRANT ALL ON TABLE "public"."workspace_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_members" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."workspace_members" TO "authenticated";



GRANT ALL ON TABLE "public"."workspaces" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."workspaces" TO "authenticated";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";




























