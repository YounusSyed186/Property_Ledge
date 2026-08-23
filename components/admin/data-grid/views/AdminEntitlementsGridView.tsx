'use client';

import React, { useMemo, useState } from 'react';
import { ColDef } from 'ag-grid-community';
import { AdminDataGrid, QuickFilterBar, QuickFilterOption } from '@/components/admin/data-grid';
import { Badge } from '@/components/admin/ui';
import { Key, ToggleLeft, Hash, Type } from 'lucide-react';

interface AdminEntitlementsGridViewProps {
  entitlements: any[];
}

export function AdminEntitlementsGridView({ entitlements }: AdminEntitlementsGridViewProps) {
  const [activeFilter, setActiveFilter] = useState('all');

  const filterOptions: QuickFilterOption[] = useMemo(
    () => [
      { value: 'all', label: 'All', count: entitlements.length },
      {
        value: 'boolean',
        label: 'Boolean',
        count: entitlements.filter((e) => e.value_type === 'boolean').length,
      },
      {
        value: 'number',
        label: 'Number',
        count: entitlements.filter((e) => e.value_type === 'number').length,
      },
      {
        value: 'string',
        label: 'String',
        count: entitlements.filter((e) => e.value_type === 'string').length,
      },
    ],
    [entitlements]
  );

  const filteredEntitlements = useMemo(() => {
    if (activeFilter === 'all') return entitlements;
    return entitlements.filter((e) => e.value_type === activeFilter);
  }, [entitlements, activeFilter]);

  const getValueTypeIcon = (type: string) => {
    if (type === 'boolean') return <ToggleLeft className="w-3.5 h-3.5" />;
    if (type === 'number') return <Hash className="w-3.5 h-3.5" />;
    return <Type className="w-3.5 h-3.5" />;
  };

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Entitlement Name',
        minWidth: 180,
        flex: 1.2,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => (
          <span className="font-semibold text-admin-foreground text-[13.5px]">
            {params.value}
          </span>
        ),
      },
      {
        field: 'key',
        headerName: 'Machine Key',
        minWidth: 180,
        cellRenderer: 'codeCell',
        filter: 'agTextColumnFilter',
      },
      {
        field: 'value_type',
        headerName: 'Value Type',
        minWidth: 130,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => (
          <Badge variant="neutral" size="sm">
            <span className="flex items-center gap-1.5 capitalize">
              {getValueTypeIcon(params.value)}
              {params.value}
            </span>
          </Badge>
        ),
      },
      {
        field: 'description',
        headerName: 'Description',
        minWidth: 220,
        flex: 1.5,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => (
          <span className="text-caption text-admin-muted truncate">
            {params.value || '—'}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <AdminDataGrid
      rowData={filteredEntitlements}
      columnDefs={columnDefs}
      enableSelection={true}
      enableColumnChooser={false}
      enableExport={true}
      exportFilename="propertyledge-entitlements"
      searchPlaceholder="Search entitlements by key or name..."
      leftToolbarContent={
        <QuickFilterBar
          options={filterOptions}
          activeValue={activeFilter}
          onChange={setActiveFilter}
        />
      }
      labelSingular="entitlement"
      labelPlural="entitlements"
      emptyTitle="No entitlements yet"
      emptyDescription="Create your first entitlement to define system capabilities."
      emptyIcon={<Key className="w-6 h-6" />}
    />
  );
}
