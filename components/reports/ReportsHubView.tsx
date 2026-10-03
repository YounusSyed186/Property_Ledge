'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Wallet,
  CheckCircle2,
  Receipt,
  Scale,
  Building2,
  FileSpreadsheet,
  Loader2,
  PieChart,
} from 'lucide-react';
import {
  FinanceReportType,
  FinanceReportFilters,
} from '@/modules/finance/domain/reporting-types';
import { fetchReportDataAction } from '@/app/actions/reports';
import { getCurrentFinancialYear } from '@/lib/finance/financial-year';
import { ReportFilterBar } from '@/components/reports/ReportFilterBar';
import { ExportDropdown } from '@/components/reports/ExportDropdown';

import { FinancialOverviewTab } from '@/components/reports/FinancialOverviewTab';
import { IncomeReportTab } from '@/components/reports/IncomeReportTab';
import { ExpenseReportTab } from '@/components/reports/ExpenseReportTab';
import { CashFlowTab } from '@/components/reports/CashFlowTab';
import { RentReconciliationTab } from '@/components/reports/RentReconciliationTab';
import { GstReportTab } from '@/components/reports/GstReportTab';
import { TaxClassificationTab } from '@/components/reports/TaxClassificationTab';
import { PropertyPerformanceTab } from '@/components/reports/PropertyPerformanceTab';
import { TransactionDetailTab } from '@/components/reports/TransactionDetailTab';
import { cn } from '@/lib/utils';

interface ReportsHubViewProps {
  initialReportType: FinanceReportType;
  initialFilters: FinanceReportFilters;
  filterOptions: {
    properties: Array<{ id: string; name: string; address_line_1?: string }>;
    categories: Array<{ id: string; name: string; type?: string }>;
    taxClassifications: Array<{ id: string; name: string; code?: string }>;
  };
  initialData?: any;
}

const REPORT_TABS: Array<{
  id: FinanceReportType;
  label: string;
  icon: React.ElementType;
  description: string;
}> = [
  { id: 'overview', label: 'Financial Overview', icon: BarChart3, description: 'Executive summary & portfolio KPIs' },
  { id: 'income', label: 'Income', icon: TrendingUp, description: 'Received rent & other inflows' },
  { id: 'expenses', label: 'Expenses', icon: TrendingDown, description: 'Deductible & capital outflows' },
  { id: 'cashflow', label: 'Cash Flow', icon: Wallet, description: 'Monthly & quarterly liquidity trajectory' },
  { id: 'rent-reconciliation', label: 'Rent Reconciliation', icon: CheckCircle2, description: 'Scheduled vs collected rent' },
  { id: 'gst', label: 'GST & BAS', icon: Receipt, description: 'Quarterly business activity statement' },
  { id: 'tax-classification', label: 'Tax Classification', icon: Scale, description: 'ATO deductible & capital works' },
  { id: 'property-performance', label: 'Property Ranking', icon: Building2, description: 'Comparative yields & net profits' },
  { id: 'transactions', label: 'Transaction Details', icon: FileSpreadsheet, description: 'Searchable line items' },
];

export function ReportsHubView({
  initialReportType,
  initialFilters,
  filterOptions,
  initialData,
}: ReportsHubViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<FinanceReportType>(initialReportType || 'overview');
  const [filters, setFilters] = useState<FinanceReportFilters>({
    financialYear: initialFilters.financialYear || getCurrentFinancialYear(),
    ...initialFilters,
  });

  const [reportData, setReportData] = useState<any>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state with URL params
  const updateQueryParams = (newTab: FinanceReportType, newFilters: FinanceReportFilters) => {
    const params = new URLSearchParams();
    params.set('tab', newTab);
    if (newFilters.financialYear) params.set('fy', String(newFilters.financialYear));
    if (newFilters.propertyId) params.set('propertyId', newFilters.propertyId);
    if (newFilters.categoryId) params.set('categoryId', newFilters.categoryId);
    if (newFilters.transactionType) params.set('type', newFilters.transactionType);
    if (newFilters.taxClassificationId) params.set('taxClassificationId', newFilters.taxClassificationId);
    if (newFilters.dateFrom) params.set('from', newFilters.dateFrom);
    if (newFilters.dateTo) params.set('to', newFilters.dateTo);
    if (newFilters.search) params.set('q', newFilters.search);

    startTransition(() => {
      router.push(`/dashboard/reports?${params.toString()}`, { scroll: false });
    });
  };

  const loadData = async (type: FinanceReportType, currentFilters: FinanceReportFilters) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchReportDataAction(type, currentFilters);
      setReportData(res.data);
    } catch (err: any) {
      console.error('Failed to load report data:', err);
      setErrorMessage(err.message || 'An error occurred while loading this report.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabSelect = (tabId: FinanceReportType) => {
    setActiveTab(tabId);
    updateQueryParams(tabId, filters);
    loadData(tabId, filters);
  };

  const handleFilterChange = (newFilters: FinanceReportFilters) => {
    setFilters(newFilters);
    updateQueryParams(activeTab, newFilters);
    loadData(activeTab, newFilters);
  };

  const handleRefresh = () => {
    loadData(activeTab, filters);
  };

  // Initial load if no initialData was hydrated
  useEffect(() => {
    if (!initialData) {
      loadData(activeTab, filters);
    }
  }, []);

  return (
    <div className="h-full w-full min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#F7FAFC] dark:bg-[#07111F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Link href="/dashboard/money" className="hover:text-[#008F83] dark:hover:text-[#32D5C4] transition-colors">
            Financials
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-800 dark:text-slate-200">Reports</span>
        </div>

        {/* Page Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
          <div>
            <h1 className="text-2xl sm:text-[28px] lg:text-[30px] font-bold tracking-tight text-slate-900 dark:text-white">
              Financial Reporting & Insights
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Analyze your financial performance across properties, categories, and reporting periods.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <ExportDropdown reportType={activeTab} filters={filters} />
          </div>
        </div>

        {/* Unified Filter Toolbar */}
        <ReportFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          properties={filterOptions.properties}
          categories={filterOptions.categories}
          taxClassifications={filterOptions.taxClassifications}
          onRefresh={handleRefresh}
          isRefreshing={isLoading}
        />

        {activeTab !== 'overview' && (
          <div className="border-b border-slate-200/80 dark:border-slate-800">
            <nav className="flex space-x-1.5 overflow-x-auto pb-2 scrollbar-none" aria-label="Reports Navigation">
              {REPORT_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabSelect(tab.id)}
                    className={cn(
                      'flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer min-h-[38px]',
                      isActive
                        ? 'bg-[#008F83] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-slate-400')} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* Active Tab Content Area */}
        <div className="mt-6">
          {isLoading && !reportData ? (
            <div className="space-y-6 animate-pulse">
              {/* Skeletons for 3 KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-white dark:bg-[#0B1726] border border-border rounded-2xl p-5" />
                ))}
              </div>
              {/* Skeleton for Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-8 h-80 bg-white dark:bg-[#0B1726] border border-border rounded-2xl" />
                <div className="lg:col-span-4 h-80 bg-white dark:bg-[#0B1726] border border-border rounded-2xl" />
              </div>
            </div>
          ) : errorMessage ? (
            <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-rose-700 dark:text-rose-300 space-y-3">
              <h3 className="text-base font-bold">Unable to load financial report</h3>
              <p className="text-xs text-rose-600 dark:text-rose-400">{errorMessage}</p>
              <button
                type="button"
                onClick={handleRefresh}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : reportData ? (
            <div>
              {activeTab === 'overview' && <FinancialOverviewTab data={reportData} />}
              {activeTab === 'income' && <IncomeReportTab data={reportData} />}
              {activeTab === 'expenses' && <ExpenseReportTab data={reportData} />}
              {activeTab === 'cashflow' && <CashFlowTab data={reportData} />}
              {activeTab === 'rent-reconciliation' && <RentReconciliationTab data={reportData} />}
              {activeTab === 'gst' && <GstReportTab data={reportData} />}
              {activeTab === 'tax-classification' && <TaxClassificationTab data={reportData} />}
              {activeTab === 'property-performance' && <PropertyPerformanceTab data={reportData} />}
              {activeTab === 'transactions' && <TransactionDetailTab data={reportData} />}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
