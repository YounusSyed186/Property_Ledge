-- Authorization refactor: role_id authority, owner consistency, insights/custom-role entitlements

-- -----------------------------------------------------------------------------
-- Backfill workspace_members.role_id from legacy role text
-- -----------------------------------------------------------------------------
UPDATE public.workspace_members wm
SET role_id = tr.id
FROM public.team_roles tr
WHERE wm.role_id IS NULL
  AND tr.workspace_id IS NULL
  AND (
    (wm.role = 'owner' AND lower(tr.name) = 'owner') OR
    (wm.role = 'admin' AND lower(tr.name) = 'admin') OR
    (wm.role = 'manager' AND lower(tr.name) = 'manager') OR
    (wm.role = 'agent' AND lower(tr.name) = 'leasing agent') OR
    (wm.role = 'staff' AND lower(tr.name) = 'staff') OR
    (wm.role = 'viewer' AND lower(tr.name) = 'viewer')
  );

UPDATE public.workspace_members wm
SET role_id = (SELECT id FROM public.team_roles WHERE workspace_id IS NULL AND lower(name) = 'viewer' LIMIT 1)
WHERE role_id IS NULL AND status = 'active';

-- -----------------------------------------------------------------------------
-- Keep legacy role text in sync from role_id (deprecated column, not used for auth)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_workspace_member_role_text()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
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

DROP TRIGGER IF EXISTS trg_sync_workspace_member_role_text ON public.workspace_members;
CREATE TRIGGER trg_sync_workspace_member_role_text
  BEFORE INSERT OR UPDATE OF role_id ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_workspace_member_role_text();

-- -----------------------------------------------------------------------------
-- Ensure workspace owner has Owner role membership
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_workspace_owner_membership(p_workspace_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.trg_workspaces_ensure_owner_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_workspace_owner_membership(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workspaces_ensure_owner_membership ON public.workspaces;
CREATE TRIGGER trg_workspaces_ensure_owner_membership
  AFTER INSERT OR UPDATE OF owner_id ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.trg_workspaces_ensure_owner_membership();

-- Backfill owner memberships for existing workspaces
DO $$
DECLARE
  v_ws UUID;
BEGIN
  FOR v_ws IN SELECT id FROM public.workspaces LOOP
    PERFORM public.ensure_workspace_owner_membership(v_ws);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- Transfer workspace ownership (transactional)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_workspace_ownership(
  p_workspace_id UUID,
  p_new_owner_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.transfer_workspace_ownership(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_workspace_owner_membership(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- New TEAM permissions: Insights
-- -----------------------------------------------------------------------------
INSERT INTO public.permissions (key, name, description, scope, resource, action) VALUES
  ('insights.view', 'View Insights', 'View workspace insights and analytics', 'TEAM', 'insights', 'view'),
  ('insights.generate', 'Generate Insights', 'Generate insight reports', 'TEAM', 'insights', 'generate'),
  ('insights.export', 'Export Insights', 'Export insight reports', 'TEAM', 'insights', 'export')
ON CONFLICT (key) DO NOTHING;

-- Assign insights permissions to system roles
INSERT INTO public.team_role_permissions (role_id, permission_id)
SELECT tr.id, p.id
FROM public.team_roles tr
CROSS JOIN public.permissions p
WHERE tr.workspace_id IS NULL AND lower(tr.name) IN ('owner', 'admin')
  AND p.key IN ('insights.view', 'insights.generate', 'insights.export')
ON CONFLICT DO NOTHING;

INSERT INTO public.team_role_permissions (role_id, permission_id)
SELECT tr.id, p.id
FROM public.team_roles tr
CROSS JOIN public.permissions p
WHERE tr.workspace_id IS NULL AND lower(tr.name) = 'manager'
  AND p.key IN ('insights.view', 'insights.generate')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- New entitlements
-- -----------------------------------------------------------------------------
INSERT INTO public.entitlements (key, name, description, value_type) VALUES
  ('insights.enabled', 'Insights', 'Access to workspace insights and analytics', 'boolean'),
  ('team_management.enabled', 'Team Management', 'Enable team member management features', 'boolean'),
  ('custom_roles.enabled', 'Custom Team Roles', 'Allow creating custom workspace team roles', 'boolean'),
  ('custom_roles.max', 'Maximum Custom Roles', 'Maximum number of custom team roles per workspace', 'number')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  value_type = EXCLUDED.value_type,
  updated_at = NOW();

-- Default plan values (Pro+ get insights; Business gets custom roles)
INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value)
SELECT sp.id, e.id, v.val
FROM public.subscription_plans sp
CROSS JOIN (
  VALUES
    ('pro', 'insights.enabled', 'true'::jsonb),
    ('business', 'insights.enabled', 'true'::jsonb),
    ('manager', 'insights.enabled', 'true'::jsonb),
    ('landlord', 'insights.enabled', 'false'::jsonb),
    ('free', 'insights.enabled', 'false'::jsonb),
    ('pro', 'team_management.enabled', 'true'::jsonb),
    ('business', 'team_management.enabled', 'true'::jsonb),
    ('manager', 'team_management.enabled', 'true'::jsonb),
    ('landlord', 'team_management.enabled', 'true'::jsonb),
    ('free', 'team_management.enabled', 'true'::jsonb),
    ('pro', 'custom_roles.enabled', 'true'::jsonb),
    ('business', 'custom_roles.enabled', 'true'::jsonb),
    ('manager', 'custom_roles.enabled', 'false'::jsonb),
    ('landlord', 'custom_roles.enabled', 'false'::jsonb),
    ('free', 'custom_roles.enabled', 'false'::jsonb),
    ('pro', 'custom_roles.max', '5'::jsonb),
    ('business', 'custom_roles.max', '10'::jsonb),
    ('manager', 'custom_roles.max', '0'::jsonb),
    ('landlord', 'custom_roles.max', '0'::jsonb),
    ('free', 'custom_roles.max', '0'::jsonb)
) AS v(slug, ent_key, val)
JOIN public.entitlements e ON e.key = v.ent_key
WHERE sp.slug = v.slug
ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Custom role count helper
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.count_workspace_custom_roles(p_workspace_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.team_roles
  WHERE workspace_id = p_workspace_id AND is_system_role = false;
$$;

GRANT EXECUTE ON FUNCTION public.count_workspace_custom_roles(UUID) TO authenticated;

-- Update invitation/member RPCs to stop manually setting legacy role (trigger handles it)
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
  IF v_user IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

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

  INSERT INTO public.workspace_members (workspace_id, user_id, role_id, status, invited_by, joined_at)
  VALUES (v_inv.workspace_id, v_user, v_inv.role_id, 'active', v_inv.invited_by, NOW())
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role_id = EXCLUDED.role_id, status = 'active', joined_at = NOW(), updated_at = NOW()
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
