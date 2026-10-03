'use client';

import React from 'react';
import {
  Calendar,
  Building2,
  Tag,
  Search,
  RotateCcw,
  SlidersHorizontal,
  ArrowLeftRight,
  RefreshCw,
} from 'lucide-react';
import { FinanceReportFilters } from '@/modules/finance/domain/reporting-types';
import { getFinancialYears, getCurrentFinancialYear } from '@/lib/finance/financial-year';
import { cn } from '@/lib/utils';

interface ReportFilterBarProps {
  filters: FinanceReportFilters;
  onFilterChange: (newFilters: FinanceReportFilters) => void;
  properties: Array<{ id: string; name: string; address_line_1?: string }>;
  categories: Array<{ id: string; name: string; type?: string }>;
  taxClassifications: Array<{ id: string; name: string; code?: string }>;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function ReportFilterBar({
  filters,
  onFilterChange,
  properties,
  categories,
  taxClassifications,
  onRefresh,
  isRefreshing = false,
  className,
}: ReportFilterBarProps) {
  const currentFY = getCurrentFinancialYear();
  const availableFYs = getFinancialYears({ countBack: 4, countForward: 1 });

  const handleFYChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      onFilterChange({
        ...filters,
        financialYear: undefined,
      });
    } else {
      onFilterChange({
        ...filters,
        financialYear: val,
        dateFrom: undefined,
        dateTo: undefined,
      });
    }
  };

  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onFilterChange({
      ...filters,
      propertyId: val === 'all' ? undefined : val,
    });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onFilterChange({
      ...filters,
      categoryId: val === 'all' ? undefined : val,
    });
  };

  const handleTransactionTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'all' | 'income' | 'expense';
    onFilterChange({
      ...filters,
      transactionType: val === 'all' ? undefined : val,
    });
  };

  const handleTaxClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onFilterChange({
      ...filters,
      taxClassificationId: val === 'all' ? undefined : val,
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      search: e.target.value || undefined,
    });
  };

  const handleReset = () => {
    onFilterChange({
      financialYear: currentFY,
      propertyId: undefined,
      categoryId: undefined,
      transactionType: undefined,
      taxClassificationId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      search: undefined,
    });
  };

  const isCustomDates = !filters.financialYear && (filters.dateFrom || filters.dateTo);

  return (
    <div className={cn('bg-white dark:bg-[#0B1726] border border-border rounded-2xl p-4 shadow-2xs space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2.5">
        {/* 1. Financial Year Selector */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#07111F] border border-slate-200 dark:border-slate-800 rounded-xl px-3 h-10 focus-within:ring-2 focus-within:ring-[#008F83]/20 focus-within:border-[#008F83]">
          <Calendar className="w-4 h-4 text-[#008F83] dark:text-[#32D5C4] shrink-0" />
          <select
            value={filters.financialYear ? String(filters.financialYear) : isCustomDates ? 'custom' : String(currentFY)}
            onChange={handleFYChange}
            aria-label="Filter by Financial Year"
            className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
          >
            {availableFYs.map((opt) => (
              <option key={opt.value} value={opt.value} className="dark:bg-[#0B1726]">
                {opt.label}
              </option>
            ))}
            <option value="custom" className="dark:bg-[#0B1726]">
              Custom Date Range...
            </option>
          </select>
        </div>

        {/* 2. Property Selector */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#07111F] border border-slate-200 dark:border-slate-800 rounded-xl px-3 h-10 focus-within:ring-2 focus-within:ring-[#008F83]/20 focus-within:border-[#008F83]">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filters.propertyId || 'all'}
            onChange={handlePropertyChange}
            aria-label="Filter by Property"
            className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[170px] truncate"
          >
            <option value="all" className="dark:bg-[#0B1726]">
              All Properties ({properties.length})
            </option>
            {properties.map((p) => (
              <option key={p.id} value={p.id} className="dark:bg-[#0B1726]">
                {p.name || p.address_line_1}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Category Filter */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#07111F] border border-slate-200 dark:border-slate-800 rounded-xl px-3 h-10 focus-within:ring-2 focus-within:ring-[#008F83]/20 focus-within:border-[#008F83]">
          <Tag className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filters.categoryId || 'all'}
            onChange={handleCategoryChange}
            aria-label="Filter by Category"
            className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[150px] truncate"
          >
            <option value="all" className="dark:bg-[#0B1726]">
              All Categories
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="dark:bg-[#0B1726]">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Transaction Type Selector */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#07111F] border border-slate-200 dark:border-slate-800 rounded-xl px-3 h-10 focus-within:ring-2 focus-within:ring-[#008F83]/20 focus-within:border-[#008F83]">
          <ArrowLeftRight className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filters.transactionType || 'all'}
            onChange={handleTransactionTypeChange}
            aria-label="Filter by Transaction Type"
            className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all" className="dark:bg-[#0B1726]">All Transactions</option>
            <option value="income" className="dark:bg-[#0B1726]">Income Only</option>
            <option value="expense" className="dark:bg-[#0B1726]">Expenses Only</option>
          </select>
        </div>

        {/* 5. Live Search Input */}
        <div className="flex-1 min-w-[160px] flex items-center gap-2 bg-slate-50 dark:bg-[#07111F] border border-slate-200 dark:border-slate-800 rounded-xl px-3 h-10 focus-within:ring-2 focus-within:ring-[#008F83]/20 focus-within:border-[#008F83]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search vendor, description, ref..."
            value={filters.search || ''}
            onChange={handleSearchChange}
            className="w-full bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* 6. Action Controls: Refresh & Reset */}
        <div className="flex items-center gap-2 shrink-0">
          {onRefresh && (
            <button
              type="button"
              disabled={isRefreshing}
              onClick={onRefresh}
              className="flex items-center justify-center h-10 w-10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-[#07111F] border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh financial report"
              aria-label="Refresh financial report"
            >
              <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin text-[#008F83]')} />
            </button>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 h-10 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-[#07111F] border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Reset filters to current FY default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Panel (Visible if custom selected) */}
      {(!filters.financialYear || isCustomDates) && (
        <div className="flex items-center gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="font-semibold text-slate-500 dark:text-slate-400">Custom Date Range:</span>
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => onFilterChange({ ...filters, financialYear: undefined, dateFrom: e.target.value })}
            className="bg-slate-50 dark:bg-[#07111F] border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
          />
          <span className="text-slate-400">→</span>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => onFilterChange({ ...filters, financialYear: undefined, dateTo: e.target.value })}
            className="bg-slate-50 dark:bg-[#07111F] border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
