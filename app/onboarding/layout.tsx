import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser, getUserProfile } from '@/lib/auth/queries';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { resolveOnboardingStage } from '@/lib/onboarding/resolver';

export const revalidate = 0;

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await getUserProfile(user.id);
  const userName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const resolution = await resolveOnboardingStage(user.id);

  if (resolution.completed) {
    redirect('/dashboard');
  }

  const workspaceName = resolution.context.workspaceName || undefined;

  return (
    <OnboardingShell userName={userName} userEmail={user.email || ''} workspaceName={workspaceName}>
      {children}
    </OnboardingShell>
  );
}
