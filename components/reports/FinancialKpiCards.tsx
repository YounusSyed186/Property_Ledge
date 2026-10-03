'use client';

import React from 'react';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/format/currency';
import { cn } from '@/lib/utils';

interface FinancialKpiCardsProps {
  totalIncome: number;
  totalExpenses: number;
  netResult: number;
  transactionCount: number;
  className?: string;
}

export function FinancialKpiCards({
  totalIncome,
  totalExpenses,
  netResult,
  transactionCount,
  className,
}: FinancialKpiCardsProps) {
  const isProfitable = netResult >= 0;

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5', className)}>
      {/* 1. Total Income */}
      <div className="bg-white dark:bg-[#0B1726] border border-border rounded-2xl p-5 lg:p-6 shadow-2xs flex flex-col justify-between min-h-[130px] transition-all hover:border-slate-300 dark:hover:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Income
          </span>
          <div className="w-9 h-9 rounded-xl bg-[#008F83]/10 text-[#008F83] dark:text-[#32D5C4] flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold tabular-nums text-slate-900 dark:text-white tracking-tight">
            {formatCurrency(totalIncome)}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Operating revenue & rental receipts
          </p>
        </div>
      </div>

      {/* 2. Total Expenses */}
      <div className="bg-white dark:bg-[#0B1726] border border-border rounded-2xl p-5 lg:p-6 shadow-2xs flex flex-col justify-between min-h-[130px] transition-all hover:border-slate-300 dark:hover:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Expenses
          </span>
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold tabular-nums text-rose-600 dark:text-rose-400 tracking-tight">
            {formatCurrency(totalExpenses)}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {transactionCount} transactions recorded
          </p>
        </div>
      </div>

      {/* 3. Net Profit */}
      <div className="bg-white dark:bg-[#0B1726] border border-border rounded-2xl p-5 lg:p-6 shadow-2xs flex flex-col justify-between min-h-[130px] transition-all hover:border-slate-300 dark:hover:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Net Profit
          </span>
          <div
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center',
              isProfitable
                ? 'bg-[#008F83]/10 text-[#008F83] dark:text-[#32D5C4]'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            )}
          >
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div
            className={cn(
              'text-2xl sm:text-3xl font-bold tabular-nums tracking-tight',
              isProfitable
                ? 'text-[#008F83] dark:text-[#32D5C4]'
                : 'text-rose-600 dark:text-rose-400'
            )}
          >
            {formatCurrency(netResult)}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {isProfitable ? 'Operating cash surplus' : 'Operating cash deficit'}
          </p>
        </div>
      </div>
    </div>
  );
}
