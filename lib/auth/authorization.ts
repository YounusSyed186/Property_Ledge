import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/queries';
import { cookies } from 'next/headers';
import { AuthorizationError } from '@/lib/auth/errors';
export type TeamPermission =
  | 'property.view' | 'property.create' | 'property.update' | 'property.delete'
  | 'tenant.view' | 'tenant.create' | 'tenant.update' | 'tenant.delete'
  | 'lease.view' | 'lease.create' | 'lease.update' | 'lease.delete'
  | 'invoice.view' | 'invoice.create' | 'invoice.update' | 'invoice.delete'
  | 'payment.view' | 'payment.create' | 'payment.update' | 'payment.delete'
  | 'expense.view' | 'expense.create' | 'expense.update' | 'expense.delete'
  | 'maintenance.view' | 'maintenance.create' | 'maintenance.update' | 'maintenance.delete' | 'maintenance.assign'
  | 'inspection.view' | 'inspection.create' | 'inspection.update' | 'inspection.delete'
  | 'document.view' | 'document.create' | 'document.update' | 'document.delete'
  | 'task.view' | 'task.create' | 'task.update' | 'task.delete'
  | 'team.member.view' | 'team.member.invite' | 'team.member.update' | 'team.member.remove'
  | 'team.settings.view' | 'team.settings.update'
  | 'team.role.view' | 'team.role.assign' | 'team.role.create' | 'team.role.update' | 'team.role.delete'
  | 'insights.view' | 'insights.generate' | 'insights.export';

export type PlatformPermission =
  | 'user.view' | 'user.create' | 'user.update' | 'user.delete'
  | 'platform_role.view' | 'platform_role.create' | 'platform_role.update' | 'platform_role.delete'
  | 'team_role.view' | 'team_role.create' | 'team_role.update' | 'team_role.delete' | 'team_role.assign'
  | 'subscription.view' | 'subscription.manage'
  | 'billing.view' | 'billing.manage'
  | 'audit.view'
  | 'platform.settings.view' | 'platform.settings.update'
  | 'team.admin_access' | 'team.data.view' | 'team.data.manage' | 'team.impersonate';

export const WORKSPACE_COOKIE = 'pl_workspace_id';

export const requireAuthenticatedUser = cache(async function requireAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError('NOT_AUTHENTICATED', 'You must be signed in.');
  return user;
});

export async function hasPlatformPermission(permission: PlatformPermission, userId?: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    'has_platform_permission' as never,
    { p_permission_key: permission, p_user_id: userId ?? null } as never
  );
  return !error && !!data;
}

export async function requirePlatformPermission(permission: PlatformPermission) {
  const user = await requireAuthenticatedUser();
  const allowed = await hasPlatformPermission(permission, user.id);
  if (!allowed) throw new AuthorizationError('PERMISSION_DENIED', `Missing platform permission ${permission}`);
  return user;
}

export async function hasWorkspacePermission(
  workspaceId: string,
  permission: TeamPermission,
  userId?: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    'has_workspace_permission' as never,
    { p_workspace_id: workspaceId, p_permission_key: permission, p_user_id: userId ?? null } as never
  );
  return !error && !!data;
}

export async function requireWorkspaceMembership(workspaceId: string) {
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from('workspace_members')
    .select('id, status')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!data) {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();
    if ((ws as { owner_id?: string } | null)?.owner_id !== user.id) {
      throw new AuthorizationError('NOT_WORKSPACE_MEMBER', "You don't have access to this workspace.");
    }
  }
  return user;
}

export async function requireWorkspacePermission(workspaceId: string, permission: TeamPermission) {
  const user = await requireWorkspaceMembership(workspaceId);
  const allowed = await hasWorkspacePermission(workspaceId, permission, user.id);
  if (!allowed) throw new AuthorizationError('PERMISSION_DENIED', `Missing permission ${permission}`);
  return user;
}

export const getEffectiveWorkspacePermissions = cache(async function getEffectiveWorkspacePermissions(
  workspaceId: string,
  userId?: string
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    'get_effective_workspace_permissions' as never,
    { p_workspace_id: workspaceId, p_user_id: userId ?? null } as never
  );
  if (error || !data) return [];
  return data as string[];
});

export const getActiveWorkspaceId = cache(async function getActiveWorkspaceId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(WORKSPACE_COOKIE)?.value ?? null;
});

export async function setActiveWorkspaceCookie(workspaceId: string) {
  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}
