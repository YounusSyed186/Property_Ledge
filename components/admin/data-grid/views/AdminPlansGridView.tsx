'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ColDef } from 'ag-grid-community';
import { AdminDataGrid, QuickFilterBar, QuickFilterOption } from '@/components/admin/data-grid';
import { Button } from '@/components/admin/ui';
import { Layers, Edit3, Plus } from 'lucide-react';

interface AdminPlansGridViewProps {
  plans: any[];
  onToggleStatus: (planId: string, currentStatus: string) => Promise<void>;
  onCreateClick?: () => void;
}

export function AdminPlansGridView({ plans, onToggleStatus, onCreateClick }: AdminPlansGridViewProps) {
  const [activeFilter, setActiveFilter] = useState('all');

  const filterOptions: QuickFilterOption[] = useMemo(
    () => [
      { value: 'all', label: 'All Plans', count: plans.length },
      {
        value: 'active',
        label: 'Active',
        count: plans.filter((p) => p.status === 'active').length,
      },
      {
        value: 'inactive',
        label: 'Inactive',
        count: plans.filter((p) => p.status === 'inactive').length,
      },
    ],
    [plans]
  );

  const filteredPlans = useMemo(() => {
    if (activeFilter === 'all') return plans;
    return plans.filter((p) => p.status === activeFilter);
  }, [plans, activeFilter]);

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Plan Name',
        minWidth: 160,
        flex: 1.2,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => (
          <span className="font-semibold text-admin-foreground text-[13.5px]">
            {params.value}
          </span>
        ),
      },
      {
        field: 'slug',
        headerName: 'Slug',
        minWidth: 130,
        cellRenderer: 'codeCell',
        filter: 'agTextColumnFilter',
      },
      {
        field: 'price_cents',
        headerName: 'Price',
        minWidth: 120,
        filter: 'agNumberColumnFilter',
        valueGetter: (params: any) => (params.data?.price_cents ? params.data.price_cents / 100 : 0),
        cellRenderer: (params: any) => {
          const cents = params.data?.price_cents || 0;
          if (cents === 0) {
            return <span className="font-semibold text-admin-foreground">Free</span>;
          }
          return (
            <span className="font-semibold text-admin-foreground font-mono text-[13px]">
              ${(cents / 100).toFixed(2)} AUD
            </span>
          );
        },
      },
      {
        field: 'billing_interval',
        headerName: 'Interval',
        minWidth: 110,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => (
          <span className="text-caption font-semibold capitalize text-admin-muted bg-admin-surface-subtle px-2 py-0.5 rounded border border-admin-border-subtle">
            {params.value}
          </span>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 120,
        cellRenderer: 'statusCell',
        filter: 'agTextColumnFilter',
      },
      {
        headerName: 'Actions',
        colId: 'actions',
        minWidth: 180,
        maxWidth: 200,
        sortable: false,
        filter: false,
        pinned: 'right',
        cellRenderer: (params: any) => {
          const plan = params.data;
          return (
            <div className="flex items-center justify-end gap-1.5 w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStatus(plan.id, plan.status);
                }}
              >
                {plan.status === 'active' ? 'Deactivate' : 'Activate'}
              </Button>
              <Link href={`/admin/plans/${plan.id}`} onClick={(e) => e.stopPropagation()}>
                <Button variant="secondary" size="sm" leftIcon={<Edit3 className="w-3.5 h-3.5" />}>
                  Entitlements
                </Button>
              </Link>
            </div>
          );
        },
      },
    ],
    [onToggleStatus]
  );

  return (
    <AdminDataGrid
      rowData={filteredPlans}
      columnDefs={columnDefs}
      enableSelection={true}
      enableColumnChooser={false}
      enableExport={true}
      exportFilename="propertyledge-plans"
      searchPlaceholder="Search plans by name or slug..."
      leftToolbarContent={
        <QuickFilterBar
          options={filterOptions}
          activeValue={activeFilter}
          onChange={setActiveFilter}
        />
      }
      rightToolbarContent={
        onCreateClick ? (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={onCreateClick}
          >
            Create Plan
          </Button>
        ) : undefined
      }
      labelSingular="plan"
      labelPlural="plans"
      emptyTitle="No plans found"
      emptyDescription="Create your first subscription plan to begin offering tiers."
      emptyIcon={<Layers className="w-6 h-6" />}
    />
  );
}
