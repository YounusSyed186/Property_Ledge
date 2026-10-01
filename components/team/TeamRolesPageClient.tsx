'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Shield, Eye, LayoutGrid } from 'lucide-react';
import { useAppContext } from '@/components/context/AppContextProvider';
import { useCan } from '@/lib/auth/client-permissions';
import { Button, Badge, Tabs, useToast } from '@/components/admin/ui';
import { ListPage } from '@/components/workspace';
import { AdminDataGrid } from '@/components/admin/data-grid';
import { ColDef } from 'ag-grid-community';
import {
  fetchWorkspaceRoles,
  fetchWorkspaceRoleMatrixData,
  handleBatchUpdateWorkspaceRolePermissions,
  type WorkspaceRoleRow,
} from '@/app/actions/workspace-roles';
import { fetchRolePermissions } from '@/app/actions/workspace-team';
import { RoleBuilderDrawer } from '@/components/team/RoleBuilderDrawer';
import { ConfigDetailDrawer, PermissionMatrix, AdminConfigPageSkeleton } from '@/components/admin/config';
import { CrossRolePermissionMatrix } from '@/components/rbac/CrossRolePermissionMatrix';
import { useCollapsibleWorkspaceOptional } from '@/components/workspace/useCollapsibleDataWorkspace';
import type { PermissionItem } from '@/components/rbac/PermissionMatrix';

export function TeamRolesPageClient() {
  const router = useRouter();
  const { workspaceId } = useAppContext();
  const { success: toastSuccess, error: toastError } = useToast();
  const canCreate = useCan('team.role.create');
  const canUpdate = useCan('team.role.update');
  const canView = useCan('team.role.view');

  const workspaceStore = useCollapsibleWorkspaceOptional();
  const [isMatrixExpanded, setIsMatrixExpanded] = useState(true);

  const [activeTab, setActiveTab] = useState<'list' | 'matrix'>('list');
  const [roles, setRoles] = useState<WorkspaceRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(() => new Date());
  const [showBuilder, setShowBuilder] = useState(false);
  const [editRole, setEditRole] = useState<WorkspaceRoleRow | null>(null);
  const [viewRole, setViewRole] = useState<WorkspaceRoleRow | null>(null);
  const [viewPerms, setViewPerms] = useState<Array<{ key: string; name: string; resource: string; action: string }>>([]);

  // Matrix data state
  const [matrixData, setMatrixData] = useState<{
    permissions: PermissionItem[];
    roles: WorkspaceRoleRow[];
    rolePermissions: Record<string, string[]>;
    grantableKeys?: string[];
    isOwner?: boolean;
  } | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);

  const handleToggleMatrixExpand = useCallback(() => {
    const next = !isMatrixExpanded;
    setIsMatrixExpanded(next);
    if (workspaceStore) {
      workspaceStore.setExpanded(next);
    }
  }, [isMatrixExpanded, workspaceStore]);

  const load = useCallback(async (isManualRefresh = false) => {
    if (!workspaceId) return;
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      setRoles(await fetchWorkspaceRoles(workspaceId));
      setLastRefreshedAt(new Date());
    } finally {
      if (isManualRefresh) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [workspaceId]);

  const loadMatrix = useCallback(async () => {
    if (!workspaceId) return;
    setMatrixLoading(true);
    try {
      const data = await fetchWorkspaceRoleMatrixData(workspaceId);
      setMatrixData(data as any);
    } catch (e) {
      toastError('Failed to load matrix', e instanceof Error ? e.message : 'Could not fetch permission matrix.');
    } finally {
      setMatrixLoading(false);
    }
  }, [workspaceId, toastError]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (activeTab === 'matrix') {
      loadMatrix();
      if (workspaceStore) {
        workspaceStore.setExpanded(isMatrixExpanded);
      }
    }
  }, [activeTab, loadMatrix, workspaceStore, isMatrixExpanded]);


  useEffect(() => {
    if (!viewRole) return;
    fetchRolePermissions(viewRole.id).then(setViewPerms).catch(() => setViewPerms([]));
  }, [viewRole]);


  const systemRoles = useMemo(() => roles.filter((r) => r.isSystemRole), [roles]);
  const customRoles = useMemo(() => roles.filter((r) => !r.isSystemRole), [roles]);

  async function handleSaveMatrix(
    updatedRolePermissions: Record<string, string[]>,
    changedRoleIds: string[]
  ) {
    if (!workspaceId) return;
    try {
      const updates = changedRoleIds
        .map((roleId) => {
          const role = (matrixData?.roles || roles).find((r) => r.id === roleId);
          if (!role || role.isSystemRole) return null;
          return {
            roleId,
            name: role.name,
            description: role.description,
            permissionKeys: updatedRolePermissions[roleId] || [],
          };
        })
        .filter(Boolean) as Array<{
          roleId: string;
          name: string;
          description: string | null;
          permissionKeys: string[];
        }>;

      if (updates.length === 0) {
        toastError('Cannot save', 'System standard roles cannot be modified directly in workspace settings.');
        return;
      }

      await handleBatchUpdateWorkspaceRolePermissions(workspaceId, updates);
      toastSuccess('Permissions saved', `Successfully updated ${updates.length} custom role(s).`);
      router.refresh();
      await load();
      await loadMatrix();
    } catch (e) {
      toastError('Save failed', e instanceof Error ? e.message : 'Could not update role permissions.');
      throw e;
    }
  }

  if (!canView) {
    return <p className="text-admin-muted py-12 text-center">You don&apos;t have permission to view team roles.</p>;
  }

  const columns: ColDef<WorkspaceRoleRow>[] = [
    { field: 'name', headerName: 'Role', flex: 1, cellRenderer: (p: { value: string }) => <span className="font-semibold text-[13.5px]">{p.value}</span> },
    { field: 'description', headerName: 'Description', flex: 1.5, cellRenderer: (p: { value: string }) => <span className="text-caption text-admin-muted truncate">{p.value || '—'}</span> },
    { field: 'permissionCount', headerName: 'Permissions', width: 120, cellRenderer: (p: { value: number }) => <span className="text-caption">{p.value} permissions</span> },
    { field: 'memberCount', headerName: 'Members', width: 100 },
    {
      headerName: 'Actions', colId: 'actions', width: 100, sortable: false, filter: false,
      cellRenderer: (p: { data: WorkspaceRoleRow }) => (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setViewRole(p.data); }} leftIcon={<Eye className="w-3.5 h-3.5" />}>
          View
        </Button>
      ),
    },
  ];

  if (loading) return <AdminConfigPageSkeleton />;

  return (
    <>
      <ListPage
        fill
        title="Team Roles"
        description="System roles are standard across PropertyLedge. Custom roles are specific to your workspace."
        actions={
          <div className="flex items-center gap-2">
            <Tabs
              tabs={[
                { value: 'list', label: 'Role List', icon: <Shield className="w-3.5 h-3.5" /> },
                { value: 'matrix', label: 'Permission Matrix', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
              ]}
              value={activeTab}
              onChange={(v) => setActiveTab(v as 'list' | 'matrix')}
            />
            {canCreate && (
              <Button size="sm" onClick={() => { setEditRole(null); setShowBuilder(true); }}>
                <Plus className="mr-1.5 h-4 w-4" />
                Create custom role
              </Button>
            )}
          </div>
        }
      >
        {activeTab === 'list' && (
          roles.length === 0 ? (
            <div className="text-center py-16 text-admin-muted">
              <Shield className="h-10 w-10 mx-auto mb-2" />
              <p>No roles available.</p>
              {canCreate && (
                <Button className="mt-4" size="sm" onClick={() => { setEditRole(null); setShowBuilder(true); }}>
                  Create custom role
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4 h-full min-h-0">
              <div className="shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="neutral" size="sm">SYSTEM</Badge>
                  <span className="text-xs text-admin-muted">Available to all workspaces</span>
                </div>
                <div className="h-[min(280px,40vh)] min-h-[160px]">
                  <AdminDataGrid
                    rowData={systemRoles}
                    columnDefs={columns}
                    onRowClick={setViewRole}
                    labelSingular="role"
                    labelPlural="roles"
                    enableSelection={false}
                    onRefresh={() => load(true)}
                    isRefreshing={isRefreshing}
                    lastRefreshedAt={lastRefreshedAt}
                  />
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="info" size="sm">CUSTOM</Badge>
                  <span className="text-xs text-admin-muted">Workspace-specific roles</span>
                </div>
                {customRoles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-admin-border p-8 text-center text-sm text-admin-muted">
                    No custom roles yet. Create a workspace-specific role for specialized responsibilities.
                  </div>
                ) : (
                  <AdminDataGrid
                    rowData={customRoles}
                    columnDefs={columns}
                    onRowClick={(role) => {
                      setViewRole(role);
                    }}
                    labelSingular="role"
                    labelPlural="roles"
                    enableSelection={false}
                    onRefresh={() => load(true)}
                    isRefreshing={isRefreshing}
                    lastRefreshedAt={lastRefreshedAt}
                  />
                )}
              </div>
            </div>
          )
        )}

        {activeTab === 'matrix' && (
          <div className="flex-1 min-h-0 flex flex-col h-full overflow-y-auto pr-1">
            {matrixLoading || !matrixData ? (
              <AdminConfigPageSkeleton />
            ) : (
              <CrossRolePermissionMatrix
                permissions={matrixData.permissions}
                roles={matrixData.roles.map((r) => ({
                  id: r.id,
                  name: r.name,
                  description: r.description,
                  isSystemRole: r.isSystemRole,
                  isEditable: !r.isSystemRole && canUpdate,
                }))}
                initialRolePermissions={matrixData.rolePermissions}
                grantableKeys={matrixData.grantableKeys}
                onSave={handleSaveMatrix}
                isExpanded={isMatrixExpanded}
                onToggleExpand={handleToggleMatrixExpand}
                title="Workspace Role Permissions Matrix"
                description="View and compare capabilities across all system and custom team roles. Custom roles can be edited directly."
              />

            )}
          </div>
        )}
      </ListPage>

      <ConfigDetailDrawer
        isOpen={!!viewRole}
        onClose={() => setViewRole(null)}
        title={viewRole?.name || ''}
        description={viewRole?.description || undefined}
        badge={viewRole?.isSystemRole ? { label: 'SYSTEM', variant: 'neutral' } : { label: 'CUSTOM', variant: 'info' }}
        sections={viewRole ? [
          { label: 'Members', value: `${viewRole.memberCount} member${viewRole.memberCount !== 1 ? 's' : ''}` },
          { label: 'Permissions', value: `${viewRole.permissionCount} permissions` },
        ] : []}
        footer={
          viewRole && !viewRole.isSystemRole && canUpdate ? (
            <Button size="sm" onClick={() => { setEditRole(viewRole); setViewRole(null); setShowBuilder(true); }}>Edit custom role</Button>
          ) : undefined
        }
      >
        {viewPerms.length > 0 && (
          <PermissionMatrix permissions={viewPerms} grantedKeys={viewPerms.map((p) => p.key)} />
        )}
      </ConfigDetailDrawer>

      {showBuilder && workspaceId && (
        <RoleBuilderDrawer
          workspaceId={workspaceId}
          role={editRole}
          onClose={() => { setShowBuilder(false); setEditRole(null); }}
          onSaved={() => { setShowBuilder(false); setEditRole(null); load(); if (activeTab === 'matrix') loadMatrix(); }}
        />
      )}
    </>
  );
}

