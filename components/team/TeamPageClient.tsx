'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { UserPlus, Users, Clock, Shield } from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import { AdminDataGrid } from '@/components/admin/data-grid';
import { Button, Badge, useToast } from '@/components/admin/ui';
import { ListPage } from '@/components/workspace';
import { useAppContext } from '@/components/context/AppContextProvider';
import { useCan } from '@/lib/auth/client-permissions';
import {
  fetchWorkspaceTeam,
  fetchPendingInvitations,
  fetchSeatUsage,
  type WorkspaceMemberRow,
  type PendingInvitationRow,
} from '@/app/actions/workspace-team';
import { AddMemberModal } from './AddMemberModal';
import { MemberDetailDrawer } from './MemberDetailDrawer';

export function TeamPageClient() {
  const { workspaceId } = useAppContext();
  const canInvite = useCan('team.member.invite');
  const canView = useCan('team.member.view');
  const canManageRoles = useCan('team.role.view');
  const { toast, error: toastError, success: toastSuccess } = useToast();

  const [members, setMembers] = useState<WorkspaceMemberRow[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitationRow[]>([]);
  const [seats, setSeats] = useState<{ current: number; limit: number; remaining: number; isOverLimit: boolean } | null>(null);
  const [tab, setTab] = useState<'members' | 'invitations'>('members');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<WorkspaceMemberRow | null>(null);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const [memberData, inviteData, seatData] = await Promise.all([
        fetchWorkspaceTeam(workspaceId),
        fetchPendingInvitations(workspaceId),
        fetchSeatUsage(workspaceId),
      ]);
      setMembers(memberData);
      setInvitations(inviteData);
      setSeats(seatData);
    } catch (e) {
      toastError('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center py-24 text-admin-muted">
        Select a workspace to manage your team.
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex items-center justify-center py-24 text-admin-muted">
        You don&apos;t have permission to view team members.
      </div>
    );
  }

  const memberColumns: ColDef<WorkspaceMemberRow>[] = [
    {
      field: 'fullName',
      headerName: 'Name',
      flex: 1,
      minWidth: 180,
      valueGetter: (p) => p.data?.fullName || p.data?.publicId || '—',
    },
    { field: 'roleName', headerName: 'Role', width: 140 },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      cellRenderer: (params: { value: string }) => (
        <Badge variant={params.value === 'active' ? 'success' : 'neutral'}>
          {params.value}
        </Badge>
      ),
    },
    {
      field: 'joinedAt',
      headerName: 'Joined',
      width: 120,
      valueFormatter: (p) => (p.value ? new Date(p.value as string).toLocaleDateString() : '—'),
    },
  ];

  const inviteColumns: ColDef<PendingInvitationRow>[] = [
    { field: 'roleName', headerName: 'Role', width: 140 },
    { field: 'inviteType', headerName: 'Type', width: 100 },
    {
      field: 'expiresAt',
      headerName: 'Expires',
      flex: 1,
      valueFormatter: (p) => new Date(p.value as string).toLocaleDateString(),
    },
    { field: 'invitedByName', headerName: 'Invited by', width: 160 },
  ];

  return (
    <>
      <ListPage
        fill
        title="Team"
        description="Manage members and workspace access."
        summary={
          seats && (
            <div className="flex items-center gap-3 rounded-xl border border-admin-border bg-admin-surface px-4 py-3">
              <Users className="h-5 w-5 text-admin-muted" />
              <div>
                <p className="text-sm font-medium text-admin-foreground">
                  {seats.current} / {seats.limit} seats
                </p>
                {seats.isOverLimit && (
                  <p className="text-xs text-amber-600">Over limit — upgrade to add more members</p>
                )}
              </div>
            </div>
          )
        }
        actions={
          <div className="flex items-center gap-2">
            {canManageRoles && (
              <Link href="/dashboard/settings/team/roles">
                <Button variant="secondary" size="sm">
                  <Shield className="mr-1.5 h-4 w-4" />
                  Manage roles
                </Button>
              </Link>
            )}
            {canInvite && (
              <Button size="sm" onClick={() => setShowAddModal(true)} disabled={seats?.remaining === 0}>
                <UserPlus className="mr-1.5 h-4 w-4" />
                Add member
              </Button>
            )}
          </div>
        }
      >
        <div className="flex gap-2 border-b border-admin-border mb-4">
          <button
            type="button"
            onClick={() => setTab('members')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === 'members'
                ? 'border-admin-primary text-admin-primary'
                : 'border-transparent text-admin-muted hover:text-admin-foreground'
            }`}
          >
            Members ({members.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('invitations')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === 'invitations'
                ? 'border-admin-primary text-admin-primary'
                : 'border-transparent text-admin-muted hover:text-admin-foreground'
            }`}
          >
            Pending invitations ({invitations.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-admin-primary border-t-transparent" />
          </div>
        ) : tab === 'members' ? (
          members.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <Users className="h-12 w-12 text-admin-muted mx-auto" />
              <p className="text-admin-muted">Your team is ready. Invite your first teammate.</p>
              {canInvite && (
                <Button onClick={() => setShowAddModal(true)}>
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Add member
                </Button>
              )}
            </div>
          ) : (
            <AdminDataGrid
              rowData={members}
              columnDefs={memberColumns}
              onRowClick={(row) => setSelectedMember(row)}
            />
          )
        ) : invitations.length === 0 ? (
          <div className="text-center py-16 text-admin-muted flex flex-col items-center gap-2">
            <Clock className="h-10 w-10" />
            No pending invitations.
          </div>
        ) : (
          <AdminDataGrid
            rowData={invitations}
            columnDefs={inviteColumns}
          />
        )}
      </ListPage>

      {showAddModal && workspaceId && (
        <AddMemberModal
          workspaceId={workspaceId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            load();
            toastSuccess('Success', 'Member action completed.');
          }}
        />
      )}

      {selectedMember && workspaceId && (
        <MemberDetailDrawer
          workspaceId={workspaceId}
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onUpdated={() => {
            setSelectedMember(null);
            load();
          }}
        />
      )}
    </>
  );
}
