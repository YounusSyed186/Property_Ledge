'use client';

import React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  Receipt,
  Minus,
  ArrowUpRight,
  Plus,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { formatCurrencyNoDecimals, formatCompactCurrency } from '@/lib/format/currency';
import type { MonthlyBreakdownItem } from '@/lib/dashboard/queries';
import { cn } from '@/lib/utils';

interface TopKpiCardsProps {
  portfolioValue: number;
  totalPropertiesCount: number;
  totalIncome: number;
  totalExpenses: number;
  incomeTrend: number | null;
  expenseTrend: number | null;
  monthlyBreakdown?: MonthlyBreakdownItem[];
  selectedProperty?: { propertyName: string } | null;
  onNewLease?: () => void;
  className?: string;
}

export function TopKpiCards({
  portfolioValue,
  totalPropertiesCount,
  totalIncome,
  totalExpenses,
  incomeTrend,
  expenseTrend,
  monthlyBreakdown = [],
  selectedProperty,
  onNewLease,
  className,
}: TopKpiCardsProps) {
  const last6Months = monthlyBreakdown.slice(-6);
  const maxIncomeIn6M = Math.max(...last6Months.map((m) => m.income), 1);
  const maxExpenseIn6M = Math.max(...last6Months.map((m) => m.expenses), 1);

  const displayPortfolioValue =
    portfolioValue > 0
      ? portfolioValue >= 1_000_000
        ? formatCompactCurrency(portfolioValue)
        : formatCurrencyNoDecimals(portfolioValue)
      : '$0';

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch', className)}>
      {/* 1. HERO CARD (7 Cols on Desktop): Dominant Portfolio Value Hero */}
      <div className="lg:col-span-7 rounded-[24px] border border-slate-200/80 dark:border-[#17283A] bg-white dark:bg-[#07111F] p-6 lg:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none flex flex-col justify-between relative overflow-hidden group">
        {/* Subtle Ambient Background Gradient in Dark / Mixed mode */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#008F83]/5 dark:bg-[#32D5C4]/10 rounded-full blur-3xl pointer-events-none" />

        <div>
          {/* Top Row: Label & Status Pill */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-[#7F8B99]">
                {selectedProperty ? 'Asset valuation' : 'Portfolio value'}
              </span>
              <span className="text-slate-300 dark:text-[#1E293B]">·</span>
              <span className="text-[11px] font-medium text-slate-400 dark:text-[#7F8B99]">
                {selectedProperty
                  ? 'Active asset'
                  : `${totalPropertiesCount} ${totalPropertiesCount === 1 ? 'property' : 'properties'}`}
              </span>
            </div>

            <Link
              href="/dashboard/properties"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#008F83] dark:text-[#32D5C4] hover:underline"
            >
              <span>Manage assets</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Huge Dominant Value Number */}
          <div className="mt-4 flex items-baseline gap-3">
            <h2 className="font-heading text-4xl sm:text-5xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
              {displayPortfolioValue}
            </h2>
          </div>

          {/* Trend & Context */}
          <div className="mt-2.5 flex items-center gap-2 text-xs">
            {incomeTrend !== null ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1 font-semibold',
                  incomeTrend >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {incomeTrend >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {incomeTrend > 0 ? `+${incomeTrend}%` : `${incomeTrend}%`}
              </span>
            ) : null}
            <span className="text-slate-400 dark:text-[#7F8B99]">
              {incomeTrend !== null ? 'vs previous period' : 'Verified asset equity'}
            </span>
          </div>
        </div>

        {/* Quick Action Pills in Footer */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-[#17283A]/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/properties"
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0E1E33] border border-slate-200/70 dark:border-[#17283A] text-slate-700 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-[#008F83] dark:text-[#32D5C4]" />
              <span>Properties</span>
            </Link>
            <Link
              href="/dashboard/money"
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0E1E33] border border-slate-200/70 dark:border-[#17283A] text-slate-700 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5 text-[#008F83] dark:text-[#32D5C4]" />
              <span>Ledger</span>
            </Link>
          </div>

          <span className="text-[11.5px] text-slate-400 dark:text-[#7F8B99]">
            Real-time capital balance
          </span>
        </div>
      </div>

      {/* 2. STACKED INCOME & EXPENSE CARDS (5 Cols on Desktop) */}
      <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-4.5">
        {/* Income Card */}
        <div className="rounded-[22px] border border-slate-200/80 dark:border-[#17283A] bg-white dark:bg-[#07111F] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none flex flex-col justify-between group hover:border-[#008F83]/30 transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#7F8B99]">
              Rental income
            </span>

            {/* Income Trend Pill */}
            {incomeTrend !== null ? (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold',
                  incomeTrend >= 0
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                )}
              >
                {incomeTrend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {incomeTrend > 0 ? `+${incomeTrend}%` : `${incomeTrend}%`}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 dark:text-[#7F8B99]">30d active</span>
            )}
          </div>

          <div className="mt-2.5 flex items-end justify-between gap-3">
            <div>
              <p className="font-heading text-2xl lg:text-[28px] font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
                {formatCurrencyNoDecimals(totalIncome)}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-[#7F8B99] mt-0.5">
                Verified collections
              </p>
            </div>

            {/* Integrated Sparkline Micro-Bars */}
            {last6Months.length > 0 && (
              <div className="flex items-end gap-1 h-7 pb-0.5 shrink-0" title="Last 6 months trajectory">
                {last6Months.map((m, idx) => {
                  const heightPercent = m.income > 0 ? Math.max(15, Math.round((m.income / maxIncomeIn6M) * 100)) : 10;
                  const isLast = idx === last6Months.length - 1;
                  return (
                    <div
                      key={m.isoMonth}
                      className={cn(
                        'w-1.5 rounded-full transition-all',
                        isLast
                          ? 'bg-[#008F83] dark:bg-[#32D5C4]'
                          : 'bg-[#008F83]/25 dark:bg-[#32D5C4]/25'
                      )}
                      style={{ height: `${heightPercent}%` }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Expense Card */}
        <div className="rounded-[22px] border border-slate-200/80 dark:border-[#17283A] bg-white dark:bg-[#07111F] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none flex flex-col justify-between group hover:border-[#008F83]/30 transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#7F8B99]">
              Expenses
            </span>

            {/* Expense Trend Pill */}
            {expenseTrend !== null ? (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold',
                  expenseTrend <= 0
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                )}
              >
                {expenseTrend <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {expenseTrend > 0 ? `+${expenseTrend}%` : `${expenseTrend}%`}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 dark:text-[#7F8B99]">30d active</span>
            )}
          </div>

          <div className="mt-2.5 flex items-end justify-between gap-3">
            <div>
              <p className="font-heading text-2xl lg:text-[28px] font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
                {formatCurrencyNoDecimals(totalExpenses)}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-[#7F8B99] mt-0.5">
                Operating outflows
              </p>
            </div>

            {/* Integrated Sparkline Micro-Bars */}
            {last6Months.length > 0 && (
              <div className="flex items-end gap-1 h-7 pb-0.5 shrink-0" title="Last 6 months trajectory">
                {last6Months.map((m, idx) => {
                  const heightPercent = m.expenses > 0 ? Math.max(15, Math.round((m.expenses / maxExpenseIn6M) * 100)) : 10;
                  const isLast = idx === last6Months.length - 1;
                  return (
                    <div
                      key={m.isoMonth}
                      className={cn(
                        'w-1.5 rounded-full transition-all',
                        isLast
                          ? 'bg-rose-500 dark:bg-rose-400'
                          : 'bg-rose-500/25 dark:bg-rose-400/25'
                      )}
                      style={{ height: `${heightPercent}%` }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
