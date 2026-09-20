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
  Trash2,
  Layers,
  FileText,
  LayoutGrid,
  List,
  RefreshCw,
} from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import { Button, useToast } from '@/components/admin/ui';
import { AdminDataGrid, QuickFilterBar, QuickFilterOption, BulkAction } from '@/components/admin/data-grid';
import { ListPage, ListPageGrid } from '@/components/workspace';
import { HoverCardGrid, HoverEffectCardItem } from '@/components/ui/card-hover-effect';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';
import {
  ExpectedPaymentScheduleDTO,
  ExpectedPaymentStatus,
  ScheduleType,
} from '@/modules/finance/domain/types';
import { fetchExpectedSchedulesAction, deleteExpectedEntryAction } from '@/app/actions/schedules';
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
  const [tenantFilter, setTenantFilter] = useState<string>('All');
  const [scheduleNameFilter, setScheduleNameFilter] = useState<string>('All');

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [isMultiOpen, setIsMultiOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [selectedEntry, setSelectedEntry] = useState<ExpectedPaymentScheduleDTO | null>(null);
  const [selectedBulkSchedules, setSelectedBulkSchedules] = useState<ExpectedPaymentScheduleDTO[]>([]);

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
    fetchExpectedSchedulesAction({
      workspace_id: activeWorkspaceId || undefined,
      property_id: selectedProperty?.propertyId || undefined,
      status: 'all',
      schedule_type: 'all',
    })
      .then((res) => {
        if (res.success && res.data) {
          setSchedules(res.data);
        } else {
          toast({ title: 'Error', description: res.error || 'Failed to load schedules', variant: 'destructive' });
        }
      })
      .finally(() => setIsLoading(false));
  }, [activeWorkspaceId, selectedProperty, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived filter options
  const tenantOptions = useMemo(() => {
    const map = new Map<string, string>();
    schedules.forEach((s) => {
      if (s.tenant) {
        map.set(s.tenant.id, `${s.tenant.first_name} ${s.tenant.last_name}`);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [schedules]);

  const scheduleNameOptions = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach((s) => {
      if (s.schedule_name) set.add(s.schedule_name);
    });
    return Array.from(set);
  }, [schedules]);

  // Filtered schedules array
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (statusFilter !== 'All' && s.status !== statusFilter) return false;
      if (typeFilter !== 'all' && s.schedule_type !== typeFilter) return false;
      if (tenantFilter !== 'All') {
        const tId = s.tenant_id || s.tenant?.id;
        if (tId !== tenantFilter) return false;
      }
      if (scheduleNameFilter !== 'All' && s.schedule_name !== scheduleNameFilter) return false;
      return true;
    });
  }, [schedules, statusFilter, typeFilter, tenantFilter, scheduleNameFilter]);

  const handleBulkDeleteSchedules = async (selectedRows: ExpectedPaymentScheduleDTO[]) => {
    if (!selectedRows || selectedRows.length === 0) return;
    try {
      let successCount = 0;
      let failCount = 0;
      let lastError = '';

      for (const item of selectedRows) {
        const res = await deleteExpectedEntryAction(item.id);
        if (res.success) {
          successCount++;
        } else {
          failCount++;
          if (res.error) lastError = res.error;
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Bulk Delete Completed',
          description: `Successfully deleted ${successCount} schedule entry(ies)${failCount > 0 ? `, ${failCount} failed (${lastError})` : ''}.`,
        });
      } else {
        toast({
          title: 'Bulk Delete Failed',
          description: lastError || 'Could not delete selected schedule entries.',
          variant: 'destructive',
        });
      }
      loadData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete schedule entries.',
        variant: 'destructive',
      });
    }
  };

  const bulkActions = useMemo<BulkAction[]>(() => {
    return [
      {
        label: 'Allocate Payments',
        icon: <DollarSign className="h-4 w-4 text-[#008F83]" />,
        variant: 'primary',
        onClick: (selectedRows: ExpectedPaymentScheduleDTO[]) => {
          const eligible = selectedRows.filter((r) => r.status !== 'paid' && r.status !== 'cancelled');
          if (eligible.length === 0) {
            toast({
              title: 'No Pending Schedules Selected',
              description: 'Please select at least one pending or partially paid schedule item to allocate.',
              variant: 'destructive',
            });
            return;
          }
          setSelectedBulkSchedules(eligible);
          setIsMultiOpen(true);
        },
      },
    ];
  }, [toast]);

  // KPIs
  const kpis = useMemo(() => {
    const totalExpected = filteredSchedules.reduce((sum, s) => sum + s.amount, 0);
    const totalAllocated = filteredSchedules.reduce((sum, s) => sum + (s.total_allocated || 0), 0);
    const remainingBalance = filteredSchedules.reduce((sum, s) => sum + (s.remaining_amount ?? s.amount), 0);
    const overdueCount = filteredSchedules.filter((s) => s.status === 'overdue').length;

    return { totalExpected, totalAllocated, remainingBalance, overdueCount };
  }, [filteredSchedules]);

  // Context check: Hide Property column if scoped to a single property
  const isSinglePropertyView = Boolean(selectedProperty?.propertyId);

  // Table Column definitions in exact requested order
  const columnDefs = useMemo<ColDef<ExpectedPaymentScheduleDTO>[]>(() => {
    return [
      {
        headerName: 'Amount Due',
        field: 'amount',
        width: 130,
        cellRenderer: (params: any) => {
          const row: ExpectedPaymentScheduleDTO = params.data;
          if (!row) return null;
          const rem = row.remaining_amount ?? row.amount;
          return (
            <div className="py-1">
              <span className="font-bold text-slate-900 dark:text-white text-xs block">
                ${Number(row.amount || 0).toFixed(2)}
              </span>
              {row.status === 'partially_paid' && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-medium">
                  Rem: ${rem.toFixed(2)}
                </span>
              )}
            </div>
          );
        },
      },
      {
        headerName: 'Date',
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
              {params.value || '—'}
            </span>
          );
        },
      },
      {
        headerName: 'paid from',
        colId: 'paid_from',
        width: 120,
        valueGetter: (params: any) => {
          return params.data?.start_date || params.data?.lease?.start_date || '—';
        },
        cellRenderer: (params: any) => {
          return <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{params.value}</span>;
        },
      },
      {
        headerName: 'paid until',
        colId: 'paid_until',
        width: 120,
        valueGetter: (params: any) => {
          return params.data?.end_date || params.data?.lease?.end_date || '—';
        },
        cellRenderer: (params: any) => {
          return <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{params.value}</span>;
        },
      },
      {
        headerName: 'Actual Payment',
        colId: 'actual_payment',
        flex: 1.2,
        minWidth: 150,
        cellRenderer: (params: any) => {
          const row: ExpectedPaymentScheduleDTO = params.data;
          if (!row) return null;
          const allocs = row.allocations || [];
          if (allocs.length > 0) {
            const firstTx = allocs[0]?.transaction;
            const ref = firstTx?.reference || firstTx?.payment_method || 'Payment Linked';
            const date = firstTx?.transaction_date || '';
            return (
              <div className="py-1 min-w-0">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                  {ref}
                </span>
                {date && <span className="text-[10px] text-slate-400 block truncate">{date}</span>}
              </div>
            );
          }
          return <span className="text-slate-400 text-xs italic">Pending</span>;
        },
      },
      {
        headerName: 'Amount Paid',
        field: 'total_allocated',
        width: 130,
        cellRenderer: (params: any) => {
          const val = Number(params.value || 0);
          return (
            <span
              className={cn(
                'font-bold text-xs',
                val > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
              )}
            >
              ${val.toFixed(2)}
            </span>
          );
        },
      },
      {
        headerName: 'Paid?',
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
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold', conf.cls)}>
              {conf.label}
            </span>
          );
        },
      },
      {
        headerName: 'Comment',
        field: 'notes',
        flex: 1.2,
        minWidth: 140,
        cellRenderer: (params: any) => {
          const val = params.value;
          if (!val) return <span className="text-slate-400 text-xs italic">—</span>;
          return <span className="text-xs text-slate-600 dark:text-slate-300 truncate block" title={val}>{val}</span>;
        },
      },
      {
        headerName: 'Schedule Name',
        field: 'schedule_name',
        flex: 1.3,
        minWidth: 160,
        cellRenderer: (params: any) => {
          const row: ExpectedPaymentScheduleDTO = params.data;
          if (!row) return null;
          return (
            <div className="flex items-center gap-2 py-1">
              <div
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                  row.schedule_type === 'lease'
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                )}
              >
                {row.schedule_type === 'lease' ? <FileText className="h-3 w-3" /> : <Layers className="h-3 w-3" />}
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
        headerName: 'Lease / Tenant',
        colId: 'lease_tenant',
        flex: 1.2,
        minWidth: 150,
        valueGetter: (params: any) => {
          const row: ExpectedPaymentScheduleDTO = params.data;
          if (!row) return 'No Lease';
          return row.tenant ? `${row.tenant.first_name} ${row.tenant.last_name}` : 'Unassigned Tenant';
        },
        cellRenderer: (params: any) => {
          const row: ExpectedPaymentScheduleDTO = params.data;
          if (!row) return null;
          const tenantName = row.tenant ? `${row.tenant.first_name} ${row.tenant.last_name}` : null;

          return (
            <div className="py-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {tenantName || 'Unassigned Tenant'}
              </p>
            </div>
          );
        },
      },
      {
        headerName: 'Property',
        field: 'property',
        hide: true,
        valueGetter: (params: any) => params.data?.property?.name || 'Workspace Level',
        flex: 1.2,
        minWidth: 160,
        cellRenderer: (params: any) => {
          const row: ExpectedPaymentScheduleDTO = params.data;
          if (!row) return null;
          const propName = row.property?.name || 'Workspace Level';
          return (
            <div className="py-1">
              <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{propName}</p>
            </div>
          );
        },
      },
      {
        headerName: 'Actions',
        colId: 'actions',
        width: 140,
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
        onClick={() => {
          setSelectedBulkSchedules([]);
          setIsMultiOpen(true);
        }}
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
        <p className="text-[11px] text-slate-500 font-medium">{filteredSchedules.length} entries</p>
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
            rowData={filteredSchedules}
            columnDefs={columnDefs as any}
            loading={isLoading}
            labelSingular="schedule"
            labelPlural="schedules"
            enableSelection={true}
            bulkActions={bulkActions}
            onDeleteSelected={handleBulkDeleteSchedules}
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
                {/* Lease / Tenant Filter */}
                <select
                  value={tenantFilter}
                  onChange={(e) => setTenantFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="All">All Tenants / Leases</option>
                  {tenantOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                {/* Schedule Name Filter */}
                <select
                  value={scheduleNameFilter}
                  onChange={(e) => setScheduleNameFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="All">All Schedules</option>
                  {scheduleNameOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>

                {/* Schedule Type Filter */}
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
            rightToolbarContent={
              <QuickFilterBar
                options={filterOptions}
                activeValue={statusFilter}
                onChange={(val) => setStatusFilter(val)}
              />
            }
          />
        </ListPageGrid>
      ) : (
        <ListPageGrid>
          <HoverCardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSchedules.map((item, index) => {
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
                        <span>Tenant:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {item.tenant ? `${item.tenant.first_name} ${item.tenant.last_name}` : 'Unassigned Tenant'}
                        </span>
                      </div>
                      {!isSinglePropertyView && (
                        <div className="flex justify-between text-slate-500">
                          <span>Property:</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {item.property?.name || 'Workspace Level'}
                          </span>
                        </div>
                      )}
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
        expectedSchedules={selectedBulkSchedules.length > 0 ? selectedBulkSchedules : filteredSchedules}
        onClose={() => {
          setIsMultiOpen(false);
          setSelectedBulkSchedules([]);
        }}
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
