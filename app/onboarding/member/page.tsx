import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/queries';
import { createClient } from '@/lib/supabase/server';
import { setActiveWorkspaceCookie } from '@/lib/auth/authorization';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { Button, Card, CardContent } from '@/components/admin/ui';

export default async function MemberOnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, team_roles(name), workspaces(name)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  const workspaceId = (membership as { workspace_id?: string } | null)?.workspace_id;

  const wsName = (membership as { workspaces?: { name?: string } } | null)?.workspaces?.name || 'your workspace';
  const roleName = (membership as { team_roles?: { name?: string } } | null)?.team_roles?.name || 'Member';

  async function handleContinue() {
    'use server';
    const client = await createClient();
    await client.from('account_context').upsert({
      user_id: user!.id,
      onboarding_status: 'completed',
    } as never);
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
