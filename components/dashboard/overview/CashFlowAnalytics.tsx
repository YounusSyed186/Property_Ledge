'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Minus,
} from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/format/currency';
import type { MonthlyBreakdownItem } from '@/lib/dashboard/queries';
import { cn } from '@/lib/utils';

type TimeRange = '3M' | '6M' | '12M' | 'FY';
type ChartMode = 'bars' | 'net';

interface CashFlowAnalyticsProps {
  totalRevenue: number;
  totalExpenses: number;
  netCashFlow: number;
  outstandingBalance: number;
  monthlyBreakdown?: MonthlyBreakdownItem[];
  activeLeasesCount?: number;
  className?: string;
}

export function CashFlowAnalytics({
  totalRevenue,
  totalExpenses,
  netCashFlow,
  outstandingBalance,
  monthlyBreakdown = [],
  activeLeasesCount = 0,
  className,
}: CashFlowAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');
  const [chartMode, setChartMode] = useState<ChartMode>('bars');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Filter breakdown data based on time range
  const filteredData = useMemo(() => {
    if (!monthlyBreakdown.length) return [];
    switch (timeRange) {
      case '3M':
        return monthlyBreakdown.slice(-3);
      case '6M':
        return monthlyBreakdown.slice(-6);
      case '12M':
      case 'FY':
      default:
        return monthlyBreakdown.slice(-12);
    }
  }, [monthlyBreakdown, timeRange]);

  // Max value for scaling SVG chart bars
  const maxBarValue = useMemo(() => {
    if (!filteredData.length) return 1000;
    const max = Math.max(
      ...filteredData.map((d) => Math.max(d.income, d.expenses, Math.abs(d.netCashFlow))),
      1
    );
    return Math.ceil(max * 1.15); // +15% breathing room
  }, [filteredData]);

  const isNetPositive = netCashFlow >= 0;
  const totalOperatingVolume = totalRevenue + totalExpenses;
  const incomeShare = totalOperatingVolume > 0 ? Math.round((totalRevenue / totalOperatingVolume) * 100) : 100;
  const expenseShare = 100 - incomeShare;
  const netMargin = totalRevenue > 0 ? Math.round((netCashFlow / totalRevenue) * 100) : 0;

  const totalInvoiced = totalRevenue + outstandingBalance;
  const collectionRate = totalInvoiced > 0 ? Math.round((totalRevenue / totalInvoiced) * 100) : 100;

  const activeHoverItem = hoveredIdx !== null && filteredData[hoveredIdx] ? filteredData[hoveredIdx] : null;

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch', className)}>
      {/* LEFT (8 COLS / ~68%): Dominant Financial Cash Flow Hero */}
      <div className="lg:col-span-8 rounded-[24px] border border-slate-200/80 dark:border-[#17283A] bg-white dark:bg-[#07111F] p-6 lg:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none flex flex-col justify-between">
        <div>
          {/* Header & Clean Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
            <div>
              <h3 className="text-xl font-heading font-bold text-slate-900 dark:text-white tracking-tight">
                Cash flow
              </h3>
              <p className="text-xs text-slate-400 dark:text-[#7F8B99] mt-0.5">
                Monthly revenue vs. verified operating expenses
              </p>
            </div>

            {/* Time Range Selector & Mode Toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Dual / Net Mode Switch */}
              <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-[#0E1E33] text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setChartMode('bars')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all cursor-pointer',
                    chartMode === 'bars'
                      ? 'bg-white dark:bg-[#008F83] text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 dark:text-[#7F8B99] hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  Dual series
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('net')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all cursor-pointer',
                    chartMode === 'net'
                      ? 'bg-white dark:bg-[#008F83] text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 dark:text-[#7F8B99] hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  Net flow
                </button>
              </div>

              {/* Time Range Buttons */}
              <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-[#0E1E33] text-[11px] font-semibold">
                {(['3M', '6M', '12M', 'FY'] as TimeRange[]).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setTimeRange(range)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg transition-all cursor-pointer',
                      timeRange === range
                        ? 'bg-white dark:bg-[#1E293B] text-[#008F83] dark:text-[#32D5C4] shadow-xs font-bold'
                        : 'text-slate-500 dark:text-[#7F8B99] hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Hover / Metric Callout */}
          <div className="h-6 flex items-center justify-between text-xs mt-1">
            {activeHoverItem ? (
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-900 dark:text-white">
                  {activeHoverItem.month} {activeHoverItem.year}:
                </span>
                <span className="text-[#008F83] dark:text-[#32D5C4] font-semibold">
                  Income: {formatCurrencyNoDecimals(activeHoverItem.income)}
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  Expenses: {formatCurrencyNoDecimals(activeHoverItem.expenses)}
                </span>
                <span className="text-slate-700 dark:text-slate-200 font-semibold">
                  Net: {formatCurrencyNoDecimals(activeHoverItem.netCashFlow)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-slate-500 dark:text-[#7F8B99]">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-[#008F83] dark:bg-[#32D5C4]" />
                  Income
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Expenses
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                  Net margin
                </span>
              </div>
            )}
          </div>

          {/* Large Hero Chart Canvas */}
          <div className="mt-4 relative h-60 sm:h-68 w-full">
            {/* Subtle Gridlines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-30">
              <div className="border-b border-dashed border-slate-200 dark:border-[#17283A] w-full" />
              <div className="border-b border-dashed border-slate-200 dark:border-[#17283A] w-full" />
              <div className="border-b border-dashed border-slate-200 dark:border-[#17283A] w-full" />
              <div className="border-b border-slate-200 dark:border-[#17283A] w-full" />
            </div>

            {/* Bars Canvas */}
            {filteredData.length > 0 ? (
              <div className="relative h-full flex items-end justify-between gap-2 sm:gap-4 px-2 pt-4 pb-8">
                {filteredData.map((item, idx) => {
                  const incomeHeight = maxBarValue > 0 ? Math.max(6, (item.income / maxBarValue) * 100) : 6;
                  const expenseHeight = maxBarValue > 0 ? Math.max(6, (item.expenses / maxBarValue) * 100) : 6;
                  const netHeight = maxBarValue > 0 ? Math.max(6, (Math.abs(item.netCashFlow) / maxBarValue) * 100) : 6;
                  const isHovered = hoveredIdx === idx;

                  return (
                    <div
                      key={item.isoMonth}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                    >
                      {/* Dual Bar Mode */}
                      {chartMode === 'bars' ? (
                        <div className="w-full max-w-[48px] flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                          {/* Income Bar */}
                          <div className="flex-1 h-full flex items-end">
                            <div
                              style={{ height: `${item.income > 0 ? incomeHeight : 4}%` }}
                              className={cn(
                                'w-full rounded-t-lg transition-all duration-300',
                                item.income > 0
                                  ? isHovered
                                    ? 'bg-[#32D5C4] shadow-[0_0_12px_rgba(50,213,196,0.5)]'
                                    : 'bg-[#008F83] dark:bg-[#32D5C4]'
                                  : 'bg-slate-200 dark:bg-slate-800'
                              )}
                            />
                          </div>

                          {/* Expense Bar */}
                          <div className="flex-1 h-full flex items-end">
                            <div
                              style={{ height: `${item.expenses > 0 ? expenseHeight : 4}%` }}
                              className={cn(
                                'w-full rounded-t-lg transition-all duration-300',
                                item.expenses > 0
                                  ? isHovered
                                    ? 'bg-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                                    : 'bg-rose-500'
                                  : 'bg-slate-200 dark:bg-slate-800'
                              )}
                            />
                          </div>
                        </div>
                      ) : (
                        /* Net Flow Mode */
                        <div className="w-full max-w-[32px] h-full flex items-end justify-center">
                          <div
                            style={{ height: `${item.netCashFlow !== 0 ? netHeight : 4}%` }}
                            className={cn(
                              'w-full rounded-t-lg transition-all duration-300',
                              item.netCashFlow >= 0
                                ? isHovered
                                  ? 'bg-[#32D5C4] shadow-[0_0_12px_rgba(50,213,196,0.6)]'
                                  : 'bg-[#008F83] dark:bg-[#32D5C4]'
                                : isHovered
                                ? 'bg-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                                : 'bg-rose-500'
                            )}
                          />
                        </div>
                      )}

                      {/* Month Label */}
                      <span
                        className={cn(
                          'absolute -bottom-6 text-[11.5px] font-semibold transition-colors',
                          isHovered
                            ? 'text-[#008F83] dark:text-[#32D5C4] font-bold'
                            : 'text-slate-400 dark:text-[#7F8B99]'
                        )}
                      >
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400 dark:text-[#7F8B99]">
                No financial records recorded for this period.
              </div>
            )}
          </div>
        </div>

        {/* Footer Metrics */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[#17283A]/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 text-slate-500 dark:text-[#7F8B99]">
            <span>
              Period volume: <strong className="text-slate-900 dark:text-white tabular-nums font-semibold">{formatCurrencyNoDecimals(totalOperatingVolume)}</strong>
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              Net margin: <strong className={cn('tabular-nums font-bold', isNetPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600')}>{netMargin}%</strong>
            </span>
          </div>

          <Link
            href="/dashboard/money"
            className="font-semibold text-[#008F83] dark:text-[#32D5C4] hover:underline inline-flex items-center gap-1"
          >
            <span>Complete ledger</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* RIGHT (4 COLS / ~32%): Financial Summary (Single Surface, No Card-in-Card) */}
      <div className="lg:col-span-4 rounded-[24px] border border-slate-200/80 dark:border-[#17283A] bg-white dark:bg-[#07111F] p-6 lg:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-heading font-bold text-slate-900 dark:text-white tracking-tight">
              Financial summary
            </h3>
            <span className="text-[11px] font-bold text-slate-400 dark:text-[#7F8B99]">
              AUD
            </span>
          </div>

          {/* Primary Net Cash Flow Metric */}
          <div className="mt-5">
            <p className="font-heading text-3xl sm:text-4xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
              {formatCurrencyNoDecimals(netCashFlow)}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-[#7F8B99]">
                Net cash flow
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full text-[10.5px] font-bold',
                  isNetPositive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                )}
              >
                {isNetPositive ? 'Surplus' : 'Deficit'}
              </span>
            </div>
          </div>

          {/* Income & Expenses Breakdown */}
          <div className="mt-7 space-y-4">
            {/* Income */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-[#94A3B8] font-medium">Income</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {formatCurrencyNoDecimals(totalRevenue)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-[#0E1E33] overflow-hidden">
                <div
                  style={{ width: `${incomeShare}%` }}
                  className="h-full rounded-full bg-[#008F83] dark:bg-[#32D5C4] transition-all duration-500"
                />
              </div>
            </div>

            {/* Expenses */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-[#94A3B8] font-medium">Expenses</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {formatCurrencyNoDecimals(totalExpenses)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-[#0E1E33] overflow-hidden">
                <div
                  style={{ width: `${expenseShare}%` }}
                  className="h-full rounded-full bg-rose-500 transition-all duration-500"
                />
              </div>
            </div>
          </div>

          {/* Collection Rate Efficiency */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-[#17283A]/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-[#7F8B99]">Collection rate</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                {collectionRate}%
              </span>
            </div>

            {outstandingBalance > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-600 dark:text-amber-400">Outstanding invoices</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {formatCurrencyNoDecimals(outstandingBalance)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Link */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#17283A]/80">
          <Link
            href="/dashboard/money"
            className="text-xs font-semibold text-[#008F83] dark:text-[#32D5C4] hover:underline inline-flex items-center gap-1"
          >
            <span>View ledger</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
