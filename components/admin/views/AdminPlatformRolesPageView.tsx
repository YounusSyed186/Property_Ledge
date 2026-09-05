'use client';

import React, { useMemo, useState, useTransition, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, HelpCircle, Shield, LayoutGrid } from 'lucide-react';
import { PageContainer, Button, Tabs, useToast } from '@/components/admin/ui';
import { AdminConfigPageHeader, AdminSummaryCards, HowItWorksDrawer, ImpactConfirmModal, AdminConfigPageSkeleton } from '@/components/admin/config';
import { AdminPlatformRolesGridView } from '@/components/admin/data-grid/views/AdminPlatformRolesGridView';
import { PlatformRoleDetailDrawer } from '@/components/admin/platform-roles/PlatformRoleDetailDrawer';
import { PlatformRoleBuilderDrawer } from '@/components/admin/platform-roles/PlatformRoleBuilderDrawer';
import { CrossRolePermissionMatrix } from '@/components/rbac/CrossRolePermissionMatrix';
import {
  handleDeletePlatformRole,
  fetchAdminPlatformRolesMatrixData,
  handleBatchUpdatePlatformRolePermissions,
} from '@/app/actions/admin-config';
import type { AdminPlatformRoleRow } from '@/lib/admin/types';
import type { PermissionItem } from '@/components/rbac/PermissionMatrix';

interface AdminPlatformRolesPageViewProps {
  roles: AdminPlatformRoleRow[];
}

export function AdminPlatformRolesPageView({ roles }: AdminPlatformRolesPageViewProps) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<'list' | 'matrix'>('list');
  const [showHelp, setShowHelp] = useState(false);
  const [builderRole, setBuilderRole] = useState<AdminPlatformRoleRow | null | undefined>(undefined);
  const [viewRole, setViewRole] = useState<AdminPlatformRoleRow | null>(null);
  const [deleteRole, setDeleteRole] = useState<AdminPlatformRoleRow | null>(null);
  const [isDeleting, startDelete] = useTransition();

  // Matrix state
  const [matrixData, setMatrixData] = useState<{
    permissions: PermissionItem[];
    roles: AdminPlatformRoleRow[];
    rolePermissions: Record<string, string[]>;
  } | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);

  const loadMatrix = useCallback(async () => {
    setMatrixLoading(true);
    try {
      const data = await fetchAdminPlatformRolesMatrixData();
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

  const systemCards = useMemo(() =>
    roles.filter((r) => r.is_system_role).slice(0, 3).map((r) => ({
      id: r.id,
      label: r.name,
      value: r.permission_count,
      sublabel: r.description || undefined,
    })),
  [roles]);

  function handleDelete() {
    if (!deleteRole) return;
    startDelete(async () => {
      try {
        await handleDeletePlatformRole(deleteRole.id);
        toastSuccess('Role deleted', `${deleteRole.name} was removed.`);
        setDeleteRole(null);
        setViewRole(null);
        router.refresh();
        if (activeTab === 'matrix') loadMatrix();
      } catch (e) {
        toastError('Could not delete', e instanceof Error ? e.message : 'Delete failed');
      }
    });
  }

  async function handleSaveMatrix(
    updatedRolePermissions: Record<string, string[]>,
    changedRoleIds: string[]
  ) {
    try {
      const updates = changedRoleIds.map((roleId) => {
        const role = (matrixData?.roles || roles).find((r) => r.id === roleId);
        return {
          roleId,
          name: role?.name || '',
          description: role?.description || '',
          permissionKeys: updatedRolePermissions[roleId] || [],
        };
      });

      await handleBatchUpdatePlatformRolePermissions(updates);
      toastSuccess('Permissions saved', `Successfully updated ${updates.length} platform role(s).`);
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
          { value: 'list', label: 'Role List', icon: <Shield className="w-3.5 h-3.5" /> },
          { value: 'matrix', label: 'Permission Matrix', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
        ]}
        value={activeTab}
        onChange={(v) => setActiveTab(v as 'list' | 'matrix')}
      />
      <Button variant="secondary" size="sm" onClick={() => setShowHelp(true)} leftIcon={<HelpCircle className="w-4 h-4" />}>
        How this works
      </Button>
      <Button size="sm" onClick={() => setBuilderRole(null)} leftIcon={<Plus className="w-4 h-4" />}>
        Create platform role
      </Button>
    </div>
  );

  return (
    <PageContainer className="relative flex flex-col h-full">
      {(!isMatrixExpanded || activeTab === 'list') ? (
        <AdminConfigPageHeader
          title="Platform Roles"
          description="Control administrative access to the PropertyLedge platform."
          actions={headerActions}
        />
      ) : (
        <div className="flex items-center justify-between pb-2 mb-1 border-b border-admin-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-admin-foreground">Platform Roles</h1>
          </div>
          {headerActions}
        </div>
      )}

      {activeTab === 'list' && (
        <>
          {systemCards.length > 0 && (
            <AdminSummaryCards items={systemCards.map((c) => ({ ...c, label: c.label, value: `${c.value} perms` }))} />
          )}

          <div className="flex-1 min-h-0 mt-2">
            <AdminPlatformRolesGridView
              roles={roles}
              onView={setViewRole}
              onEdit={(r) => { setViewRole(null); setBuilderRole(r); }}
              onDelete={setDeleteRole}
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
                isSystemRole: r.is_system_role,
                isEditable: true,
              }))}
              initialRolePermissions={matrixData.rolePermissions}
              onSave={handleSaveMatrix}
              isExpanded={isMatrixExpanded}
              onToggleExpand={() => setIsMatrixExpanded((prev) => !prev)}
              title="Platform Role Permissions Matrix"
              description="Configure platform capabilities across all roles."
            />
          )}
        </div>
      )}


      <HowItWorksDrawer topic="platform_roles" isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <PlatformRoleDetailDrawer
        role={viewRole}
        isOpen={!!viewRole}
        onClose={() => setViewRole(null)}
        onEdit={(r) => { setViewRole(null); setBuilderRole(r); }}
        onDelete={setDeleteRole}
      />
      {builderRole !== undefined && (
        <PlatformRoleBuilderDrawer
          role={builderRole}
          isOpen={true}
          onClose={() => setBuilderRole(undefined)}
        />
      )}

      <ImpactConfirmModal
        isOpen={!!deleteRole}
        onClose={() => setDeleteRole(null)}
        onConfirm={handleDelete}
        title={deleteRole ? `Delete "${deleteRole.name}"?` : ''}
        description={
          deleteRole && deleteRole.user_count > 0
            ? `This role is assigned to ${deleteRole.user_count} administrator${deleteRole.user_count !== 1 ? 's' : ''}. You must reassign them before deleting.`
            : 'This action cannot be undone.'
        }
        confirmLabel="Delete role"
        variant="danger"
        loading={isDeleting}
      />
    </PageContainer>
  );
}

