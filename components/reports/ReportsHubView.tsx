'use client';

import React, { useState, useEffect, useTransition } from 'react';
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

  // Initial load if no initialData was hydrated
  useEffect(() => {
    if (!initialData) {
      loadData(activeTab, filters);
    }
  }, []);

  return (
    <div className="h-full w-full min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-admin-border pb-5">
        <div>
          <h1 className="font-heading text-page-title font-bold tracking-tight text-admin-foreground flex items-center gap-2.5">
            <PieChart className="w-6 h-6 text-admin-primary" />
            Financial Reporting & Insights
          </h1>
          <p className="mt-1 text-body-sm text-admin-muted">
            Australian Financial Year compliant reporting, cash flow analysis, BAS tracking, and tax categorization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportDropdown reportType={activeTab} filters={filters} />
        </div>
      </div>

      {/* Global Filter Bar */}
      <ReportFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        properties={filterOptions.properties}
        categories={filterOptions.categories}
        taxClassifications={filterOptions.taxClassifications}
      />

      {/* Report Navigation Tabs */}
      <div className="border-b border-admin-border">
        <nav className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none" aria-label="Reports">
          {REPORT_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabSelect(tab.id)}
                className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-body-sm font-semibold transition-all whitespace-nowrap cursor-pointer min-h-[42px] ${
                  isActive
                    ? 'bg-admin-primary text-white shadow-sm shadow-admin-primary/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-admin-foreground hover:bg-admin-surface-subtle/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Tab Content Area */}
      <div className="mt-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-admin-surface rounded-2xl border border-admin-border">
            <Loader2 className="w-8 h-8 animate-spin text-admin-primary mb-3" />
            <div className="text-body-sm font-medium text-admin-muted">
              Aggregating Australian Financial Year data...
            </div>
          </div>
        ) : errorMessage ? (
          <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-rose-700 dark:text-rose-300">
            <h3 className="text-base font-bold">Error loading report</h3>
            <p className="mt-1 text-body-sm">{errorMessage}</p>
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
