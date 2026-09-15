'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  FileText,
  Download,
  Printer,
  Calendar,
  Building,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShieldCheck,
  Layers,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { Button, Input, Select, Textarea, useToast } from '@/components/admin/ui';
import {
  PREDEFINED_LEDGER_TEMPLATES,
  PredefinedLedgerTemplate,
} from '@/modules/finance/domain/constants/report-templates';
import { TransactionDTO, LedgerEntryDTO } from '@/modules/finance/domain/types';
import { cn } from '@/lib/utils';
import { exportLedgerCsvAction } from '@/app/actions/finance';

interface LedgerReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: TransactionDTO[];
  ledgerEntries: LedgerEntryDTO[];
  properties: any[];
  initialTemplateId?: string;
  defaultPropertyId?: string;
}

type PeriodType =
  | 'this_fy'
  | 'last_fy'
  | 'this_quarter'
  | 'last_quarter'
  | 'ytd'
  | 'last_12_months'
  | 'this_month'
  | 'custom';

export function LedgerReportModal({
  isOpen,
  onClose,
  transactions,
  ledgerEntries,
  properties,
  initialTemplateId = 'template_executive',
  defaultPropertyId = '',
}: LedgerReportModalProps) {
  const { toast } = useToast();

  // Wizard Step: 1 = Template Selection, 2 = Period & Scope, 3 = Preview & Download
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // A4 Preview Sizing and Zoom Controls (Matching Invoice Preview)
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [isAutoFit, setIsAutoFit] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(0.75);

  // Measure available container width accurately using ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const w = el.clientWidth;
      if (w > 0) setContainerWidth(w);
    };

    updateWidth();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width || el.clientWidth;
          if (w > 0) setContainerWidth(w);
        }
      });
      ro.observe(el);
    }

    window.addEventListener('resize', updateWidth);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [step]);

  // Compute fit scale so that 794px A4 sheet fits inside container without cutoffs
  const fitScale = useMemo(() => {
    if (!containerWidth || containerWidth <= 0) return 0.75;
    const available = Math.max(180, containerWidth - 48);
    const scale = available / 794;
    return Math.min(1.0, Math.max(0.25, Number(scale.toFixed(3))));
  }, [containerWidth]);

  const effectiveScale = isAutoFit ? fitScale : zoomLevel;

  // Configuration State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId);
  const [periodType, setPeriodType] = useState<PeriodType>('this_fy');
  const [customStartDate, setCustomStartDate] = useState<string>('2025-07-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-06-30');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(defaultPropertyId);
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [reportTitle, setReportTitle] = useState<string>('Financial Ledger & Cashflow Report');
  const [preparedFor, setPreparedFor] = useState<string>('Property Owner / Investor');
  const [preparedBy, setPreparedBy] = useState<string>('PropertyLedge Asset Management');
  const [notes, setNotes] = useState<string>(
    'This report is generated from verified transaction records. Figures are in Australian Dollars (AUD).'
  );
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  const selectedTemplate = useMemo(() => {
    return (
      PREDEFINED_LEDGER_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
      PREDEFINED_LEDGER_TEMPLATES[0]
    );
  }, [selectedTemplateId]);

  // Compute actual date range based on periodType
  const dateRange = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed (0 = Jan, 6 = Jul)

    if (periodType === 'this_fy') {
      // Australian FY: Jul 1 to Jun 30
      const startYear = currentMonth >= 6 ? currentYear : currentYear - 1;
      return {
        startDate: `${startYear}-07-01`,
        endDate: `${startYear + 1}-06-30`,
        label: `Financial Year ${startYear}/${(startYear + 1).toString().slice(-2)}`,
      };
    }

    if (periodType === 'last_fy') {
      const startYear = currentMonth >= 6 ? currentYear - 1 : currentYear - 2;
      return {
        startDate: `${startYear}-07-01`,
        endDate: `${startYear + 1}-06-30`,
        label: `Financial Year ${startYear}/${(startYear + 1).toString().slice(-2)} (Last FY)`,
      };
    }

    if (periodType === 'this_quarter') {
      // Q1: Jul-Sep, Q2: Oct-Dec, Q3: Jan-Mar, Q4: Apr-Jun
      let qStart = 0;
      let qEnd = 2;
      let qYear = currentYear;
      let qName = 'Q1';

      if (currentMonth >= 6 && currentMonth <= 8) {
        qStart = 6;
        qEnd = 8;
        qName = 'Q1 (Jul - Sep)';
      } else if (currentMonth >= 9 && currentMonth <= 11) {
        qStart = 9;
        qEnd = 11;
        qName = 'Q2 (Oct - Dec)';
      } else if (currentMonth >= 0 && currentMonth <= 2) {
        qStart = 0;
        qEnd = 2;
        qName = 'Q3 (Jan - Mar)';
      } else {
        qStart = 3;
        qEnd = 5;
        qName = 'Q4 (Apr - Jun)';
      }

      const sDate = new Date(qYear, qStart, 1).toISOString().split('T')[0];
      const eDate = new Date(qYear, qEnd + 1, 0).toISOString().split('T')[0];
      return { startDate: sDate, endDate: eDate, label: `Current Quarter: ${qName}` };
    }

    if (periodType === 'last_quarter') {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      const m = d.getMonth();
      const y = d.getFullYear();
      let qStart = Math.floor(m / 3) * 3;
      const sDate = new Date(y, qStart, 1).toISOString().split('T')[0];
      const eDate = new Date(y, qStart + 3, 0).toISOString().split('T')[0];
      return { startDate: sDate, endDate: eDate, label: 'Previous Quarter' };
    }

    if (periodType === 'ytd') {
      return {
        startDate: `${currentYear}-01-01`,
        endDate: today.toISOString().split('T')[0],
        label: `Calendar Year ${currentYear} (YTD)`,
      };
    }

    if (periodType === 'last_12_months') {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      return {
        startDate: past.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
        label: 'Trailing 12 Months',
      };
    }

    if (periodType === 'this_month') {
      const sDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const eDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
      return {
        startDate: sDate,
        endDate: eDate,
        label: today.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }),
      };
    }

    // Custom
    return {
      startDate: customStartDate,
      endDate: customEndDate,
      label: `${customStartDate} to ${customEndDate}`,
    };
  }, [periodType, customStartDate, customEndDate]);

  // Filtered transactions for the report
  const filteredData = useMemo(() => {
    return transactions.filter((tx) => {
      // Property filter
      if (selectedPropertyId && tx.property_id !== selectedPropertyId) return false;
      // Type filter
      if (selectedType === 'income' && tx.transaction_type !== 'income') return false;
      if (selectedType === 'expense' && tx.transaction_type !== 'expense') return false;
      // Date range filter
      if (dateRange.startDate && tx.transaction_date < dateRange.startDate) return false;
      if (dateRange.endDate && tx.transaction_date > dateRange.endDate) return false;
      return true;
    });
  }, [transactions, selectedPropertyId, selectedType, dateRange]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryTotals: Record<string, { name: string; type: string; total: number; count: number }> = {};
    const propertyTotals: Record<string, { name: string; income: number; expense: number; net: number }> = {};

    filteredData.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.transaction_type === 'income') {
        totalIncome += amt;
      } else {
        totalExpenses += amt;
      }

      // Category breakdown
      const catKey = tx.category?.id || tx.category?.name || 'uncategorized';
      const catName = tx.category?.name || 'Uncategorized';
      if (!categoryTotals[catKey]) {
        categoryTotals[catKey] = { name: catName, type: tx.transaction_type, total: 0, count: 0 };
      }
      categoryTotals[catKey].total += amt;
      categoryTotals[catKey].count += 1;

      // Property breakdown
      const propKey = tx.property_id || 'unassigned';
      const propName = tx.property?.name || tx.property?.address_line_1 || 'General / Unassigned';
      if (!propertyTotals[propKey]) {
        propertyTotals[propKey] = { name: propName, income: 0, expense: 0, net: 0 };
      }
      if (tx.transaction_type === 'income') {
        propertyTotals[propKey].income += amt;
        propertyTotals[propKey].net += amt;
      } else {
        propertyTotals[propKey].expense += amt;
        propertyTotals[propKey].net -= amt;
      }
    });

    const netCashflow = totalIncome - totalExpenses;
    const operatingMargin = totalIncome > 0 ? (netCashflow / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpenses,
      netCashflow,
      operatingMargin,
      categories: Object.values(categoryTotals).sort((a, b) => b.total - a.total),
      properties: Object.values(propertyTotals).sort((a, b) => b.income - a.income),
      count: filteredData.length,
    };
  }, [filteredData]);

  // Compute chronological rows with running balance (matching accounting statements)
  const chronologicalRows = useMemo(() => {
    const sorted = [...filteredData].sort((a, b) => (a.transaction_date > b.transaction_date ? 1 : -1));
    let running = 0;
    return sorted.map((tx) => {
      const amt = Number(tx.amount) || 0;
      const isInc = tx.transaction_type === 'income';
      const debit = isInc ? 0 : amt;
      const credit = isInc ? amt : 0;
      running += credit - debit;
      return {
        ...tx,
        debit,
        credit,
        runningBalance: running,
      };
    });
  }, [filteredData]);

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format date helper (DD/MM/YY)
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    if (y && m && d) return `${d}/${m}/${y.slice(-2)}`;
    return new Date(dateStr).toLocaleDateString('en-AU');
  };

  // Handle Print PDF with clean iframe isolation
  const handlePrint = () => {
    const printElement = document.getElementById('printable-ledger-report');
    if (!printElement) {
      window.print();
      return;
    }

    // Create an isolated hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4 portrait;
              margin: 1.2cm;
            }
            body {
              background-color: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            tr, .grid {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          </style>
        </head>
        <body>
          <div style="padding: 10px;">
            ${printElement.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Trigger print once styles and fonts are parsed
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }, 400);
  };

  // Handle Export CSV
  const handleDownloadCsv = async () => {
    setIsExportingCsv(true);
    try {
      const res = await exportLedgerCsvAction({
        property_id: selectedPropertyId || undefined,
        transaction_type: selectedType === 'all' ? undefined : selectedType,
        start_date: dateRange.startDate || undefined,
        end_date: dateRange.endDate || undefined,
      });

      const blob = new Blob([res.content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `${selectedTemplate.id}_${periodType}_${dateRange.startDate || 'all'}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Report Downloaded',
        description: `CSV file exported successfully for ${dateRange.label}.`,
        variant: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Export Failed',
        description: err.message || 'Could not generate CSV report.',
        variant: 'destructive',
      });
    } finally {
      setIsExportingCsv(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 print:p-0 print:bg-transparent print:backdrop-blur-none print:static print:block print:overflow-visible">
      {/* Global Print Stylesheet specifically for Ledger Statements */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body {
              background: #ffffff !important;
              color: #000000 !important;
              font-family: system-ui, -apple-system, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body * {
              visibility: hidden;
            }
            #printable-ledger-report, #printable-ledger-report * {
              visibility: visible;
            }
            #printable-ledger-report {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 20px !important;
              border: none !important;
              box-shadow: none !important;
              background: #ffffff !important;
            }
            @page {
              size: A4 portrait;
              margin: 1.2cm;
            }
          }
        `
      }} />

      {/* Container */}
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden print:max-h-none print:h-auto print:border-none print:shadow-none print:p-0 print:overflow-visible print:bg-transparent">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: selectedTemplate.brandColor }}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Ledger Report & Template Generator
                <span className="text-[10.5px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  Step {step} of 3
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {step === 1 && 'Select a professional ledger report template blueprint'}
                {step === 2 && 'Configure time periods (Yearly, Quarterly, Custom) and scope'}
                {step === 3 && 'Live preview and download high-resolution PDF or CSV'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Step Progress Indicator */}
        <div className="grid grid-cols-3 px-6 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold print:hidden">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={cn(
              'flex items-center gap-2 transition-colors',
              step === 1 ? 'text-[#008F83] font-bold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <span
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                step >= 1 ? 'bg-[#008F83] text-white' : 'bg-slate-200 text-slate-600'
              )}
            >
              1
            </span>
            <span>1. Choose Blueprint</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(2)}
            className={cn(
              'flex items-center gap-2 transition-colors justify-center',
              step === 2 ? 'text-[#008F83] font-bold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <span
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                step >= 2 ? 'bg-[#008F83] text-white' : 'bg-slate-200 text-slate-600'
              )}
            >
              2
            </span>
            <span>2. Period & Filters</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(3)}
            className={cn(
              'flex items-center gap-2 transition-colors justify-end',
              step === 3 ? 'text-[#008F83] font-bold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <span
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                step >= 3 ? 'bg-[#008F83] text-white' : 'bg-slate-200 text-slate-600'
              )}
            >
              3
            </span>
            <span>3. Preview & Download</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* STEP 1: CHOOSE BLUEPRINT */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Available Statement Blueprints
                </h3>
                <span className="text-xs text-slate-500">
                  {PREDEFINED_LEDGER_TEMPLATES.length} Australian Tax & Accounting Standards
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PREDEFINED_LEDGER_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplateId === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => {
                        setSelectedTemplateId(tmpl.id);
                        if (tmpl.id === 'template_ato_tax') {
                          setReportTitle('ATO Rental Property Tax Schedule (EOFY)');
                        } else if (tmpl.id === 'template_quarterly_bas') {
                          setReportTitle('Quarterly Cashflow & BAS Statement');
                        } else if (tmpl.id === 'template_property_breakdown') {
                          setReportTitle('Portfolio Property Performance Matrix');
                        } else if (tmpl.id === 'template_accountant_ledger') {
                          setReportTitle('General Ledger Audit & Running Balance');
                        } else {
                          setReportTitle('Executive Property Statement & Cashflow');
                        }
                      }}
                      className={cn(
                        'p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group relative',
                        isSelected
                          ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 ring-2 ring-[#008F83]/20 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700'
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#008F83] text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
                            style={{ backgroundColor: tmpl.brandColor }}
                          />
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {tmpl.badge}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#008F83] transition-colors">
                            {tmpl.name}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {tmpl.description}
                          </p>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                          {tmpl.features.map((feat, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#008F83]" />
                              <span className="truncate">{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Best for: <strong className="text-slate-600 dark:text-slate-300 font-medium">{tmpl.bestFor.split(',')[0]}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: PERIOD & CONFIGURATION */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Selected Template Summary */}
              <div className="p-4 rounded-2xl bg-[#008F83]/10 border border-[#008F83]/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-xs"
                    style={{ backgroundColor: selectedTemplate.brandColor }}
                  >
                    {selectedTemplate.layoutStyle.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Selected Blueprint: {selectedTemplate.name}
                    </h4>
                    <p className="text-xs text-slate-500">{selectedTemplate.badge}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-[#008F83] hover:underline"
                >
                  Change Template
                </button>
              </div>

              {/* Time Period Presets */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  1. Select Reporting Period
                </label>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPeriodType('this_fy')}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all',
                      periodType === 'this_fy'
                        ? 'border-[#008F83] bg-[#008F83]/10 font-bold text-[#008F83]'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    )}
                  >
                    <p className="text-xs font-bold">This Financial Year</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">FY 2025/26 (Jul-Jun)</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodType('last_fy')}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all',
                      periodType === 'last_fy'
                        ? 'border-[#008F83] bg-[#008F83]/10 font-bold text-[#008F83]'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    )}
                  >
                    <p className="text-xs font-bold">Last Financial Year</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">FY 2024/25 (Jul-Jun)</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodType('this_quarter')}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all',
                      periodType === 'this_quarter'
                        ? 'border-[#008F83] bg-[#008F83]/10 font-bold text-[#008F83]'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    )}
                  >
                    <p className="text-xs font-bold">Current Quarter</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Q1/Q2/Q3/Q4 BAS</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodType('last_quarter')}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all',
                      periodType === 'last_quarter'
                        ? 'border-[#008F83] bg-[#008F83]/10 font-bold text-[#008F83]'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    )}
                  >
                    <p className="text-xs font-bold">Last Quarter</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Previous 3 Months</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodType('ytd')}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all',
                      periodType === 'ytd'
                        ? 'border-[#008F83] bg-[#008F83]/10 font-bold text-[#008F83]'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    )}
                  >
                    <p className="text-xs font-bold">Calendar Year (YTD)</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Jan 1 - Today</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodType('last_12_months')}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all',
                      periodType === 'last_12_months'
                        ? 'border-[#008F83] bg-[#008F83]/10 font-bold text-[#008F83]'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    )}
                  >
                    <p className="text-xs font-bold">Trailing 12 Months</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Past 365 Days</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodType('this_month')}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all',
                      periodType === 'this_month'
                        ? 'border-[#008F83] bg-[#008F83]/10 font-bold text-[#008F83]'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    )}
                  >
                    <p className="text-xs font-bold">This Month</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Current Month</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodType('custom')}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all',
                      periodType === 'custom'
                        ? 'border-[#008F83] bg-[#008F83]/10 font-bold text-[#008F83]'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    )}
                  >
                    <p className="text-xs font-bold">Custom Range</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Select Dates</p>
                  </button>
                </div>

                {/* Custom Date Inputs if Custom selected */}
                {periodType === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 mt-2">
                    <Input
                      label="Start Date"
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-white dark:bg-slate-800"
                    />
                    <Input
                      label="End Date"
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Scope Filters: Property & Flow Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Property Scope"
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="bg-white dark:bg-slate-800"
                >
                  <option value="">All Properties in Portfolio</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.address_line_1}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Transaction Flow"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="bg-white dark:bg-slate-800"
                >
                  <option value="all">Complete Net Cashflow (Income & Expenses)</option>
                  <option value="income">Income Records Only (Rental / Revenue)</option>
                  <option value="expense">Expense Records Only (Deductions / Costs)</option>
                </Select>
              </div>

              {/* Report Header Customizations */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  2. Report Header Details & Sign-Off
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Statement Title"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    className="bg-white dark:bg-slate-800"
                  />
                  <Input
                    label="Prepared For (Client / Owner)"
                    value={preparedFor}
                    onChange={(e) => setPreparedFor(e.target.value)}
                    className="bg-white dark:bg-slate-800"
                  />
                  <Input
                    label="Prepared By (Firm / Manager)"
                    value={preparedBy}
                    onChange={(e) => setPreparedBy(e.target.value)}
                    className="bg-white dark:bg-slate-800"
                  />
                </div>

                <Textarea
                  label="Audit & Disclaimer Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="bg-white dark:bg-slate-800 resize-none text-xs"
                />
              </div>
            </div>
          )}

          {/* STEP 3: LIVE PREVIEW & DOWNLOAD */}
          {step === 3 && (
            <div className="space-y-4 print:space-y-0 print:p-0">
              {/* Action Toolbar (Toolbar matching LiveInvoiceRenderer) */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs print:hidden">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#008F83]/15 text-[#008F83] border border-[#008F83]/20">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      A4 Document Preview
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        Live PDF Parity
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Standard A4 Portrait (210mm × 297mm) • {filteredData.length} records in scope
                    </p>
                  </div>
                </div>

                {/* Quick Blueprint Picker */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                  {PREDEFINED_LEDGER_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplateId(t.id);
                        if (t.id === 'template_ato_tax') {
                          setReportTitle('ATO Rental Property Tax Schedule (EOFY)');
                        } else if (t.id === 'template_quarterly_bas') {
                          setReportTitle('Quarterly Cashflow & BAS Statement');
                        } else if (t.id === 'template_property_breakdown') {
                          setReportTitle('Portfolio Property Performance Matrix');
                        } else if (t.id === 'template_accountant_ledger') {
                          setReportTitle('General Ledger Audit & Running Balance');
                        } else {
                          setReportTitle('Executive Property Statement & Cashflow');
                        }
                      }}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border',
                        selectedTemplateId === t.id
                          ? 'bg-[#008F83] text-white border-[#008F83] shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-slate-900'
                      )}
                      title={`${t.name} (${t.badge})`}
                    >
                      <span
                        className="w-2 h-2 rounded-full border border-black/10"
                        style={{ backgroundColor: t.brandColor }}
                      />
                      {t.name.split(' ')[0]}
                    </button>
                  ))}
                </div>

                {/* Controls & Actions */}
                <div className="flex items-center gap-1.5">
                  {/* Auto-Fit Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsAutoFit((prev) => !prev)}
                    className={cn(
                      "px-2 py-1 text-xs font-semibold rounded-lg transition-colors border flex items-center gap-1",
                      isAutoFit
                        ? "bg-[#008F83]/15 text-[#008F83] border-[#008F83]/30 font-bold"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-700"
                    )}
                    title={isAutoFit ? "Auto-Fit Enabled (snaps to container width)" : "Fit to width"}
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Fit</span>
                  </button>

                  {/* Zoom controls */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsAutoFit(false);
                      setZoomLevel((z) => Math.max(0.3, Number(((isAutoFit ? fitScale : z) - 0.05).toFixed(2))));
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 px-1">
                    {Math.round(effectiveScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAutoFit(false);
                      setZoomLevel((z) => Math.min(1.4, Number(((isAutoFit ? fitScale : z) + 0.05).toFixed(2))));
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  {/* CSV Export Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadCsv}
                    disabled={isExportingCsv}
                    className="font-bold text-xs gap-1 ml-1"
                    size="sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    CSV
                  </Button>

                  {/* Print / Save PDF Button */}
                  <Button
                    type="button"
                    onClick={handlePrint}
                    className="font-bold text-xs bg-[#008F83] hover:bg-[#007A70] text-white gap-1 shadow-xs ml-0.5"
                    size="sm"
                  >
                    <Printer className="w-3.5 h-3.5 mr-0.5" /> Print PDF
                  </Button>
                </div>
              </div>

              {/* ─── AUTHENTIC A4 CANVAS CONTAINER (Exact Invoice Preview Styling) ─── */}
              <div
                ref={containerRef}
                className="bg-zinc-900/70 dark:bg-black/80 p-4 md:p-6 rounded-2xl border border-slate-800 flex justify-center items-start overflow-auto shadow-inner min-h-[520px]"
              >
                {/* Scaled Layout Wrapper */}
                <div
                  style={{
                    width: `${Math.round(794 * effectiveScale)}px`,
                    minHeight: `${Math.round(1123 * effectiveScale)}px`,
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'width 0.15s ease-out',
                  }}
                  className="bg-white text-slate-900 shadow-2xl rounded-sm border border-zinc-300"
                >
                  {/* The Physical A4 Sheet (794px × 1123px standard A4 at 96 DPI) */}
                  <div
                    id="printable-ledger-report"
                    style={{
                      width: '794px',
                      minHeight: '1123px',
                      transform: `scale(${effectiveScale})`,
                      transformOrigin: 'top left',
                      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                    }}
                    className="p-8 sm:p-10 bg-white text-slate-900 flex flex-col min-h-[1123px]"
                  >
                    <div className="space-y-6 flex-1">
                      {/* ========================================================= */}
                      {/* TEMPLATE 1: EXECUTIVE STATEMENT */}
                      {/* ========================================================= */}
                      {selectedTemplate.id === 'template_executive' && (
                        <div className="space-y-5">
                          <div className="h-2 w-full rounded-full bg-[#008F83]" />

                          <div className="flex items-start justify-between border-b pb-4 border-slate-200">
                            <div className="space-y-1 max-w-[480px]">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#008F83]" />
                                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                  {selectedTemplate.name}
                                </span>
                                <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                                  {selectedTemplate.badge}
                                </span>
                              </div>
                              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                                {reportTitle}
                              </h1>
                              <p className="text-xs text-slate-500 font-medium">
                                Period: <strong className="text-slate-800 font-semibold">{dateRange.label}</strong> ({dateRange.startDate} to {dateRange.endDate})
                              </p>
                            </div>

                            <div className="text-right space-y-1 text-xs">
                              <div className="font-extrabold text-slate-900 text-sm tracking-tight">{preparedBy}</div>
                              <p className="text-slate-500">Client: <strong className="text-slate-800">{preparedFor}</strong></p>
                              <p className="text-[11px] text-slate-400 font-mono">
                                Issued: {new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                Ref: PL-EXEC-{dateRange.startDate.replace(/-/g, '').slice(2)}-01
                              </p>
                            </div>
                          </div>

                          {/* Metadata Block (Currency Removed) */}
                          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                            <div>
                              <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block">
                                Property / Portfolio Scope
                              </span>
                              <span className="font-bold text-slate-900 block mt-0.5 break-words">
                                {selectedPropertyId ? properties.find(p => p.id === selectedPropertyId)?.name || properties.find(p => p.id === selectedPropertyId)?.address_line_1 || 'Specific Property' : 'Consolidated Portfolio'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block">
                                Statement Status
                              </span>
                              <span className="font-bold text-emerald-700 block mt-0.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" /> Verified & Reconciled
                              </span>
                            </div>
                          </div>

                          {/* KPI Cards */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80">
                              <p className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-800">
                                Total Inflow (Money In)
                              </p>
                              <h3 className="text-xl font-black text-emerald-700 mt-1 font-mono">
                                {formatCurrency(metrics.totalIncome)}
                              </h3>
                            </div>
                            <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200/80">
                              <p className="text-[9.5px] font-bold uppercase tracking-wider text-rose-800">
                                Total Outflow (Money Out)
                              </p>
                              <h3 className="text-xl font-black text-rose-700 mt-1 font-mono">
                                {formatCurrency(metrics.totalExpenses)}
                              </h3>
                            </div>
                            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200">
                              <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-700">
                                Net Operating Position
                              </p>
                              <h3 className={cn('text-xl font-black mt-1 font-mono', metrics.netCashflow >= 0 ? 'text-slate-900' : 'text-rose-600')}>
                                {formatCurrency(metrics.netCashflow)}
                              </h3>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ========================================================= */}
                      {/* TEMPLATE 2: ATO / EOFY TAX SCHEDULE */}
                      {/* ========================================================= */}
                      {selectedTemplate.id === 'template_ato_tax' && (
                        <div className="space-y-5">
                          {/* Official ATO Style Header Banner */}
                          <div className="bg-[#1E3A8A] text-white p-4 rounded-xl shadow-xs flex items-center justify-between">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-blue-900/80 px-2 py-0.5 rounded text-blue-200 border border-blue-400/30">
                                  ATO Individual / Trust Tax Schedule
                                </span>
                                <span className="text-[10px] font-bold text-blue-200">Item 21 Rental Schedule</span>
                              </div>
                              <h1 className="text-xl font-black tracking-tight text-white mt-1">
                                {reportTitle}
                              </h1>
                              <p className="text-xs text-blue-200">
                                Income Tax Assessment Act 1997 • Financial Year {dateRange.label}
                              </p>
                            </div>
                            <div className="text-right space-y-0.5 text-xs border-l border-blue-400/30 pl-4">
                              <p className="text-[10.5px] text-blue-200 uppercase font-bold">Tax Agent / Manager</p>
                              <p className="font-extrabold text-white text-sm">{preparedBy}</p>
                              <p className="text-[10.5px] text-blue-300 font-mono">Date: {new Date().toLocaleDateString('en-AU')}</p>
                            </div>
                          </div>

                          {/* Tax Entity Details (Currency Removed) */}
                          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 text-xs">
                            <div>
                              <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-900 block">
                                Taxpayer / Entity Name
                              </span>
                              <span className="font-extrabold text-slate-900 text-sm mt-0.5 block break-words">{preparedFor}</span>
                            </div>
                            <div>
                              <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-900 block">
                                Rental Property Address / Parcel
                              </span>
                              <span className="font-semibold text-slate-800 mt-0.5 block break-words">
                                {selectedPropertyId ? properties.find(p => p.id === selectedPropertyId)?.name || properties.find(p => p.id === selectedPropertyId)?.address_line_1 || 'Specific Property' : 'All Investment Properties (Consolidated)'}
                              </span>
                            </div>
                          </div>

                          {/* ATO Tax Position Summary Box */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-300">
                              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-900">
                                Item 21A: Gross Rent Inflows
                              </p>
                              <h3 className="text-xl font-black text-emerald-800 mt-1 font-mono">
                                {formatCurrency(metrics.totalIncome)}
                              </h3>
                            </div>
                            <div className="p-3.5 rounded-xl bg-blue-50 border-2 border-blue-300">
                              <p className="text-[9px] font-black uppercase tracking-wider text-blue-900">
                                Item 21B: Allowable Tax Deductions
                              </p>
                              <h3 className="text-xl font-black text-blue-800 mt-1 font-mono">
                                {formatCurrency(metrics.totalExpenses)}
                              </h3>
                            </div>
                            <div className="p-3.5 rounded-xl bg-slate-100 border-2 border-slate-300">
                              <p className="text-[9px] font-black uppercase tracking-wider text-slate-800">
                                Net Taxable Rental Income / (Loss)
                              </p>
                              <h3 className={cn('text-xl font-black mt-1 font-mono', metrics.netCashflow >= 0 ? 'text-slate-900' : 'text-rose-700')}>
                                {formatCurrency(metrics.netCashflow)}
                              </h3>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ========================================================= */}
                      {/* TEMPLATE 3: QUARTERLY BAS STATEMENT */}
                      {/* ========================================================= */}
                      {selectedTemplate.id === 'template_quarterly_bas' && (
                        <div className="space-y-5">
                          <div className="flex items-center justify-between border-b-2 border-teal-600 pb-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[9.5px] font-black uppercase px-2 py-0.5 rounded bg-teal-600 text-white">
                                  BAS / GST Period
                                </span>
                                <span className="text-xs font-bold text-teal-800">
                                  Activity Statement Cashflow
                                </span>
                              </div>
                              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                {reportTitle}
                              </h1>
                              <p className="text-xs text-slate-500">
                                Scope: <strong className="text-slate-800">{dateRange.label}</strong> ({dateRange.startDate} to {dateRange.endDate})
                              </p>
                            </div>

                            <div className="text-right space-y-1 text-xs">
                              <div className="text-base font-extrabold text-teal-900">{preparedBy}</div>
                              <p className="text-slate-500">Prepared For: <strong className="text-slate-800">{preparedFor}</strong></p>
                              <p className="text-[10.5px] text-slate-400 font-mono">Reconciliation Ref: BAS-AU-{dateRange.startDate.slice(2, 4)}-Q</p>
                            </div>
                          </div>

                          {/* Scope Box (Currency Removed) */}
                          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-teal-50/60 border border-teal-200 text-xs">
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-teal-800 block">Portfolio Scope</span>
                              <span className="font-bold text-slate-900 mt-0.5 block break-words">
                                {selectedPropertyId ? properties.find(p => p.id === selectedPropertyId)?.name || 'Selected Property' : 'All Properties (Portfolio Wide)'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-teal-800 block">BAS Lodgement Status</span>
                              <span className="font-bold text-teal-800 mt-0.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-600" /> Cleared For BAS Lodgement
                              </span>
                            </div>
                          </div>

                          {/* 4-Metric Strip */}
                          <div className="grid grid-cols-4 gap-2.5 text-center">
                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                              <p className="text-[8.5px] font-black uppercase text-emerald-800">Gross Sales / Rent</p>
                              <p className="text-base font-black text-emerald-700 mt-0.5 font-mono">{formatCurrency(metrics.totalIncome)}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                              <p className="text-[8.5px] font-black uppercase text-rose-800">Gross Outflows</p>
                              <p className="text-base font-black text-rose-700 mt-0.5 font-mono">{formatCurrency(metrics.totalExpenses)}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
                              <p className="text-[8.5px] font-black uppercase text-slate-700">Net Movement</p>
                              <p className="text-base font-black text-slate-900 mt-0.5 font-mono">{formatCurrency(metrics.netCashflow)}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-teal-50 border border-teal-200">
                              <p className="text-[8.5px] font-black uppercase text-teal-800">Est. GST Component</p>
                              <p className="text-base font-black text-teal-700 mt-0.5 font-mono">{formatCurrency(metrics.totalIncome * 0.1)}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ========================================================= */}
                      {/* TEMPLATE 4: PROPERTY PERFORMANCE MATRIX */}
                      {/* ========================================================= */}
                      {selectedTemplate.id === 'template_property_breakdown' && (
                        <div className="space-y-5">
                          <div className="p-4 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white shadow-xs flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded bg-white/20 text-white backdrop-blur-xs">
                                  Asset Breakdown Matrix
                                </span>
                                <span className="text-xs font-semibold text-purple-100">{metrics.properties.length} Active Properties</span>
                              </div>
                              <h1 className="text-xl font-black tracking-tight text-white">
                                {reportTitle}
                              </h1>
                              <p className="text-xs text-purple-200">
                                Portfolio Period: {dateRange.label} ({dateRange.startDate} to {dateRange.endDate})
                              </p>
                            </div>

                            <div className="text-right space-y-0.5 text-xs border-l border-white/20 pl-4">
                              <p className="text-[10px] text-purple-200 uppercase font-bold">Asset Manager</p>
                              <p className="font-extrabold text-white text-sm">{preparedBy}</p>
                              <p className="text-xs text-purple-200">Client: {preparedFor}</p>
                            </div>
                          </div>

                          {/* Top Property Yields Mini Cards */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                              <p className="text-[9px] font-bold uppercase text-purple-900">Total Portfolio Revenue</p>
                              <h3 className="text-lg font-black text-purple-800 mt-0.5 font-mono">{formatCurrency(metrics.totalIncome)}</h3>
                            </div>
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                              <p className="text-[9px] font-bold uppercase text-rose-900">Total Operating Expenses</p>
                              <h3 className="text-lg font-black text-rose-800 mt-0.5 font-mono">{formatCurrency(metrics.totalExpenses)}</h3>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                              <p className="text-[9px] font-bold uppercase text-emerald-900">Net Portfolio Cashflow</p>
                              <h3 className="text-lg font-black text-emerald-800 mt-0.5 font-mono">{formatCurrency(metrics.netCashflow)}</h3>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ========================================================= */}
                      {/* TEMPLATE 5: ACCOUNTANT'S GENERAL LEDGER */}
                      {/* ========================================================= */}
                      {selectedTemplate.id === 'template_accountant_ledger' && (
                        <div className="space-y-4">
                          <div className="border-b-2 border-slate-900 pb-3 flex items-end justify-between">
                            <div>
                              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">
                                Double-Entry General Ledger Schedule • Account: GL-1000-RE
                              </div>
                              <h1 className="text-2xl font-serif font-black tracking-tight text-slate-900 mt-0.5">
                                {reportTitle}
                              </h1>
                              <p className="text-xs font-mono text-slate-600">
                                Audit Window: {dateRange.startDate} through {dateRange.endDate} ({dateRange.label})
                              </p>
                            </div>

                            <div className="text-right text-xs font-mono space-y-0.5">
                              <p className="font-bold text-slate-900">{preparedBy}</p>
                              <p className="text-slate-500">Client / Account: {preparedFor}</p>
                              <p className="text-[10px] text-slate-400">Audit Checksum: HEX-89F01-AU</p>
                            </div>
                          </div>

                          {/* Classical Double-Entry T-Account Summary Box */}
                          <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-300 font-mono text-xs">
                            <div className="border-r border-slate-200 pr-2">
                              <span className="text-[9px] uppercase font-bold text-rose-700 block">Total Ledger Debits (Dr)</span>
                              <span className="font-bold text-rose-700 text-sm mt-0.5 block">{formatCurrency(metrics.totalExpenses)}</span>
                            </div>
                            <div className="border-r border-slate-200 pr-2">
                              <span className="text-[9px] uppercase font-bold text-emerald-800 block">Total Ledger Credits (Cr)</span>
                              <span className="font-bold text-emerald-800 text-sm mt-0.5 block">{formatCurrency(metrics.totalIncome)}</span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-700 block">Net Ledger Balance (Closing)</span>
                              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{formatCurrency(metrics.netCashflow)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ========================================================= */}
                      {/* CORE ACCOUNTING LEDGER TABLE (Shared across all blueprints) */}
                      {/* ========================================================= */}
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between border-b pb-1.5">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Account Ledger Transaction Statement
                          </h3>
                          <span className="text-[11px] font-mono text-slate-500">
                            {chronologicalRows.length} {chronologicalRows.length === 1 ? 'Record' : 'Records'}
                          </span>
                        </div>

                        <div className="w-full border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                          <table className="w-full table-fixed text-left text-xs border-collapse font-sans">
                            <thead>
                              <tr className="border-b border-slate-300 bg-slate-50 text-slate-700 font-bold uppercase text-[9px] tracking-wider">
                                <th className="w-[9%] py-2 px-1.5 whitespace-nowrap">Date</th>
                                <th className="w-[7%] py-2 px-1 whitespace-nowrap">Ref.</th>
                                <th className="w-[8%] py-2 px-1 whitespace-nowrap">A/C</th>
                                <th className="w-[5%] py-2 px-0.5 text-center whitespace-nowrap">Type</th>
                                <th className="w-[11%] py-2 px-1.5 whitespace-nowrap">Property</th>
                                <th className="w-[16%] py-2 px-1.5">Details</th>
                                <th className="w-[11%] py-2 px-1.5 whitespace-nowrap">Payee / Payer</th>
                                <th className="w-[11%] py-2 px-1 text-right whitespace-nowrap">Debit ($)</th>
                                <th className="w-[11%] py-2 px-1 text-right whitespace-nowrap">Credit ($)</th>
                                <th className="w-[11%] py-2 pr-3 pl-1 text-right whitespace-nowrap">Balance ($)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[10px]">
                              {/* Balance Brought Forward Initial Row */}
                              <tr className="bg-slate-50/60 font-semibold text-slate-500">
                                <td className="py-1.5 px-1.5 font-mono text-slate-400">—</td>
                                <td className="py-1.5 px-1 font-mono text-slate-400">—</td>
                                <td className="py-1.5 px-1 font-mono text-slate-400">—</td>
                                <td className="py-1.5 px-0.5 text-center font-mono uppercase text-[8.5px]">B/F</td>
                                <td className="py-1.5 px-1.5 font-medium text-slate-600 break-words">Portfolio</td>
                                <td className="py-1.5 px-1.5 italic text-slate-600 font-medium break-words">Balance B/F</td>
                                <td className="py-1.5 px-1.5 text-slate-400">—</td>
                                <td className="py-1.5 px-1 text-right font-mono text-slate-400 tabular-nums">—</td>
                                <td className="py-1.5 px-1 text-right font-mono text-slate-400 tabular-nums">—</td>
                                <td className="py-1.5 pr-3 pl-1 text-right font-mono font-bold text-slate-900 tabular-nums">$0.00</td>
                              </tr>

                              {/* Chronological Transaction Rows */}
                              {chronologicalRows.length === 0 ? (
                                <tr>
                                  <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                                    No transactions recorded in this period.
                                  </td>
                                </tr>
                              ) : (
                                chronologicalRows.map((tx) => {
                                  const payeeOrPayer =
                                    tx.transaction_type === 'expense'
                                      ? tx.vendor_name || 'Vendor'
                                      : tx.tenant
                                      ? `${tx.tenant.first_name} ${tx.tenant.last_name}`
                                      : 'Tenant / Client';
                                  const propName = tx.property?.name || tx.property?.address_line_1 || '—';
                                  const catName = tx.category?.name || 'General';

                                  return (
                                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                                      <td className="py-1.5 px-1.5 font-mono whitespace-nowrap text-slate-600">
                                        {formatDate(tx.transaction_date)}
                                      </td>
                                      <td className="py-1.5 px-1 font-mono text-slate-500 break-words leading-tight" title={tx.reference || undefined}>
                                        {tx.reference || '—'}
                                      </td>
                                      <td className="py-1.5 px-1 font-mono font-semibold text-slate-700 break-words leading-tight" title={catName}>
                                        {catName}
                                      </td>
                                      <td className="py-1.5 px-0.5 text-center font-mono uppercase text-[8.5px] font-bold text-slate-500">
                                        {tx.transaction_type === 'income' ? 'Inc' : 'Exp'}
                                      </td>
                                      <td className="py-1.5 px-1.5 font-medium text-slate-700 break-words leading-tight" title={propName}>
                                        {propName}
                                      </td>
                                      <td className="py-1.5 px-1.5 text-slate-900 leading-tight">
                                        <div className="font-medium break-words leading-tight" title={tx.description || catName}>
                                          {tx.description || catName}
                                        </div>
                                        {tx.notes && (
                                          <div className="text-[8.5px] text-slate-400 italic break-words leading-tight mt-0.5" title={tx.notes}>
                                            {tx.notes}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-1.5 px-1.5 text-slate-700 font-medium break-words leading-tight" title={payeeOrPayer}>
                                        {payeeOrPayer}
                                      </td>
                                      <td className="py-1.5 px-1 text-right font-mono font-bold text-rose-600 whitespace-nowrap tabular-nums">
                                        {tx.debit > 0 ? formatCurrency(tx.debit) : '—'}
                                      </td>
                                      <td className="py-1.5 px-1 text-right font-mono font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                                        {tx.credit > 0 ? formatCurrency(tx.credit) : '—'}
                                      </td>
                                      <td className="py-1.5 pr-3 pl-1 text-right font-mono font-bold text-slate-900 whitespace-nowrap tabular-nums">
                                        {formatCurrency(tx.runningBalance)}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                            <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                              <tr>
                                <td colSpan={7} className="py-2 px-1.5 text-right uppercase text-[9px] tracking-wider text-slate-700">
                                  Closing Balance / Period Totals:
                                </td>
                                <td className="py-2 px-1 text-right font-mono text-rose-700 font-black tabular-nums">
                                  {formatCurrency(metrics.totalExpenses)}
                                </td>
                                <td className="py-2 px-1 text-right font-mono text-emerald-800 font-black tabular-nums">
                                  {formatCurrency(metrics.totalIncome)}
                                </td>
                                <td className="py-2 pr-3 pl-1 text-right font-mono text-slate-900 font-black text-xs tabular-nums">
                                  {formatCurrency(metrics.netCashflow)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* ========================================================= */}
                    {/* DOCUMENT FOOTER & SIGN-OFF (Styled per template) */}
                    {/* ========================================================= */}
                    <div className="pt-8 mt-auto border-t border-slate-200 text-[10px] text-slate-500 flex items-end justify-between">
                      <div className="space-y-1 max-w-[500px]">
                        <p className="font-bold text-slate-700">
                          {selectedTemplate.id === 'template_ato_tax'
                            ? 'Statutory Tax Declaration (ITAA 1997):'
                            : selectedTemplate.id === 'template_accountant_ledger'
                            ? 'General Ledger Reconciliation Certification:'
                            : 'Audit & Compliance Declaration:'}
                        </p>
                        <p className="leading-relaxed">{notes}</p>
                        <p className="text-slate-400 pt-1">
                          Generated via PropertyLedge Australian Accounting System • Page 1 of 1
                        </p>
                      </div>

                      <div className="text-right space-y-1">
                        <div className="w-36 border-b border-slate-400 mb-1 ml-auto" />
                        <p className="font-bold text-slate-700 text-[10.5px]">{preparedBy}</p>
                        <p className="text-[9.5px] text-slate-400">
                          {selectedTemplate.id === 'template_ato_tax'
                            ? 'Registered Tax Agent / Signatory'
                            : selectedTemplate.id === 'template_accountant_ledger'
                            ? 'Certified Practising Accountant (CPA)'
                            : 'Authorised Asset Manager'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Navigation Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 shrink-0 print:hidden">
          <div>
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((p) => ((p - 1) as any))}
                className="text-xs font-bold gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep((p) => ((p + 1) as any))}
                className="text-xs font-bold bg-[#008F83] hover:bg-[#007A70] text-white gap-1 shadow-xs"
              >
                Continue to {step === 1 ? 'Period & Scope' : 'Preview & Download'}{' '}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onClose}
                className="text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900"
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
