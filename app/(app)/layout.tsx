import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser, getUserProfile } from '@/lib/auth/queries';
import { getPersonaForUser } from '@/lib/auth/resolvePersona';
import { DashboardClientLayout } from '@/components/dashboard/DashboardClientLayout';
import { resolveWorkspaceContext, getUserWorkspaces } from '@/lib/workspace/context';
import { getUserProperties } from '@/lib/properties/queries';

import { getActiveWorkspaceId } from '@/lib/auth/authorization';

export const revalidate = 0;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [activeWsId, user] = await Promise.all([
    getActiveWorkspaceId(),
    getCurrentUser(),
  ]);
  if (!user) {
    redirect('/login');
  }

  const [workspaceContext, personaContext, profile, userWorkspaces, initialProperties] = await Promise.all([
    resolveWorkspaceContext(activeWsId),
    getPersonaForUser(user.id),
    getUserProfile(user.id),
    getUserWorkspaces(user.id),
    getUserProperties(user.id, activeWsId ?? undefined),
  ]);

  const workspaces = userWorkspaces.map((ws) => ({
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    status: ws.status,
    role: ws.roleName ?? 'Owner',
  }));

  if (personaContext.persona === 'tenant') {
    redirect('/tenant');
  }
  if (personaContext.persona === 'platform_admin') {
    redirect('/admin');
  }

  return (
    <DashboardClientLayout
      userEmail={user.email || ''}
      userName={profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
      userAvatarUrl={profile?.avatar_url || ''}
      persona={personaContext.persona}
      workspaceId={workspaceContext?.workspaceId ?? null}
      workspaceName={workspaceContext?.workspaceName ?? null}
      roleName={workspaceContext?.roleName ?? null}
      permissions={workspaceContext?.permissions ?? []}
      entitlements={workspaceContext?.entitlements ?? {}}
      workspaces={workspaces}
      initialProperties={initialProperties}
    >
      {children}
    </DashboardClientLayout>
  );
}
