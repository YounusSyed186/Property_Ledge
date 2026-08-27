-- List pending invitations for workspace (manager view)
CREATE OR REPLACE FUNCTION public.get_workspace_pending_invitations(p_workspace_id UUID)
RETURNS TABLE(
  id UUID,
  role_name TEXT,
  invite_type TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  inviter_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.get_workspace_pending_invitations(UUID) TO authenticated;
