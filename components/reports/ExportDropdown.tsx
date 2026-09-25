'use client';

import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, ChevronDown } from 'lucide-react';
import { FinanceReportType, FinanceReportFilters } from '@/modules/finance/domain/reporting-types';
import { exportReportCsvAction, exportReportPdfAction } from '@/app/actions/reports';

interface ExportDropdownProps {
  reportType: FinanceReportType;
  filters: FinanceReportFilters;
}

export function ExportDropdown({ reportType, filters }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportCsv = async () => {
    try {
      setIsExportingCsv(true);
      const res = await exportReportCsvAction(reportType, filters);
      if (res.success && res.csvContent) {
        const blob = new Blob([res.csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', res.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setIsExportingCsv(false);
      setIsOpen(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const res = await exportReportPdfAction(reportType, filters);
      if (res.success && res.base64Data) {
        const link = document.createElement('a');
        link.href = res.base64Data;
        link.setAttribute('download', res.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to export PDF report. Please try again.');
    } finally {
      setIsExportingPdf(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      >
        <Download className="w-4 h-4" />
        <span>Export Report</span>
        <ChevronDown className="w-3.5 h-3.5 text-emerald-100" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-30 py-2 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Download Options
            </div>

            <button
              type="button"
              disabled={isExportingCsv}
              onClick={handleExportCsv}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer disabled:opacity-50"
            >
              {isExportingCsv ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              )}
              <div>
                <div className="font-medium text-slate-900 dark:text-white">Export as CSV</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Excel / Spreadsheet format</div>
              </div>
            </button>

            <button
              type="button"
              disabled={isExportingPdf}
              onClick={handleExportPdf}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer disabled:opacity-50"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
              ) : (
                <FileText className="w-4 h-4 text-rose-600" />
              )}
              <div>
                <div className="font-medium text-slate-900 dark:text-white">Executive PDF</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Print & ATO statement</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
