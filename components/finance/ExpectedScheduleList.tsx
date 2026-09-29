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
  Search,
  User,
  CheckCircle2,
  ChevronDown,
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
import { ScheduleTypeSelectModal } from './ScheduleTypeSelectModal';
import { LinkTransactionModal } from './LinkTransactionModal';
import { MultiAllocationModal } from './MultiAllocationModal';
import { EditScheduleModal } from './EditScheduleModal';
import { cn } from '@/lib/utils';

interface ExpectedScheduleListProps {
  initialSchedules?: ExpectedPaymentScheduleDTO[];
}

/**
 * Format date string safely to '27 Aug 2026'
 */
function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr || dateStr === '—') return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day)) {
      return `${day} ${months[monthIndex]} ${year}`;
    }
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  } catch {
    // Fallback to original
  }
  return dateStr;
}

/**
 * Extract 2-letter initials for tenant avatar
 */
function getTenantInitials(first?: string | null, last?: string | null): string {
  const f = (first || '').trim().charAt(0).toUpperCase();
  const l = (last || '').trim().charAt(0).toUpperCase();
  return f + l || 'T';
}

/**
 * Resolve tenant from schedule direct relation, lease.tenant, or lease.lease_tenants
 */
export function getScheduleTenant(row: ExpectedPaymentScheduleDTO | null | undefined) {
  if (!row) return null;
  if (row.tenant) return row.tenant;
  if (row.lease?.tenant) return row.lease.tenant;
  const primaryLt = row.lease?.lease_tenants?.find((lt: any) => lt.is_primary)?.tenant;
  if (primaryLt) return primaryLt;
  const fallbackLt = row.lease?.lease_tenants?.[0]?.tenant;
  if (fallbackLt) return fallbackLt;
  return null;
}

export function ExpectedScheduleList({ initialSchedules }: ExpectedScheduleListProps = {}) {
  const { toast } = useToast();
  const { selectedProperty } = usePropertyContext();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const activePropertyId = selectedProperty?.propertyId ?? null;
  const isInitialMount = React.useRef(true);

  const [schedules, setSchedules] = useState<ExpectedPaymentScheduleDTO[]>(initialSchedules || []);
  const [isLoading, setIsLoading] = useState(!initialSchedules);

  // View & Filter States
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<ScheduleType | 'all'>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('All');
  const [scheduleNameFilter, setScheduleNameFilter] = useState<string>('All');

  // Dialog States
  const [isTypeSelectOpen, setIsTypeSelectOpen] = useState(false);
  const [createScheduleType, setCreateScheduleType] = useState<ScheduleType>('lease');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [isMultiOpen, setIsMultiOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [selectedEntry, setSelectedEntry] = useState<ExpectedPaymentScheduleDTO | null>(null);
  const [selectedBulkSchedules, setSelectedBulkSchedules] = useState<ExpectedPaymentScheduleDTO[]>([]);

  const statusTabOptions = useMemo(
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
      property_id: activePropertyId || undefined,
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
  }, [activeWorkspaceId, activePropertyId, toast]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialSchedules && (!activePropertyId || activePropertyId === '')) {
        return;
      }
    }
    loadData();
  }, [loadData, activePropertyId, initialSchedules]);

  // Derived filter options
  const tenantOptions = useMemo(() => {
    const map = new Map<string, string>();
    schedules.forEach((s) => {
      const tenant = getScheduleTenant(s);
      if (tenant) {
        map.set(tenant.id, `${tenant.first_name} ${tenant.last_name}`);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [schedules]);

  const scheduleNameOptions = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach((s) => {
      if (s.schedule_name) {
        const cleanName = s.schedule_name.replace(/\s+#\d+$/, '').trim();
        if (cleanName) set.add(cleanName);
      }
    });
    return Array.from(set).sort();
  }, [schedules]);

  // Filtered schedules array
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (statusFilter !== 'All' && s.status !== statusFilter) return false;
      if (typeFilter !== 'all' && s.schedule_type !== typeFilter) return false;
      if (tenantFilter !== 'All') {
        const tenant = getScheduleTenant(s);
        const tId = s.tenant_id || tenant?.id || s.lease?.tenant_id;
        if (tId !== tenantFilter) return false;
      }
      if (scheduleNameFilter !== 'All') {
        const cleanName = (s.schedule_name || '').replace(/\s+#\d+$/, '').trim();
        if (cleanName !== scheduleNameFilter && s.schedule_name !== scheduleNameFilter) return false;
      }
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

  // Table Column definitions in exact requested order with refined presentation
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
          const basCode = row.tax_classification?.bas_code;
          return (
            <div className="py-1 flex flex-col justify-center">
              <div className="flex items-baseline gap-0.5">
                <span className="font-bold text-slate-900 dark:text-white text-xs tracking-tight">
                  ${Number(row.amount || 0).toFixed(2)}
                </span>
                {basCode && (
                  <sup className="ml-1 text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[#008F83] border border-slate-200 dark:border-slate-700 align-super">
                    {basCode}
                  </sup>
                )}
              </div>
              {row.gst_inclusive && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Inc ${Number(row.gst_amount || 0).toFixed(2)} GST
                </span>
              )}
              {row.status === 'partially_paid' && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold leading-tight">
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
          const formatted = formatDisplayDate(params.value);
          return (
            <span
              className={cn(
                'text-xs font-medium',
                isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'
              )}
            >
              {formatted}
            </span>
          );
        },
      },
      {
        headerName: 'Paid From',
        colId: 'paid_from',
        width: 120,
        valueGetter: (params: any) => {
          return params.data?.start_date || params.data?.lease?.start_date || '—';
        },
        cellRenderer: (params: any) => {
          const formatted = formatDisplayDate(params.value);
          return <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{formatted}</span>;
        },
      },
      {
        headerName: 'Paid Until',
        colId: 'paid_until',
        width: 120,
        valueGetter: (params: any) => {
          return params.data?.end_date || params.data?.lease?.end_date || '—';
        },
        cellRenderer: (params: any) => {
          const formatted = formatDisplayDate(params.value);
          return <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{formatted}</span>;
        },
      },
      {
        headerName: 'Actual Payment',
        colId: 'actual_payment',
        flex: 1.2,
        minWidth: 155,
        cellRenderer: (params: any) => {
          const row: ExpectedPaymentScheduleDTO = params.data;
          if (!row) return null;
          const allocs = row.allocations || [];
          if (allocs.length > 0) {
            const firstTx = allocs[0]?.transaction;
            const ref = firstTx?.reference || firstTx?.payment_method || 'Payment Linked';
            const date = firstTx?.transaction_date ? formatDisplayDate(firstTx.transaction_date) : '';
            return (
              <div className="py-1 min-w-0 flex flex-col justify-center">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate capitalize">
                  {ref.replace(/_/g, ' ')}
                </span>
                {date && <span className="text-[10.5px] text-slate-400 truncate">{date}</span>}
              </div>
            );
          }
          return <span className="text-slate-400 text-xs italic">Pending</span>;
        },
      },
      {
        headerName: 'Amount Paid',
        field: 'total_allocated',
        width: 120,
        cellRenderer: (params: any) => {
          const val = Number(params.value || 0);
          return (
            <span
              className={cn(
                'text-xs font-bold',
                val > 0 ? 'text-[#008F83] dark:text-teal-400' : 'text-slate-400 font-medium'
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
        width: 125,
        cellRenderer: (params: any) => {
          const status: ExpectedPaymentStatus = params.value;
          const map: Record<ExpectedPaymentStatus, { label: string; badgeCls: string; dotCls: string }> = {
            pending: {
              label: 'Pending',
              badgeCls: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40',
              dotCls: 'bg-amber-500',
            },
            partially_paid: {
              label: 'Partially Paid',
              badgeCls: 'bg-teal-50 text-teal-700 border-teal-200/60 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800/40',
              dotCls: 'bg-[#008F83]',
            },
            paid: {
              label: 'Paid',
              badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40',
              dotCls: 'bg-emerald-500',
            },
            overdue: {
              label: 'Overdue',
              badgeCls: 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40',
              dotCls: 'bg-rose-500',
            },
            cancelled: {
              label: 'Cancelled',
              badgeCls: 'bg-slate-100 text-slate-600 border-slate-200/60 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/60',
              dotCls: 'bg-slate-400',
            },
          };
          const conf = map[status] || map.pending;

          return (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border shadow-2xs',
                conf.badgeCls
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', conf.dotCls)} />
              <span>{conf.label}</span>
            </span>
          );
        },
      },
      {
        headerName: 'Comment',
        field: 'notes',
        flex: 1.1,
        minWidth: 140,
        cellRenderer: (params: any) => {
          const val = params.value;
          if (!val) return <span className="text-slate-400 text-xs italic">—</span>;
          return (
            <span className="text-xs text-slate-600 dark:text-slate-300 truncate block" title={val}>
              {val}
            </span>
          );
        },
      },
      {
        headerName: 'Schedule Name',
        field: 'schedule_name',
        flex: 1.3,
        minWidth: 180,
        cellRenderer: (params: any) => {
          const row: ExpectedPaymentScheduleDTO = params.data;
          if (!row) return null;
          return (
            <div className="flex items-center gap-2.5 py-1 min-w-0" title={row.schedule_name}>
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold border shadow-2xs',
                  row.schedule_type === 'lease'
                    ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40'
                    : 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/40'
                )}
              >
                {row.schedule_type === 'lease' ? <FileText className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 dark:text-white truncate text-xs">
                  {row.schedule_name?.replace(/\s+#\d+$/, '') || row.schedule_name}
                </p>
                <p className="text-[10.5px] text-slate-400 capitalize">{row.frequency} schedule</p>
              </div>
            </div>
          );
        },
      },
      {
        headerName: 'Lease / Tenant',
        colId: 'lease_tenant',
        flex: 1.2,
        minWidth: 160,
        valueGetter: (params: any) => {
          const row: ExpectedPaymentScheduleDTO = params.data;
          if (!row) return 'No Lease';
          const tenant = getScheduleTenant(row);
          return tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Unassigned Tenant';
        },
        cellRenderer: (params: any) => {
          const row: ExpectedPaymentScheduleDTO = params.data;
          if (!row) return null;
          const tenant = getScheduleTenant(row);
          const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}` : null;
          const initials = tenant ? getTenantInitials(tenant.first_name, tenant.last_name) : null;

          return (
            <div className="flex items-center gap-2 py-1 min-w-0">
              {tenantName ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs">
                    {initials}
                  </div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{tenantName}</p>
                </>
              ) : (
                <span className="text-xs text-slate-400 italic">Unassigned Tenant</span>
              )}
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
        width: 130,
        cellRenderer: (params: any) => {
          const row: ExpectedPaymentScheduleDTO = params.data;
          if (!row) return null;
          const isPaid = row.status === 'paid';

          return (
            <div className="flex items-center gap-1.5 py-1">
              {!isPaid && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEntry(row);
                    setIsLinkOpen(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#008F83]/10 px-2.5 py-1 text-[11px] font-bold text-[#008F83] hover:bg-[#008F83]/20 border border-[#008F83]/20 transition-all shadow-2xs"
                  title="Link or record payment"
                >
                  <DollarSign className="h-3 w-3" />
                  <span>Process</span>
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEntry(row);
                  setIsEditOpen(true);
                }}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
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
    <div className="flex items-center gap-2.5">
      {/* View Mode Toggle */}
      <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-0.5 shadow-2xs">
        <button
          type="button"
          onClick={() => setViewMode('table')}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            viewMode === 'table'
              ? 'bg-[#008F83] text-white shadow-2xs'
              : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
          )}
          title="Table View"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setViewMode('grid')}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            viewMode === 'grid'
              ? 'bg-[#008F83] text-white shadow-2xs'
              : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
        leftIcon={<Layers className="h-4 w-4 text-slate-500" />}
        className="rounded-xl border-slate-200/80 dark:border-slate-800 font-semibold shadow-2xs hover:bg-slate-50"
      >
        Multi-Allocate
      </Button>

      <Button
        size="sm"
        onClick={() => setIsTypeSelectOpen(true)}
        leftIcon={<Plus className="h-4 w-4" />}
        className="bg-[#008F83] hover:bg-[#007A70] text-white font-bold rounded-xl shadow-xs transition-all"
      >
        Create Schedule
      </Button>
    </div>
  );

  // Summary KPI Cards Header (Exact match with reference SaaS design)
  const summaryHeader = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      {/* Card 1: Total Expected */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Expected</span>
          <div className="w-8 h-8 rounded-xl bg-[#008F83]/10 border border-[#008F83]/15 flex items-center justify-center text-[#008F83] shrink-0">
            <Calendar className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          ${kpis.totalExpected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400 font-semibold bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 rounded-md border border-teal-100 dark:border-teal-900/40">
            {filteredSchedules.length} entries
          </span>
          <span>in active view</span>
        </div>
      </div>

      {/* Card 2: Total Collected */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Collected</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
          ${kpis.totalAllocated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-[11px] text-slate-500 font-medium">Linked via actual transactions</p>
      </div>

      {/* Card 3: Remaining Due */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Remaining Due</span>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
          ${kpis.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-[11px] text-slate-500 font-medium">Pending payment obligations</p>
      </div>

      {/* Card 4: Overdue Entries */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Overdue Entries</span>
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/15 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <AlertCircle className="h-4 w-4" />
          </div>
        </div>
        <p
          className={cn(
            'text-2xl font-bold tracking-tight',
            kpis.overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
          )}
        >
          {kpis.overdueCount}
        </p>
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
              <div className="flex flex-wrap items-center gap-2">
                {/* Lease / Tenant Filter */}
                <div className="relative">
                  <select
                    value={tenantFilter}
                    onChange={(e) => setTenantFilter(e.target.value)}
                    className="h-10 pl-3 pr-8 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#008F83]/20 focus:border-[#008F83] appearance-none cursor-pointer transition-all"
                  >
                    <option value="All">All Tenants / Leases</option>
                    {tenantOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Schedule Name Filter */}
                <div className="relative">
                  <select
                    value={scheduleNameFilter}
                    onChange={(e) => setScheduleNameFilter(e.target.value)}
                    className="h-10 pl-3 pr-8 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#008F83]/20 focus:border-[#008F83] appearance-none cursor-pointer transition-all"
                  >
                    <option value="All">All Schedules</option>
                    {scheduleNameOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Schedule Type Filter */}
                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    className="h-10 pl-3 pr-8 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#008F83]/20 focus:border-[#008F83] appearance-none cursor-pointer transition-all"
                  >
                    <option value="all">All Types</option>
                    <option value="lease">Lease-Based Only</option>
                    <option value="independent">Independent Only</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Refresh Action */}
                <button
                  type="button"
                  onClick={loadData}
                  className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-xs transition-all"
                  title="Refresh Data"
                >
                  <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin text-[#008F83]')} />
                </button>
              </div>
            }
            rightToolbarContent={
              <div className="flex items-center gap-2">
                {/* Status Segmented Pill Tabs */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                  {statusTabOptions.map((opt) => {
                    const isActive = statusFilter === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setStatusFilter(opt.value)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                          isActive
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
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
                  <div className="p-5 space-y-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-xl font-bold text-xs border shadow-2xs',
                            item.schedule_type === 'lease'
                              ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400'
                              : 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/40 dark:text-purple-400'
                          )}
                        >
                          {item.schedule_type === 'lease' ? <FileText className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                            {item.schedule_name?.replace(/\s+#\d+$/, '') || item.schedule_name}
                          </h3>
                          <p className="text-[11px] text-slate-400 capitalize">{item.frequency} schedule</p>
                        </div>
                      </div>

                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase border shadow-2xs',
                          item.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                            : item.status === 'partially_paid'
                            ? 'bg-teal-50 text-teal-700 border-teal-200/60'
                            : item.status === 'overdue'
                            ? 'bg-rose-50 text-rose-700 border-rose-200/60'
                            : 'bg-amber-50 text-amber-700 border-amber-200/60'
                        )}
                      >
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Due Date:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {formatDisplayDate(item.due_date)}
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
                        <div className="text-right">
                          <span className="font-bold text-slate-900 dark:text-white inline-flex items-baseline">
                            ${item.amount.toFixed(2)}
                            {item.tax_classification?.bas_code && (
                              <sup className="ml-1 text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[#008F83] border border-slate-200 dark:border-slate-700">
                                {item.tax_classification.bas_code}
                              </sup>
                            )}
                          </span>
                          {item.gst_inclusive && (
                            <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">
                              (Inc ${Number(item.gst_amount || 0).toFixed(2)} GST)
                            </span>
                          )}
                        </div>
                      </div>
                      {item.tax_classification && (
                        <div className="flex justify-between text-slate-500">
                          <span>Tax Classification:</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {item.tax_classification.bas_code ? `[${item.tax_classification.bas_code}] ` : ''}{item.tax_classification.name}
                          </span>
                        </div>
                      )}
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
                          className="bg-[#008F83] hover:bg-[#007A70] text-white font-bold rounded-xl"
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
                        className="rounded-xl"
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
      <ScheduleTypeSelectModal
        isOpen={isTypeSelectOpen}
        onClose={() => setIsTypeSelectOpen(false)}
        onSelectType={(type) => {
          setIsTypeSelectOpen(false);
          setCreateScheduleType(type);
          setIsCreateOpen(true);
        }}
      />

      <CreateScheduleModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadData}
        defaultPropertyId={selectedProperty?.propertyId}
        defaultScheduleType={createScheduleType}
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
