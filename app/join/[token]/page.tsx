import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  Shield,
  XCircle,
  Users,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/queries';
import {
  acceptJoinInvitation,
  resolveJoinInvitation,
} from '@/app/actions/workspace-team';
import { PageContainer, Button, Card, CardContent, Badge } from '@/components/admin/ui';

interface JoinPageProps {
  params: Promise<{ token: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { token } = await params;
  const user = await getCurrentUser();

  const invitation = await resolveJoinInvitation(token);

  if (!invitation) {
    return <JoinState icon={XCircle} title="Invalid invitation" message="We couldn't find this invitation." />;
  }

  if (invitation.status === 'revoked') {
    return <JoinState icon={XCircle} title="Invitation revoked" message="This invitation is no longer valid." />;
  }

  if (invitation.status === 'accepted') {
    return (
      <JoinState
        icon={CheckCircle2}
        title="Already accepted"
        message="This invitation has already been used."
        actionHref="/dashboard"
        actionLabel="Open workspace"
      />
    );
  }

  if (invitation.isExpired || invitation.status === 'expired') {
    return (
      <JoinState
        icon={Clock}
        title="Invitation expired"
        message="This invitation has expired. Please ask your workspace administrator for a new one."
      />
    );
  }

  if (!user) {
    const returnTo = encodeURIComponent(`/join/${token}`);
    return (
      <JoinLayout>
        <Card>
          <CardContent className="p-8 space-y-6 text-center">
            <Users className="h-12 w-12 text-admin-primary mx-auto" />
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-admin-foreground">
                You&apos;re invited to {invitation.workspaceName}
              </h1>
              <p className="text-sm text-admin-muted">
                {invitation.inviterName} invited you to join as <strong>{invitation.roleName}</strong>.
              </p>
              <p className="text-sm text-admin-muted">
                Create your PropertyLedge account or sign in to continue.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button href={`/signup?redirectTo=${returnTo}`}>
                Create account
              </Button>
              <Button variant="secondary" href={`/login?redirectTo=${returnTo}`}>
                Sign in
              </Button>
            </div>
          </CardContent>
        </Card>
      </JoinLayout>
    );
  }

  if (invitation.status === 'pending') {
    const supabase = await import('@/lib/supabase/server').then((m) => m.createClient());
    const { data: existing } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', invitation.workspaceId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      return (
        <JoinState
          icon={CheckCircle2}
          title="Already a member"
          message={`You're already a member of ${invitation.workspaceName}.`}
          actionHref="/dashboard"
          actionLabel="Open workspace"
        />
      );
    }

    async function handleAccept() {
      'use server';
      await acceptJoinInvitation(token);
      redirect('/dashboard?joined=1');
    }

    return (
      <JoinLayout>
        <InviteCard
          workspaceName={invitation.workspaceName}
          inviterName={invitation.inviterName}
          roleName={invitation.roleName}
          expiresAt={invitation.expiresAt}
          onAccept={handleAccept}
          userEmail={user.email}
        />
      </JoinLayout>
    );
  }

  return <JoinState icon={XCircle} title="Invalid invitation" message="This invitation is no longer valid." />;
}

function JoinLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-admin-background flex items-center justify-center p-4">
      <PageContainer className="max-w-lg w-full py-8">{children}</PageContainer>
    </div>
  );
}

function JoinState({
  icon: Icon,
  title,
  message,
  actionHref,
  actionLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <JoinLayout>
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <Icon className="h-12 w-12 text-admin-muted mx-auto" />
          <h1 className="text-xl font-semibold text-admin-foreground">{title}</h1>
          <p className="text-sm text-admin-muted">{message}</p>
          {actionHref && <Button href={actionHref}>{actionLabel || 'Continue'}</Button>}
        </CardContent>
      </Card>
    </JoinLayout>
  );
}

function InviteCard({
  workspaceName,
  inviterName,
  roleName,
  expiresAt,
  onAccept,
  userEmail,
}: {
  workspaceName: string;
  inviterName: string;
  roleName: string;
  expiresAt?: string;
  onAccept: () => Promise<void>;
  userEmail?: string | null;
}) {
  return (
    <Card>
      <CardContent className="p-8 space-y-6">
        <div className="text-center space-y-2">
          <Shield className="h-10 w-10 text-admin-primary mx-auto" />
          <h1 className="text-xl font-semibold text-admin-foreground">
            You&apos;re invited to {workspaceName}
          </h1>
          <p className="text-sm text-admin-muted">
            <strong>{inviterName}</strong> invited you to join this workspace.
          </p>
        </div>

        <div className="rounded-xl border border-admin-border bg-admin-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-admin-muted">Role</span>
            <Badge variant="neutral">{roleName}</Badge>
          </div>
          {expiresAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-admin-muted">Expires</span>
              <span className="text-admin-foreground">
                {new Date(expiresAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        <form action={onAccept}>
          <Button type="submit" className="w-full">
            Accept invitation
          </Button>
        </form>

        {userEmail && (
          <p className="text-xs text-center text-admin-muted">
            Signed in as {userEmail}.{' '}
            <Link href="/login" className="text-admin-primary hover:underline">
              Switch account
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
