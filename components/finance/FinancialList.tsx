'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Download,
  List,
  LayoutGrid,
  ArrowUpRight,
  Receipt,
  Building,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  PieChart,
  User,
  LayoutTemplate,
  FileText,
  Link2,
  FolderUp,
} from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import { Button, useToast } from '@/components/admin/ui';
import { AdminDataGrid, QuickFilterBar, QuickFilterOption } from '@/components/admin/data-grid';
import { ListPage, ListPageGrid } from '@/components/workspace';
import { HoverCardGrid, HoverEffectCardItem } from '@/components/ui/card-hover-effect';
import { DiceBearIcon } from '@/components/ui/avatar';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';
import {
  TransactionDTO,
  CategoryDTO,
  LedgerEntryDTO,
  FinancialSummaryDTO,
  TransactionType,
} from '@/modules/finance/domain/types';
import {
  fetchCategoriesAction,
  fetchFinancialPageDataAction,
  fetchTransactionsAction,
  fetchLedgerAction,
  fetchFinancialOverviewAction,
  deleteTransactionAction,
  exportLedgerCsvAction,
  FinancialPageData,
} from '@/app/actions/finance';
import { getDropdownOptions, prewarmOptionsCache } from '@/lib/cache/optionsCache';
import { TransactionModal } from './TransactionModal';
import { TransactionDetailModal } from './TransactionDetailModal';
import { TransactionTypeSelectModal } from './TransactionTypeSelectModal';
import { LedgerReportModal } from './LedgerReportModal';
import { MultiAllocationModal } from './MultiAllocationModal';
import { BulkExpenseUploadModal } from './BulkExpenseUploadModal';
import { isIncome, isExpense } from '@/modules/finance/domain/calculations';
import { cn } from '@/lib/utils';

interface FinancialListProps {
  initialData?: FinancialPageData;
}

export function FinancialList({ initialData }: FinancialListProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { selectedProperty, availableProperties } = usePropertyContext();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const activePropertyId = selectedProperty?.propertyId ?? null;
  const isInitialMount = React.useRef(true);

  // Data State
  const [transactions, setTransactions] = useState<TransactionDTO[]>(initialData?.transactions || []);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntryDTO[]>(initialData?.ledgerEntries || []);
  const [summary, setSummary] = useState<FinancialSummaryDTO | null>(initialData?.summary || null);
  const [categories, setCategories] = useState<CategoryDTO[]>(initialData?.categories || []);
  const [properties, setProperties] = useState<any[]>(availableProperties || []);
  const [isLoading, setIsLoading] = useState(!initialData);

  // View & Filter States
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Income' | 'Expense' | 'Ledger'>('All');

  // Modals & Drawers
  const [isTypeSelectOpen, setIsTypeSelectOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>('expense');
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDTO | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<TransactionDTO | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<TransactionDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isLinkScheduleOpen, setIsLinkScheduleOpen] = useState(false);
  const [selectedTxForLink, setSelectedTxForLink] = useState<TransactionDTO | null>(null);
  const [isLinkExpenseOpen, setIsLinkExpenseOpen] = useState(false);
  const [selectedTxForLinkExpense, setSelectedTxForLinkExpense] = useState<TransactionDTO | null>(null);

  // Sync available properties when context updates
  useEffect(() => {
    if (availableProperties && availableProperties.length > 0) {
      setProperties(availableProperties);
    }
  }, [availableProperties]);

  // Load Transactions & Overview Data in a single consolidated pass
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const filterParams = {
        property_id: activePropertyId || undefined,
      };

      const pageData = await fetchFinancialPageDataAction(filterParams);

      setTransactions(pageData.transactions || []);
      setLedgerEntries(pageData.ledgerEntries || []);
      setSummary(pageData.summary || null);
      if (pageData.categories?.length > 0) {
        setCategories(pageData.categories);
      }
    } catch (err: any) {
      console.error('Failed to load transaction data:', err);
      toast({
        title: 'Error Loading Transactions',
        description: err.message || 'Could not fetch transaction records.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [activePropertyId, toast]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialData && (!activePropertyId || activePropertyId === '')) {
        return;
      }
    }
    loadData();
  }, [loadData, activePropertyId, initialData]);

  // Filter options for QuickFilterBar (modelled after tenant directory)
  const filterOptions = useMemo<QuickFilterOption[]>(
    () => [
      { label: 'All Transactions', value: 'All' },
      { label: 'Income', value: 'Income' },
      { label: 'Expenses', value: 'Expense' },
    ],
    []
  );

  // Filtered transactions based on active property & type tab
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (activePropertyId && t.property_id !== activePropertyId) {
        return false;
      }
      if (typeFilter === 'Income') return t.transaction_type === 'income';
      if (typeFilter === 'Expense') return t.transaction_type === 'expense';
      return true;
    });
  }, [transactions, typeFilter, activePropertyId]);

  // Filtered transactions with calculated running balance
  const filteredTransactionsWithBalance = useMemo(() => {
    // Sort all transactions chronologically ascending to compute running balance
    const sortedAsc = [...transactions].sort((a, b) => {
      const dateA = new Date(a.transaction_date).getTime();
      const dateB = new Date(b.transaction_date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    let runningBal = 0;
    const balanceMap = new Map<string, number>();
    for (const tx of sortedAsc) {
      if (tx.status === 'completed') {
        if (isIncome(tx.transaction_type)) {
          runningBal += Number(tx.amount || 0);
        } else {
          runningBal -= Number(tx.amount || 0);
        }
      }
      balanceMap.set(tx.id, runningBal);
    }

    return filteredTransactions.map((tx) => ({
      ...tx,
      running_balance: balanceMap.get(tx.id) ?? 0,
    }));
  }, [transactions, filteredTransactions]);

  // Filtered ledger entries
  const filteredLedgerEntries = useMemo(() => {
    return ledgerEntries.filter((entry) => {
      if (activePropertyId && entry.transaction.property_id !== activePropertyId) {
        return false;
      }
      return true;
    });
  }, [ledgerEntries, activePropertyId]);

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
    return new Date(dateStr).toLocaleDateString('en-AU');
  };

  // AG-Grid Columns matching the requested Accounting Ledger Row Layout
  const transactionColumns: ColDef[] = useMemo(
    () => [
      {
        field: 'transaction_date',
        headerName: 'DATE',
        width: 110,
        valueGetter: (p) => formatDate(p.data?.transaction_date),
        cellRenderer: (params: any) => {
          return (
            <span className="font-medium text-admin-foreground text-[13px]">
              {formatDate(params.data?.transaction_date)}
            </span>
          );
        },
      },
      {
        field: 'reference',
        headerName: 'REF.',
        width: 105,
        valueGetter: (p) => p.data?.reference || p.data?.invoice?.invoice_number || '—',
        cellRenderer: (params: any) => {
          const ref = params.data?.reference || params.data?.invoice?.invoice_number;
          if (!ref) return <span className="text-admin-muted text-xs">—</span>;
          return (
            <span className="font-mono text-xs text-admin-foreground font-semibold">
              {ref}
            </span>
          );
        },
      },
      {
        headerName: 'A/C',
        width: 130,
        valueGetter: (p) => p.data?.category?.name || 'Uncategorized',
        cellRenderer: (params: any) => {
          const cat = params.data?.category?.name;
          return (
            <span className="font-medium text-admin-foreground text-xs truncate">
              {cat || '—'}
            </span>
          );
        },
      },
      {
        field: 'transaction_type',
        headerName: 'TYPE',
        width: 110,
        cellRenderer: (params: any) => {
          const type = params.data?.transaction_type;
          return (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider uppercase',
                isIncome(type)
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              )}
            >
              {isIncome(type) ? 'INCOME' : 'EXPENSE'}
            </span>
          );
        },
      },
      {
        headerName: 'PROPERTY',
        flex: 1.5,
        minWidth: 170,
        valueGetter: (p) => p.data?.property?.name || '—',
        cellRenderer: (params: any) => {
          const prop = params.data?.property;
          if (!prop) return <span className="text-admin-muted text-xs">Unassigned</span>;
          return (
            <div className="flex items-center gap-2 py-1 min-w-0 max-w-full overflow-hidden">
              <DiceBearIcon name="building" badge variant="red" className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold text-admin-foreground text-[13px] truncate">
                {prop.name || prop.address_line_1}
              </span>
            </div>
          );
        },
      },
      {
        field: 'description',
        headerName: 'DETAILS',
        flex: 2,
        minWidth: 180,
        valueGetter: (p) => p.data?.description || p.data?.notes || p.data?.category?.name || '—',
        cellRenderer: (params: any) => {
          const desc = params.data?.description || params.data?.notes || params.data?.category?.name || '—';
          const hasReceipt = Boolean(params.data?.receipt_url);
          return (
            <div className="flex items-center gap-1.5 min-w-0">
              {hasReceipt && (
                <span className="text-slate-400 dark:text-slate-500 shrink-0 text-xs" title="Receipt attached">
                  📎
                </span>
              )}
              <span className="font-medium text-admin-foreground text-[13px] truncate block" title={desc}>
                {desc}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'PAYEE / PAYER',
        width: 160,
        valueGetter: (p) => {
          const tx = p.data;
          return tx?.vendor_name || (tx?.tenant ? `${tx.tenant.first_name || ''} ${tx.tenant.last_name || ''}`.trim() : '') || '—';
        },
        cellRenderer: (params: any) => {
          const tx = params.data;
          const name = tx?.vendor_name || (tx?.tenant ? `${tx.tenant.first_name || ''} ${tx.tenant.last_name || ''}`.trim() : '') || '—';
          return (
            <span className="font-medium text-admin-foreground text-xs truncate block" title={name}>
              {name}
            </span>
          );
        },
      },
      {
        headerName: 'DEBIT ($)',
        width: 130,
        cellRenderer: (params: any) => {
          const tx: TransactionDTO = params.data;
          if (!tx) return null;
          const isExp = isExpense(tx.transaction_type);
          if (!isExp || !tx.amount) return <span className="text-admin-muted text-xs">—</span>;
          return (
            <span className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
              -{formatCurrency(tx.amount)}
            </span>
          );
        },
      },
      {
        headerName: 'CREDIT ($)',
        width: 130,
        cellRenderer: (params: any) => {
          const tx: TransactionDTO = params.data;
          if (!tx) return null;
          const isInc = isIncome(tx.transaction_type);
          if (!isInc || !tx.amount) return <span className="text-admin-muted text-xs">—</span>;
          return (
            <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(tx.amount)}
            </span>
          );
        },
      },
      {
        headerName: 'BALANCE ($)',
        width: 140,
        cellRenderer: (params: any) => {
          const val = params.data?.running_balance ?? 0;
          return (
            <span
              className={cn(
                'font-mono font-black text-sm',
                val >= 0 ? 'text-admin-foreground' : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {formatCurrency(val)}
            </span>
          );
        },
      },
      {
        headerName: 'ACTIONS',
        colId: 'actions',
        width: 120,
        pinned: 'right',
        sortable: false,
        filter: false,
        cellRenderer: (params: any) => {
          const tx: TransactionDTO = params.data;
          if (!tx) return null;
          const isInc = isIncome(tx.transaction_type);
          const isExp = isExpense(tx.transaction_type);

          return (
            <div className="flex items-center gap-1 py-0.5">
              {isInc && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTxForLink(tx);
                    setIsLinkScheduleOpen(true);
                  }}
                  className="p-1 text-[#008F83] hover:bg-[#008F83]/15 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-xs"
                  title="Link Transaction to Expected Payment Schedule"
                >
                  <Link2 className="w-3.5 h-3.5" />
                </button>
              )}
              {isExp && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTxForLinkExpense(tx);
                    setIsLinkExpenseOpen(true);
                  }}
                  className="p-1 text-[#008F83] hover:bg-[#008F83]/15 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-xs"
                  title="Link Transaction to Expenses / Operating Bills"
                >
                  <Link2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTransactionToEdit(tx);
                  setModalType(tx.transaction_type);
                  setIsCreateOpen(true);
                }}
                className="p-1 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded transition-colors inline-flex items-center gap-1 font-bold text-xs"
                title="Edit Transaction"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTransactionToDelete(tx);
                }}
                className="p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded transition-colors inline-flex items-center gap-1 font-bold text-xs"
                title="Delete Transaction"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        },
      },
    ],
    []
  );

  // AG-Grid Columns for Live Ledger View
  const ledgerColumns: ColDef[] = useMemo(
    () => [
      {
        field: 'date',
        headerName: 'DATE',
        width: 110,
        valueGetter: (p) => formatDate(p.data?.date),
      },
      {
        field: 'reference',
        headerName: 'REF.',
        width: 105,
        valueGetter: (p) => p.data?.reference || p.data?.transaction?.invoice?.invoice_number || '—',
        cellRenderer: (params: any) => {
          const ref = params.data?.reference || params.data?.transaction?.invoice?.invoice_number;
          if (!ref) return <span className="text-admin-muted text-xs">—</span>;
          return <span className="font-mono text-xs text-admin-foreground font-semibold">{ref}</span>;
        },
      },
      {
        field: 'category_name',
        headerName: 'A/C',
        width: 130,
      },
      {
        field: 'transaction_type',
        headerName: 'TYPE',
        width: 110,
        cellRenderer: (params: any) => {
          const type = params.data?.transaction_type;
          return (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider uppercase',
                isIncome(type)
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              )}
            >
              {isIncome(type) ? 'INCOME' : 'EXPENSE'}
            </span>
          );
        },
      },
      {
        field: 'property_name',
        headerName: 'PROPERTY',
        flex: 1.5,
        minWidth: 170,
      },
      {
        field: 'description',
        headerName: 'DETAILS',
        flex: 2,
        minWidth: 180,
      },
      {
        headerName: 'PAYEE / PAYER',
        width: 160,
        valueGetter: (p) => {
          const tx = p.data?.transaction;
          return tx?.vendor_name || (tx?.tenant ? `${tx.tenant.first_name || ''} ${tx.tenant.last_name || ''}`.trim() : '') || '—';
        },
        cellRenderer: (params: any) => {
          const tx = params.data?.transaction;
          const name = tx?.vendor_name || (tx?.tenant ? `${tx.tenant.first_name || ''} ${tx.tenant.last_name || ''}`.trim() : '') || '—';
          return (
            <span className="font-medium text-admin-foreground text-xs truncate block" title={name}>
              {name}
            </span>
          );
        },
      },
      {
        field: 'money_out',
        headerName: 'DEBIT ($)',
        width: 130,
        cellRenderer: (params: any) => {
          const val = params.data?.money_out;
          if (!val || val === 0) return <span className="text-admin-muted text-xs">—</span>;
          return <span className="font-mono font-bold text-rose-600 dark:text-rose-400">-{formatCurrency(val)}</span>;
        },
      },
      {
        field: 'money_in',
        headerName: 'CREDIT ($)',
        width: 130,
        cellRenderer: (params: any) => {
          const val = params.data?.money_in;
          if (!val || val === 0) return <span className="text-admin-muted text-xs">—</span>;
          return <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(val)}</span>;
        },
      },
      {
        field: 'running_balance',
        headerName: 'BALANCE ($)',
        width: 140,
        pinned: 'right',
        cellRenderer: (params: any) => {
          const val = params.data?.running_balance ?? 0;
          return (
            <span
              className={cn(
                'font-mono font-black text-sm',
                val >= 0 ? 'text-admin-foreground' : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {formatCurrency(val)}
            </span>
          );
        },
      },
    ],
    []
  );

  // Handle Export CSV
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const res = await exportLedgerCsvAction({
        property_id: activePropertyId || undefined,
      });

      const blob = new Blob([res.content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', res.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Ledger Exported',
        description: `Downloaded ${res.filename}`,
        variant: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Export Failed',
        description: err.message || 'Could not generate CSV export.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Delete Confirmation
  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteTransactionAction(transactionToDelete.id);
      if (!res.success) throw new Error(res.error || 'Failed to delete transaction');

      toast({
        title: 'Transaction Deleted',
        description: `Removed ${transactionToDelete.transaction_type} of ${formatCurrency(
          transactionToDelete.amount
        )}.`,
        variant: 'success',
      });

      setTransactionToDelete(null);
      loadData();
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteTransactions = async (selectedRows: TransactionDTO[]) => {
    if (!selectedRows || selectedRows.length === 0) return;
    setIsDeleting(true);
    try {
      let successCount = 0;
      let failCount = 0;
      let lastError = '';

      for (const tx of selectedRows) {
        const res = await deleteTransactionAction(tx.id);
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
          description: `Successfully deleted ${successCount} transaction(s)${failCount > 0 ? `, ${failCount} failed (${lastError})` : ''}.`,
          variant: 'success',
        });
      } else {
        toast({
          title: 'Bulk Delete Failed',
          description: lastError || 'Could not delete selected transactions.',
          variant: 'destructive',
        });
      }
      loadData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete transactions.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const contextName = selectedProperty ? selectedProperty.propertyName : 'All Properties';
  const pageDescription = `${contextName} · ${filteredTransactions.length} ${filteredTransactions.length === 1 ? 'record' : 'records'}`;

  return (
    <ListPage
      title="Transactions"
      description={pageDescription}
      actions={
        <div className="flex items-center gap-3">
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

          <Button
            variant="outline"
            onClick={() => setIsReportModalOpen(true)}
            className="font-bold gap-1.5 text-xs text-admin-foreground hover:text-admin-primary border-admin-border"
          >
            <LayoutTemplate className="w-4 h-4 text-[#008F83]" />
            Ledger Blueprints & Reports
          </Button>

          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="font-bold gap-2 text-xs"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsBulkUploadOpen(true)}
            className="font-bold gap-2 text-xs text-admin-foreground hover:text-admin-primary border-admin-border"
          >
            <FolderUp className="w-4 h-4 text-[#008F83]" />
            Bulk Upload
          </Button>

          <Button
            onClick={() => setIsTypeSelectOpen(true)}
            className="font-bold gap-2"
          >
            <Plus className="w-4 h-4" /> Record Transaction
          </Button>
        </div>
      }
      summary={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Action Card (Modelled after Tenant Setup Tenancy Card) */}
          <div
            onClick={() => setIsTypeSelectOpen(true)}
            className="bg-admin-primary text-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-white/70 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div>
              <h3 className="text-base font-black mb-0.5">Record Transaction</h3>
              <p className="text-xs text-white/80 font-medium">Log income or property operating expenses.</p>
            </div>
          </div>

          {/* Total Income */}
          <div className="bg-admin-surface border border-admin-border rounded-2xl p-5 flex flex-col justify-between shadow-xs">
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-admin-muted uppercase tracking-wider mb-0.5">
                Total Income (Money In)
              </p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {isLoading ? (
                  <span className="inline-block h-7 w-16 rounded skeleton-shimmer align-middle" />
                ) : (
                  formatCurrency(summary?.total_income || 0)
                )}
              </h3>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="bg-admin-surface border border-admin-border rounded-2xl p-5 flex flex-col justify-between shadow-xs">
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-admin-muted uppercase tracking-wider mb-0.5">
                Total Expenses (Money Out)
              </p>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {isLoading ? (
                  <span className="inline-block h-7 w-16 rounded skeleton-shimmer align-middle" />
                ) : (
                  formatCurrency(summary?.total_expense || 0)
                )}
              </h3>
            </div>
          </div>

          {/* Net Cashflow */}
          <div className="bg-admin-surface border border-admin-border rounded-2xl p-5 flex flex-col justify-between shadow-xs">
            <div className="flex justify-between items-start mb-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  (summary?.net_profit || 0) >= 0
                    ? 'bg-teal-500/10 text-teal-500'
                    : 'bg-indigo-500/10 text-indigo-500'
                )}
              >
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-admin-muted uppercase tracking-wider mb-0.5">
                Net Operating Cashflow
              </p>
              <h3
                className={cn(
                  'text-2xl font-black',
                  (summary?.net_profit || 0) >= 0
                    ? 'text-admin-foreground'
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {isLoading ? (
                  <span className="inline-block h-7 w-16 rounded skeleton-shimmer align-middle" />
                ) : (
                  formatCurrency(summary?.net_profit || 0)
                )}
              </h3>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex-1 flex flex-col min-h-0 h-full space-y-4">
        {!isLoading && filteredTransactions.length === 0 && typeFilter === 'All' ? (
          <div className="py-20 px-6 text-center bg-admin-surface rounded-2xl border border-admin-border shadow-xs flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-14 h-14 bg-admin-surface-subtle rounded-full flex items-center justify-center mx-auto mb-4 text-admin-muted border border-admin-border">
              <DollarSign className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-admin-foreground mb-1">No transactions found</h3>
            <p className="text-xs text-admin-muted max-w-sm mx-auto mb-5 font-medium">
              Start tracking your financials by logging rent payments, utility bills, or maintenance expenses.
            </p>
            <Button
              onClick={() => {
                setModalType('income');
                setTransactionToEdit(null);
                setIsCreateOpen(true);
              }}
              className="font-bold"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Record First Transaction
            </Button>
          </div>
        ) : viewMode === 'table' ? (
          /* Standard Transactions AG-Grid Table */
          <ListPageGrid>
            <AdminDataGrid
              rowData={filteredTransactionsWithBalance}
              columnDefs={transactionColumns}
              loading={isLoading}
              labelSingular="transaction"
              labelPlural="transactions"
              enableSelection={true}
              onDeleteSelected={handleBulkDeleteTransactions}
              onRowClick={(row) => setSelectedTransaction(row)}
              getRowId={(p) => p.data.id}
              enableColumnChooser
              enableExport
              exportFilename="transactions-export"
              searchPlaceholder="Search transactions, memo, reference..."
              leftToolbarContent={
                <QuickFilterBar
                  options={filterOptions}
                  activeValue={typeFilter}
                  onChange={(val) => setTypeFilter(val as any)}
                />
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
          /* Modern Card Grid View */
          <HoverCardGrid className="overflow-y-auto flex-1 p-1">
            {filteredTransactions.map((tx) => {
              const income = isIncome(tx.transaction_type);
              return (
                <HoverEffectCardItem
                  key={tx.id}
                  onClick={() => setSelectedTransaction(tx)}
                  className="cursor-pointer group/card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0',
                          income
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        )}
                      >
                        {income ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-admin-foreground leading-tight truncate group-hover/card:text-admin-primary transition-colors">
                          {tx.description || tx.category?.name || 'Transaction'}
                        </h4>
                        <p className="text-xs text-admin-muted mt-0.5 truncate">
                          {formatDate(tx.transaction_date)} • {tx.category?.name || 'General'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider shrink-0',
                        income
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      )}
                    >
                      {income ? 'Income' : 'Expense'}
                    </span>
                  </div>

                  <div className="space-y-2 p-3 rounded-xl bg-admin-surface-subtle/50 border border-admin-border/50 text-xs text-admin-muted my-1">
                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-admin-primary shrink-0" />
                      <span className="font-semibold text-admin-foreground truncate">
                        {tx.property?.name || tx.property?.address_line_1 || 'Unassigned Property'}
                      </span>
                    </div>
                    {tx.vendor_name ? (
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-admin-muted shrink-0" />
                        <span className="truncate">Payee: {tx.vendor_name}</span>
                      </div>
                    ) : tx.tenant ? (
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-admin-muted shrink-0" />
                        <span className="truncate">
                          Tenant: {tx.tenant.first_name} {tx.tenant.last_name}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-admin-muted/60 italic">
                        <span>No party specified</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-admin-border/50">
                    <span
                      className={cn(
                        'text-base font-mono font-black',
                        income
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {income ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTransactionToEdit(tx);
                        setModalType(tx.transaction_type);
                        setIsCreateOpen(true);
                      }}
                      className="px-2 py-1 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded-lg transition-colors inline-flex items-center gap-1 font-semibold text-xs"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                </HoverEffectCardItem>
              );
            })}
          </HoverCardGrid>
        )}
      </div>

      {/* Transaction Type Select Modal (Income vs Expense) */}
      <TransactionTypeSelectModal
        isOpen={isTypeSelectOpen}
        onClose={() => setIsTypeSelectOpen(false)}
        onSelectType={(type) => {
          setIsTypeSelectOpen(false);
          setModalType(type);
          setTransactionToEdit(null);
          setIsCreateOpen(true);
        }}
      />

      {/* Record / Edit Transaction Modal */}
      <TransactionModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setTransactionToEdit(null);
        }}
        onSuccess={() => {
          setIsCreateOpen(false);
          setTransactionToEdit(null);
          loadData();
        }}
        defaultType={modalType}
        transactionToEdit={transactionToEdit}
      />

      {/* Transaction Detail View Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onEdit={(tx) => {
          setSelectedTransaction(null);
          setTransactionToEdit(tx);
          setModalType(tx.transaction_type);
          setIsCreateOpen(true);
        }}
        onDelete={(tx) => {
          setSelectedTransaction(null);
          setTransactionToDelete(tx);
        }}
        onLinkSchedule={(tx) => {
          setSelectedTransaction(null);
          setSelectedTxForLink(tx);
          setIsLinkScheduleOpen(true);
        }}
        onLinkExpense={(tx) => {
          setSelectedTransaction(null);
          setSelectedTxForLinkExpense(tx);
          setIsLinkExpenseOpen(true);
        }}
      />

      {/* Link Transaction to Schedule Modal */}
      <MultiAllocationModal
        isOpen={isLinkScheduleOpen}
        initialTransactionId={selectedTxForLink?.id}
        onClose={() => {
          setIsLinkScheduleOpen(false);
          setSelectedTxForLink(null);
        }}
        onSuccess={loadData}
      />

      {/* Delete Confirmation Modal */}
      {transactionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-admin-surface border border-admin-border rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-admin-foreground">Delete Transaction</h3>
                <p className="text-xs text-admin-muted">This action is permanent and updates the ledger.</p>
              </div>
            </div>

            <p className="text-sm text-admin-muted">
              Are you sure you want to delete this {transactionToDelete.transaction_type} of{' '}
              <strong className="text-admin-foreground">
                {formatCurrency(transactionToDelete.amount)}
              </strong>
              ?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTransactionToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Ledger & Statement Generator Modal */}
      <LedgerReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        transactions={transactions}
        ledgerEntries={ledgerEntries}
        properties={properties}
        defaultPropertyId={activePropertyId || ''}
      />

      {/* Bulk Expense Folder Upload Modal */}
      <BulkExpenseUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSuccess={loadData}
        defaultPropertyId={activePropertyId || ''}
      />
    </ListPage>
  );
}
