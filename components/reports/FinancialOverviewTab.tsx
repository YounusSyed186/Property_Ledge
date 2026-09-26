'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Building2,
  FileCheck2,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Scale,
} from 'lucide-react';
import {
  FinancialOverviewReportDTO,
  MonthlyFinancialSummary,
  CategoryFinancialSummary,
  PropertyFinancialSummary,
} from '@/modules/finance/domain/reporting-types';

interface FinancialOverviewTabProps {
  data: FinancialOverviewReportDTO;
}

export function FinancialOverviewTab({ data }: FinancialOverviewTabProps) {
  const { kpis, monthlyTrends, incomeByCategory, expenseByCategory, propertyBreakdown } = data;

  const formatCurrency = (val: number) => {
    return `$${val.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Executive Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="bg-admin-surface border border-admin-border rounded-xl p-5 shadow-xs flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Income</span>
            <div className="p-2.5 bg-[#008F83]/10 border border-[#008F83]/20 rounded-lg text-[#008F83] dark:text-[#32D5C4]">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-[28px] font-bold tabular-nums text-admin-foreground tracking-tight">
            {formatCurrency(kpis.totalIncome)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Actual received income in period</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-admin-surface border border-admin-border rounded-xl p-5 shadow-xs flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Expenses</span>
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-[28px] font-bold tabular-nums text-admin-foreground tracking-tight">
            {formatCurrency(kpis.totalExpenses)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{kpis.transactionCount} transactions recorded</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-admin-surface border border-admin-border rounded-xl p-5 shadow-xs flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Result / Profit</span>
            <div className={`p-2.5 rounded-lg border ${kpis.netResult >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className={`mt-3 text-2xl sm:text-[28px] font-bold tabular-nums tracking-tight ${kpis.netResult >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
            {formatCurrency(kpis.netResult)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Operating income minus expenses</span>
          </div>
        </div>

        {/* Net GST Position */}
        <div className="bg-admin-surface border border-admin-border rounded-xl p-5 shadow-xs flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net GST Position</span>
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-[28px] font-bold tabular-nums text-admin-foreground tracking-tight">
            {formatCurrency(kpis.netGstPayable)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Collected: {formatCurrency(kpis.gstCollected)}</span>
            <span>Paid: {formatCurrency(kpis.gstPaid)}</span>
          </div>
        </div>
      </div>

      {/* 2. Monthly Australian Financial Year Trend Table */}
      <div className="bg-admin-surface border border-admin-border rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-admin-border">
          <div>
            <h3 className="text-base font-semibold text-admin-foreground">Financial Year Monthly Breakdown</h3>
            <p className="text-body-sm text-admin-muted mt-0.5">Ordered standard July through June</p>
          </div>
          <div className="text-xs font-semibold px-3 py-1 bg-admin-surface-subtle border border-admin-border rounded-lg text-admin-foreground">
            {kpis.transactionCount} total records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm">
            <thead>
              <tr className="border-b border-admin-border text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-admin-surface-subtle/30">
                <th className="py-3 px-4">Month</th>
                <th className="py-3 px-4 text-right">Income ($)</th>
                <th className="py-3 px-4 text-right">Expenses ($)</th>
                <th className="py-3 px-4 text-right">Net Profit ($)</th>
                <th className="py-3 px-4 text-right">GST Collected</th>
                <th className="py-3 px-4 text-right">GST Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border/60">
              {monthlyTrends.map((m: MonthlyFinancialSummary) => (
                <tr key={m.key} className="hover:bg-admin-surface-subtle/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-admin-foreground">{m.label}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                    {formatCurrency(m.income)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-rose-700 dark:text-rose-300 tabular-nums">
                    {formatCurrency(m.expenses)}
                  </td>
                  <td className={`py-3 px-4 text-right font-bold tabular-nums ${m.net >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                    {formatCurrency(m.net)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400 tabular-nums">
                    {formatCurrency(m.gstCollected)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400 tabular-nums">
                    {formatCurrency(m.gstPaid)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-admin-border font-bold bg-admin-surface-subtle/60 text-admin-foreground">
                <td className="py-3.5 px-4">FY Total</td>
                <td className="py-3.5 px-4 text-right text-emerald-700 dark:text-emerald-300 tabular-nums">{formatCurrency(kpis.totalIncome)}</td>
                <td className="py-3.5 px-4 text-right text-rose-700 dark:text-rose-300 tabular-nums">{formatCurrency(kpis.totalExpenses)}</td>
                <td className={`py-3.5 px-4 text-right tabular-nums ${kpis.netResult >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                  {formatCurrency(kpis.netResult)}
                </td>
                <td className="py-3.5 px-4 text-right tabular-nums">{formatCurrency(kpis.gstCollected)}</td>
                <td className="py-3.5 px-4 text-right tabular-nums">{formatCurrency(kpis.gstPaid)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 3. Category Breakdowns (Income & Expense Side-by-Side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income by Category */}
        <div className="bg-admin-surface border border-admin-border rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-admin-border">
            <h3 className="text-base font-semibold text-admin-foreground">Income by Category</h3>
            <span className="text-xs font-bold text-[#008F83] dark:text-[#32D5C4]">{incomeByCategory.length} Categories</span>
          </div>
          {incomeByCategory.length === 0 ? (
            <p className="text-body-sm text-admin-muted py-6 text-center">No income records found for this period.</p>
          ) : (
            <div className="space-y-3">
              {incomeByCategory.map((cat: CategoryFinancialSummary) => (
                <div key={cat.categoryId} className="flex items-center justify-between p-3.5 bg-admin-surface-subtle/50 border border-admin-border/50 rounded-xl">
                  <div>
                    <div className="font-semibold text-body-sm text-admin-foreground">{cat.categoryName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cat.transactionCount} transactions ({cat.percentage.toFixed(1)}%)</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-body-sm text-emerald-700 dark:text-emerald-300 tabular-nums">{formatCurrency(cat.totalAmount)}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">GST: {formatCurrency(cat.gstAmount)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expenses by Category */}
        <div className="bg-admin-surface border border-admin-border rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-admin-border">
            <h3 className="text-base font-semibold text-admin-foreground">Expenses by Category</h3>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{expenseByCategory.length} Categories</span>
          </div>
          {expenseByCategory.length === 0 ? (
            <p className="text-body-sm text-admin-muted py-6 text-center">No expense records found for this period.</p>
          ) : (
            <div className="space-y-3">
              {expenseByCategory.map((cat: CategoryFinancialSummary) => (
                <div key={cat.categoryId} className="flex items-center justify-between p-3.5 bg-admin-surface-subtle/50 border border-admin-border/50 rounded-xl">
                  <div>
                    <div className="font-semibold text-body-sm text-admin-foreground">{cat.categoryName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cat.transactionCount} transactions ({cat.percentage.toFixed(1)}%)</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-body-sm text-rose-700 dark:text-rose-300 tabular-nums">{formatCurrency(cat.totalAmount)}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">GST: {formatCurrency(cat.gstAmount)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
