import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser, getUserProfile } from '@/lib/auth/queries';
import { getPersonaForUser } from '@/lib/auth/resolvePersona';
import { getTenantRecordForUser } from '@/lib/tenant/queries';
import { TenantClientLayout } from '@/components/tenant/TenantClientLayout';

export const revalidate = 0;

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const personaContext = await getPersonaForUser(user.id);
  if (personaContext.persona !== 'tenant') {
    redirect('/dashboard');
  }

  const [profile, tenant] = await Promise.all([
    getUserProfile(user.id),
    getTenantRecordForUser(user.id),
  ]);

  const property = (tenant as { property?: { name?: string } } | null)?.property;

  return (
    <TenantClientLayout
      userEmail={user.email || ''}
      userName={profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Tenant'}
      propertyName={property?.name}
    >
      {children}
    </TenantClientLayout>
  );
}
