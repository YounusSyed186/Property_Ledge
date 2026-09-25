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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Income</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(kpis.totalIncome)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Actual received income in period</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expenses</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(kpis.totalExpenses)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{kpis.transactionCount} transactions recorded</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Result / Profit</span>
            <div className={`p-2 rounded-xl ${kpis.netResult >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'}`}>
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className={`mt-3 text-2xl font-bold ${kpis.netResult >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatCurrency(kpis.netResult)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Operating income minus expenses</span>
          </div>
        </div>

        {/* Net GST Position */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net GST Position</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(kpis.netGstPayable)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Collected: {formatCurrency(kpis.gstCollected)}</span>
            <span>Paid: {formatCurrency(kpis.gstPaid)}</span>
          </div>
        </div>
      </div>

      {/* 2. Monthly Australian Financial Year Trend Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white"> Financial Year Monthly Breakdown</h3>
            <p className="text-xs text-slate-500">Ordered standard July through June</p>
          </div>
          <div className="text-xs font-semibold px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
            {kpis.transactionCount} total records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-3 px-3">Month</th>
                <th className="py-3 px-3 text-right">Income ($)</th>
                <th className="py-3 px-3 text-right">Expenses ($)</th>
                <th className="py-3 px-3 text-right">Net Profit ($)</th>
                <th className="py-3 px-3 text-right">GST Collected</th>
                <th className="py-3 px-3 text-right">GST Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {monthlyTrends.map((m: MonthlyFinancialSummary) => (
                <tr key={m.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{m.label}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(m.income)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                    {formatCurrency(m.expenses)}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-bold ${m.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(m.net)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                    {formatCurrency(m.gstCollected)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                    {formatCurrency(m.gstPaid)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 dark:border-slate-700 font-bold bg-slate-50/80 dark:bg-slate-800/50 text-slate-900 dark:text-white">
                <td className="py-3 px-3">FY Total</td>
                <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(kpis.totalIncome)}</td>
                <td className="py-3 px-3 text-right text-rose-600 dark:text-rose-400">{formatCurrency(kpis.totalExpenses)}</td>
                <td className={`py-3 px-3 text-right ${kpis.netResult >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(kpis.netResult)}
                </td>
                <td className="py-3 px-3 text-right">{formatCurrency(kpis.gstCollected)}</td>
                <td className="py-3 px-3 text-right">{formatCurrency(kpis.gstPaid)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 3. Category Breakdowns (Income & Expense Side-by-Side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income by Category */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Income by Category</h3>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{incomeByCategory.length} Categories</span>
          </div>
          {incomeByCategory.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No income records found for this period.</p>
          ) : (
            <div className="space-y-3">
              {incomeByCategory.map((cat: CategoryFinancialSummary) => (
                <div key={cat.categoryId} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div>
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{cat.categoryName}</div>
                    <div className="text-xs text-slate-400">{cat.transactionCount} transactions ({cat.percentage.toFixed(1)}%)</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(cat.totalAmount)}</div>
                    <div className="text-xs text-slate-400">GST: {formatCurrency(cat.gstAmount)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expenses by Category */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Expenses by Category</h3>
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">{expenseByCategory.length} Categories</span>
          </div>
          {expenseByCategory.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No expense records found for this period.</p>
          ) : (
            <div className="space-y-3">
              {expenseByCategory.map((cat: CategoryFinancialSummary) => (
                <div key={cat.categoryId} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div>
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{cat.categoryName}</div>
                    <div className="text-xs text-slate-400">{cat.transactionCount} transactions ({cat.percentage.toFixed(1)}%)</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-rose-600 dark:text-rose-400">{formatCurrency(cat.totalAmount)}</div>
                    <div className="text-xs text-slate-400">GST: {formatCurrency(cat.gstAmount)}</div>
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
