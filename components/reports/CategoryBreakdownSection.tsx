'use client';

import React from 'react';
import { CategoryFinancialSummary } from '@/modules/finance/domain/reporting-types';
import { formatCurrency } from '@/lib/format/currency';
import { cn } from '@/lib/utils';
import { Tag, Receipt } from 'lucide-react';

interface CategoryBreakdownSectionProps {
  incomeCategories: CategoryFinancialSummary[];
  expenseCategories: CategoryFinancialSummary[];
  totalIncome: number;
  totalExpenses: number;
  className?: string;
}

export function CategoryBreakdownSection({
  incomeCategories = [],
  expenseCategories = [],
  totalIncome,
  totalExpenses,
  className,
}: CategoryBreakdownSectionProps) {
  // Sort descending by amount
  const sortedIncome = [...incomeCategories].sort((a, b) => b.totalAmount - a.totalAmount);
  const sortedExpenses = [...expenseCategories].sort((a, b) => b.totalAmount - a.totalAmount);

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5', className)}>
      {/* 1. Income by Category */}
      <div className="bg-white dark:bg-[#0B1726] border border-border rounded-2xl p-5 lg:p-6 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Income by Category
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Revenue streams and rental inflows
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#008F83]/10 text-[#008F83] dark:text-[#32D5C4]">
              {sortedIncome.length} {sortedIncome.length === 1 ? 'Category' : 'Categories'}
            </span>
          </div>

          {sortedIncome.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
              No income transactions recorded for this period.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {sortedIncome.map((cat) => {
                const percent =
                  totalIncome > 0
                    ? Math.round((cat.totalAmount / totalIncome) * 100)
                    : cat.percentage || 0;

                return (
                  <div key={cat.categoryId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {cat.categoryName}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                          ({cat.transactionCount} {cat.transactionCount === 1 ? 'txn' : 'txns'})
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums">
                          {percent}%
                        </span>
                        <span className="font-bold text-[#008F83] dark:text-[#32D5C4] tabular-nums">
                          {formatCurrency(cat.totalAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
                        className="h-full rounded-full bg-[#008F83] transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. Expenses by Category */}
      <div className="bg-white dark:bg-[#0B1726] border border-border rounded-2xl p-5 lg:p-6 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Expenses by Category
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Operating expenses, repairs, and capital works
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
              {sortedExpenses.length} {sortedExpenses.length === 1 ? 'Category' : 'Categories'}
            </span>
          </div>

          {sortedExpenses.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
              No expense transactions recorded for this period.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {sortedExpenses.map((cat) => {
                const percent =
                  totalExpenses > 0
                    ? Math.round((cat.totalAmount / totalExpenses) * 100)
                    : cat.percentage || 0;

                return (
                  <div key={cat.categoryId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {cat.categoryName}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                          ({cat.transactionCount} {cat.transactionCount === 1 ? 'txn' : 'txns'})
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums">
                          {percent}%
                        </span>
                        <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                          {formatCurrency(cat.totalAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
                        className="h-full rounded-full bg-rose-500 transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
