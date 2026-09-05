'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { authorizeOrThrow } from '@/lib/auth/authorize';
import { ENTITLEMENT_KEYS } from '@/lib/entitlements/types';
import { AuthorizationError } from '@/lib/auth/errors';

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
    .select('key, name, resource, action, description')
    .eq('scope', 'TEAM')
    .order('resource')
    .order('action');
  if (error) throw new Error(error.message);
  return data as Array<{ key: string; name: string; resource: string; action: string; description?: string }>;
}

export async function createWorkspaceRole(
  workspaceId: string,
  name: string,
  description: string,
  permissionKeys: string[]
) {
  const ctx = await authorizeOrThrow({
    workspaceId,
    permission: 'team.role.create',
    entitlement: ENTITLEMENT_KEYS.CUSTOM_ROLES_ENABLED,
    checkCustomRoleLimit: true,
  });

  const trimmedName = name?.trim();
  if (!trimmedName) throw new Error('Role name is required.');
  if (!Array.isArray(permissionKeys) || permissionKeys.length === 0) {
    throw new Error('At least one permission must be assigned to the role.');
  }

  // Anti self-escalation: Non-owners can only grant permissions they themselves possess
  if (!ctx.isOwner) {
    const invalidKeys = permissionKeys.filter((k) => !ctx.permissions.includes(k));
    if (invalidKeys.length > 0) {
      throw new AuthorizationError(
        'PERMISSION_DENIED',
        `You cannot grant permissions that you do not possess: ${invalidKeys.join(', ')}`
      );
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    'create_workspace_team_role' as never,
    {
      p_workspace_id: workspaceId,
      p_name: trimmedName,
      p_description: description?.trim() || null,
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
  const ctx = await authorizeOrThrow({ workspaceId, permission: 'team.role.update' });

  const trimmedName = name?.trim();
  if (!trimmedName) throw new Error('Role name is required.');
  if (!Array.isArray(permissionKeys) || permissionKeys.length === 0) {
    throw new Error('At least one permission must be assigned to the role.');
  }

  // Anti self-escalation: Non-owners can only grant permissions they themselves possess
  if (!ctx.isOwner) {
    const invalidKeys = permissionKeys.filter((k) => !ctx.permissions.includes(k));
    if (invalidKeys.length > 0) {
      throw new AuthorizationError(
        'PERMISSION_DENIED',
        `You cannot grant permissions that you do not possess: ${invalidKeys.join(', ')}`
      );
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    'update_workspace_team_role' as never,
    {
      p_role_id: roleId,
      p_name: trimmedName,
      p_description: description?.trim() || null,
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

export async function fetchWorkspaceRoleMatrixData(workspaceId: string) {
  const ctx = await authorizeOrThrow({ workspaceId, permission: 'team.role.view' });
  const supabase = await createClient();

  const [permissions, roles] = await Promise.all([
    fetchTeamPermissions(),
    fetchWorkspaceRoles(workspaceId),
  ]);

  const roleIds = roles.map((r) => r.id);
  const rolePermissions: Record<string, string[]> = {};
  roles.forEach((r) => {
    rolePermissions[r.id] = [];
  });

  if (roleIds.length > 0) {
    const { data: permsData } = await supabase
      .from('team_role_permissions')
      .select('role_id, permissions(key)')
      .in('role_id', roleIds);

    if (permsData) {
      permsData.forEach((row: any) => {
        const roleId = row.role_id;
        const permKey = row.permissions?.key;
        if (roleId && permKey) {
          if (!rolePermissions[roleId]) rolePermissions[roleId] = [];
          rolePermissions[roleId].push(permKey);
        }
      });
    }
  }

  return {
    permissions,
    roles,
    rolePermissions,
    grantableKeys: ctx.isOwner ? undefined : ctx.permissions,
    isOwner: ctx.isOwner,
  };
}

export async function handleBatchUpdateWorkspaceRolePermissions(
  workspaceId: string,
  updates: Array<{ roleId: string; name: string; description: string | null; permissionKeys: string[] }>
) {
  const ctx = await authorizeOrThrow({ workspaceId, permission: 'team.role.update' });
  const supabase = await createClient();

  for (const update of updates) {
    if (!update.name?.trim()) throw new Error('Role name is required.');
    if (!Array.isArray(update.permissionKeys) || update.permissionKeys.length === 0) {
      throw new Error('At least one permission must be assigned to the role.');
    }

    if (!ctx.isOwner) {
      const invalidKeys = update.permissionKeys.filter((k) => !ctx.permissions.includes(k));
      if (invalidKeys.length > 0) {
        throw new AuthorizationError(
          'PERMISSION_DENIED',
          `You cannot grant permissions that you do not possess: ${invalidKeys.join(', ')}`
        );
      }
    }

    const { error } = await supabase.rpc(
      'update_workspace_team_role' as never,
      {
        p_role_id: update.roleId,
        p_name: update.name.trim(),
        p_description: update.description?.trim() || null,
        p_permission_keys: update.permissionKeys,
      } as never
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath('/dashboard/team/roles');
}

