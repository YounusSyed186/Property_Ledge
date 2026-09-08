import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { container } from '@/composition';
import { setActiveWorkspaceCookie } from '@/lib/auth/authorization';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { Button, Card, CardContent } from '@/components/admin/ui';

export default async function MemberOnboardingPage() {
  const authService = await container.resolve('authService');
  const userRes = await authService.getCurrentUser();
  const user = userRes.success ? userRes.data : null;
  if (!user) redirect('/login');

  const workspaceService = await container.resolve('workspaceService');
  const wsRes = await workspaceService.listUserWorkspaces(user.id);
  const workspaces = wsRes.success ? wsRes.data : [];
  const primaryWs = workspaces[0];

  const workspaceId = primaryWs?.id;
  const wsName = primaryWs?.name || 'your workspace';
  const roleName = primaryWs?.roleName || 'Member';

  async function handleContinue() {
    'use server';
    const serverAuthService = await container.resolve('authService');
    await serverAuthService.completeOnboarding(user!.id);

    if (workspaceId) {
      await setActiveWorkspaceCookie(workspaceId);
    }
    redirect('/dashboard');
  }

  return (
    <OnboardingShell>
      <Card>
        <CardContent className="p-8 space-y-6 text-center max-w-lg mx-auto">
          <h1 className="text-2xl font-semibold text-admin-foreground">
            Welcome to {wsName}
          </h1>
          <p className="text-admin-muted">
            You&apos;ve joined as <strong>{roleName}</strong>.
          </p>
          <p className="text-sm text-admin-muted">
            Your workspace admin has given you access. You can view and manage resources based on your role permissions.
          </p>
          <form action={handleContinue}>
            <Button type="submit" className="w-full">Continue to workspace</Button>
          </form>
          <p className="text-xs text-admin-muted">
            <Link href="/dashboard/settings" className="text-admin-primary hover:underline">
              Complete your profile
            </Link>{' '}
            in settings anytime.
          </p>
        </CardContent>
      </Card>
    </OnboardingShell>
  );
}
