'use client';

import React from 'react';
import { Scale, CheckCircle, ShieldAlert, Sparkles, Building2 } from 'lucide-react';
import { TaxClassificationReportDTO } from '@/modules/finance/domain/reporting-types';

interface TaxClassificationTabProps {
  data: TaxClassificationReportDTO;
}

export function TaxClassificationTab({ data }: TaxClassificationTabProps) {
  const { kpis, classifications } = data;

  const formatCurrency = (val: number) => {
    return `$${val.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Immediate Deductions</span>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(kpis.deductibleAmount)}
          </div>
          <div className="mt-1 text-xs text-slate-400">100% tax claimable in FY</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Capital Works (Div 43)</span>
          <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(kpis.capitalWorksAmount)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Depreciable structural assets</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Non-Deductible</span>
          <div className="mt-2 text-2xl font-bold text-slate-700 dark:text-slate-300">
            {formatCurrency(kpis.nonDeductibleAmount)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Private or capital base costs</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unclassified Items</span>
          <div className={`mt-2 text-2xl font-bold ${kpis.unclassifiedAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
            {formatCurrency(kpis.unclassifiedAmount)}
          </div>
          <div className="mt-1 text-xs text-slate-400">{kpis.transactionCount} total classified items</div>
        </div>
      </div>

      {/* Classifications Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Tax Classification Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-2.5 px-3">Classification</th>
                <th className="py-2.5 px-3 text-center">BAS Code</th>
                <th className="py-2.5 px-3 text-right">Transactions</th>
                <th className="py-2.5 px-3 text-right">Total Amount ($)</th>
                <th className="py-2.5 px-3 text-right">GST ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {classifications.map((c) => (
                <tr key={c.classificationId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{c.classificationName}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {c.basCode || 'G11'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-500">{c.transactionCount}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(c.totalAmount)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-500">{formatCurrency(c.gstAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
