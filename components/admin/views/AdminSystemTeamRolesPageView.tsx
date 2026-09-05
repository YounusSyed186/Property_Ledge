'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle, Users, LayoutGrid } from 'lucide-react';
import { PageContainer, Button, Tabs, useToast } from '@/components/admin/ui';
import { AdminConfigPageHeader, AdminSummaryCards, HowItWorksDrawer, AdminConfigPageSkeleton } from '@/components/admin/config';
import { AdminSystemTeamRolesGridView } from '@/components/admin/data-grid/views/AdminSystemTeamRolesGridView';
import { SystemTeamRoleDetailDrawer } from '@/components/admin/team-roles/SystemTeamRoleDetailDrawer';
import { SystemTeamRoleBuilderDrawer } from '@/components/admin/team-roles/SystemTeamRoleBuilderDrawer';
import { CrossRolePermissionMatrix } from '@/components/rbac/CrossRolePermissionMatrix';
import {
  fetchAdminSystemTeamRolesMatrixData,
  handleBatchUpdateSystemTeamRolePermissions,
} from '@/app/actions/admin-config';
import type { AdminSystemTeamRoleRow } from '@/lib/admin/types';
import type { PermissionItem } from '@/components/rbac/PermissionMatrix';

interface AdminSystemTeamRolesPageViewProps {
  roles: AdminSystemTeamRoleRow[];
}

export function AdminSystemTeamRolesPageView({ roles }: AdminSystemTeamRolesPageViewProps) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<'list' | 'matrix'>('list');
  const [showHelp, setShowHelp] = useState(false);
  const [viewRole, setViewRole] = useState<AdminSystemTeamRoleRow | null>(null);
  const [editRole, setEditRole] = useState<AdminSystemTeamRoleRow | null>(null);

  // Matrix state
  const [matrixData, setMatrixData] = useState<{
    permissions: PermissionItem[];
    roles: AdminSystemTeamRoleRow[];
    rolePermissions: Record<string, string[]>;
  } | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);

  const loadMatrix = useCallback(async () => {
    setMatrixLoading(true);
    try {
      const data = await fetchAdminSystemTeamRolesMatrixData();
      setMatrixData(data as any);
    } catch (e) {
      toastError('Failed to load matrix', e instanceof Error ? e.message : 'Could not fetch permission matrix.');
    } finally {
      setMatrixLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    if (activeTab === 'matrix') {
      loadMatrix();
    }
  }, [activeTab, loadMatrix]);

  const summaryCards = useMemo(() => [
    { id: 'total', label: 'System Roles', value: roles.length },
    { id: 'members', label: 'Total Members', value: roles.reduce((s, r) => s + r.member_count, 0) },
    { id: 'workspaces', label: 'Workspaces', value: roles.reduce((s, r) => s + r.workspace_count, 0) },
    { id: 'perms', label: 'Avg Permissions', value: roles.length ? Math.round(roles.reduce((s, r) => s + r.permission_count, 0) / roles.length) : 0 },
  ], [roles]);

  async function handleSaveMatrix(
    updatedRolePermissions: Record<string, string[]>,
    changedRoleIds: string[]
  ) {
    try {
      const updates = changedRoleIds.map((roleId) => {
        const role = (matrixData?.roles || roles).find((r) => r.id === roleId);
        return {
          roleId,
          description: role?.description || '',
          permissionKeys: updatedRolePermissions[roleId] || [],
        };
      });

      await handleBatchUpdateSystemTeamRolePermissions(updates);
      toastSuccess('Permissions saved', `Successfully updated ${updates.length} system team role(s).`);
      router.refresh();
      await loadMatrix();
    } catch (e) {
      toastError('Save failed', e instanceof Error ? e.message : 'Could not update role permissions.');
      throw e;
    }
  }

  const [isMatrixExpanded, setIsMatrixExpanded] = useState(true);

  const headerActions = (
    <div className="flex items-center gap-2">
      <Tabs
        tabs={[
          { value: 'list', label: 'Role List', icon: <Users className="w-3.5 h-3.5" /> },
          { value: 'matrix', label: 'Permission Matrix', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
        ]}
        value={activeTab}
        onChange={(v) => setActiveTab(v as 'list' | 'matrix')}
      />
      <Button variant="secondary" size="sm" onClick={() => setShowHelp(true)} leftIcon={<HelpCircle className="w-4 h-4" />}>
        How this works
      </Button>
    </div>
  );

  return (
    <PageContainer className="relative flex flex-col h-full">
      {(!isMatrixExpanded || activeTab === 'list') ? (
        <AdminConfigPageHeader
          title="System Team Roles"
          description="These roles are managed by PropertyLedge and are available across workspaces."
          secondaryDescription="System roles cannot be created here. Workspaces create custom roles under Dashboard → Team roles."
          actions={headerActions}
        />
      ) : (
        <div className="flex items-center justify-between pb-2 mb-1 border-b border-admin-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-admin-foreground">System Team Roles</h1>
          </div>
          {headerActions}
        </div>
      )}

      {activeTab === 'list' && (
        <>
          <AdminSummaryCards items={summaryCards} />

          <div className="flex-1 min-h-0 mt-2">
            <AdminSystemTeamRolesGridView
              roles={roles}
              onView={setViewRole}
              onEdit={(r) => { setViewRole(null); setEditRole(r); }}
            />
          </div>
        </>
      )}

      {activeTab === 'matrix' && (
        <div className="flex-1 min-h-0 flex flex-col pt-0.5 overflow-y-auto pr-1">
          {matrixLoading || !matrixData ? (
            <AdminConfigPageSkeleton />
          ) : (
            <CrossRolePermissionMatrix
              permissions={matrixData.permissions}
              roles={matrixData.roles.map((r) => ({
                id: r.id,
                name: r.name,
                description: r.description,
                isSystemRole: true,
                isEditable: true,
              }))}
              initialRolePermissions={matrixData.rolePermissions}
              onSave={handleSaveMatrix}
              isExpanded={isMatrixExpanded}
              onToggleExpand={() => setIsMatrixExpanded((prev) => !prev)}
              title="System Team Roles Permission Matrix"
              description="Configure default permission sets for PropertyLedge standard workspace roles."
            />
          )}
        </div>
      )}


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

