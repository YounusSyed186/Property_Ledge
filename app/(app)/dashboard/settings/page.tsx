import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { container } from '@/composition';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { WorkspaceCard } from '@/components/settings/WorkspaceCard';
import { PageContainer } from '@/components/admin/ui';

export const metadata: Metadata = {
  title: 'Settings | PropertyLedge',
  description: 'Manage your profile and preferences',
};

export default async function SettingsPage() {
  const authService = await container.resolve('authService');
  const userRes = await authService.getCurrentUser();
  const user = userRes.success ? userRes.data : null;
  if (!user) redirect('/login');

  const profileRes = await authService.getUserProfile(user.id);
  const profile = profileRes.success ? profileRes.data : null;

  const userPayload = {
    id: user.id,
    email: user.email || '',
    fullName: profile?.fullName || user.fullName || 'User',
    phone: profile?.phone || user.phone || '',
    avatarUrl: profile?.avatarUrl || user.avatarUrl || '',
    createdAt: profile?.createdAt || user.createdAt,
    emailVerified: Boolean(user.emailVerified),
    provider: user.provider || 'email',
    publicId: profile?.publicId || '',
  };

  return (
    <PageContainer>
      <div className="w-full space-y-6">
        <h2 className="workspace-page-title mb-2">Workspace & Account Settings</h2>
        <WorkspaceCard />
        <ProfileCard user={userPayload} />
      </div>
    </PageContainer>
  );
}
