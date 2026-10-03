'use client';

import React from 'react';
import { MonthlyFinancialSummary } from '@/modules/finance/domain/reporting-types';
import { formatCurrency } from '@/lib/format/currency';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

interface MonthlyBreakdownTableProps {
  monthlyTrends: MonthlyFinancialSummary[];
  totalIncome: number;
  totalExpenses: number;
  netResult: number;
  totalGstCollected: number;
  totalGstPaid: number;
  className?: string;
}

export function MonthlyBreakdownTable({
  monthlyTrends,
  totalIncome,
  totalExpenses,
  netResult,
  totalGstCollected,
  totalGstPaid,
  className,
}: MonthlyBreakdownTableProps) {
  const isOverallProfitable = netResult >= 0;

  return (
    <div className={cn('bg-white dark:bg-[#0B1726] border border-border rounded-2xl p-5 lg:p-6 shadow-2xs space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Monthly Financial Breakdown
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            A detailed breakdown of income, expenses, and profit by month across the Australian Financial Year
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>12 Months (Jul → Jun)</span>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto -mx-1 sm:mx-0">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/60 dark:bg-slate-900/40">
              <th className="py-3 px-4 rounded-l-lg font-semibold">Month</th>
              <th className="py-3 px-4 text-right font-semibold">Income ($)</th>
              <th className="py-3 px-4 text-right font-semibold">Expenses ($)</th>
              <th className="py-3 px-4 text-right font-semibold">Net Profit ($)</th>
              <th className="py-3 px-4 text-right font-semibold">GST Collected</th>
              <th className="py-3 px-4 text-right rounded-r-lg font-semibold">GST Paid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {monthlyTrends.map((m) => {
              const isMonthProfitable = m.net >= 0;
              const hasActivity = m.income > 0 || m.expenses > 0;

              return (
                <tr
                  key={m.key}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                >
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {m.label}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-[#008F83] dark:text-[#32D5C4] tabular-nums whitespace-nowrap">
                    {formatCurrency(m.income)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400 tabular-nums whitespace-nowrap">
                    {formatCurrency(m.expenses)}
                  </td>
                  <td
                    className={cn(
                      'py-3 px-4 text-right font-bold tabular-nums whitespace-nowrap',
                      hasActivity
                        ? isMonthProfitable
                          ? 'text-[#008F83] dark:text-[#32D5C4]'
                          : 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-400 dark:text-slate-500'
                    )}
                  >
                    {formatCurrency(m.net)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap">
                    {formatCurrency(m.gstCollected)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap">
                    {formatCurrency(m.gstPaid)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 dark:border-slate-700 font-bold bg-slate-50 dark:bg-[#07111F] text-slate-900 dark:text-white">
              <td className="py-3.5 px-4 rounded-l-lg font-bold">Total</td>
              <td className="py-3.5 px-4 text-right text-[#008F83] dark:text-[#32D5C4] tabular-nums whitespace-nowrap font-bold">
                {formatCurrency(totalIncome)}
              </td>
              <td className="py-3.5 px-4 text-right text-rose-600 dark:text-rose-400 tabular-nums whitespace-nowrap font-bold">
                {formatCurrency(totalExpenses)}
              </td>
              <td
                className={cn(
                  'py-3.5 px-4 text-right tabular-nums whitespace-nowrap font-bold',
                  isOverallProfitable ? 'text-[#008F83] dark:text-[#32D5C4]' : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {formatCurrency(netResult)}
              </td>
              <td className="py-3.5 px-4 text-right tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-300 font-bold">
                {formatCurrency(totalGstCollected)}
              </td>
              <td className="py-3.5 px-4 text-right rounded-r-lg tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-300 font-bold">
                {formatCurrency(totalGstPaid)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
