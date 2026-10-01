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
  Building,
  Calendar,
  Layers,
  Info,
  TrendingUp,
  TrendingDown,
  Scale,
  Receipt,
  CheckCircle2,
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
  const workspaceName = useWorkspaceStore((s) => s.workspaceName) || 'Portfolio';

  const { totals, incomeByCategory, expenseByCategory, unclassifiedCount } = worksheet;
  const isPayable = totals.netGstPosition >= 0;

  const startYear = worksheet.financialYear - 1;
  const endYear = worksheet.financialYear;
  const fyShort = `FY ${startYear}–${endYear}`;
  const periodTitle = worksheet.period === 'FY'
    ? `${fyShort} Annual BAS Summary`
    : `${fyShort} • ${worksheet.period} Activity Statement`;

  const propertyDisplayName = worksheet.propertyId
    ? worksheet.propertyName
    : 'Across All Portfolio Assets';

  // Helper to format currency or '-' if zero
  const formatCellCurrency = (val: number, showDashIfZero = false) => {
    if (showDashIfZero && Math.abs(val) < 0.005) {
      return '—';
    }
    const isNegative = val < -0.005;
    const formatted = Math.abs(val).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isNegative ? `-$${formatted}` : `$${formatted}`;
  };

  // Calculate GST ratio for visual comparison bar
  const totalGstFlow = Math.abs(totals.gstOnSales) + Math.abs(totals.gstOnExpenses);
  const salesGstPercent = totalGstFlow > 0 ? (totals.gstOnSales / totalGstFlow) * 100 : 50;
  const expensesGstPercent = 100 - salesGstPercent;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Unclassified Warning Banner */}
      {unclassifiedCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
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
              className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline"
            >
              Review in Details <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Main Executive Worksheet Container */}
      <div className="mx-auto max-w-5xl rounded-2xl border border-admin-border bg-admin-surface p-6 sm:p-8 shadow-sm space-y-8">
        
        {/* Top Scope & Metadata Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-admin-border/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-admin-primary/10 border border-admin-primary/20 px-2 py-0.5 text-[11px] font-semibold text-admin-primary">
                <Receipt className="h-3 w-3" />
                Simpler BAS Method
              </span>
              <span className="text-xs text-admin-muted">ATO GST Compliant</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-admin-foreground mt-2">
              {workspaceName}&apos;s Business Activity Statement
            </h1>
            <p className="text-xs font-medium text-admin-muted mt-0.5">
              {periodTitle} • Generated from verified ledger entries
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto text-xs">
            <div className="flex items-center gap-1.5 rounded-lg border border-admin-border bg-admin-surface-subtle px-3 py-1.5 font-medium text-admin-foreground">
              <Building className="h-3.5 w-3.5 text-admin-muted" />
              <span className="max-w-[200px] truncate">{propertyDisplayName}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-admin-border bg-admin-surface-subtle px-3 py-1.5 font-medium text-admin-foreground">
              <Calendar className="h-3.5 w-3.5 text-admin-muted" />
              <span>{worksheet.periodLabel}</span>
            </div>
          </div>
        </div>

        {/* ================= SECTION 0: EXECUTIVE NET GST POSITION ================= */}
        <div className="rounded-xl border border-admin-border/80 bg-admin-surface-subtle/50 p-5 sm:p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-admin-muted">
                Calculated ATO Settlement
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-admin-foreground">
                  {formatCurrency(Math.abs(totals.netGstPosition))}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                    totals.netGstPosition < -0.005
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : totals.netGstPosition > 0.005
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'border-admin-border bg-admin-surface text-admin-muted'
                  }`}
                >
                  <Scale className="h-3.5 w-3.5" />
                  {totals.netGstPosition < -0.005
                    ? 'Refund Due from ATO'
                    : totals.netGstPosition > 0.005
                    ? 'Payment Due to ATO'
                    : 'Balanced ($0.00)'}
                </span>
              </div>
              <p className="text-xs text-admin-muted mt-1">
                Formula: Box 1A (GST Collected: {formatCurrency(totals.gstOnSales)}) minus Box 1B (GST Claimable: {formatCurrency(totals.gstOnExpenses)})
              </p>
            </div>

            {/* Visual Ratio Bar */}
            <div className="w-full md:w-64 space-y-1.5 self-center">
              <div className="flex justify-between text-[11px] font-medium text-admin-muted">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-admin-teal" />
                  GST on Sales: {salesGstPercent.toFixed(0)}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-admin-primary" />
                  GST Claimable: {expensesGstPercent.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-admin-surface border border-admin-border flex">
                <div
                  className="bg-admin-teal transition-all duration-500"
                  style={{ width: `${salesGstPercent}%` }}
                />
                <div
                  className="bg-admin-primary transition-all duration-500"
                  style={{ width: `${expensesGstPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* ATO Box Figures Quick Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-admin-border/60">
            <div className="rounded-lg border border-admin-border/60 bg-admin-surface p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-admin-muted">TOTAL SALES</span>
                <span className="rounded bg-admin-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-admin-primary">
                  G1
                </span>
              </div>
              <p className="text-base font-bold font-mono text-admin-foreground mt-1">
                {formatCurrency(totals.totalSales)}
              </p>
              <p className="text-[10px] text-admin-muted mt-0.5">Gross revenue incl. GST</p>
            </div>

            <div className="rounded-lg border border-admin-border/60 bg-admin-surface p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-admin-muted">GST ON SALES</span>
                <span className="rounded bg-admin-teal/10 px-1.5 py-0.5 text-[10px] font-bold text-admin-teal">
                  1A
                </span>
              </div>
              <p className="text-base font-bold font-mono text-admin-teal mt-1">
                {formatCurrency(totals.gstOnSales)}
              </p>
              <p className="text-[10px] text-admin-muted mt-0.5">GST collected on rent</p>
            </div>

            <div className="rounded-lg border border-admin-border/60 bg-admin-surface p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-admin-muted">PURCHASES</span>
                <span className="rounded bg-admin-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-admin-primary">
                  G11
                </span>
              </div>
              <p className="text-base font-bold font-mono text-admin-foreground mt-1">
                {formatCurrency(totals.totalExpenses)}
              </p>
              <p className="text-[10px] text-admin-muted mt-0.5">Operating expenses</p>
            </div>

            <div className="rounded-lg border border-admin-border/60 bg-admin-surface p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-admin-muted">GST CLAIMABLE</span>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  1B
                </span>
              </div>
              <p className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(totals.gstOnExpenses)}
              </p>
              <p className="text-[10px] text-admin-muted mt-0.5">Input tax credits</p>
            </div>
          </div>
        </div>

        {/* ================= SECTION 1: BUSINESS INCOME ================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-admin-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-admin-teal" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-admin-foreground">
                Business Income
              </h2>
            </div>
            {showBasCodes && (
              <span className="text-xs font-semibold text-admin-muted">
                Reported at ATO Box <strong className="text-admin-foreground font-mono">G1</strong> &amp; <strong className="text-admin-teal font-mono">1A</strong>
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-admin-border">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-admin-border bg-admin-surface-subtle/80 text-[11px] font-bold uppercase tracking-wider text-admin-muted">
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Revenue Category</th>
                  <th className="py-3 px-4 text-right">Gross Amount</th>
                  <th className="py-3 px-4 text-right">GST Collected</th>
                  <th className="py-3 px-4 text-right">Net Amount</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-admin-border/60 text-admin-foreground">
                {incomeByCategory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 px-4 text-center text-xs text-admin-muted italic">
                      No income transactions recorded for {worksheet.periodLabel}
                    </td>
                  </tr>
                ) : (
                  incomeByCategory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-admin-surface-subtle/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-admin-muted">{worksheet.periodLabel}</td>
                      <td className="py-3 px-4 font-semibold text-admin-foreground flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-admin-teal/60" />
                        {item.categoryName}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium">
                        {formatCellCurrency(item.gross)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-admin-teal">
                        {formatCellCurrency(item.gst, true)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-admin-muted">
                        {formatCellCurrency(item.net)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-admin-border bg-admin-surface-subtle font-bold text-xs text-admin-foreground">
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4">Total Business Income</td>
                  <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                    {formatCellCurrency(totals.totalSales)}
                    {showBasCodes && (
                      <span className="ml-1 rounded bg-admin-primary/10 px-1 py-0.5 text-[10px] font-bold text-admin-primary">
                        G1
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-admin-teal whitespace-nowrap">
                    {formatCellCurrency(totals.gstOnSales)}
                    {showBasCodes && (
                      <span className="ml-1 rounded bg-admin-teal/10 px-1 py-0.5 text-[10px] font-bold text-admin-teal">
                        1A
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-admin-muted">
                    {formatCellCurrency(totals.totalSales - totals.gstOnSales > 0 ? totals.totalSales - totals.gstOnSales : totals.totalSales)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ================= SECTION 2: BUSINESS EXPENSES ================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-admin-border">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-admin-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-admin-foreground">
                Business Expenses
              </h2>
            </div>
            {showBasCodes && (
              <span className="text-xs font-semibold text-admin-muted">
                Reported at ATO Box <strong className="text-admin-foreground font-mono">G11</strong> &amp; <strong className="text-emerald-600 dark:text-emerald-400 font-mono">1B</strong>
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-admin-border">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-admin-border bg-admin-surface-subtle/80 text-[11px] font-bold uppercase tracking-wider text-admin-muted">
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Expense Category</th>
                  <th className="py-3 px-4 text-right">Gross Amount</th>
                  <th className="py-3 px-4 text-right">GST Claimable</th>
                  <th className="py-3 px-4 text-right">Net Amount</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-admin-border/60 text-admin-foreground">
                {expenseByCategory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 px-4 text-center text-xs text-admin-muted italic">
                      No expense transactions recorded for {worksheet.periodLabel}
                    </td>
                  </tr>
                ) : (
                  expenseByCategory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-admin-surface-subtle/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-admin-muted">{worksheet.periodLabel}</td>
                      <td className="py-3 px-4 font-semibold text-admin-foreground flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-admin-primary/60" />
                        {item.categoryName}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium">
                        {formatCellCurrency(item.gross)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCellCurrency(item.gst, true)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-admin-muted">
                        {formatCellCurrency(item.net)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-admin-border bg-admin-surface-subtle font-bold text-xs text-admin-foreground">
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4">Total Business Expenses</td>
                  <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                    {formatCellCurrency(totals.totalExpenses)}
                    {showBasCodes && (
                      <span className="ml-1 rounded bg-admin-primary/10 px-1 py-0.5 text-[10px] font-bold text-admin-primary">
                        G11
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {formatCellCurrency(totals.gstOnExpenses)}
                    {showBasCodes && (
                      <span className="ml-1 rounded bg-emerald-500/10 px-1 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        1B
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-admin-muted">
                    {formatCellCurrency(totals.totalExpenses - totals.gstOnExpenses)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ATO Reference Guide Strip */}
      {showBasCodes && (
        <div className="mx-auto max-w-5xl rounded-xl border border-admin-border bg-admin-surface p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-admin-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-admin-foreground flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-admin-primary" />
              Official ATO Business Activity Statement Box Codes
            </h3>
            {onOpenHowToTab && (
              <button
                type="button"
                onClick={onOpenHowToTab}
                className="text-xs font-semibold text-admin-primary hover:underline flex items-center gap-1"
              >
                ATO Lodgment Guide <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 text-xs">
            <div className="flex items-start gap-2.5">
              <span className="rounded bg-admin-primary/10 px-2 py-0.5 text-[11px] font-bold text-admin-primary">
                G1
              </span>
              <div>
                <p className="font-semibold text-admin-foreground">Total Sales</p>
                <p className="text-[11px] text-admin-muted">Gross rent &amp; commercial receipts incl. GST</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="rounded bg-admin-teal/10 px-2 py-0.5 text-[11px] font-bold text-admin-teal">
                1A
              </span>
              <div>
                <p className="font-semibold text-admin-foreground">GST on Sales</p>
                <p className="text-[11px] text-admin-muted">GST collected payable to the Australian Tax Office</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="rounded bg-admin-surface-subtle border border-admin-border px-2 py-0.5 text-[11px] font-bold text-admin-foreground">
                G11
              </span>
              <div>
                <p className="font-semibold text-admin-foreground">Non-capital Purchases</p>
                <p className="text-[11px] text-admin-muted">Operating expenses, council rates, insurance, repairs</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                1B
              </span>
              <div>
                <p className="font-semibold text-admin-foreground">GST on Purchases</p>
                <p className="text-[11px] text-admin-muted">Input tax credits refundable back to your account</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
