'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  MonthlyFinancialSummary,
  CategoryFinancialSummary,
} from '@/modules/finance/domain/reporting-types';
import { formatCurrency, formatCompactCurrency } from '@/lib/format/currency';
import { cn } from '@/lib/utils';
import { Receipt, AlertCircle } from 'lucide-react';

interface IncomeExpenseAnalyticsProps {
  monthlyTrends: MonthlyFinancialSummary[];
  totalIncome: number;
  totalExpenses: number;
  netResult: number;
  gstCollected?: number;
  gstPaid?: number;
  netGstPayable?: number;
  className?: string;
}

export function IncomeExpenseAnalytics({
  monthlyTrends,
  totalIncome,
  totalExpenses,
  netResult,
  gstCollected = 0,
  gstPaid = 0,
  netGstPayable = 0,
  className,
}: IncomeExpenseAnalyticsProps) {
  // Check if there is any financial activity in the period
  const hasActivity = totalIncome > 0 || totalExpenses > 0 || monthlyTrends.some((m) => m.income > 0 || m.expenses > 0);

  // Profit Margin Calculation (safe against division by 0)
  const profitMargin = useMemo(() => {
    if (!totalIncome || totalIncome <= 0) return null;
    const margin = (netResult / totalIncome) * 100;
    return margin;
  }, [totalIncome, netResult]);

  // Donut Ring Gauge Math
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const safePercentage = profitMargin !== null ? Math.max(0, Math.min(100, profitMargin)) : 0;
  const strokeDashoffset = circumference - (safePercentage / 100) * circumference;

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch', className)}>
      {/* LEFT (~68% / 8 cols): Income vs Expenses Grouped Bar + Line Chart */}
      <div className="lg:col-span-8 bg-white dark:bg-[#0B1726] border border-border rounded-2xl p-5 lg:p-6 shadow-2xs flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Income vs Expenses
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Monthly income, expenses, and net profit trajectory
              </p>
            </div>

            {/* Custom Chart Legend */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#008F83]" />
                <span className="text-slate-600 dark:text-slate-300">Income</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
                <span className="text-slate-600 dark:text-slate-300">Expenses</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-slate-900 dark:bg-[#32D5C4]" />
                <span className="text-slate-600 dark:text-slate-300">Net Profit</span>
              </div>
            </div>
          </div>

          {/* Visualization Area */}
          <div className="mt-5 w-full h-[280px] sm:h-[300px]">
            {!hasActivity ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <AlertCircle className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-2" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No financial activity for this period
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
                  Try changing the financial year, selecting a different property, or adjusting your filters.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={monthlyTrends}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(148, 163, 184, 0.15)"
                  />
                  <XAxis
                    dataKey="shortLabel"
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    dy={6}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={(val) => formatCompactCurrency(val)}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(148, 163, 184, 0.06)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0]?.payload as MonthlyFinancialSummary;
                      if (!item) return null;

                      return (
                        <div className="rounded-xl border border-border bg-white dark:bg-[#07111F] p-3 shadow-xl text-xs space-y-2 min-w-[170px]">
                          <div className="font-bold text-slate-900 dark:text-white pb-1.5 border-b border-slate-100 dark:border-slate-800">
                            {item.label}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-slate-500 dark:text-slate-400">Income:</span>
                              <span className="font-bold text-[#008F83] dark:text-[#32D5C4] tabular-nums">
                                {formatCurrency(item.income)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-slate-500 dark:text-slate-400">Expenses:</span>
                              <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                                {formatCurrency(item.expenses)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Net Profit:</span>
                              <span
                                className={cn(
                                  'font-bold tabular-nums',
                                  item.net >= 0 ? 'text-[#008F83] dark:text-[#32D5C4]' : 'text-rose-600 dark:text-rose-400'
                                )}
                              >
                                {formatCurrency(item.net)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#008F83"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Expenses"
                    fill="#E11D48"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net Profit"
                    stroke="#0F172A"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#008F83', strokeWidth: 1.5, stroke: '#FFFFFF' }}
                    activeDot={{ r: 5, fill: '#008F83', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT (~32% / 4 cols): Financial Snapshot & Profit Margin Donut */}
      <div className="lg:col-span-4 bg-white dark:bg-[#0B1726] border border-border rounded-2xl p-5 lg:p-6 shadow-2xs flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Financial Snapshot
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Key performance ratio & net position
            </p>
          </div>

          {/* Profit Margin Circular Donut */}
          <div className="mt-4 flex flex-col items-center justify-center">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                {/* Background Ring */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  className="text-slate-100 dark:text-[#152538]"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                />
                {/* Active Profit Margin Arc */}
                {profitMargin !== null && profitMargin > 0 && (
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    className="text-[#008F83] dark:text-[#32D5C4] transition-all duration-700 ease-out"
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                )}
              </svg>

              {/* Center Metric */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-heading text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {profitMargin !== null ? `${profitMargin.toFixed(1)}%` : '—'}
                </span>
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  Profit Margin
                </span>
              </div>
            </div>
          </div>

          {/* Summary Breakdown Metrics */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-[#008F83]" />
                <span>Total Income</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                {formatCurrency(totalIncome)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Total Expenses</span>
              </div>
              <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                {formatCurrency(totalExpenses)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white" />
                <span>Net Profit</span>
              </div>
              <span
                className={cn(
                  'font-bold tabular-nums',
                  netResult >= 0 ? 'text-[#008F83] dark:text-[#32D5C4]' : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {formatCurrency(netResult)}
              </span>
            </div>

            {/* GST Position (Secondary Metric) */}
            <div className="flex items-center justify-between pt-1.5 text-[11.5px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-slate-400" />
                <span>Net GST Position</span>
              </div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                {formatCurrency(netGstPayable)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
