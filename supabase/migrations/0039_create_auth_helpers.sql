-- Migration 0039 (V3.1): authorization helpers

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.platform_admins pa
    WHERE pa.user_id = auth.uid() AND pa.status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.owns_property(p_property_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = p_property_id AND owner_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_property(p_property_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.owns_property(p_property_id)
      OR EXISTS (
        SELECT 1 FROM public.property_members
        WHERE property_id = p_property_id AND user_id = auth.uid() AND status = 'active'
      );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_workspace(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = p_workspace_id AND (
      w.owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = w.id AND wm.user_id = auth.uid() AND wm.status = 'active'
      )
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_property_permission(
  p_property_id UUID,
  p_permission TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_role TEXT;
  v_user UUID;
BEGIN
  v_user := COALESCE(auth.uid(), p_user_id);
  IF p_user_id IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_platform_admin() THEN
    RETURN FALSE;
  END IF;
  IF v_user IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT owner_id INTO v_owner_id FROM public.properties WHERE id = p_property_id;
  IF v_owner_id IS NULL THEN
    RETURN FALSE;
  END IF;
  IF v_owner_id = v_user THEN
    RETURN TRUE;
  END IF;

  SELECT role INTO v_role
  FROM public.property_members
  WHERE property_id = p_property_id AND user_id = v_user AND status = 'active';

  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;

  CASE
    WHEN p_permission IN (
      'property.view', 'team.view', 'tenant.view', 'lease.view', 'financial.view',
      'maintenance.view', 'inspection.view', 'document.view', 'task.view', 'reports.view'
    ) THEN
      RETURN v_role IN ('owner', 'manager', 'agent', 'staff', 'viewer');
    WHEN p_permission = 'property.update' THEN
      RETURN v_role IN ('owner', 'manager', 'agent');
    WHEN p_permission = 'property.delete' THEN
      RETURN v_role = 'owner';
    WHEN p_permission IN ('team.invite', 'team.manage_members', 'team.remove') THEN
      RETURN v_role IN ('owner', 'manager');
    WHEN p_permission IN (
      'tenant.create', 'tenant.update', 'tenant.manage',
      'lease.create', 'lease.update', 'lease.manage'
    ) THEN
      RETURN v_role IN ('owner', 'manager', 'agent');
    WHEN p_permission = 'financial.manage' THEN
      RETURN v_role IN ('owner', 'manager');
    WHEN p_permission = 'maintenance.create' THEN
      RETURN v_role IN ('owner', 'manager', 'agent', 'staff');
    WHEN p_permission = 'maintenance.manage' THEN
      RETURN v_role IN ('owner', 'manager', 'agent');
    WHEN p_permission IN ('inspection.create', 'inspection.manage') THEN
      RETURN v_role IN ('owner', 'manager', 'agent');
    WHEN p_permission IN ('document.create', 'document.manage', 'task.create', 'task.manage') THEN
      RETURN v_role IN ('owner', 'manager', 'agent', 'staff');
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_accessible_property_ids(p_user_id UUID DEFAULT NULL)
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
BEGIN
  v_user := auth.uid();
  IF p_user_id IS NOT NULL AND p_user_id IS DISTINCT FROM v_user THEN
    IF NOT public.is_platform_admin() THEN
      RETURN;
    END IF;
    v_user := p_user_id;
  END IF;
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT id FROM public.properties WHERE owner_id = v_user AND status = 'active'
  UNION
  SELECT pm.property_id FROM public.property_members pm
  JOIN public.properties p ON pm.property_id = p.id
  WHERE pm.user_id = v_user AND pm.status = 'active' AND p.status = 'active';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_accessible_workspace_ids(p_user_id UUID DEFAULT NULL)
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
BEGIN
  v_user := auth.uid();
  IF p_user_id IS NOT NULL AND p_user_id IS DISTINCT FROM v_user THEN
    IF NOT public.is_platform_admin() THEN
      RETURN;
    END IF;
    v_user := p_user_id;
  END IF;
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT id FROM public.workspaces WHERE owner_id = v_user AND status = 'active'
  UNION
  SELECT wm.workspace_id FROM public.workspace_members wm
  JOIN public.workspaces w ON wm.workspace_id = w.id
  WHERE wm.user_id = v_user AND wm.status = 'active' AND w.status = 'active';
END;
$$;

