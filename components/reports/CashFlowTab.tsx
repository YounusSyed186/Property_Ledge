'use client';

import React from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight, CircleDollarSign } from 'lucide-react';
import { CashFlowReportDTO, MonthlyFinancialSummary } from '@/modules/finance/domain/reporting-types';

interface CashFlowTabProps {
  data: CashFlowReportDTO;
}

export function CashFlowTab({ data }: CashFlowTabProps) {
  const { kpis, monthlyCashFlow, quarterlyCashFlow } = data;

  const formatCurrency = (val: number) => {
    return `$${val.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cash Inflow</span>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(kpis.totalInflow)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Rental & other receipts</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cash Outflow</span>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(kpis.totalOutflow)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Operational & capital expenses</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Cash Flow</span>
          <div className={`mt-2 text-2xl font-bold ${kpis.netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatCurrency(kpis.netCashFlow)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Period net liquidity delta</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operating Margin</span>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {kpis.operatingMargin.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-slate-400">Cash efficiency yield</div>
        </div>
      </div>

      {/* Monthly Cash Flow Progression */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Monthly Cash Flow Trajectory (July to June)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-2.5 px-3">Month</th>
                <th className="py-2.5 px-3 text-right">Inflow ($)</th>
                <th className="py-2.5 px-3 text-right">Outflow ($)</th>
                <th className="py-2.5 px-3 text-right">Net Flow ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {monthlyCashFlow.map((m: MonthlyFinancialSummary) => (
                <tr key={m.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{m.label}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{formatCurrency(m.income)}</td>
                  <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400 font-semibold">{formatCurrency(m.expenses)}</td>
                  <td className={`py-2.5 px-3 text-right font-bold ${m.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(m.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quarterly BAS Alignment */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Quarterly Cash Flow Alignment (Q1 - Q4)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quarterlyCashFlow.map((q) => (
            <div key={q.quarter} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="font-bold text-sm text-slate-900 dark:text-white">{q.quarter}</div>
              <div className="mt-3 space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Inflow:</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(q.inflow)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Outflow:</span>
                  <span className="font-semibold text-rose-600">{formatCurrency(q.outflow)}</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  <span>Net:</span>
                  <span className={q.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(q.net)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
