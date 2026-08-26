import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircle2, Mail, Shield } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/queries';
import { acceptInvitation, getInvitationByToken } from '@/app/actions/team';
import { PageContainer, Button, Card, CardContent } from '@/components/admin/ui';

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InviteAcceptPage({ params }: InvitePageProps) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);
  const user = await getCurrentUser();

  if (!invitation) {
    return (
      <PageContainer className="max-w-lg mx-auto py-16">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <h1 className="text-xl font-semibold text-admin-foreground">Invitation not found</h1>
            <p className="text-sm text-admin-muted">
              This invitation link may have expired or already been used.
            </p>
            <Button href="/login">Go to login</Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (!user) {
    const redirectTo = encodeURIComponent(`/invite/${token}`);
    redirect(`/login?redirectTo=${redirectTo}`);
  }

  if (invitation.status === 'active') {
    return (
      <PageContainer className="max-w-lg mx-auto py-16">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h1 className="text-xl font-semibold text-admin-foreground">Already accepted</h1>
            <p className="text-sm text-admin-muted">You already have access to this workspace.</p>
            <Button href="/dashboard">Go to dashboard</Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const targetLabel =
    invitation.scope === 'workspace'
      ? invitation.workspaceName || 'workspace'
      : invitation.propertyName || 'property';

  async function handleAccept() {
    'use server';
    await acceptInvitation(token);
    redirect('/dashboard');
  }

  return (
    <PageContainer className="max-w-lg mx-auto py-16">
      <Card>
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <Shield className="h-10 w-10 text-admin-primary mx-auto" />
            <h1 className="text-xl font-semibold text-admin-foreground">Accept invitation</h1>
            <p className="text-sm text-admin-muted">
              You&apos;ve been invited to join <strong>{targetLabel}</strong> as{' '}
              <strong>{invitation.role}</strong>.
            </p>
          </div>

          <div className="rounded-xl border border-admin-border bg-admin-muted/30 p-4 flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-admin-muted shrink-0" />
            <span className="text-admin-foreground">{invitation.email}</span>
          </div>

          <form action={handleAccept}>
            <Button type="submit" className="w-full">
              Accept invitation
            </Button>
          </form>

          <p className="text-xs text-center text-admin-muted">
            Signed in as {user.email}.{' '}
            <Link href="/login" className="text-admin-primary hover:underline">
              Switch account
            </Link>
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
