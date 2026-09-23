'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ColDef } from 'ag-grid-community';
import { BasTransactionDTO } from '@/modules/finance/domain/types';
import { AdminDataGrid } from '@/components/admin/data-grid';
import { ListPageGrid } from '@/components/workspace';
import { formatCurrency } from '@/lib/format/currency';
import { formatAuDisplayDate } from '@/lib/format/australian-time';
import {
  Tag,
  Building,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface BasDetailsTabProps {
  transactions: BasTransactionDTO[];
  periodLabel: string;
  initialTypeFilter?: 'income' | 'expense' | 'all';
}

export function BasDetailsTab({
  transactions,
  periodLabel,
  initialTypeFilter = 'all',
}: BasDetailsTabProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>(initialTypeFilter);
  const [selectedClassification, setSelectedClassification] = useState<string>('all');

  const classifications = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.taxClassification) set.add(tx.taxClassification);
    });
    return Array.from(set).sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (selectedClassification !== 'all' && tx.taxClassification !== selectedClassification) return false;
      return true;
    });
  }, [transactions, typeFilter, selectedClassification]);

  // AG Grid Column Definitions
  const columnDefs = useMemo<ColDef<BasTransactionDTO>[]>(() => {
    return [
      {
        headerName: 'Date',
        field: 'date',
        width: 110,
        sort: 'desc',
        valueFormatter: (params) => {
          if (!params.value) return '—';
          return formatAuDisplayDate(params.value);
        },
      },
      {
        headerName: 'Description',
        field: 'description',
        flex: 1.5,
        minWidth: 180,
        cellRenderer: (params: any) => {
          const data = params.data;
          if (!data) return null;
          return (
            <div className="flex flex-col justify-center h-full">
              <span className="font-medium text-admin-foreground truncate text-xs">
                {data.description || 'Transaction'}
              </span>
              {data.reference && (
                <span className="text-[10px] text-admin-muted font-mono truncate">
                  Ref: {data.reference}
                </span>
              )}
            </div>
          );
        },
      },
      {
        headerName: 'Property',
        field: 'propertyName',
        flex: 1,
        minWidth: 150,
        cellRenderer: (params: any) => {
          const name = params.value;
          if (!name) return <span className="text-admin-muted">—</span>;
          return (
            <div className="flex items-center gap-1.5 h-full text-xs text-admin-foreground truncate">
              <Building className="h-3.5 w-3.5 shrink-0 text-admin-muted" />
              <span className="truncate">{name}</span>
            </div>
          );
        },
      },
      {
        headerName: 'Type',
        field: 'type',
        width: 100,
        cellRenderer: (params: any) => {
          const isIncome = params.value === 'income';
          return (
            <div className="flex items-center h-full">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                  isIncome
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}
              >
                {isIncome ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {isIncome ? 'Income' : 'Expense'}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Category',
        field: 'category',
        width: 140,
        cellRenderer: (params: any) => {
          const cat = params.value;
          if (!cat) return <span className="text-admin-muted">—</span>;
          return (
            <div className="flex items-center h-full">
              <span className="inline-flex items-center gap-1 rounded-md bg-admin-surface-subtle border border-admin-border px-2 py-0.5 text-xs text-admin-foreground truncate">
                <Tag className="h-3 w-3 text-admin-muted" />
                <span className="truncate">{cat}</span>
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Tax Classification',
        field: 'taxClassification',
        width: 160,
        cellRenderer: (params: any) => {
          const tc = params.value;
          if (!tc) {
            return (
              <span className="text-[11px] text-admin-warning font-medium italic">
                Unclassified
              </span>
            );
          }
          return (
            <span className="text-xs text-admin-foreground truncate">
              {tc}
            </span>
          );
        },
      },
      {
        headerName: 'BAS Code',
        field: 'basCode',
        width: 95,
        cellRenderer: (params: any) => {
          const code = params.value;
          if (!code) return <span className="text-admin-muted">—</span>;
          return (
            <div className="flex items-center h-full">
              <span className="rounded bg-admin-primary/10 border border-admin-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-admin-primary">
                {code}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Gross Amount',
        field: 'amount',
        width: 120,
        type: 'rightAligned',
        cellRenderer: (params: any) => {
          const val = params.value;
          return (
            <span className="font-mono font-semibold text-xs text-admin-foreground">
              {formatCurrency(val)}
            </span>
          );
        },
      },
      {
        headerName: 'GST Amount',
        field: 'gstAmount',
        width: 110,
        type: 'rightAligned',
        cellRenderer: (params: any) => {
          const val = params.value;
          const isIncome = params.data?.type === 'income';
          return (
            <span
              className={`font-mono font-medium text-xs ${
                val === 0
                  ? 'text-admin-muted'
                  : isIncome
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {formatCurrency(val)}
            </span>
          );
        },
      },
      {
        headerName: 'Net Amount',
        field: 'netAmount',
        width: 110,
        type: 'rightAligned',
        cellRenderer: (params: any) => {
          const val = params.value;
          return (
            <span className="font-mono text-xs text-admin-muted">
              {formatCurrency(val)}
            </span>
          );
        },
      },
    ];
  }, []);

  return (
    <div className="space-y-3 h-full flex flex-col">
      <ListPageGrid className="min-h-[480px]">
        <AdminDataGrid
          rowData={filteredTransactions}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          enableColumnChooser
          enableExport
          exportFilename={`bas-audit-ledger-${periodLabel.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
          searchPlaceholder="Search BAS ledger entries, descriptions, categories..."
          leftToolbarContent={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="rounded-lg border border-admin-border bg-admin-surface px-2.5 py-1.5 text-xs font-medium text-admin-foreground focus:outline-none cursor-pointer"
              >
                <option value="all">All Types (Income & Expenses)</option>
                <option value="income">Income Only</option>
                <option value="expense">Expenses Only</option>
              </select>

              {/* Classification Filter */}
              {classifications.length > 0 && (
                <select
                  value={selectedClassification}
                  onChange={(e) => setSelectedClassification(e.target.value)}
                  className="rounded-lg border border-admin-border bg-admin-surface px-2.5 py-1.5 text-xs font-medium text-admin-foreground focus:outline-none cursor-pointer"
                >
                  <option value="all">All Tax Classifications</option>
                  {classifications.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>
          }
          emptyTitle="No BAS transactions found"
          emptyDescription="No ledger entries match the selected period or filters."
        />
      </ListPageGrid>
    </div>
  );
}
