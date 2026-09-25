'use client';

import React from 'react';
import {
  Calendar,
  Building2,
  Tag,
  Search,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { FinanceReportFilters } from '@/modules/finance/domain/reporting-types';
import { getFinancialYears, getFinancialYearLabel, getCurrentFinancialYear } from '@/lib/finance/financial-year';

interface ReportFilterBarProps {
  filters: FinanceReportFilters;
  onFilterChange: (newFilters: FinanceReportFilters) => void;
  properties: Array<{ id: string; name: string; address_line_1?: string }>;
  categories: Array<{ id: string; name: string; type?: string }>;
  taxClassifications: Array<{ id: string; name: string; code?: string }>;
}

export function ReportFilterBar({
  filters,
  onFilterChange,
  properties,
  categories,
  taxClassifications,
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
    });
  };

  const isCustomDates = !filters.financialYear && (filters.dateFrom || filters.dateTo);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3.5 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        {/* Financial Year Selector */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500/20">
          <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Year:</span>
          <select
            value={filters.financialYear ? String(filters.financialYear) : isCustomDates ? 'custom' : String(currentFY)}
            onChange={handleFYChange}
            className="bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-2"
          >
            {availableFYs.map((opt) => (
              <option key={opt.value} value={opt.value} className="dark:bg-slate-900">
                {opt.label}
              </option>
            ))}
            <option value="custom" className="dark:bg-slate-900">
              Custom Date Range...
            </option>
          </select>
        </div>

        {/* Property Selector */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500/20">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Property:</span>
          <select
            value={filters.propertyId || 'all'}
            onChange={handlePropertyChange}
            className="bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[180px] truncate"
          >
            <option value="all" className="dark:bg-slate-900">
              All Properties ({properties.length})
            </option>
            {properties.map((p) => (
              <option key={p.id} value={p.id} className="dark:bg-slate-900">
                {p.name || p.address_line_1}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500/20">
          <Tag className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Category:</span>
          <select
            value={filters.categoryId || 'all'}
            onChange={handleCategoryChange}
            className="bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[160px] truncate"
          >
            <option value="all" className="dark:bg-slate-900">
              All Categories
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="dark:bg-slate-900">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tax Classification Filter */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500/20">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tax Class:</span>
          <select
            value={filters.taxClassificationId || 'all'}
            onChange={handleTaxClassChange}
            className="bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[160px] truncate"
          >
            <option value="all" className="dark:bg-slate-900">
              All Classifications
            </option>
            {taxClassifications.map((t) => (
              <option key={t.id} value={t.id} className="dark:bg-slate-900">
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Live Search Input */}
        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500/20">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search description, vendor, ref..."
            value={filters.search || ''}
            onChange={handleSearchChange}
            className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* Reset Button */}
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          title="Reset to current FY default"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Custom Date Range Panel (Visible if custom selected) */}
      {(!filters.financialYear || isCustomDates) && (
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-sm">
          <span className="text-xs font-semibold text-slate-500">Custom Range:</span>
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => onFilterChange({ ...filters, financialYear: undefined, dateFrom: e.target.value })}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => onFilterChange({ ...filters, financialYear: undefined, dateTo: e.target.value })}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
