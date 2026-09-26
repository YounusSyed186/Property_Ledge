'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, TrendingUp, TrendingDown, DollarSign, Wallet, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/format/currency';
import { cn } from '@/lib/utils';

interface CashFlowChartProps {
  totalIncome: number;
  totalExpenses: number;
  outstandingIncome: number;
  activeLeasesCount: number;
  totalPropertiesCount: number;
  className?: string;
}

export function CashFlowChart({
  totalIncome,
  totalExpenses,
  outstandingIncome,
  activeLeasesCount,
  totalPropertiesCount,
  className,
}: CashFlowChartProps) {
  const netCashFlow = totalIncome - totalExpenses;
  const isPositive = netCashFlow >= 0;
  const totalOperatingVolume = totalIncome + totalExpenses;
  const incomeShare = totalOperatingVolume > 0 ? Math.round((totalIncome / totalOperatingVolume) * 100) : 50;
  const expenseShare = totalOperatingVolume > 0 ? Math.round((totalExpenses / totalOperatingVolume) * 100) : 50;

  const totalExpectedIncome = totalIncome + outstandingIncome;
  const collectionRate = totalExpectedIncome > 0 ? Math.round((totalIncome / totalExpectedIncome) * 100) : 100;

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch', className)}>
      {/* Left/Main column: Cash Flow & Operating Ledger Comparison (7 cols) */}
      <div className="lg:col-span-7 rounded-xl border border-admin-border bg-admin-surface p-5 sm:p-6 flex flex-col justify-between shadow-xs">
        <div>
          <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-admin-border/80">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#008F83]" />
                <h3 className="text-sm sm:text-base font-semibold text-admin-foreground tracking-tight">
                  Operating Cash Flow
                </h3>
              </div>
              <p className="text-body-sm text-admin-muted mt-0.5">Operating income vs. verified expenses</p>
            </div>
            <Link
              href="/dashboard/money"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-admin-primary hover:text-admin-primary-hover hover:underline transition-colors min-h-[36px] px-2.5 py-1 rounded-lg hover:bg-admin-primary-soft/50"
            >
              <span>Transactions</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Big Net Position Highlight */}
          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Net Operating Position
              </span>
              <div className="flex items-baseline gap-2.5 mt-1">
                <p className={cn(
                  'font-heading text-2xl sm:text-3xl font-bold tabular-nums tracking-tight',
                  isPositive ? 'text-admin-foreground' : 'text-rose-600 dark:text-rose-400'
                )}>
                  {formatCurrency(netCashFlow)}
                </p>
                <span className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border',
                  isPositive
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25'
                )}>
                  {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {isPositive ? 'Surplus' : 'Deficit'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-medium text-admin-muted">Operating Volume</span>
              <p className="text-sm font-bold text-admin-foreground tabular-nums mt-0.5">
                {formatCurrency(totalOperatingVolume)}
              </p>
            </div>
          </div>

          {/* Visual Ratio Bar Chart */}
          <div className="mt-6 space-y-2.5">
            <div className="flex items-center justify-between text-xs sm:text-[13px] font-medium text-admin-muted">
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#008F83]" />
                Income: {incomeShare}% ({formatCurrency(totalIncome)})
              </span>
              <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-semibold">
                <span className="h-2.5 w-2.5 rounded-xs bg-rose-500" />
                Expenses: {expenseShare}% ({formatCurrency(totalExpenses)})
              </span>
            </div>

            {/* Split Bar */}
            <div className="h-3.5 w-full rounded-full bg-admin-surface-subtle overflow-hidden flex p-0.5 border border-admin-border/80">
              <div
                style={{ width: `${incomeShare}%` }}
                className="h-full rounded-l-full bg-[#008F83] transition-all duration-500"
                title={`Income: ${formatCurrency(totalIncome)}`}
              />
              <div
                style={{ width: `${expenseShare}%` }}
                className="h-full rounded-r-full bg-rose-500 transition-all duration-500"
                title={`Expenses: ${formatCurrency(totalExpenses)}`}
              />
            </div>
          </div>
        </div>

        {/* Supporting Metric Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 pt-4 border-t border-admin-border/80">
          <div className="p-3 rounded-lg bg-admin-surface-subtle/60 border border-admin-border/70">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <TrendingUp className="h-3.5 w-3.5 text-[#008F83]" />
              <span>Received Income</span>
            </div>
            <p className="mt-1.5 font-heading text-base sm:text-lg font-bold text-admin-foreground tabular-nums">
              {formatCurrency(totalIncome)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-admin-surface-subtle/60 border border-admin-border/70">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
              <span>Paid Expenses</span>
            </div>
            <p className="mt-1.5 font-heading text-base sm:text-lg font-bold text-admin-foreground tabular-nums">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
        </div>
      </div>

      {/* Right column: Rent Collection & Lease Health (5 cols) */}
      <div className="lg:col-span-5 rounded-xl border border-admin-border bg-admin-surface p-5 sm:p-6 flex flex-col justify-between shadow-xs">
        <div>
          <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-admin-border/80">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                <h3 className="text-sm sm:text-base font-semibold text-admin-foreground tracking-tight">
                  Rent Collection Rate
                </h3>
              </div>
              <p className="text-body-sm text-admin-muted mt-0.5">Realized vs. outstanding billings</p>
            </div>
            <Link
              href="/dashboard/money?tab=invoices"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-admin-primary hover:text-admin-primary-hover hover:underline transition-colors min-h-[36px] px-2.5 py-1 rounded-lg hover:bg-admin-primary-soft/50"
            >
              <span>Invoices</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Collection Ring & Numbers */}
          <div className="mt-5 flex items-center gap-5">
            {/* SVG Progress Donut */}
            <div className="relative w-22 h-22 sm:w-24 sm:h-24 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                {/* Background track */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  className="stroke-admin-border"
                  strokeWidth="3.2"
                />
                {/* Realized Income Progress */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#008F83"
                  strokeWidth="3.4"
                  strokeDasharray={`${collectionRate} ${100 - collectionRate}`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-heading text-base sm:text-lg font-bold text-admin-foreground tabular-nums">
                  {collectionRate}%
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-admin-muted">
                  Collected
                </span>
              </div>
            </div>

            {/* Breakdown stats */}
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <span className="text-admin-muted font-medium">Collected</span>
                  <span className="font-bold text-admin-foreground tabular-nums">
                    {formatCurrency(totalIncome)}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-admin-surface-subtle overflow-hidden">
                  <div className="h-full rounded-full bg-[#008F83]" style={{ width: `${collectionRate}%` }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <span className="text-admin-muted font-medium">Outstanding</span>
                  <span className={cn(
                    'font-bold tabular-nums',
                    outstandingIncome > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-admin-muted'
                  )}>
                    {formatCurrency(outstandingIncome)}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-admin-surface-subtle overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${totalExpectedIncome > 0 ? Math.round((outstandingIncome / totalExpectedIncome) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom context pill */}
        <div className="mt-5 pt-3.5 border-t border-admin-border/80 flex items-center justify-between text-xs sm:text-[13px] text-admin-muted">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#008F83]" />
            <span className="font-medium">Active Portfolio Leases</span>
          </span>
          <span className="font-bold text-admin-foreground">
            {activeLeasesCount} lease{activeLeasesCount === 1 ? '' : 's'} / {totalPropertiesCount} propert{totalPropertiesCount === 1 ? 'y' : 'ies'}
          </span>
        </div>
      </div>
    </div>
  );
}
