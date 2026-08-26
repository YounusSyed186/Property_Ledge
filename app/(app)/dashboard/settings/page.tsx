import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/auth/queries';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { PageContainer } from '@/components/admin/ui';

export const metadata: Metadata = {
  title: 'Settings | PropertyLedge',
  description: 'Manage your profile and preferences',
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const profile = await getUserProfile(user.id);

  const userPayload = {
    id: user.id,
    email: user.email || '',
    fullName: (profile as { full_name?: string })?.full_name || user.user_metadata?.full_name || 'User',
    phone: (profile as { phone?: string })?.phone || '',
    avatarUrl: (profile as { avatar_url?: string })?.avatar_url || user.user_metadata?.avatar_url || '',
    createdAt: (profile as { created_at?: string })?.created_at || user.created_at,
    emailVerified: Boolean(user.email_confirmed_at),
    provider: user.app_metadata?.provider || 'email',
  };

  return (
    <PageContainer>
      <div className="max-w-2xl">
        <h2 className="workspace-page-title mb-2">Profile Settings</h2>
        <ProfileCard user={userPayload} />
      </div>
    </PageContainer>
  );
}
