import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser, getUserProfile } from '@/lib/auth/queries';
import { getPersonaForUser, getDefaultHomeForPersona } from '@/lib/auth/resolvePersona';
import { DashboardClientLayout } from '@/components/dashboard/DashboardClientLayout';

export const revalidate = 0;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const personaContext = await getPersonaForUser(user.id);
  if (personaContext.persona === 'tenant') {
    redirect('/tenant');
  }
  if (personaContext.persona === 'platform_admin') {
    redirect('/admin');
  }

  const profile = await getUserProfile(user.id);

  return (
    <DashboardClientLayout
      userEmail={user.email || ''}
      userName={profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
      persona={personaContext.persona}
    >
      {children}
    </DashboardClientLayout>
  );
}
