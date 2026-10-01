'use client';

import React, { useMemo, useState } from 'react';
import { ColDef } from 'ag-grid-community';
import { AdminDataGrid } from '@/components/admin/data-grid';
import { Badge, Button } from '@/components/admin/ui';
import { Eye, Pencil, Trash2, Shield } from 'lucide-react';
import type { AdminPlatformRoleRow } from '@/lib/admin/types';

interface AdminPlatformRolesGridViewProps {
  roles: AdminPlatformRoleRow[];
  onView: (row: AdminPlatformRoleRow) => void;
  onEdit: (row: AdminPlatformRoleRow) => void;
  onDelete: (row: AdminPlatformRoleRow) => void;
  onRefresh?: () => void | Promise<void>;
  isRefreshing?: boolean;
  lastRefreshedAt?: Date | null;
}

export function AdminPlatformRolesGridView({
  roles,
  onView,
  onEdit,
  onDelete,
  onRefresh,
  isRefreshing,
  lastRefreshedAt,
}: AdminPlatformRolesGridViewProps) {
  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Role',
        minWidth: 160,
        flex: 1,
        cellRenderer: (params: { value: string }) => (
          <span className="font-semibold text-[13.5px]">{params.value}</span>
        ),
      },
      {
        field: 'description',
        headerName: 'Description',
        minWidth: 200,
        flex: 1.5,
        cellRenderer: (params: { value: string }) => (
          <span className="text-caption text-admin-muted truncate">{params.value || '—'}</span>
        ),
      },
      {
        field: 'permission_count',
        headerName: 'Permissions',
        minWidth: 120,
        cellRenderer: (params: { value: number }) => (
          <span className="text-caption">{params.value} permission{params.value !== 1 ? 's' : ''}</span>
        ),
      },
      {
        field: 'user_count',
        headerName: 'Users',
        minWidth: 90,
        cellRenderer: (params: { value: number }) => (
          <span className="text-caption">{params.value} user{params.value !== 1 ? 's' : ''}</span>
        ),
      },
      {
        field: 'is_system_role',
        headerName: 'Type',
        minWidth: 100,
        cellRenderer: (params: { value: boolean }) => (
          <Badge variant={params.value ? 'neutral' : 'info'} size="sm">
            {params.value ? 'SYSTEM' : 'CUSTOM'}
          </Badge>
        ),
      },
      {
        field: 'updated_at',
        headerName: 'Updated',
        minWidth: 120,
        cellRenderer: 'dateCell',
      },
      {
        headerName: 'Actions',
        colId: 'actions',
        minWidth: 200,
        pinned: 'right',
        sortable: false,
        filter: false,
        cellRenderer: (params: { data: AdminPlatformRoleRow }) => {
          const row = params.data;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onView(row); }} leftIcon={<Eye className="w-3.5 h-3.5" />}>View</Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(row); }} leftIcon={<Pencil className="w-3.5 h-3.5" />}>Edit</Button>
              {!row.is_system_role && (
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(row); }} leftIcon={<Trash2 className="w-3.5 h-3.5" />} className="text-admin-danger">Delete</Button>
              )}
            </div>
          );
        },
      },
    ],
    [onView, onEdit, onDelete]
  );

  return (
    <AdminDataGrid
      rowData={roles}
      columnDefs={columnDefs}
      enableSelection={false}
      enableExport={true}
      exportFilename="platform-roles"
      searchPlaceholder="Search platform roles..."
      onRowClick={onView}
      labelSingular="role"
      labelPlural="roles"
      emptyTitle="No platform roles"
      emptyDescription="Create a platform role to manage administrator access."
      emptyIcon={<Shield className="w-6 h-6" />}
      onRefresh={onRefresh}
      isRefreshing={isRefreshing}
      lastRefreshedAt={lastRefreshedAt}
    />
  );
}
