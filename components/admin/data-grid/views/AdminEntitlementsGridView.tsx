'use client';

import React, { useMemo, useState } from 'react';
import { ColDef } from 'ag-grid-community';
import { AdminDataGrid, QuickFilterBar, QuickFilterOption } from '@/components/admin/data-grid';
import { Badge, Button } from '@/components/admin/ui';
import { Key, Eye, Pencil, Trash2 } from 'lucide-react';
import {
  findCapabilityByKey,
  getEntitlementKind,
  getKindLabel,
  getTypeDisplayLabel,
  isSupportedCapabilityKey,
} from '@/lib/entitlements/capability-catalog';
import type { AdminEntitlementRow } from '@/lib/admin/types';

interface AdminEntitlementsGridViewProps {
  entitlements: AdminEntitlementRow[];
  onView: (row: AdminEntitlementRow) => void;
  onEdit: (row: AdminEntitlementRow) => void;
  onDelete: (row: AdminEntitlementRow) => void;
  onCreateClick?: () => void;
  summaryFilter?: string;
  onSummaryFilterChange?: (filter: string) => void;
  onRefresh?: () => void | Promise<void>;
  isRefreshing?: boolean;
  lastRefreshedAt?: Date | null;
}

export function AdminEntitlementsGridView({
  entitlements,
  onView,
  onEdit,
  onDelete,
  onCreateClick,
  summaryFilter = 'all',
  onSummaryFilterChange,
  onRefresh,
  isRefreshing,
  lastRefreshedAt,
}: AdminEntitlementsGridViewProps) {
  const [activeFilter, setActiveFilter] = useState('all');

  const filterOptions: QuickFilterOption[] = useMemo(
    () => [
      { value: 'all', label: 'All', count: entitlements.length },
      {
        value: 'feature',
        label: 'Features',
        count: entitlements.filter((e) => getEntitlementKind(e.value_type) === 'feature').length,
      },
      {
        value: 'limit',
        label: 'Limits',
        count: entitlements.filter((e) => getEntitlementKind(e.value_type) === 'limit').length,
      },
      { value: 'used', label: 'Used by plans', count: entitlements.filter((e) => e.planCount > 0).length },
      { value: 'unused', label: 'Unused', count: entitlements.filter((e) => e.planCount === 0).length },
    ],
    [entitlements]
  );

  const filteredEntitlements = useMemo(() => {
    let rows = entitlements;
    if (summaryFilter === 'feature' || summaryFilter === 'limit') {
      rows = rows.filter((e) => getEntitlementKind(e.value_type) === summaryFilter);
    } else if (summaryFilter === 'plan-linked') {
      rows = rows.filter((e) => e.planCount > 0);
    } else if (summaryFilter === 'boolean' || summaryFilter === 'number') {
      rows = rows.filter((e) => e.value_type === summaryFilter);
    }
    if (activeFilter === 'feature' || activeFilter === 'limit') {
      rows = rows.filter((e) => getEntitlementKind(e.value_type) === activeFilter);
    } else if (activeFilter === 'used') {
      rows = rows.filter((e) => e.planCount > 0);
    } else if (activeFilter === 'unused') {
      rows = rows.filter((e) => e.planCount === 0);
    }
    return rows;
  }, [entitlements, activeFilter, summaryFilter]);

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Name',
        minWidth: 200,
        flex: 1.2,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: { data: AdminEntitlementRow }) => {
          const row = params.data;
          const cap = findCapabilityByKey(row.key);
          return (
            <div className="py-1">
              <span className="font-semibold text-admin-foreground text-[13.5px] block">{row.name}</span>
              <code className="text-[10px] text-admin-muted font-mono">{row.key}</code>
            </div>
          );
        },
      },
      {
        colId: 'controls',
        headerName: 'What it controls',
        minWidth: 200,
        flex: 1.5,
        valueGetter: (p) => {
          const cap = findCapabilityByKey(p.data?.key);
          return cap?.shortDescription || p.data?.description || 'Custom configuration';
        },
        cellRenderer: (params: { value: string }) => (
          <span className="text-caption text-admin-muted line-clamp-2">{params.value}</span>
        ),
      },
      {
        field: 'value_type',
        headerName: 'Type',
        minWidth: 120,
        cellRenderer: (params: { data: AdminEntitlementRow }) => {
          const row = params.data;
          const supported = isSupportedCapabilityKey(row.key);
          return (
            <div className="flex flex-col gap-0.5">
              <Badge variant="neutral" size="sm">{getKindLabel(getEntitlementKind(row.value_type))}</Badge>
              <span className="text-[10px] text-admin-muted">{getTypeDisplayLabel(row.value_type)}</span>
              {!supported && <span className="text-[10px] text-admin-muted/70">Custom</span>}
            </div>
          );
        },
      },
      {
        field: 'planCount',
        headerName: 'Used by',
        minWidth: 100,
        cellRenderer: (params: { value: number }) => (
          <span className="text-caption text-admin-muted">
            {params.value > 0 ? `${params.value} plan${params.value !== 1 ? 's' : ''}` : '—'}
          </span>
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
        minWidth: 220,
        maxWidth: 260,
        sortable: false,
        filter: false,
        pinned: 'right',
        cellRenderer: (params: { data: AdminEntitlementRow }) => {
          const row = params.data;
          return (
            <div className="flex items-center justify-end gap-1 w-full">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onView(row); }} leftIcon={<Eye className="w-3.5 h-3.5" />}>View</Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(row); }} leftIcon={<Pencil className="w-3.5 h-3.5" />}>Edit</Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(row); }} leftIcon={<Trash2 className="w-3.5 h-3.5" />} className="text-admin-danger hover:text-admin-danger">Delete</Button>
            </div>
          );
        },
      },
    ],
    [onView, onEdit, onDelete]
  );

  return (
    <AdminDataGrid
      rowData={filteredEntitlements}
      columnDefs={columnDefs}
      enableSelection={false}
      enableColumnChooser={true}
      enableExport={true}
      exportFilename="propertyledge-entitlements"
      searchPlaceholder="Search entitlements..."
      onRowClick={onView}
      leftToolbarContent={
        <QuickFilterBar
          options={filterOptions}
          activeValue={activeFilter}
          onChange={(v) => {
            setActiveFilter(v);
            onSummaryFilterChange?.('all');
          }}
        />
      }
      rightToolbarContent={
        onCreateClick ? (
          <Button variant="primary" size="sm" onClick={onCreateClick}>Create entitlement</Button>
        ) : undefined
      }
      labelSingular="entitlement"
      labelPlural="entitlements"
      emptyTitle="No entitlements found"
      emptyDescription="Try another search or clear your filters."
      emptyIcon={<Key className="w-6 h-6" />}
      onRefresh={onRefresh}
      isRefreshing={isRefreshing}
      lastRefreshedAt={lastRefreshedAt}
    />
  );
}
