'use client';

import React from 'react';
import { CheckCircle2, Clock, AlertCircle, Building2, User, FileText } from 'lucide-react';
import { RentReconciliationReportDTO, RentScheduleReconciliationItem, PropertyFinancialSummary } from '@/modules/finance/domain/reporting-types';

interface RentReconciliationTabProps {
  data: RentReconciliationReportDTO;
}

export function RentReconciliationTab({ data }: RentReconciliationTabProps) {
  const { kpis, schedules, byProperty } = data;

  const formatCurrency = (val: number) => {
    return `$${val.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
            <Clock className="w-3 h-3" /> Partial
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-3 h-3" /> Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Scheduled Rent</span>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(kpis.totalExpected)}
          </div>
          <div className="mt-1 text-xs text-slate-400">{kpis.scheduleCount} scheduled payments</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actual Received Rent</span>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(kpis.totalReceived)}
          </div>
          <div className="mt-1 text-xs text-slate-400">{kpis.fullyPaidCount} fully paid items</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Rent</span>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(kpis.totalOutstanding)}
          </div>
          <div className="mt-1 text-xs text-slate-400">{kpis.overdueCount} overdue / {kpis.partiallyPaidCount} partial</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Collection Rate</span>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {kpis.collectionRate.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-slate-400">Received vs scheduled</div>
        </div>
      </div>

      {/* Property-Level Rent Reconciliation Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Property Rent Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-2.5 px-3">Property</th>
                <th className="py-2.5 px-3 text-right">Expected ($)</th>
                <th className="py-2.5 px-3 text-right">Received ($)</th>
                <th className="py-2.5 px-3 text-right">Outstanding ($)</th>
                <th className="py-2.5 px-3 text-right">Collection Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {byProperty.map((p: PropertyFinancialSummary) => (
                <tr key={p.propertyId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{p.propertyName}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300">{formatCurrency(p.expectedRent)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.actualRentReceived)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(p.outstandingRent)}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-slate-200">{p.collectionRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Schedule Items Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Payment Schedule Itemization ({schedules.length} Items)</h3>
        {schedules.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No payment schedules found for this period.</p>
        ) : (
          <div className="overflow-x-auto max-h-[450px]">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 shadow-xs">
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Property</th>
                  <th className="py-2.5 px-3">Tenant</th>
                  <th className="py-2.5 px-3 text-right">Expected ($)</th>
                  <th className="py-2.5 px-3 text-right">Received ($)</th>
                  <th className="py-2.5 px-3 text-right">Outstanding ($)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {schedules.map((s: RentScheduleReconciliationItem) => (
                  <tr key={s.scheduleId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{s.dueDate}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{s.propertyName}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{s.tenantName}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300">{formatCurrency(s.expectedAmount)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(s.paidAmount)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(s.outstandingAmount)}</td>
                    <td className="py-2.5 px-3 text-center">{getStatusBadge(s.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
