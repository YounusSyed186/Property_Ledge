'use client';

import React from 'react';
import { Receipt, AlertCircle, Building2, Layers } from 'lucide-react';
import { GstReportDTO, CategoryFinancialSummary, TaxClassificationFinancialSummary } from '@/modules/finance/domain/reporting-types';

interface GstReportTabProps {
  data: GstReportDTO;
}

export function GstReportTab({ data }: GstReportTabProps) {
  const { kpis, basQuarterSummaries, byCategory, byTaxClassification } = data;

  const formatCurrency = (val: number) => {
    return `$${val.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GST Collected (1A)</span>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(kpis.gstCollected)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Total GST on taxable sales</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GST Paid Credits (1B)</span>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(kpis.gstPaidClaimable)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Input tax credits on business purchases</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net GST Position</span>
          <div className={`mt-2 text-2xl font-bold ${kpis.netGstPayable >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatCurrency(Math.abs(kpis.netGstPayable))}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {kpis.netGstPayable >= 0 ? 'Payable to ATO (1A > 1B)' : 'Refund due from ATO (1B > 1A)'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Taxable Turnover</span>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(kpis.totalSalesSubjectToGst)}
          </div>
          <div className="mt-1 text-xs text-slate-400">{kpis.transactionCount} GST recorded items</div>
        </div>
      </div>

      {/* Quarterly BAS Alignment Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Quarterly Business Activity Statement (BAS) Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-2.5 px-3">BAS Period</th>
                <th className="py-2.5 px-3 text-right">GST on Sales (1A)</th>
                <th className="py-2.5 px-3 text-right">GST on Purchases (1B)</th>
                <th className="py-2.5 px-3 text-right">Net GST Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {basQuarterSummaries.map((q) => (
                <tr key={q.quarter} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{q.label || q.quarter}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-white">{formatCurrency(q.gstCollected)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-white">{formatCurrency(q.gstPaid)}</td>
                  <td className={`py-2.5 px-3 text-right font-bold ${q.netGst >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {formatCurrency(q.netGst)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category GST Status */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">GST by Category</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-center">Type</th>
                <th className="py-2.5 px-3 text-right">Total Amount ($)</th>
                <th className="py-2.5 px-3 text-right">GST ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {byCategory.map((c: CategoryFinancialSummary) => (
                <tr key={c.categoryId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{c.categoryName}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.transactionType === 'income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'}`}>
                      {c.transactionType.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">{formatCurrency(c.totalAmount)}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(c.gstAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
