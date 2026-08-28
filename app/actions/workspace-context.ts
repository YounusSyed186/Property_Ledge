'use server';

import { getCurrentUser } from '@/lib/auth/queries';
import { getUserWorkspaces, resolveWorkspaceContext } from '@/lib/workspace/context';

export async function fetchWorkspaceBootstrap() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [context, workspaces] = await Promise.all([
    resolveWorkspaceContext(),
    getUserWorkspaces(user.id),
  ]);

  return {
    activeWorkspaceId: context?.workspaceId ?? null,
    workspaceName: context?.workspaceName ?? null,
    roleName: context?.roleName ?? null,
    permissions: context?.permissions ?? [],
    entitlements: context?.entitlements ?? {},
    workspaces: workspaces.map((ws) => ({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      status: ws.status,
      role: ws.roleName ?? 'Member',
    })),
  };
}
