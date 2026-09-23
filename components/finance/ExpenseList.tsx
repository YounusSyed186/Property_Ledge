'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign,
  TrendingDown,
  Clock,
  Plus,
  Pencil,
  Trash2,
  List,
  LayoutGrid,
  Receipt,
  Building,
  CheckCircle2,
  AlertCircle,
  Tag,
  FileText,
  User,
  Link2,
  Layers,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import { Button, useToast } from '@/components/admin/ui';
import { AdminDataGrid, QuickFilterOption, BulkAction } from '@/components/admin/data-grid';
import { ListPage, ListPageGrid } from '@/components/workspace';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';
import {
  ExpenseDTO,
  CategoryDTO,
  ExpenseFilterParams,
  ExpenseStatus,
} from '@/modules/finance/domain/types';
import {
  fetchExpensesAction,
  deleteExpenseAction,
  unlinkExpenseTransactionAction,
} from '@/app/actions/expenses';
import { getDropdownOptions, prewarmOptionsCache } from '@/lib/cache/optionsCache';
import { ExpenseModal } from './ExpenseModal';
import { ExpenseDetailModal } from './ExpenseDetailModal';
import { LinkExpenseTransactionModal } from './LinkExpenseTransactionModal';
import { MultiExpenseAllocationModal } from './MultiExpenseAllocationModal';
import { formatCurrency } from '@/lib/format/currency';
import { formatAuDisplayDate } from '@/lib/format/australian-time';
import { cn } from '@/lib/utils';

interface ExpenseListProps {
  initialExpenses?: ExpenseDTO[];
  initialCategories?: CategoryDTO[];
}

export function ExpenseList({ initialExpenses, initialCategories }: ExpenseListProps = {}) {
  const { toast } = useToast();
  const { selectedProperty, availableProperties } = usePropertyContext();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const activePropertyId = selectedProperty?.propertyId ?? null;
  const isInitialMount = React.useRef(true);

  // Data State
  const [expenses, setExpenses] = useState<ExpenseDTO[]>(initialExpenses || []);
  const [categories, setCategories] = useState<CategoryDTO[]>(initialCategories || []);
  const [properties, setProperties] = useState<any[]>(availableProperties || []);
  const [isLoading, setIsLoading] = useState(!initialExpenses);

  // View & Filter States
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [statusFilter, setStatusFilter] = useState<'All' | ExpenseStatus>('All');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals & Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMultiOpen, setIsMultiOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseDTO | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<ExpenseDTO | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseDTO | null>(null);
  const [expenseForLinking, setExpenseForLinking] = useState<ExpenseDTO | null>(null);
  const [selectedBulkExpenses, setSelectedBulkExpenses] = useState<ExpenseDTO[]>([]);

  // Sync available properties when context updates
  useEffect(() => {
    if (availableProperties && availableProperties.length > 0) {
      setProperties(availableProperties);
    }
  }, [availableProperties]);

  // Load Expenses Data
  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const filterParams: ExpenseFilterParams = {
        property_id: activePropertyId || undefined,
      };

      const res = await fetchExpensesAction(filterParams);
      if (res.success && res.data) {
        setExpenses(res.data);
      } else {
        setExpenses([]);
      }
    } catch (err: any) {
      console.error('Failed to load expenses:', err);
      toast({
        title: 'Error Loading Expenses',
        description: err.message || 'Could not fetch expense records.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [activePropertyId, toast]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialExpenses && (!activePropertyId || activePropertyId === '')) {
        return;
      }
    }
    loadExpenses();
  }, [loadExpenses, activePropertyId, initialExpenses]);

  // Filter options for Quick Filter Bar
  const filterOptions = useMemo<QuickFilterOption[]>(
    () => [
      { label: 'All', value: 'All' },
      { label: 'Pending', value: 'pending' },
      { label: 'Partially Paid', value: 'partially_paid' },
      { label: 'Paid', value: 'paid' },
    ],
    []
  );

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (activePropertyId && exp.property_id !== activePropertyId) {
        return false;
      }
      if (statusFilter !== 'All' && exp.status !== statusFilter) {
        return false;
      }
      if (selectedCategoryFilter !== 'All' && exp.transaction_category_id !== selectedCategoryFilter) {
        return false;
      }
      if (startDate && exp.expense_date < startDate) {
        return false;
      }
      if (endDate && exp.expense_date > endDate) {
        return false;
      }
      return true;
    });
  }, [expenses, activePropertyId, statusFilter, selectedCategoryFilter, startDate, endDate]);

  // Bulk Delete Handler
  const handleBulkDeleteExpenses = async (selectedRows: ExpenseDTO[]) => {
    if (!selectedRows || selectedRows.length === 0) return;
    try {
      let successCount = 0;
      let failCount = 0;
      let lastError = '';

      for (const item of selectedRows) {
        const res = await deleteExpenseAction(item.id);
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
          description: `Successfully deleted ${successCount} expense record(s)${failCount > 0 ? `, ${failCount} failed (${lastError})` : ''}.`,
          variant: 'success',
        });
      } else {
        toast({
          title: 'Bulk Delete Failed',
          description: lastError || 'Could not delete selected expenses.',
          variant: 'destructive',
        });
      }
      loadExpenses();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete expenses.',
        variant: 'destructive',
      });
    }
  };

  const bulkActions = useMemo<BulkAction[]>(() => {
    return [
      {
        label: 'Link to Ledger',
        icon: <Link2 className="h-4 w-4 text-[#008F83]" />,
        variant: 'primary',
        onClick: (selectedRows: ExpenseDTO[]) => {
          const eligible = selectedRows.filter((r) => r.status !== 'paid' && r.status !== 'cancelled');
          if (eligible.length === 0) {
            toast({
              title: 'No Pending Expenses Selected',
              description: 'Please select an unpaid or partially paid expense to link.',
              variant: 'destructive',
            });
            return;
          }
          setExpenseForLinking(eligible[0]);
        },
      },
    ];
  }, [toast]);

  // Unlink Allocation Handler
  const handleUnlinkAllocation = async (allocationId: string) => {
    try {
      const res = await unlinkExpenseTransactionAction(allocationId);
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to unlink transaction');
      }

      toast({
        title: 'Transaction Unlinked',
        description: 'Removed transaction allocation from this expense.',
        variant: 'success',
      });

      setSelectedExpense(res.data);
      loadExpenses();
    } catch (err: any) {
      console.error('Unlink error:', err);
      toast({
        title: 'Unlink Failed',
        description: err.message || 'Could not unlink transaction.',
        variant: 'destructive',
      });
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    const totalIncurred = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalAllocated = filteredExpenses.reduce((sum, e) => sum + Number(e.total_allocated || 0), 0);
    const remainingBalance = filteredExpenses.reduce((sum, e) => {
      const rem = e.remaining_amount !== undefined ? e.remaining_amount : Math.max(0, e.amount - (e.total_allocated || 0));
      return sum + rem;
    }, 0);
    const pendingCount = filteredExpenses.filter((e) => e.status === 'pending' || e.status === 'partially_paid').length;

    return { totalIncurred, totalAllocated, remainingBalance, pendingCount };
  }, [filteredExpenses]);

  // AG-Grid Column Definitions
  const columnDefs = useMemo<ColDef<ExpenseDTO>[]>(() => {
    const cols: ColDef<ExpenseDTO>[] = [
      {
        headerName: 'Amount Due',
        field: 'amount',
        width: 130,
        sortable: true,
        cellRenderer: (params: any) => {
          const row = params.data as ExpenseDTO;
          if (!row) return null;
          const rem = row.remaining_amount ?? Math.max(0, row.amount - (row.total_allocated || 0));
          return (
            <div className="py-1">
              <span className="font-bold text-slate-900 dark:text-white text-xs block font-mono">
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
        field: 'expense_date',
        width: 120,
        sortable: true,
        cellRenderer: (params: any) => {
          if (!params.data) return null;
          return (
            <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
              {params.value || '—'}
            </span>
          );
        },
      },
      {
        headerName: 'Category',
        field: 'category.name' as any,
        width: 150,
        cellRenderer: (params: any) => {
          const name = params.data?.category?.name || 'Operating Expense';
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <Tag className="w-3 h-3" />
              {name}
            </span>
          );
        },
      },
      {
        headerName: 'Payee / Description',
        field: 'description',
        flex: 1.3,
        minWidth: 160,
        cellRenderer: (params: any) => {
          const row = params.data as ExpenseDTO;
          if (!row) return null;
          return (
            <div className="py-1 min-w-0">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                {row.description || row.category?.name || 'Expense'}
              </span>
              {row.vendor_name && (
                <span className="text-[10px] text-slate-400 block truncate">
                  Payee: {row.vendor_name}
                </span>
              )}
            </div>
          );
        },
      },
      {
        headerName: 'Property',
        field: 'property.name' as any,
        width: 150,
        hide: Boolean(activePropertyId),
        cellRenderer: (params: any) => {
          const row = params.data as ExpenseDTO;
          if (!row?.property) return <span className="text-slate-400 text-xs italic">—</span>;
          return (
            <div className="flex items-center gap-1.5 py-1 min-w-0">
              <Building className="w-3.5 h-3.5 text-[#008F83] shrink-0" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                {row.property.name}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Lease / Tenancy',
        field: 'lease_id',
        width: 140,
        cellRenderer: (params: any) => {
          const row = params.data as ExpenseDTO;
          if (!row?.lease_id) {
            return <span className="text-slate-400 text-xs italic">No Lease</span>;
          }
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-900">
              <FileText className="w-3 h-3" />
              Lease #{row.lease_id.slice(0, 6)}
            </span>
          );
        },
      },
      {
        headerName: 'Amount Paid',
        field: 'total_allocated',
        width: 120,
        sortable: true,
        cellRenderer: (params: any) => {
          const val = Number(params.value || 0);
          return (
            <span
              className={cn(
                'font-bold text-xs font-mono',
                val > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
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
          const status = params.value as ExpenseStatus;
          const map: Record<ExpenseStatus, { label: string; cls: string }> = {
            pending: { label: 'Pending', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
            partially_paid: { label: 'Partially Paid', cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
            paid: { label: 'Paid', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
            cancelled: { label: 'Cancelled', cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' },
          };
          const conf = map[status] || map.pending;

          return (
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border', conf.cls)}>
              {conf.label}
            </span>
          );
        },
      },
      {
        headerName: 'Actions',
        field: 'id',
        width: 175,
        sortable: false,
        pinned: 'right',
        cellRenderer: (params: any) => {
          const exp = params.data as ExpenseDTO;
          if (!exp) return null;
          const rem = exp.remaining_amount ?? Math.max(0, exp.amount - (exp.total_allocated || 0));

          return (
            <div className="flex items-center gap-1.5 py-1">
              {rem > 0 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpenseForLinking(exp);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#008F83] hover:bg-[#007A70] text-white shadow-2xs transition-all hover:scale-105 active:scale-95"
                  title="Process & Link Transaction"
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>Process</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" />
                  Settled
                </span>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedExpense(exp);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="View & Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpenseToDelete(exp);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                title="Delete Expense"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        },
      },
    ];

    return cols;
  }, [activePropertyId]);

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
          setSelectedBulkExpenses([]);
          setIsMultiOpen(true);
        }}
        leftIcon={<Layers className="h-4 w-4 text-[#008F83]" />}
      >
        Multi-Allocate
      </Button>

      <Button
        size="sm"
        onClick={() => setIsCreateOpen(true)}
        leftIcon={<Plus className="h-4 w-4" />}
        className="bg-[#008F83] hover:bg-[#007A70] text-white font-bold"
      >
        Record Expense
      </Button>
    </div>
  );

  // Summary KPIs Header (exact match with Payment Schedules & Finance style)
  const summaryHeader = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1 shadow-2xs">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span>Total Incurred</span>
          <Receipt className="h-4 w-4 text-blue-500" />
        </div>
        <p className="text-xl font-black text-slate-900 dark:text-white">${kpis.totalIncurred.toFixed(2)}</p>
        <p className="text-[11px] text-slate-500 font-medium">{filteredExpenses.length} expense records</p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1 shadow-2xs">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span>Paid & Settled</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </div>
        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
          ${kpis.totalAllocated.toFixed(2)}
        </p>
        <p className="text-[11px] text-slate-500 font-medium">Mapped to ledger transactions</p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1 shadow-2xs">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span>Unpaid Balance</span>
          <Clock className="h-4 w-4 text-amber-500" />
        </div>
        <p className="text-xl font-black text-amber-600 dark:text-amber-400">
          ${kpis.remainingBalance.toFixed(2)}
        </p>
        <p className="text-[11px] text-slate-500 font-medium">{kpis.pendingCount} pending / partial bills</p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1 shadow-2xs">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span>Active Categories</span>
          <Tag className="h-4 w-4 text-purple-500" />
        </div>
        <p className="text-xl font-black text-purple-600 dark:text-purple-400">{categories.length}</p>
        <p className="text-[11px] text-slate-500 font-medium">Operational expense categories</p>
      </div>
    </div>
  );

  return (
    <ListPage
      title="Expenses"
      description="Track and manage property operating expenses, vendor invoices, and financial ledger mappings."
      actions={pageActions}
      summary={summaryHeader}
      fill
    >
      {viewMode === 'table' ? (
        <ListPageGrid>
          <AdminDataGrid
            rowData={filteredExpenses}
            columnDefs={columnDefs as any}
            loading={isLoading}
            labelSingular="expense"
            labelPlural="expenses"
            enableSelection={true}
            bulkActions={bulkActions}
            onDeleteSelected={handleBulkDeleteExpenses}
            defaultExpanded={true}
            onRowClick={(row) => {
              setSelectedExpense(row);
            }}
            getRowId={(p) => p.data.id}
            enableColumnChooser
            enableExport
            exportFilename="expenses-export"
            searchPlaceholder="Search expenses, payees, notes..."
            leftToolbarContent={
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="paid">Paid</option>
                </select>

                {/* Category Filter */}
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="All">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                {/* Date Bounds */}
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span>From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span>To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>
              </div>
            }
          />
        </ListPageGrid>
      ) : (
        /* Card Grid View */
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExpenses.map((exp) => (
              <div
                key={exp.id}
                onClick={() => setSelectedExpense(exp)}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[#008F83]/50 transition-all cursor-pointer space-y-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    <Tag className="w-3 h-3" />
                    {exp.category?.name || 'Expense'}
                  </span>
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {formatCurrency(exp.amount)}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {exp.description || exp.category?.name || 'Operating Expense'}
                  </h4>
                  {exp.vendor_name && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">Payee: {exp.vendor_name}</p>
                  )}
                  {exp.property && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                      <Building className="w-3 h-3 text-[#008F83]" />
                      {exp.property.name}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="text-slate-500 dark:text-slate-400 font-mono">
                    {exp.expense_date}
                  </div>
                  <div className="flex items-center gap-2">
                    {exp.status === 'paid' ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
                      </span>
                    ) : (
                      <>
                        <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                          Due: {formatCurrency(exp.remaining_amount ?? Math.max(0, exp.amount - (exp.total_allocated || 0)))}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpenseForLinking(exp);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#008F83] hover:bg-[#007A70] text-white shadow-2xs transition-all hover:scale-105"
                        >
                          <DollarSign className="h-3 w-3" />
                          Process
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Expense Drawer Modal */}
      <ExpenseModal
        isOpen={isCreateOpen || Boolean(expenseToEdit)}
        onClose={() => {
          setIsCreateOpen(false);
          setExpenseToEdit(null);
        }}
        onSuccess={() => {
          loadExpenses();
        }}
        expenseToEdit={expenseToEdit}
        defaultPropertyId={activePropertyId || undefined}
      />

      {/* Expense Detail Drawer */}
      <ExpenseDetailModal
        expense={selectedExpense}
        isOpen={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        onEdit={(exp) => {
          setSelectedExpense(null);
          setExpenseToEdit(exp);
        }}
        onDelete={async (exp) => {
          setSelectedExpense(null);
          try {
            const res = await deleteExpenseAction(exp.id);
            if (res.success) {
              toast({ title: 'Expense Deleted', description: 'Expense record was removed.', variant: 'success' });
              loadExpenses();
            } else {
              toast({ title: 'Delete Failed', description: res.error || 'Could not delete expense.', variant: 'destructive' });
            }
          } catch (e: any) {
            toast({ title: 'Delete Failed', description: e.message, variant: 'destructive' });
          }
        }}
        onOpenLinkModal={(exp) => {
          setSelectedExpense(null);
          setExpenseForLinking(exp);
        }}
        onUnlinkAllocation={handleUnlinkAllocation}
      />

      {/* Link Ledger Transaction Drawer Modal */}
      <LinkExpenseTransactionModal
        expense={expenseForLinking}
        isOpen={Boolean(expenseForLinking)}
        onClose={() => setExpenseForLinking(null)}
        onSuccess={() => {
          loadExpenses();
        }}
      />

      {/* Multi-Expense Batch Allocation Modal */}
      <MultiExpenseAllocationModal
        isOpen={isMultiOpen}
        expenses={selectedBulkExpenses}
        onClose={() => setIsMultiOpen(false)}
        onSuccess={() => {
          loadExpenses();
        }}
      />
    </ListPage>
  );
}
