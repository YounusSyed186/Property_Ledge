'use client';

import React from 'react';
import {
  BasWorksheetDTO,
  BasCategoryBreakdownItem,
} from '@/modules/finance/domain/types';
import { formatCurrency } from '@/lib/format/currency';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';
import {
  AlertCircle,
  ArrowRight,
  Printer,
  Download,
  Info,
} from 'lucide-react';

interface BasWorksheetTabProps {
  worksheet: BasWorksheetDTO;
  showBasCodes?: boolean;
  onSelectCategoryFilter?: (type: 'income' | 'expense', categoryId?: string) => void;
  onOpenHowToTab?: () => void;
}

export function BasWorksheetTab({
  worksheet,
  showBasCodes = true,
  onSelectCategoryFilter,
  onOpenHowToTab,
}: BasWorksheetTabProps) {
  const workspaceName = useWorkspaceStore((s) => s.workspaceName) || 'Michael';

  const { totals, incomeByCategory, expenseByCategory, unclassifiedCount } = worksheet;
  const isPayable = totals.netGstPosition >= 0;

  const startYear = worksheet.financialYear - 1;
  const endYear = worksheet.financialYear;
  const fyShort = `FY${String(startYear).slice(-2)}–${String(endYear).slice(-2)}`;
  const dateLabel = worksheet.period === 'FY' ? fyShort : `${worksheet.period} (${startYear})`;
  const periodTitle = worksheet.period === 'FY'
    ? `FY ${startYear}–${endYear} Annual BAS`
    : `FY ${startYear}–${String(endYear).slice(-2)} ${worksheet.period} BAS`;

  const propertyDisplayName = worksheet.propertyId
    ? worksheet.propertyName
    : 'Across All Rental Properties';

  // Helper to format currency or '-' if zero/negative
  const formatCellCurrency = (val: number, showDashIfZero = false) => {
    if (showDashIfZero && Math.abs(val) < 0.005) {
      return '-';
    }
    const isNegative = val < -0.005;
    const formatted = Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isNegative ? `-$${formatted}` : `$${formatted}`;
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Unclassified Warning Banner */}
      {unclassifiedCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 shadow-2xs">
          <div className="flex items-center gap-2.5 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong className="font-semibold">
                {unclassifiedCount} transaction{unclassifiedCount > 1 ? 's' : ''}
              </strong>{' '}
              without tax classification. Tagging tax classifications ensures 100% auditable BAS reporting.
            </span>
          </div>
          {onSelectCategoryFilter && (
            <button
              type="button"
              onClick={() => onSelectCategoryFilter('expense')}
              className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
            >
              Review in Details <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Main Printable / High-Fidelity Worksheet Paper Container */}
      <div className="mx-auto max-w-4xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-sm space-y-7 text-[#0A2540] dark:text-slate-100">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-transparent">
          <div>
            <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#0A2540] dark:text-white">
              {workspaceName}&apos;s BAS Activity Worksheet
            </h1>
            <p className="text-sm font-semibold text-[#0A2540]/80 dark:text-slate-300 mt-0.5">
              {periodTitle}
            </p>
          </div>
          <div className="text-xs font-medium text-slate-400 self-start sm:self-auto">
            Page 1 of 1
          </div>
        </div>

        {/* Blue Property & Period Banner */}
        <div className="rounded-lg bg-[#4D92DF] text-white px-5 py-3 shadow-2xs space-y-0.5">
          <p className="font-bold text-sm sm:text-base leading-snug">
            {propertyDisplayName}
          </p>
          <p className="font-semibold text-xs sm:text-sm text-blue-50 leading-snug">
            {periodTitle}
          </p>
        </div>

        {/* ================= SECTION 1: BUSINESS INCOME ================= */}
        <div className="space-y-2">
          {/* Section Title */}
          <div className="border-b-2 border-[#4D92DF] pb-1">
            <h2 className="text-lg font-bold text-[#0A2540] dark:text-white">
              Business Income
            </h2>
          </div>

          {/* Income Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#E1EDFA] dark:bg-slate-800 text-[#0A2540] dark:text-white font-bold">
                  <th className="py-2.5 px-4 rounded-l-md w-28 sm:w-36">Date</th>
                  <th className="py-2.5 px-4">Source</th>
                  <th className="py-2.5 px-4 text-right w-28 sm:w-36">Gross</th>
                  <th className="py-2.5 px-4 text-right w-24 sm:w-32">GST</th>
                  <th className="py-2.5 px-4 text-right rounded-r-md w-28 sm:w-36">Net</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal text-[#0A2540] dark:text-slate-200">
                {incomeByCategory.length === 0 ? (
                  <tr>
                    <td className="py-3 px-4 text-slate-400 italic">{dateLabel}</td>
                    <td className="py-3 px-4 text-slate-400 italic">No income transactions recorded</td>
                    <td className="py-3 px-4 text-right font-medium">$0.00</td>
                    <td className="py-3 px-4 text-right font-medium">-</td>
                    <td className="py-3 px-4 text-right font-medium">$0.00</td>
                  </tr>
                ) : (
                  incomeByCategory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-medium">{dateLabel}</td>
                      <td className="py-2.5 px-4 font-medium">{item.categoryName}</td>
                      <td className="py-2.5 px-4 text-right font-medium">
                        {formatCellCurrency(item.gross)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">
                        {formatCellCurrency(item.gst, true)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">
                        {formatCellCurrency(item.net)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Totals & BAS Codes */}
              <tfoot>
                {/* Totals Row */}
                <tr className="bg-[#E1EDFA] dark:bg-slate-800 text-[#0A2540] dark:text-white font-bold text-xs sm:text-[13px]">
                  <td className="py-2.5 px-4 rounded-l-md"></td>
                  <td className="py-2.5 px-4">Totals</td>
                  <td className="py-2.5 px-4 text-right">
                    {formatCellCurrency(totals.totalSales)}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {formatCellCurrency(totals.gstOnSales)}
                  </td>
                  <td className="py-2.5 px-4 text-right rounded-r-md">
                    {formatCellCurrency(totals.totalSales - totals.gstOnSales > 0 ? totals.totalSales - totals.gstOnSales : totals.totalSales)}
                  </td>
                </tr>

                {/* BAS Codes Row */}
                {showBasCodes && (
                  <tr className="bg-[#EEF5FC] dark:bg-slate-850 text-[#0A2540] dark:text-slate-200 font-bold text-xs">
                    <td className="py-2.5 px-4 rounded-l-md"></td>
                    <td className="py-2.5 px-4">BAS Codes</td>
                    <td className="py-2.5 px-4 text-right font-bold text-[#0A2540] dark:text-white">
                      (G1)
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-[#0A2540] dark:text-white">
                      (1A)
                    </td>
                    <td className="py-2.5 px-4 text-right rounded-r-md"></td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>

        {/* ================= SECTION 2: BUSINESS EXPENSES ================= */}
        <div className="space-y-2 pt-2">
          {/* Section Title */}
          <div className="border-b-2 border-[#4D92DF] pb-1">
            <h2 className="text-lg font-bold text-[#0A2540] dark:text-white">
              Business Expenses
            </h2>
          </div>

          {/* Expenses Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#E1EDFA] dark:bg-slate-800 text-[#0A2540] dark:text-white font-bold">
                  <th className="py-2.5 px-4 rounded-l-md w-28 sm:w-36">Date</th>
                  <th className="py-2.5 px-4">Expenses</th>
                  <th className="py-2.5 px-4 text-right w-28 sm:w-36">Gross</th>
                  <th className="py-2.5 px-4 text-right w-24 sm:w-32">GST</th>
                  <th className="py-2.5 px-4 text-right rounded-r-md w-28 sm:w-36">Net</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal text-[#0A2540] dark:text-slate-200">
                {expenseByCategory.length === 0 ? (
                  <tr>
                    <td className="py-3 px-4 text-slate-400 italic">{dateLabel}</td>
                    <td className="py-3 px-4 text-slate-400 italic">No business expense transactions recorded</td>
                    <td className="py-3 px-4 text-right font-medium">$0.00</td>
                    <td className="py-3 px-4 text-right font-medium">-</td>
                    <td className="py-3 px-4 text-right font-medium">$0.00</td>
                  </tr>
                ) : (
                  expenseByCategory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-medium">{dateLabel}</td>
                      <td className="py-2.5 px-4 font-medium">{item.categoryName}</td>
                      <td className="py-2.5 px-4 text-right font-medium">
                        {formatCellCurrency(item.gross)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">
                        {formatCellCurrency(item.gst, true)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">
                        {formatCellCurrency(item.net)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Totals & BAS Codes */}
              <tfoot>
                {/* Totals Row */}
                <tr className="bg-[#E1EDFA] dark:bg-slate-800 text-[#0A2540] dark:text-white font-bold text-xs sm:text-[13px]">
                  <td className="py-2.5 px-4 rounded-l-md"></td>
                  <td className="py-2.5 px-4">Totals</td>
                  <td className="py-2.5 px-4 text-right">
                    {formatCellCurrency(totals.totalExpenses)}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {formatCellCurrency(totals.gstOnExpenses)}
                  </td>
                  <td className="py-2.5 px-4 text-right rounded-r-md">
                    {formatCellCurrency(totals.totalExpenses - totals.gstOnExpenses)}
                  </td>
                </tr>

                {/* BAS Codes Row */}
                {showBasCodes && (
                  <tr className="bg-[#EEF5FC] dark:bg-slate-850 text-[#0A2540] dark:text-slate-200 font-bold text-xs">
                    <td className="py-2.5 px-4 rounded-l-md"></td>
                    <td className="py-2.5 px-4">BAS Codes</td>
                    <td className="py-2.5 px-4 text-right font-bold text-[#0A2540] dark:text-white">
                      (G11)
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-[#0A2540] dark:text-white">
                      (1B)
                    </td>
                    <td className="py-2.5 px-4 text-right rounded-r-md"></td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>

        {/* ================= SECTION 3: NET GST POSITION ================= */}
        <div className="pt-2">
          <div className="bg-[#E1EDFA] dark:bg-slate-800 rounded-lg px-5 py-3 flex items-center justify-between font-bold text-sm sm:text-base text-[#0A2540] dark:text-white shadow-2xs">
            <span>Net GST Payable/(refundable)</span>
            <span className="font-extrabold text-sm sm:text-base">
              {totals.netGstPosition < -0.005
                ? `-$${Math.abs(totals.netGstPosition).toFixed(2)} (Refund)`
                : formatCellCurrency(totals.netGstPosition)}
            </span>
          </div>
        </div>

      </div>

      {/* ATO Code Reference Guide */}
      {showBasCodes && (
        <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A2540] dark:text-white flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-[#4D92DF]" />
              Official ATO BAS Reference Codes
            </h3>
            {onOpenHowToTab && (
              <button
                type="button"
                onClick={onOpenHowToTab}
                className="text-xs font-semibold text-[#4D92DF] hover:underline flex items-center gap-1"
              >
                How to complete BAS form <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 text-xs">
            <div className="flex items-start gap-2">
              <span className="rounded bg-[#4D92DF]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#4D92DF]">
                G1
              </span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Total Sales</p>
                <p className="text-[11px] text-slate-500">Gross income including GST</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                1A
              </span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">GST on Sales</p>
                <p className="text-[11px] text-slate-500">GST collected on rent</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                1B
              </span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">GST on Purchases</p>
                <p className="text-[11px] text-slate-500">Input tax credits claimable</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">
                G11
              </span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Non-capital Purchases</p>
                <p className="text-[11px] text-slate-500">Operating property expenses</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
