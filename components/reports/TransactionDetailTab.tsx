'use client';

import React from 'react';
import { FileText, ArrowUpRight, ArrowDownRight, Tag, Building2, User } from 'lucide-react';
import { TransactionDetailReportDTO } from '@/modules/finance/domain/reporting-types';

interface TransactionDetailTabProps {
  data: TransactionDetailReportDTO;
}

export function TransactionDetailTab({ data }: TransactionDetailTabProps) {
  const { transactions, totalCount, totalIncome, totalExpenses, totalGst, netAmount } = data;

  const formatCurrency = (val: number) => {
    return `$${val.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Filter KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtered Records</span>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {totalCount}
          </div>
          <div className="mt-1 text-xs text-slate-400">Total matched transactions</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Income</span>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalIncome)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Inflow across matching records</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expenses</span>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(totalExpenses)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Outflow across matching records</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Amount</span>
          <div className={`mt-2 text-2xl font-bold ${netAmount >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatCurrency(netAmount)}
          </div>
          <div className="mt-1 text-xs text-slate-400">GST: {formatCurrency(totalGst)}</div>
        </div>
      </div>

      {/* Transactions Drill-down Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Transaction Line Items</h3>
          <span className="text-xs font-semibold text-slate-500">{transactions.length} rows</span>
        </div>

        {transactions.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No transactions found matching the selected filters.</p>
        ) : (
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 shadow-xs">
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Tax Class</th>
                  <th className="py-2.5 px-3">Description / Payee</th>
                  <th className="py-2.5 px-3">Property</th>
                  <th className="py-2.5 px-3 text-right">Amount ($)</th>
                  <th className="py-2.5 px-3 text-right">GST ($)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {transactions.map((tx) => {
                  const isIncome = tx.transaction_type === 'income';
                  const propName = tx.property?.name || tx.property?.address_line_1 || '—';
                  const payeeName = tx.vendor_name || (tx.tenant ? `${tx.tenant.first_name || ''} ${tx.tenant.last_name || ''}`.trim() : null);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {tx.transaction_date}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isIncome ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'}`}>
                          {isIncome ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {isIncome ? 'INCOME' : 'EXPENSE'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {tx.category?.name || 'Unassigned'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-xs">
                        {tx.tax_classification?.name || 'Standard'}
                      </td>
                      <td className="py-2.5 px-3 max-w-[240px] truncate">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{tx.description || '—'}</div>
                        {payeeName && <div className="text-xs text-slate-400 truncate">{payeeName}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-xs truncate max-w-[160px]">
                        {propName}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatCurrency(Number(tx.amount || 0))}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500 text-xs whitespace-nowrap">
                        {formatCurrency(Number(tx.gst_amount || 0))}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                          {tx.status || 'completed'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
