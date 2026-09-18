'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Pencil,
  Layers,
  FileText,
  LayoutGrid,
  List,
  RefreshCw,
} from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import { Button, useToast } from '@/components/admin/ui';
import { AdminDataGrid, QuickFilterBar, QuickFilterOption } from '@/components/admin/data-grid';
import { ListPage, ListPageGrid } from '@/components/workspace';
import { HoverCardGrid, HoverEffectCardItem } from '@/components/ui/card-hover-effect';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';
import {
  ExpectedPaymentScheduleDTO,
  ExpectedPaymentStatus,
  ScheduleType,
} from '@/modules/finance/domain/types';
import { fetchExpectedSchedulesAction } from '@/app/actions/schedules';
import { CreateScheduleModal } from './CreateScheduleModal';
import { LinkTransactionModal } from './LinkTransactionModal';
import { MultiAllocationModal } from './MultiAllocationModal';
import { EditScheduleModal } from './EditScheduleModal';
import { cn } from '@/lib/utils';

export function ExpectedScheduleList() {
  const { toast } = useToast();
  const { selectedProperty } = usePropertyContext();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const [schedules, setSchedules] = useState<ExpectedPaymentScheduleDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View & Filter States
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<ScheduleType | 'all'>('all');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [isMultiOpen, setIsMultiOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [selectedEntry, setSelectedEntry] = useState<ExpectedPaymentScheduleDTO | null>(null);

  const filterOptions = useMemo<QuickFilterOption[]>(
    () => [
      { label: 'All', value: 'All' },
      { label: 'Pending', value: 'pending' },
      { label: 'Partially Paid', value: 'partially_paid' },
      { label: 'Paid', value: 'paid' },
      { label: 'Overdue', value: 'overdue' },
    ],
    []
  );

  const loadData = useCallback(() => {
    setIsLoading(true);
    const apiStatus = statusFilter === 'All' ? 'all' : (statusFilter as ExpectedPaymentStatus);
    fetchExpectedSchedulesAction({
      workspace_id: activeWorkspaceId || undefined,
      property_id: selectedProperty?.propertyId || undefined,
      status: apiStatus,
      schedule_type: typeFilter,
    })
      .then((res) => {
        if (res.success && res.data) {
          setSchedules(res.data);
        } else {
          toast({ title: 'Error', description: res.error || 'Failed to load schedules', variant: 'destructive' });
        }
      })
      .finally(() => setIsLoading(false));
  }, [activeWorkspaceId, selectedProperty, statusFilter, typeFilter, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // KPIs
  const kpis = useMemo(() => {
    const totalExpected = schedules.reduce((sum, s) => sum + s.amount, 0);
    const totalAllocated = schedules.reduce((sum, s) => sum + (s.total_allocated || 0), 0);
    const remainingBalance = schedules.reduce((sum, s) => sum + (s.remaining_amount || s.amount), 0);
    const overdueCount = schedules.filter((s) => s.status === 'overdue').length;

    return { totalExpected, totalAllocated, remainingBalance, overdueCount };
  }, [schedules]);

  // Table Column definitions
  const columnDefs = useMemo<ColDef<ExpectedPaymentScheduleDTO>[]>(() => {
    return [
      {
        headerName: 'Schedule Name',
        field: 'schedule_name',
        flex: 1.5,
        minWidth: 200,
        cellRenderer: (params: any) => {
          const row: ExpectedPaymentScheduleDTO = params.data;
          if (!row) return null;
          return (
            <div className="flex items-center gap-2 py-1">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                  row.schedule_type === 'lease'
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                )}
              >
                {row.schedule_type === 'lease' ? <FileText className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white truncate text-xs">{row.schedule_name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{row.frequency} schedule</p>
              </div>
            </div>
          );
        },
      },
      {
        headerName: 'Due Date',
        field: 'due_date',
        width: 120,
        cellRenderer: (params: any) => {
          if (!params.data) return null;
          const isOverdue = params.data.status === 'overdue';
          return (
            <span
              className={cn(
                'font-mono text-xs font-medium',
                isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'
              )}
            >
              {params.value}
            </span>
          );
        },
      },
      {
        headerName: 'Type',
        field: 'schedule_type',
        width: 130,
        cellRenderer: (params: any) => {
          const type = params.value;
          return (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize',
                type === 'lease'
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
              )}
            >
              {type === 'lease' ? 'Lease-Based' : 'Independent'}
            </span>
          );
        },
      },
      {
        headerName: 'Property',
        field: 'property',
        valueGetter: (params: any) => params.data?.property?.name || 'Workspace Level',
        flex: 1.2,
        minWidth: 160,
        cellRenderer: (params: any) => {
          const row: ExpectedPaymentScheduleDTO = params.data;
          if (!row) return null;
          const propName = row.property?.name || 'Workspace Level';
          const tenantName = row.tenant ? `${row.tenant.first_name} ${row.tenant.last_name}` : null;
          return (
            <div className="py-1">
              <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{propName}</p>
              {tenantName && <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Tenant: {tenantName}</p>}
            </div>
          );
        },
      },
      {
        headerName: 'Expected ($)',
        field: 'amount',
        width: 120,
        cellRenderer: (params: any) => {
          return <span className="font-semibold text-slate-900 dark:text-white text-xs">${Number(params.value || 0).toFixed(2)}</span>;
        },
      },
      {
        headerName: 'Paid / Allocated',
        field: 'total_allocated',
        width: 140,
        cellRenderer: (params: any) => {
          const val = Number(params.value || 0);
          return (
            <span
              className={cn(
                'font-semibold text-xs',
                val > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
              )}
            >
              ${val.toFixed(2)}
            </span>
          );
        },
      },
      {
        headerName: 'Remaining ($)',
        field: 'remaining_amount',
        width: 130,
        cellRenderer: (params: any) => {
          const val = Number(params.value ?? params.data?.amount ?? 0);
          return (
            <span
              className={cn(
                'font-bold text-xs',
                val > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
              )}
            >
              ${val.toFixed(2)}
            </span>
          );
        },
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 130,
        cellRenderer: (params: any) => {
          const status: ExpectedPaymentStatus = params.value;
          const map: Record<ExpectedPaymentStatus, { label: string; cls: string }> = {
            pending: { label: 'Pending', cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
            partially_paid: { label: 'Partially Paid', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
            paid: { label: 'Paid', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
            overdue: { label: 'Overdue', cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
            cancelled: { label: 'Cancelled', cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400' },
          };
          const conf = map[status] || map.pending;

          return (
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold', conf.cls)}>
              {conf.label}
            </span>
          );
        },
      },
      {
        headerName: 'Actions',
        colId: 'actions',
        width: 160,
        cellRenderer: (params: any) => {
          const row: ExpectedPaymentScheduleDTO = params.data;
          if (!row) return null;
          const isPaid = row.status === 'paid';

          return (
            <div className="flex items-center gap-1.5 py-1">
              {!isPaid && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEntry(row);
                    setIsLinkOpen(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#008F83]/10 px-2.5 py-1 text-[11px] font-bold text-[#008F83] hover:bg-[#008F83]/20 transition-colors"
                  title="Link or record payment"
                >
                  <DollarSign className="h-3 w-3" />
                  Process
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEntry(row);
                  setIsEditOpen(true);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Edit Entry"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        },
      },
    ];
  }, []);

  // Top Page Actions
  const pageActions = (
    <div className="flex items-center gap-2">
      {/* View Mode Toggle */}
      <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-0.5">
        <button
          onClick={() => setViewMode('table')}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            viewMode === 'table'
              ? 'bg-[#008F83] text-white shadow-2xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          )}
          title="Table View"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => setViewMode('grid')}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            viewMode === 'grid'
              ? 'bg-[#008F83] text-white shadow-2xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          )}
          title="Grid View"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsMultiOpen(true)}
        leftIcon={<Layers className="h-4 w-4" />}
      >
        Multi-Allocate
      </Button>

      <Button
        size="sm"
        onClick={() => setIsCreateOpen(true)}
        leftIcon={<Plus className="h-4 w-4" />}
        className="bg-[#008F83] hover:bg-[#007A70] text-white font-bold"
      >
        Create Schedule
      </Button>
    </div>
  );

  // Summary KPIs Header
  const summaryHeader = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1 shadow-2xs">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span>Total Expected</span>
          <Calendar className="h-4 w-4 text-blue-500" />
        </div>
        <p className="text-xl font-black text-slate-900 dark:text-white">${kpis.totalExpected.toFixed(2)}</p>
        <p className="text-[11px] text-slate-500 font-medium">{schedules.length} generated entries</p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1 shadow-2xs">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span>Total Collected</span>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </div>
        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
          ${kpis.totalAllocated.toFixed(2)}
        </p>
        <p className="text-[11px] text-slate-500 font-medium">Linked via actual transactions</p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1 shadow-2xs">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span>Remaining Due</span>
          <Clock className="h-4 w-4 text-amber-500" />
        </div>
        <p className="text-xl font-black text-amber-600 dark:text-amber-400">
          ${kpis.remainingBalance.toFixed(2)}
        </p>
        <p className="text-[11px] text-slate-500 font-medium">Pending payment obligations</p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1 shadow-2xs">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span>Overdue Entries</span>
          <AlertCircle className="h-4 w-4 text-rose-500" />
        </div>
        <p className="text-xl font-black text-rose-600 dark:text-rose-400">{kpis.overdueCount}</p>
        <p className="text-[11px] text-slate-500 font-medium">Entries past due date</p>
      </div>
    </div>
  );

  return (
    <ListPage
      title="Payment Schedules"
      description="Manage expected rent and independent recurring payment schedules with dynamic transaction allocations."
      actions={pageActions}
      summary={summaryHeader}
      fill
    >
      {viewMode === 'table' ? (
        <ListPageGrid>
          <AdminDataGrid
            rowData={schedules}
            columnDefs={columnDefs as any}
            loading={isLoading}
            labelSingular="schedule"
            labelPlural="schedules"
            onRowClick={(row) => {
              setSelectedEntry(row);
              setIsEditOpen(true);
            }}
            getRowId={(p) => p.data.id}
            enableColumnChooser
            enableExport
            exportFilename="payment-schedules-export"
            searchPlaceholder="Search schedules..."
            leftToolbarContent={
              <div className="flex items-center gap-2">
                <QuickFilterBar
                  options={filterOptions}
                  activeValue={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                />

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="lease">Lease-Based Only</option>
                  <option value="independent">Independent Only</option>
                </select>

                <button
                  onClick={loadData}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Refresh Data"
                >
                  <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                </button>
              </div>
            }
          />
        </ListPageGrid>
      ) : (
        <ListPageGrid>
          <HoverCardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map((item, index) => {
              const rem = item.remaining_amount ?? item.amount;
              return (
                <HoverEffectCardItem key={item.id} index={index}>
                  <div className="p-5 space-y-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-xl font-bold text-xs',
                            item.schedule_type === 'lease'
                              ? 'bg-blue-500/10 text-blue-600'
                              : 'bg-purple-500/10 text-purple-600'
                          )}
                        >
                          {item.schedule_type === 'lease' ? <FileText className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">{item.schedule_name}</h3>
                          <p className="text-[11px] text-slate-500 capitalize">{item.frequency} schedule</p>
                        </div>
                      </div>

                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase',
                          item.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : item.status === 'partially_paid'
                            ? 'bg-amber-500/10 text-amber-600'
                            : item.status === 'overdue'
                            ? 'bg-rose-500/10 text-rose-600'
                            : 'bg-blue-500/10 text-blue-600'
                        )}
                      >
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Due Date:</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {item.due_date}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Property:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {item.property?.name || 'Workspace Level'}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Expected Amount:</span>
                        <span className="font-bold text-slate-900 dark:text-white">${item.amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Remaining Due:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">${rem.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      {item.status !== 'paid' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedEntry(item);
                            setIsLinkOpen(true);
                          }}
                          className="bg-[#008F83] hover:bg-[#007A70] text-white font-bold"
                        >
                          <DollarSign className="mr-1 h-3.5 w-3.5" />
                          Process Payment
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEntry(item);
                          setIsEditOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </HoverEffectCardItem>
              );
            })}
          </HoverCardGrid>
        </ListPageGrid>
      )}

      {/* Modals & Drawers */}
      <CreateScheduleModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadData}
        defaultPropertyId={selectedProperty?.propertyId}
      />

      <LinkTransactionModal
        isOpen={isLinkOpen}
        expectedPayment={selectedEntry}
        onClose={() => {
          setIsLinkOpen(false);
          setSelectedEntry(null);
        }}
        onSuccess={loadData}
      />

      <MultiAllocationModal
        isOpen={isMultiOpen}
        expectedSchedules={schedules}
        onClose={() => setIsMultiOpen(false)}
        onSuccess={loadData}
      />

      <EditScheduleModal
        isOpen={isEditOpen}
        expectedPayment={selectedEntry}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedEntry(null);
        }}
        onSuccess={loadData}
      />
    </ListPage>
  );
}
