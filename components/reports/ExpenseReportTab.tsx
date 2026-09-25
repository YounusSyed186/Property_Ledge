'use client';

import React from 'react';
import { TrendingDown, Users, Tag, Scale, Receipt } from 'lucide-react';
import { ExpenseReportDTO, TaxClassificationFinancialSummary, VendorFinancialSummary } from '@/modules/finance/domain/reporting-types';

interface ExpenseReportTabProps {
  data: ExpenseReportDTO;
}

export function ExpenseReportTab({ data }: ExpenseReportTabProps) {
  const { kpis, monthlyExpenses, byOperationalCategory, byTaxClassification, byProperty, byVendor } = data;

  const formatCurrency = (val: number) => {
    return `$${val.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expenses</span>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(kpis.totalExpenses)}
          </div>
          <div className="mt-1 text-xs text-slate-400">{kpis.transactionCount} transactions</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ATO Deductible (100%)</span>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(kpis.deductibleExpenses)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Repairs, rates, insurance & management</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Capital Works (Div 43)</span>
          <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(kpis.capitalExpenses)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Structural improvements / depreciation</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GST Paid on Purchases</span>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(kpis.gstPaid)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Input tax credits for claim</div>
        </div>
      </div>

      {/* Tax Classification & Vendor Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by Tax Classification */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">ATO Tax Classification Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-2.5 px-2">Classification</th>
                  <th className="py-2.5 px-2 text-right">Count</th>
                  <th className="py-2.5 px-2 text-right">Amount ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {byTaxClassification.map((t: TaxClassificationFinancialSummary) => (
                  <tr key={t.classificationId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-2 font-medium text-slate-800 dark:text-slate-200">{t.classificationName}</td>
                    <td className="py-2.5 px-2 text-right text-slate-400">{t.transactionCount}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-slate-900 dark:text-white">
                      {formatCurrency(t.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Vendors */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Top Payees / Vendors</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-2.5 px-2">Payee / Vendor</th>
                  <th className="py-2.5 px-2 text-right">Invoices</th>
                  <th className="py-2.5 px-2 text-right">Total Spent ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {byVendor.slice(0, 10).map((v: VendorFinancialSummary) => (
                  <tr key={v.vendorName} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-2 font-medium text-slate-800 dark:text-slate-200">{v.vendorName}</td>
                    <td className="py-2.5 px-2 text-right text-slate-400">{v.transactionCount}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(v.totalAmount)}
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
