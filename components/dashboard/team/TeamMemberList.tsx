'use client';

import React, { useState } from 'react';
import { UserPlus, Mail, Clock, CheckCircle2 } from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import { AdminDataGrid } from '@/components/admin/data-grid';
import { Button, Input, Select, useToast } from '@/components/admin/ui';
import { inviteWorkspaceMember } from '@/app/actions/team';

export interface TeamMemberRow {
  id: string;
  email: string;
  full_name?: string | null;
  role: string;
  status: 'invited' | 'active' | 'suspended' | 'removed';
  joined_at?: string | null;
}

interface TeamMemberListProps {
  workspaceId: string;
  members: TeamMemberRow[];
  onInvited?: () => void;
}

const roleOptions = [
  { value: 'manager', label: 'Manager' },
  { value: 'agent', label: 'Agent' },
  { value: 'staff', label: 'Staff' },
  { value: 'viewer', label: 'Viewer' },
];

const columns: ColDef<TeamMemberRow>[] = [
  {
    field: 'full_name',
    headerName: 'Name',
    flex: 1,
    minWidth: 160,
    valueGetter: (p) => p.data?.full_name || p.data?.email || '—',
  },
  { field: 'email', headerName: 'Email', flex: 1, minWidth: 180 },
  { field: 'role', headerName: 'Role', width: 120, cellRenderer: 'statusCell' },
  {
    field: 'status',
    headerName: 'Status',
    width: 120,
    cellRenderer: (params: { value: string }) => {
      const status = params.value;
      if (status === 'active') {
        return (
          <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" /> Active
          </span>
        );
      }
      if (status === 'invited') {
        return (
          <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
            <Clock className="h-3.5 w-3.5" /> Invited
          </span>
        );
      }
      return <span className="text-xs text-admin-muted capitalize">{status}</span>;
    },
  },
  { field: 'joined_at', headerName: 'Joined', width: 140, cellRenderer: 'dateCell' },
];

export function TeamMemberList({ workspaceId, members, onInvited }: TeamMemberListProps) {
  const { success, error: showError } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      await inviteWorkspaceMember(
        workspaceId,
        email.trim(),
        role as 'manager' | 'agent' | 'staff' | 'viewer'
      );
      success('Invitation sent', `An invite was sent to ${email.trim()}.`);
      setEmail('');
      onInvited?.();
    } catch (err) {
      showError('Invite failed', err instanceof Error ? err.message : 'Could not send invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 w-full space-y-1">
          <label className="text-xs font-medium text-admin-muted">Email address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-admin-muted" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="pl-9"
              required
            />
          </div>
        </div>
        <div className="w-full sm:w-40 space-y-1">
          <label className="text-xs font-medium text-admin-muted">Role</label>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={isSubmitting} className="shrink-0">
          <UserPlus className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Sending…' : 'Invite'}
        </Button>
      </form>

      <AdminDataGrid
        rowData={members}
        columnDefs={columns}
        labelSingular="member"
        labelPlural="members"
        searchPlaceholder="Search team members..."
        getRowId={(params) => String(params.data.id)}
      />
    </div>
  );
}
