'use client';

import React, { useMemo } from 'react';
import { ColDef } from 'ag-grid-community';
import { AdminDataGrid } from '@/components/admin/data-grid';
import { Badge, Button } from '@/components/admin/ui';
import { Eye, Pencil, Users } from 'lucide-react';
import type { AdminSystemTeamRoleRow } from '@/lib/admin/types';

interface AdminSystemTeamRolesGridViewProps {
  roles: AdminSystemTeamRoleRow[];
  onView: (row: AdminSystemTeamRoleRow) => void;
  onEdit: (row: AdminSystemTeamRoleRow) => void;
}

export function AdminSystemTeamRolesGridView({ roles, onView, onEdit }: AdminSystemTeamRolesGridViewProps) {
  const columnDefs: ColDef[] = useMemo(
    () => [
      { field: 'name', headerName: 'Role', minWidth: 140, flex: 1, cellRenderer: (p: { value: string }) => <span className="font-semibold text-[13.5px]">{p.value}</span> },
      { field: 'description', headerName: 'Description', minWidth: 200, flex: 1.5, cellRenderer: (p: { value: string }) => <span className="text-caption text-admin-muted truncate">{p.value || '—'}</span> },
      { field: 'permission_count', headerName: 'Permissions', minWidth: 120, cellRenderer: (p: { value: number }) => <span className="text-caption">{p.value} permissions</span> },
      { field: 'workspace_count', headerName: 'Workspaces', minWidth: 110, cellRenderer: (p: { value: number }) => <span className="text-caption">{p.value}</span> },
      { field: 'member_count', headerName: 'Members', minWidth: 100, cellRenderer: (p: { value: number }) => <span className="text-caption">{p.value}</span> },
      { field: 'is_system_role', headerName: 'Type', minWidth: 90, cellRenderer: () => <Badge variant="neutral" size="sm">SYSTEM</Badge> },
      {
        headerName: 'Actions', colId: 'actions', minWidth: 160, pinned: 'right', sortable: false, filter: false,
        cellRenderer: (p: { data: AdminSystemTeamRoleRow }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onView(p.data); }} leftIcon={<Eye className="w-3.5 h-3.5" />}>View</Button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(p.data); }} leftIcon={<Pencil className="w-3.5 h-3.5" />}>Edit</Button>
          </div>
        ),
      },
    ],
    [onView, onEdit]
  );

  return (
    <AdminDataGrid
      rowData={roles}
      columnDefs={columnDefs}
      enableSelection={false}
      enableExport={true}
      exportFilename="system-team-roles"
      searchPlaceholder="Search system team roles..."
      onRowClick={onView}
      labelSingular="role"
      labelPlural="roles"
      emptyTitle="No system team roles"
      emptyDescription="System roles are seeded by PropertyLedge."
      emptyIcon={<Users className="w-6 h-6" />}
    />
  );
}
