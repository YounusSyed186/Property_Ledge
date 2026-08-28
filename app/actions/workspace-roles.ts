'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { authorizeOrThrow } from '@/lib/auth/authorize';
import { ENTITLEMENT_KEYS } from '@/lib/entitlements/types';

export interface WorkspaceRoleRow {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  workspaceId: string | null;
  memberCount: number;
  permissionCount: number;
}

export async function fetchWorkspaceRoles(workspaceId: string): Promise<WorkspaceRoleRow[]> {
  await authorizeOrThrow({ workspaceId, permission: 'team.role.view' });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    'get_workspace_team_roles' as never,
    { p_workspace_id: workspaceId } as never
  );
  if (error) throw new Error(error.message);
  return (data as Array<{
    id: string;
    name: string;
    description: string | null;
    is_system_role: boolean;
    workspace_id: string | null;
    member_count: number;
    permission_count: number;
  }>).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isSystemRole: r.is_system_role,
    workspaceId: r.workspace_id,
    memberCount: Number(r.member_count),
    permissionCount: Number(r.permission_count),
  }));
}

export async function fetchTeamPermissions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('permissions')
    .select('key, name, resource, action')
    .eq('scope', 'TEAM')
    .order('resource')
    .order('action');
  if (error) throw new Error(error.message);
  return data as Array<{ key: string; name: string; resource: string; action: string }>;
}

export async function createWorkspaceRole(
  workspaceId: string,
  name: string,
  description: string,
  permissionKeys: string[]
) {
  await authorizeOrThrow({
    workspaceId,
    permission: 'team.role.create',
    entitlement: ENTITLEMENT_KEYS.CUSTOM_ROLES_ENABLED,
    checkCustomRoleLimit: true,
  });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    'create_workspace_team_role' as never,
    {
      p_workspace_id: workspaceId,
      p_name: name,
      p_description: description,
      p_permission_keys: permissionKeys,
    } as never
  );
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/team/roles');
  return data as string;
}

export async function updateWorkspaceRole(
  roleId: string,
  workspaceId: string,
  name: string,
  description: string,
  permissionKeys: string[]
) {
  await authorizeOrThrow({ workspaceId, permission: 'team.role.update' });
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    'update_workspace_team_role' as never,
    {
      p_role_id: roleId,
      p_name: name,
      p_description: description,
      p_permission_keys: permissionKeys,
    } as never
  );
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/team/roles');
}

export async function deleteWorkspaceRole(roleId: string, workspaceId: string) {
  await authorizeOrThrow({ workspaceId, permission: 'team.role.delete' });
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    'delete_workspace_team_role' as never,
    { p_role_id: roleId } as never
  );
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/team/roles');
}
