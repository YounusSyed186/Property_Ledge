'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingDown,
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
  Filter,
  FolderUp,
  ExternalLink,
  ShieldCheck,
  Eye,
  DollarSign,
  ArrowUpRight,
  Download,
  Calendar,
} from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import { Button, useToast, ConfirmDialog } from '@/components/admin/ui';
import { AdminDataGrid, QuickFilterBar, QuickFilterOption, BulkAction } from '@/components/admin/data-grid';
import { ListPage, ListPageGrid } from '@/components/workspace';
import { HoverCardGrid, HoverEffectCardItem } from '@/components/ui/card-hover-effect';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';
import {
  ExpenseDTO,
  CategoryDTO,
  ExpenseFilterParams,
} from '@/modules/finance/domain/types';
import {
  fetchExpensesAction,
  deleteExpenseAction,
} from '@/app/actions/expenses';
import { ExpenseModal } from './ExpenseModal';
import { ExpenseDetailModal } from './ExpenseDetailModal';
import { BulkExpenseUploadModal } from './BulkExpenseUploadModal';
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(() => new Date());

  // View & Filter States
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [quickFilter, setQuickFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals & Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseDTO | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<ExpenseDTO | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync available properties when context updates
  useEffect(() => {
    if (availableProperties && availableProperties.length > 0) {
      setProperties(availableProperties);
    }
  }, [availableProperties]);

  // Load Expenses Data from Transactions
  const loadExpenses = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
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
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      console.error('Failed to load expenses:', err);
      toast({
        title: isManualRefresh ? 'Unable to refresh expenses' : 'Error Loading Expenses',
        description: isManualRefresh ? 'Please try again.' : (err.message || 'Could not fetch expense records.'),
        variant: 'destructive',
      });
    } finally {
      if (isManualRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
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

  // Quick Filter Options
  const filterOptions = useMemo<QuickFilterOption[]>(
    () => [
      { label: 'All Expenses', value: 'all' },
      { label: 'Operating', value: 'operating' },
      { label: 'Maintenance & Repairs', value: 'maintenance' },
      { label: 'Rates & Utilities', value: 'utilities' },
      { label: 'Capital (G10)', value: 'capital' },
    ],
    []
  );

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (activePropertyId && exp.property_id !== activePropertyId) {
        return false;
      }

      // Quick filter
      if (quickFilter !== 'all') {
        const catName = (exp.category?.name || '').toLowerCase();
        const basCode = exp.tax_classification?.bas_code;

        if (quickFilter === 'capital' && basCode !== 'G10') return false;
        if (quickFilter === 'maintenance' && !catName.includes('repair') && !catName.includes('maintenance')) return false;
        if (
          quickFilter === 'utilities' &&
          !catName.includes('water') &&
          !catName.includes('rate') &&
          !catName.includes('utility') &&
          !catName.includes('council') &&
          !catName.includes('strata')
        ) return false;
        if (quickFilter === 'operating' && basCode === 'G10') return false;
      }

      if (selectedCategoryFilter !== 'All' && exp.transaction_category_id !== selectedCategoryFilter) {
        return false;
      }
      const expDate = exp.transaction_date || exp.expense_date || '';
      if (startDate && expDate < startDate) {
        return false;
      }
      if (endDate && expDate > endDate) {
        return false;
      }
      return true;
    });
  }, [expenses, activePropertyId, quickFilter, selectedCategoryFilter, startDate, endDate]);

  // Single Delete Handler
  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteExpenseAction(expenseToDelete.id);
      if (!res.success) throw new Error(res.error || 'Failed to delete expense');

      toast({
        title: 'Expense Deleted',
        description: `Removed expense of ${formatCurrency(expenseToDelete.amount)}.`,
        variant: 'success',
      });
      setExpenseToDelete(null);
      loadExpenses();
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err.message || 'Could not delete expense.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Delete Handler
  const handleBulkDeleteExpenses = async (selectedRows: ExpenseDTO[]) => {
    if (!selectedRows || selectedRows.length === 0) return;
    setIsDeleting(true);
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
          description: `Successfully deleted ${successCount} expense transaction(s)${failCount > 0 ? `, ${failCount} failed (${lastError})` : ''}.`,
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
    } finally {
      setIsDeleting(false);
    }
  };

  const bulkActions = useMemo<BulkAction[]>(() => {
    return [
      {
        label: 'Delete Selected',
        icon: <Trash2 className="h-4 w-4 text-rose-600" />,
        variant: 'destructive',
        onClick: (selectedRows: ExpenseDTO[]) => {
          handleBulkDeleteExpenses(selectedRows);
        },
      },
    ];
  }, [handleBulkDeleteExpenses]);

  // KPIs
  const kpis = useMemo(() => {
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalGst = filteredExpenses.reduce((sum, e) => sum + Number(e.gst_amount || 0), 0);
    const capitalG10 = filteredExpenses
      .filter((e) => e.tax_classification?.bas_code === 'G10')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const operatingExpenses = totalExpenses - capitalG10;
    const transactionCount = filteredExpenses.length;

    return { totalExpenses, totalGst, capitalG10, operatingExpenses, transactionCount };
  }, [filteredExpenses]);

  // AG-Grid Column Definitions
  const columnDefs = useMemo<ColDef<ExpenseDTO>[]>(() => {
    const cols: ColDef<ExpenseDTO>[] = [
      {
        headerName: 'DATE',
        field: 'transaction_date',
        width: 115,
        sortable: true,
        cellRenderer: (params: any) => {
          const row = params.data as ExpenseDTO;
          if (!row) return null;
          const dateStr = row.transaction_date || row.expense_date || '';
          return (
            <span className="font-mono text-xs font-semibold text-admin-foreground">
              {dateStr ? formatAuDisplayDate(dateStr) : '—'}
            </span>
          );
        },
      },
      {
        headerName: 'AMOUNT ($)',
        field: 'amount',
        width: 130,
        sortable: true,
        cellRenderer: (params: any) => {
          const row = params.data as ExpenseDTO;
          if (!row) return null;
          const basCode = row.tax_classification?.bas_code;
          return (
            <div className="py-1">
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs inline-flex items-baseline">
                -{formatCurrency(row.amount)}
                {basCode && (
                  <sup className="ml-1 text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[#008F83] border border-slate-200 dark:border-slate-700 align-super">
                    {basCode}
                  </sup>
                )}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'GST CLAIMABLE',
        field: 'gst_amount',
        width: 130,
        cellRenderer: (params: any) => {
          const row = params.data as ExpenseDTO;
          if (!row) return null;
          const gst = Number(row.gst_amount || 0);
          if (gst <= 0) {
            return <span className="text-[11px] text-admin-muted font-mono">GST-Free</span>;
          }
          return (
            <div className="py-1">
              <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(gst)}
              </span>
              <span className="text-[10px] text-admin-muted block">
                {row.gst_inclusive ? 'Inclusive' : 'Exclusive'}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'CATEGORY',
        field: 'category.name' as any,
        width: 170,
        cellRenderer: (params: any) => {
          const name = params.data?.category?.name || 'Operating Expense';
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 truncate max-w-[150px]">
              <Tag className="w-3 h-3 shrink-0" />
              <span className="truncate">{name}</span>
            </span>
          );
        },
      },
      {
        headerName: 'TAX / BAS',
        field: 'tax_classification.name' as any,
        width: 120,
        cellRenderer: (params: any) => {
          const row = params.data as ExpenseDTO;
          const basCode = row?.tax_classification?.bas_code;
          if (!basCode) return <span className="text-admin-muted text-xs">—</span>;
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#008F83]/10 text-[#008F83] border border-[#008F83]/20">
              <ShieldCheck className="w-3 h-3" />
              {basCode}
            </span>
          );
        },
      },
      {
        headerName: 'PAYEE / DETAILS',
        field: 'description',
        flex: 2,
        minWidth: 180,
        cellRenderer: (params: any) => {
          const row = params.data as ExpenseDTO;
          if (!row) return null;
          return (
            <div className="py-1 min-w-0">
              <span className="text-xs font-semibold text-admin-foreground block truncate">
                {row.vendor_name || row.description || 'Expense Transaction'}
              </span>
              {row.description && row.vendor_name && (
                <span className="text-[10px] text-admin-muted block truncate">
                  {row.description}
                </span>
              )}
            </div>
          );
        },
      },
      {
        headerName: 'PROPERTY',
        field: 'property.name' as any,
        width: 160,
        hide: Boolean(activePropertyId),
        cellRenderer: (params: any) => {
          const row = params.data as ExpenseDTO;
          if (!row?.property?.name) return <span className="text-admin-muted text-xs italic">—</span>;
          return (
            <div className="flex items-center gap-1.5 py-1 min-w-0">
              <Building className="w-3.5 h-3.5 text-[#008F83] shrink-0" />
              <span className="text-xs font-medium text-admin-foreground truncate">
                {row.property.name}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'RECEIPT',
        field: 'receipt_url',
        width: 95,
        cellRenderer: (params: any) => {
          const row = params.data as ExpenseDTO;
          const url = row?.receipt_url || row?.attachments?.[0]?.blob_url;
          if (!url) return <span className="text-admin-muted text-xs">—</span>;
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[#008F83] hover:bg-[#008F83]/10 transition-colors text-xs font-semibold"
              title="View Receipt"
            >
              <Receipt className="w-3.5 h-3.5" />
              <ExternalLink className="w-3 h-3" />
            </a>
          );
        },
      },
      {
        headerName: 'ACTIONS',
        field: 'id',
        width: 140,
        sortable: false,
        pinned: 'right',
        cellRenderer: (params: any) => {
          const exp = params.data as ExpenseDTO;
          if (!exp) return null;

          return (
            <div className="flex items-center gap-1 py-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedExpense(exp);
                }}
                className="px-2 py-1 text-admin-primary hover:bg-admin-primary/10 rounded transition-colors inline-flex items-center gap-1 font-bold text-xs"
                title="View Details"
              >
                <Eye className="h-3.5 w-3.5" /> View
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpenseToEdit(exp);
                }}
                className="p-1 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded transition-colors"
                title="Edit Expense"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpenseToDelete(exp);
                }}
                className="p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
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

  const contextName = selectedProperty ? selectedProperty.propertyName : 'All Properties';
  const pageDescription = `${contextName} · ${filteredExpenses.length} ${filteredExpenses.length === 1 ? 'record' : 'records'}`;

  return (
    <ListPage
      title="Expenses"
      description={pageDescription}
      breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Expenses' }]}
      actions={
        <div className="flex items-center gap-2 sm:gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-admin-surface border border-admin-border rounded-xl p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                viewMode === 'table'
                  ? 'bg-admin-surface-elevated text-admin-primary shadow-xs'
                  : 'text-admin-muted hover:text-admin-foreground'
              )}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                viewMode === 'grid'
                  ? 'bg-admin-surface-elevated text-admin-primary shadow-xs'
                  : 'text-admin-muted hover:text-admin-foreground'
              )}
              title="Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Import / Bulk Upload */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsBulkUploadOpen(true)}
            className="font-bold gap-2 text-xs text-admin-foreground hover:text-admin-primary border-admin-border"
          >
            <FolderUp className="w-4 h-4 text-[#008F83]" />
            Bulk Upload
          </Button>

          {/* Record Expense Primary Button */}
          <Button
            type="button"
            onClick={() => {
              setExpenseToEdit(null);
              setIsCreateOpen(true);
            }}
            className="font-bold gap-2"
          >
            <Plus className="w-4 h-4" /> Record Expense
          </Button>
        </div>
      }
      summary={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Action Card (Modelled after Transactions & Tenants Primary Action Cards) */}
          <div
            onClick={() => {
              setExpenseToEdit(null);
              setIsCreateOpen(true);
            }}
            className="bg-admin-primary text-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-white/70 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div>
              <h3 className="text-base font-black mb-0.5">Record Expense</h3>
              <p className="text-xs text-white/80 font-medium">Log supplier costs, utilities, or repairs.</p>
            </div>
          </div>

          {/* Total Operating Expenses */}
          <div className="bg-admin-surface border border-admin-border rounded-2xl p-5 flex flex-col justify-between shadow-xs">
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-admin-muted uppercase tracking-wider mb-0.5">
                Total Expenses
              </p>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {isLoading ? (
                  <span className="inline-block h-7 w-20 rounded skeleton-shimmer align-middle" />
                ) : (
                  formatCurrency(kpis.totalExpenses)
                )}
              </h3>
            </div>
          </div>

          {/* GST Claimable (1B) */}
          <div className="bg-admin-surface border border-admin-border rounded-2xl p-5 flex flex-col justify-between shadow-xs">
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-admin-muted uppercase tracking-wider mb-0.5">
                GST Claimable (1B)
              </p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {isLoading ? (
                  <span className="inline-block h-7 w-20 rounded skeleton-shimmer align-middle" />
                ) : (
                  formatCurrency(kpis.totalGst)
                )}
              </h3>
            </div>
          </div>

          {/* Capital Works (G10) */}
          <div className="bg-admin-surface border border-admin-border rounded-2xl p-5 flex flex-col justify-between shadow-xs">
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                <Building className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-admin-muted uppercase tracking-wider mb-0.5">
                Capital Works (G10)
              </p>
              <h3 className="text-2xl font-black text-admin-foreground">
                {isLoading ? (
                  <span className="inline-block h-7 w-20 rounded skeleton-shimmer align-middle" />
                ) : (
                  formatCurrency(kpis.capitalG10)
                )}
              </h3>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex-1 flex flex-col min-h-0 h-full space-y-4">
        {!isLoading && filteredExpenses.length === 0 && quickFilter === 'all' && selectedCategoryFilter === 'All' && !startDate && !endDate ? (
          <div className="py-20 px-6 text-center bg-admin-surface rounded-2xl border border-admin-border shadow-xs flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-14 h-14 bg-admin-surface-subtle rounded-full flex items-center justify-center mx-auto mb-4 text-admin-muted border border-admin-border">
              <Receipt className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-admin-foreground mb-1">No expenses found</h3>
            <p className="text-xs text-admin-muted max-w-sm mx-auto mb-5 font-medium">
              Start logging your property operating expenses, utility bills, maintenance, or contractor costs.
            </p>
            <Button
              onClick={() => {
                setExpenseToEdit(null);
                setIsCreateOpen(true);
              }}
              className="font-bold"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Record First Expense
            </Button>
          </div>
        ) : viewMode === 'table' ? (
          /* AG-Grid Table View */
          <ListPageGrid>
            <AdminDataGrid<ExpenseDTO>
              rowData={filteredExpenses}
              columnDefs={columnDefs}
              loading={isLoading}
              onRefresh={() => loadExpenses(true)}
              isRefreshing={isRefreshing}
              lastRefreshedAt={lastRefreshedAt}
              labelSingular="expense"
              labelPlural="expenses"
              enableSelection={true}
              bulkActions={bulkActions}
              onRowClick={(row) => setSelectedExpense(row)}
              getRowId={(p) => p.data.id}
              enableColumnChooser
              enableExport
              exportFilename="expenses-export"
              searchPlaceholder="Search expenses, vendor, memo, tax..."
              leftToolbarContent={
                <div className="flex flex-wrap items-center gap-2">
                  <QuickFilterBar
                    options={filterOptions}
                    activeValue={quickFilter}
                    onChange={(val) => setQuickFilter(val as any)}
                  />

                  {/* Category Dropdown */}
                  {categories.length > 0 && (
                    <select
                      aria-label="Filter by Category"
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      className="h-8 px-2.5 text-xs rounded-xl bg-admin-surface border border-admin-border text-admin-foreground focus:outline-none focus:ring-1 focus:ring-admin-primary font-medium"
                    >
                      <option value="All">All Categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Date Filter */}
                  <div className="hidden xl:flex items-center gap-1.5 text-xs text-admin-muted">
                    <input
                      type="date"
                      aria-label="Start date filter"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-8 px-2 text-xs rounded-xl bg-admin-surface border border-admin-border text-admin-foreground focus:outline-none focus:ring-1 focus:ring-admin-primary"
                    />
                    <span>–</span>
                    <input
                      type="date"
                      aria-label="End date filter"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-8 px-2 text-xs rounded-xl bg-admin-surface border border-admin-border text-admin-foreground focus:outline-none focus:ring-1 focus:ring-admin-primary"
                    />
                  </div>

                  {(selectedCategoryFilter !== 'All' || startDate || endDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryFilter('All');
                        setStartDate('');
                        setEndDate('');
                      }}
                      className="text-xs text-admin-primary hover:underline font-semibold ml-1"
                    >
                      Reset
                    </button>
                  )}
                </div>
              }
              disablePagination={true}
            />
          </ListPageGrid>
        ) : isLoading ? (
          /* Card Skeleton Loading State */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto flex-1 p-1">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-admin-surface border border-admin-border rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-3 skeleton-shimmer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl skeleton-shimmer shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 rounded skeleton-shimmer w-28" />
                      <div className="h-2.5 rounded skeleton-shimmer w-36" />
                    </div>
                  </div>
                  <div className="h-5 w-14 rounded skeleton-shimmer" />
                </div>
                <div className="h-px w-full bg-admin-border/60" />
                <div className="space-y-2 py-1">
                  <div className="h-3 rounded skeleton-shimmer w-32" />
                  <div className="h-3 rounded skeleton-shimmer w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Modern Card Grid View matching Transactions */
          <HoverCardGrid className="overflow-y-auto flex-1 p-1">
            {filteredExpenses.map((exp) => (
              <HoverEffectCardItem
                key={exp.id}
                onClick={() => setSelectedExpense(exp)}
                className="cursor-pointer group/card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <TrendingDown className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-admin-foreground leading-tight truncate group-hover/card:text-admin-primary transition-colors">
                        {exp.vendor_name || exp.description || exp.category?.name || 'Expense'}
                      </h4>
                      <p className="text-xs text-admin-muted mt-0.5 truncate">
                        {formatAuDisplayDate(exp.transaction_date || exp.expense_date)} • {exp.category?.name || 'General'}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider shrink-0 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    Expense
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-admin-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-admin-muted uppercase tracking-wider block">
                      Amount
                    </span>
                    <span className="font-mono text-base font-black text-rose-600 dark:text-rose-400 inline-flex items-baseline">
                      -{formatCurrency(exp.amount)}
                      {exp.tax_classification?.bas_code && (
                        <sup className="ml-1 text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[#008F83] border border-slate-200 dark:border-slate-700">
                          {exp.tax_classification.bas_code}
                        </sup>
                      )}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-admin-muted uppercase tracking-wider block">
                      GST (1B)
                    </span>
                    <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {Number(exp.gst_amount || 0) > 0 ? formatCurrency(exp.gst_amount || 0) : 'GST-Free'}
                    </span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-admin-border/40 flex items-center justify-between text-xs text-admin-muted">
                  <div className="flex items-center gap-1.5 truncate">
                    <Building className="w-3.5 h-3.5 text-[#008F83] shrink-0" />
                    <span className="truncate">{exp.property?.name || 'All Properties'}</span>
                  </div>
                  {exp.tax_classification?.bas_code && (
                    <span className="font-bold text-[#008F83] text-[11px]">
                      {exp.tax_classification.bas_code}
                    </span>
                  )}
                </div>
              </HoverEffectCardItem>
            ))}
          </HoverCardGrid>
        )}
      </div>

      {/* Record / Edit Expense Modal */}
      <ExpenseModal
        isOpen={isCreateOpen || Boolean(expenseToEdit)}
        onClose={() => {
          setIsCreateOpen(false);
          setExpenseToEdit(null);
        }}
        expenseToEdit={expenseToEdit}
        defaultPropertyId={activePropertyId || undefined}
        onSuccess={() => {
          loadExpenses();
        }}
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
        onDelete={(exp) => {
          setSelectedExpense(null);
          setExpenseToDelete(exp);
        }}
      />

      {/* Bulk Expense Upload Modal */}
      <BulkExpenseUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        defaultPropertyId={activePropertyId || undefined}
        onSuccess={() => {
          loadExpenses();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(expenseToDelete)}
        title="Delete Expense Transaction"
        description={`Are you sure you want to delete this expense of ${formatCurrency(expenseToDelete?.amount || 0)}? This will remove the transaction from the property operating ledger.`}
        confirmLabel="Delete Expense"
        cancelLabel="Cancel"
        variant="danger"
        loading={isDeleting}
        onConfirm={confirmDeleteExpense}
        onClose={() => setExpenseToDelete(null)}
      />
    </ListPage>
  );
}

