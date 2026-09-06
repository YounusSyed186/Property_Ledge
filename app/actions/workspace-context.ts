'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
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
      avatarUrl: ws.avatarUrl ?? null,
    })),
  };
}

export async function updateWorkspaceAvatarAction(workspaceId: string, avatarUrl: string) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'User not authenticated' };

  try {
    const supabase = await createClient();
    const { error } = await (supabase as any)
      .from('workspaces')
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard', 'layout');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update workspace avatar' };
  }
}
