'use client';

import React from 'react';
import { Building2, TrendingUp, TrendingDown, ArrowUpRight, DollarSign } from 'lucide-react';
import { PropertyPerformanceReportDTO, PropertyFinancialSummary } from '@/modules/finance/domain/reporting-types';

interface PropertyPerformanceTabProps {
  data: PropertyPerformanceReportDTO;
}

export function PropertyPerformanceTab({ data }: PropertyPerformanceTabProps) {
  const { kpis, properties } = data;

  const formatCurrency = (val: number) => {
    return `$${val.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Portfolio Income</span>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(kpis.totalPortfolioIncome)}
          </div>
          <div className="mt-1 text-xs text-slate-400">{kpis.propertyCount} active properties</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Portfolio Expenses</span>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(kpis.totalPortfolioExpenses)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Operating & capital expenses</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Portfolio Profit</span>
          <div className={`mt-2 text-2xl font-bold ${kpis.netPortfolioResult >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatCurrency(kpis.netPortfolioResult)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Net operating yield result</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Collection Rate</span>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {kpis.overallCollectionRate.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-emerald-600 font-semibold">Scheduled vs received rent</div>
        </div>
      </div>

      {/* Property Performance Comparison Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Property Performance Ranking</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-2.5 px-3">Property</th>
                <th className="py-2.5 px-3 text-right">Income ($)</th>
                <th className="py-2.5 px-3 text-right">Expenses ($)</th>
                <th className="py-2.5 px-3 text-right">Net Result ($)</th>
                <th className="py-2.5 px-3 text-right">Collection Rate</th>
                <th className="py-2.5 px-3 text-right">Transactions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {properties.map((p: PropertyFinancialSummary) => (
                <tr key={p.propertyId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                    <div>{p.propertyName}</div>
                    {p.address && <div className="text-xs text-slate-400">{p.address}</div>}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.totalIncome)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(p.totalExpenses)}</td>
                  <td className={`py-2.5 px-3 text-right font-bold ${p.netResult >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(p.netResult)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 font-medium">{p.collectionRate.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right text-slate-500">{p.transactionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
