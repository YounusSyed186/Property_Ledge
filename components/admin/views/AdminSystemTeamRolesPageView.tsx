'use client';

import React, { useMemo, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { PageContainer, Button } from '@/components/admin/ui';
import { AdminConfigPageHeader, AdminSummaryCards, HowItWorksDrawer } from '@/components/admin/config';
import { AdminSystemTeamRolesGridView } from '@/components/admin/data-grid/views/AdminSystemTeamRolesGridView';
import { SystemTeamRoleDetailDrawer } from '@/components/admin/team-roles/SystemTeamRoleDetailDrawer';
import { SystemTeamRoleBuilderDrawer } from '@/components/admin/team-roles/SystemTeamRoleBuilderDrawer';
import type { AdminSystemTeamRoleRow } from '@/lib/admin/types';

interface AdminSystemTeamRolesPageViewProps {
  roles: AdminSystemTeamRoleRow[];
}

export function AdminSystemTeamRolesPageView({ roles }: AdminSystemTeamRolesPageViewProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [viewRole, setViewRole] = useState<AdminSystemTeamRoleRow | null>(null);
  const [editRole, setEditRole] = useState<AdminSystemTeamRoleRow | null>(null);

  const summaryCards = useMemo(() => [
    { id: 'total', label: 'System Roles', value: roles.length },
    { id: 'members', label: 'Total Members', value: roles.reduce((s, r) => s + r.member_count, 0) },
    { id: 'workspaces', label: 'Workspaces', value: roles.reduce((s, r) => s + r.workspace_count, 0) },
    { id: 'perms', label: 'Avg Permissions', value: roles.length ? Math.round(roles.reduce((s, r) => s + r.permission_count, 0) / roles.length) : 0 },
  ], [roles]);

  return (
    <PageContainer className="relative">
      <AdminConfigPageHeader
        title="System Team Roles"
        description="These roles are managed by PropertyLedge and are available across workspaces."
        secondaryDescription="System roles cannot be created here. Workspaces create custom roles under Dashboard → Team roles."
        actions={
          <Button variant="secondary" size="sm" onClick={() => setShowHelp(true)} leftIcon={<HelpCircle className="w-4 h-4" />}>
            How this works
          </Button>
        }
      />

      <AdminSummaryCards items={summaryCards} />

      <div className="flex-1 min-h-0">
        <AdminSystemTeamRolesGridView
          roles={roles}
          onView={setViewRole}
          onEdit={(r) => { setViewRole(null); setEditRole(r); }}
        />
      </div>

      <HowItWorksDrawer topic="team_roles" isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <SystemTeamRoleDetailDrawer
        role={viewRole}
        isOpen={!!viewRole}
        onClose={() => setViewRole(null)}
        onEdit={(r) => { setViewRole(null); setEditRole(r); }}
      />
      <SystemTeamRoleBuilderDrawer role={editRole} isOpen={!!editRole} onClose={() => setEditRole(null)} />
    </PageContainer>
  );
}
