import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/queries';
import {
  getActiveWorkspaceId,
  getEffectiveWorkspacePermissions,
  WORKSPACE_COOKIE,
} from '@/lib/auth/authorization';
import { resolveWorkspaceBilling } from '@/lib/entitlements/workspace-billing';
import type { EntitlementMap } from '@/types/subscriptions';

export interface WorkspaceContext {
  workspaceId: string;
  workspaceName: string;
  roleId: string | null;
  roleName: string | null;
  permissions: string[];
  entitlements: EntitlementMap;
  billingAccountId: string;
  isOwner: boolean;
}

export async function getUserWorkspaces(userId: string) {
  const supabase = await createClient();
  const { data: owned } = await supabase
    .from('workspaces')
    .select('id, name, slug, status, avatar_url')
    .eq('owner_id', userId)
    .eq('status', 'active');

  const { data: memberOf } = await supabase
    .from('workspace_members')
    .select('workspace_id, role_id, team_roles(name), workspaces(id, name, slug, status, avatar_url)')
    .eq('user_id', userId)
    .eq('status', 'active');

  const map = new Map<string, {
    id: string;
    name: string;
    slug: string;
    status: string;
    roleName: string | null;
    roleId: string | null;
    avatarUrl: string | null;
  }>();

  for (const ws of owned || []) {
    const row = ws as { id: string; name: string; slug: string; status: string; avatar_url?: string | null };
    map.set(row.id, { ...row, roleName: 'Owner', roleId: null, avatarUrl: row.avatar_url ?? null });
  }

  for (const m of memberOf || []) {
    const row = m as {
      workspace_id: string;
      role_id: string | null;
      team_roles?: { name?: string } | null;
      workspaces?: { id: string; name: string; slug: string; status: string; avatar_url?: string | null } | null;
    };
    const ws = row.workspaces;
    if (!ws || ws.status !== 'active') continue;
    if (!map.has(ws.id)) {
      map.set(ws.id, {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        status: ws.status,
        roleName: row.team_roles?.name ?? null,
        roleId: row.role_id,
        avatarUrl: ws.avatar_url ?? null,
      });
    }
  }

  return Array.from(map.values());
}

export async function resolveWorkspaceContext(
  workspaceId?: string | null
): Promise<WorkspaceContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const wsId = workspaceId ?? (await getActiveWorkspaceId());
  if (!wsId) {
    const workspaces = await getUserWorkspaces(user.id);
    if (workspaces.length === 0) return null;
    const first = workspaces[0];
    // Do not set cookies during RSC render — use the first workspace in-memory.
    // Cookie persistence happens via switchWorkspace() server action.
    return resolveWorkspaceContext(first.id);
  }

  const supabase = await createClient();
  const { data: ws } = await supabase
    .from('workspaces')
    .select('id, name, owner_id')
    .eq('id', wsId)
    .eq('status', 'active')
    .maybeSingle();

  if (!ws) return null;

  const isOwner = (ws as { owner_id: string }).owner_id === user.id;
  let roleId: string | null = null;
  let roleName: string | null = isOwner ? 'Owner' : null;

  if (!isOwner) {
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role_id, team_roles(name)')
      .eq('workspace_id', wsId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) return null;
    const m = membership as { role_id: string | null; team_roles?: { name?: string } | null };
    roleId = m.role_id;
    roleName = m.team_roles?.name ?? null;
  } else {
    const { data: ownerRole } = await supabase
      .from('team_roles')
      .select('id, name')
      .is('workspace_id', null)
      .ilike('name', 'owner')
      .maybeSingle();
    if (ownerRole) {
      roleId = (ownerRole as { id: string }).id;
      roleName = (ownerRole as { name: string }).name;
    }
  }

  const permissions = await getEffectiveWorkspacePermissions(wsId, user.id);
  const billing = await resolveWorkspaceBilling(wsId);

  return {
    workspaceId: wsId,
    workspaceName: (ws as { name: string }).name,
    roleId,
    roleName,
    permissions,
    entitlements: billing.entitlements,
    billingAccountId: billing.billingAccountId,
    isOwner,
  };
}

export { WORKSPACE_COOKIE };
