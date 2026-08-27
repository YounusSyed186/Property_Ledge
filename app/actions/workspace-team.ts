'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWorkspaceSeatAvailable } from '@/lib/entitlements/workspace-seats';
import { authorizeOrThrow } from '@/lib/auth/authorize';
import { requireAuthenticatedUser } from '@/lib/auth/authorization';
import { ENTITLEMENT_KEYS } from '@/lib/entitlements/types';
import { setActiveWorkspaceCookie } from '@/lib/auth/authorization';

async function requireTeamInviteAuth(workspaceId: string) {
  await authorizeOrThrow({
    workspaceId,
    permission: 'team.member.invite',
    entitlement: ENTITLEMENT_KEYS.TEAM_MANAGEMENT_ENABLED,
    checkTeamMemberLimit: true,
  });
}

async function requireTeamPermission(workspaceId: string, permission: Parameters<typeof authorizeOrThrow>[0]['permission']) {
  await authorizeOrThrow({ workspaceId, permission });
}

export interface TeamRoleOption {
  roleId: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  permissionCount: number;
}

export interface WorkspaceMemberRow {
  id: string;
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  publicId: string | null;
  roleId: string | null;
  roleName: string | null;
  status: string;
  joinedAt: string | null;
  isSystemRole: boolean;
}

export interface PendingInvitationRow {
  id: string;
  roleName: string;
  inviteType: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedByName: string | null;
}

export interface PermissionRow {
  key: string;
  name: string;
  resource: string;
  action: string;
}

export async function fetchAssignableRoles(workspaceId: string): Promise<TeamRoleOption[]> {
  await requireTeamInviteAuth(workspaceId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    'get_assignable_team_roles' as never,
    { p_workspace_id: workspaceId } as never
  );
  if (error) throw new Error(error.message);
  return (data as Array<{
    role_id: string;
    name: string;
    description: string | null;
    is_system_role: boolean;
    permission_count: number;
  }>).map((r) => ({
    roleId: r.role_id,
    name: r.name,
    description: r.description,
    isSystemRole: r.is_system_role,
    permissionCount: Number(r.permission_count),
  }));
}

export async function fetchRolePermissions(roleId: string): Promise<PermissionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    'get_role_permissions' as never,
    { p_role_id: roleId } as never
  );
  if (error) throw new Error(error.message);
  return (data as PermissionRow[]) || [];
}

export async function createInviteLink(workspaceId: string, roleId: string) {
  await requireTeamInviteAuth(workspaceId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    'create_workspace_invitation' as never,
    {
      p_workspace_id: workspaceId,
      p_role_id: roleId,
      p_invite_type: 'LINK',
    } as never
  );

  if (error) throw new Error(error.message);
  const row = (data as Array<{ invitation_id: string; raw_token: string }>)?.[0];
  if (!row) throw new Error('Failed to create invitation');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  revalidatePath('/dashboard/team');
  return {
    invitationId: row.invitation_id,
    inviteUrl: `${appUrl}/join/${row.raw_token}`,
    token: row.raw_token,
  };
}

export async function revokeInvitation(workspaceId: string, invitationId: string) {
  await requireTeamInviteAuth(workspaceId);
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    'revoke_workspace_invitation' as never,
    { p_invitation_id: invitationId } as never
  );
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/team');
}

export async function lookupProfile(publicId: string) {
  await requireAuthenticatedUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    'lookup_profile_by_public_id' as never,
    { p_public_id: publicId.trim() } as never
  );
  if (error) throw new Error(error.message);
  const row = (data as Array<{ id: string; public_id: string; full_name: string | null; avatar_url: string | null }>)?.[0];
  if (!row) return null;
  return {
    id: row.id,
    publicId: row.public_id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
  };
}

export async function addMemberByProfileId(workspaceId: string, publicId: string, roleId: string) {
  await requireTeamInviteAuth(workspaceId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    'add_workspace_member_by_profile_id' as never,
    {
      p_workspace_id: workspaceId,
      p_public_id: publicId.trim(),
      p_role_id: roleId,
    } as never
  );
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/team');
  return data;
}

export async function changeMemberRole(workspaceId: string, memberId: string, roleId: string) {
  await requireTeamPermission(workspaceId, 'team.member.update');
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    'change_workspace_member_role' as never,
    { p_member_id: memberId, p_role_id: roleId } as never
  );
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/team');
}

export async function removeMember(workspaceId: string, memberId: string) {
  await requireTeamPermission(workspaceId, 'team.member.remove');
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    'remove_workspace_member' as never,
    { p_member_id: memberId } as never
  );
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/team');
}

export async function suspendMember(workspaceId: string, memberId: string) {
  await requireTeamPermission(workspaceId, 'team.member.update');
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    'suspend_workspace_member' as never,
    { p_member_id: memberId } as never
  );
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/team');
}

export async function fetchWorkspaceTeam(workspaceId: string) {
  await requireTeamPermission(workspaceId, 'team.member.view');
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from('workspace_members')
    .select('id, user_id, role_id, status, joined_at, team_roles ( name, is_system_role )')
    .eq('workspace_id', workspaceId)
    .neq('status', 'removed')
    .order('joined_at', { ascending: true });

  if (error) throw new Error(error.message);

  const userIds = (members || []).map((m) => (m as { user_id: string }).user_id);
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, full_name, avatar_url, public_id').in('id', userIds)
    : { data: [] };

  const profileMap = new Map(
    (profiles || []).map((p) => {
      const row = p as { id: string; full_name: string | null; avatar_url: string | null; public_id: string | null };
      return [row.id, row];
    })
  );

  const memberRows: WorkspaceMemberRow[] = (members || []).map((m) => {
    const row = m as {
      id: string;
      user_id: string;
      role_id: string | null;
      status: string;
      joined_at: string | null;
      team_roles?: { name?: string; is_system_role?: boolean } | null;
    };
    const profile = profileMap.get(row.user_id);
    return {
      id: row.id,
      userId: row.user_id,
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      publicId: profile?.public_id ?? null,
      roleId: row.role_id,
      roleName: row.team_roles?.name ?? null,
      status: row.status,
      joinedAt: row.joined_at,
      isSystemRole: row.team_roles?.is_system_role ?? false,
    };
  });

  return memberRows;
}

export async function fetchPendingInvitations(workspaceId: string): Promise<PendingInvitationRow[]> {
  await requireTeamPermission(workspaceId, 'team.member.view');
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    'get_workspace_pending_invitations' as never,
    { p_workspace_id: workspaceId } as never
  );

  if (error) {
    // RPC may not exist yet in dev - return empty
    if (error.code === 'PGRST202') return [];
    throw new Error(error.message);
  }

  return (data as Array<{
    id: string;
    role_name: string;
    invite_type: string;
    status: string;
    expires_at: string;
    created_at: string;
    inviter_name: string | null;
  }>).map((r) => ({
    id: r.id,
    roleName: r.role_name,
    inviteType: r.invite_type,
    status: r.status,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    invitedByName: r.inviter_name,
  }));
}

export async function resolveJoinInvitation(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    'resolve_invitation_by_token' as never,
    { p_token: token } as never
  );
  if (error || !data) return null;
  const row = (data as Array<{
    invitation_id: string;
    status: string;
    workspace_id: string;
    workspace_name: string;
    inviter_name: string;
    role_name: string;
    role_id: string;
    expires_at: string;
    is_expired: boolean;
  }>)?.[0];
  if (!row) return null;
  return {
    invitationId: row.invitation_id,
    status: row.status,
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    inviterName: row.inviter_name,
    roleName: row.role_name,
    roleId: row.role_id,
    expiresAt: row.expires_at,
    isExpired: row.is_expired,
  };
}

export async function acceptJoinInvitation(token: string) {
  await requireAuthenticatedUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    'accept_workspace_invitation' as never,
    { p_token: token } as never
  );
  if (error) throw new Error(error.message);

  const row = (data as Array<{ workspace_id: string; member_id: string; role_name: string }>)?.[0];
  if (row?.workspace_id) {
    await setActiveWorkspaceCookie(row.workspace_id);
  }

  revalidatePath('/dashboard');
  return row;
}

export async function fetchSeatUsage(workspaceId: string) {
  const { getWorkspaceSeatUsage } = await import('@/lib/entitlements/workspace-seats');
  return getWorkspaceSeatUsage(workspaceId);
}

export async function switchWorkspace(workspaceId: string) {
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  const { data: ws } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .single();

  if (!membership && (ws as { owner_id?: string } | null)?.owner_id !== user.id) {
    throw new Error('Forbidden: not a workspace member');
  }

  await setActiveWorkspaceCookie(workspaceId);
  return { success: true };
}
