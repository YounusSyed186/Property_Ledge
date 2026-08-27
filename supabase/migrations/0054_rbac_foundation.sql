-- RBAC Foundation: permissions, roles, invitations, profiles.public_id, core functions

-- -----------------------------------------------------------------------------
-- profiles.public_id
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_id TEXT;

CREATE OR REPLACE FUNCTION public.generate_profile_public_id()
RETURNS TEXT
LANGUAGE plpgsql
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

UPDATE public.profiles SET public_id = public.generate_profile_public_id() WHERE public_id IS NULL;

ALTER TABLE public.profiles ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_public_id ON public.profiles(public_id);

CREATE OR REPLACE FUNCTION public.trg_profiles_set_public_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.public_id IS NULL OR NEW.public_id = '' THEN
    NEW.public_id := public.generate_profile_public_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_set_public_id ON public.profiles;
CREATE TRIGGER trg_profiles_set_public_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_profiles_set_public_id();

-- -----------------------------------------------------------------------------
-- permissions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  scope TEXT NOT NULL CHECK (scope IN ('PLATFORM', 'TEAM')),
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_scope ON public.permissions(scope);
CREATE INDEX IF NOT EXISTS idx_permissions_key ON public.permissions(key);

-- -----------------------------------------------------------------------------
-- platform_roles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.platform_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_role_permissions_role ON public.platform_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_platform_role_permissions_perm ON public.platform_role_permissions(permission_id);

CREATE TABLE IF NOT EXISTS public.platform_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.platform_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_user_roles_user ON public.platform_user_roles(user_id);

-- -----------------------------------------------------------------------------
-- team_roles (hybrid: system global, custom workspace-scoped)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_team_role_scope CHECK (
    (is_system_role = true AND workspace_id IS NULL) OR
    (is_system_role = false AND workspace_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_team_roles_system_name
  ON public.team_roles (lower(name)) WHERE workspace_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_roles_workspace_name
  ON public.team_roles (workspace_id, lower(name)) WHERE workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_roles_workspace_id ON public.team_roles(workspace_id);

CREATE TABLE IF NOT EXISTS public.team_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.team_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_team_role_permissions_role ON public.team_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_team_role_permissions_perm ON public.team_role_permissions(permission_id);

-- -----------------------------------------------------------------------------
-- workspace_members.role_id
-- -----------------------------------------------------------------------------
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.team_roles(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_workspace_members_role_id ON public.workspace_members(role_id);

-- -----------------------------------------------------------------------------
-- workspace_invitations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  role_id UUID NOT NULL REFERENCES public.team_roles(id) ON DELETE RESTRICT,
  token_hash TEXT,
  invite_type TEXT NOT NULL CHECK (invite_type IN ('LINK', 'DIRECT_PROFILE', 'EMAIL')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_invitations_token_hash
  ON public.workspace_invitations(token_hash) WHERE token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace ON public.workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_status ON public.workspace_invitations(status);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_expires ON public.workspace_invitations(expires_at);

-- -----------------------------------------------------------------------------
-- Helper: hash invitation token
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hash_invitation_token(p_token TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(sha256(p_token::bytea), 'hex');
$$;

-- -----------------------------------------------------------------------------
-- has_platform_permission
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_platform_permission(
  p_permission_key TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- -----------------------------------------------------------------------------
-- get_effective_workspace_permissions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_effective_workspace_permissions(
  p_workspace_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS SETOF TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- -----------------------------------------------------------------------------
-- has_workspace_permission
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_workspace_permission(
  p_workspace_id UUID,
  p_permission_key TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- -----------------------------------------------------------------------------
-- can_assign_team_role (permission subset check)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_assign_team_role(
  p_workspace_id UUID,
  p_role_id UUID,
  p_assigner_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- -----------------------------------------------------------------------------
-- count_workspace_seats
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.count_workspace_seats(p_workspace_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    (SELECT COUNT(*)::INTEGER FROM public.workspace_members
     WHERE workspace_id = p_workspace_id AND status = 'active')
    +
    (SELECT COUNT(*)::INTEGER FROM public.workspace_invitations
     WHERE workspace_id = p_workspace_id AND status = 'pending' AND expires_at > NOW())
  );
$$;

-- -----------------------------------------------------------------------------
-- get_workspace_seat_limit
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_workspace_seat_limit(p_workspace_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- -----------------------------------------------------------------------------
-- assert_workspace_seat_available
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_workspace_seat_available(p_workspace_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Update is_platform_admin to also check platform roles
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  IF EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid() AND status = 'active') THEN
    RETURN TRUE;
  END IF;
  RETURN public.has_platform_permission('team.admin_access');
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_platform_permission(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_workspace_permission(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_workspace_permissions(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_assign_team_role(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_workspace_seats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_seat_limit(UUID) TO authenticated;
