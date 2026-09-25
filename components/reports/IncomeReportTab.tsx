'use client';

import React from 'react';
import { TrendingUp, Building2, Tag, Receipt, Users } from 'lucide-react';
import { IncomeReportDTO, CategoryFinancialSummary, PropertyFinancialSummary } from '@/modules/finance/domain/reporting-types';

interface IncomeReportTabProps {
  data: IncomeReportDTO;
}

export function IncomeReportTab({ data }: IncomeReportTabProps) {
  const { kpis, monthlyIncome, byCategory, byProperty, byTenant } = data;

  const formatCurrency = (val: number) => {
    return `$${val.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Received Income</span>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(kpis.totalIncome)}
          </div>
          <div className="mt-1 text-xs text-slate-400">{kpis.transactionCount} transactions</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scheduled Rent</span>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(kpis.expectedRent)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Expected lease schedule volume</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rent Received</span>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(kpis.actualRentReceived)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Outstanding: {formatCurrency(kpis.outstandingRent)}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GST Collected</span>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(kpis.gstCollected)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Total GST on sales / receipts</div>
        </div>
      </div>

      {/* Property & Category Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income by Property */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Income by Property</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-2.5 px-2">Property</th>
                  <th className="py-2.5 px-2 text-right">Count</th>
                  <th className="py-2.5 px-2 text-right">Amount ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {byProperty.map((p: PropertyFinancialSummary) => (
                  <tr key={p.propertyId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-2 font-medium text-slate-800 dark:text-slate-200">{p.propertyName}</td>
                    <td className="py-2.5 px-2 text-right text-slate-400">{p.transactionCount}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.totalIncome)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Income by Category */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Income by Category</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-2.5 px-2">Category</th>
                  <th className="py-2.5 px-2 text-right">Share (%)</th>
                  <th className="py-2.5 px-2 text-right">Amount ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {byCategory.map((c: CategoryFinancialSummary) => (
                  <tr key={c.categoryId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-2 font-medium text-slate-800 dark:text-slate-200">{c.categoryName}</td>
                    <td className="py-2.5 px-2 text-right text-slate-400">{c.percentage.toFixed(1)}%</td>
                    <td className="py-2.5 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(c.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
