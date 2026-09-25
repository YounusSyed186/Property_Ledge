import React, { Suspense } from 'react';
import { ReportsHubView } from '@/components/reports/ReportsHubView';
import { fetchReportDataAction, fetchReportFilterOptionsAction } from '@/app/actions/reports';
import { FinanceReportType, FinanceReportFilters } from '@/modules/finance/domain/reporting-types';
import { getCurrentFinancialYear } from '@/lib/finance/financial-year';

export const metadata = {
  title: 'Financial Reports & Insights | PropertyLedge',
  description: 'Australian Financial Year (AFY) reporting, cash flow analysis, GST/BAS tracking, rent reconciliation, and tax classification for property investors.',
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    fy?: string;
    propertyId?: string;
    categoryId?: string;
    taxClassificationId?: string;
    from?: string;
    to?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const activeTab = (params?.tab || 'overview') as FinanceReportType;
  const currentFY = getCurrentFinancialYear();

  const initialFilters: FinanceReportFilters = {
    financialYear: params?.fy ? parseInt(params.fy, 10) : currentFY,
    propertyId: params?.propertyId || undefined,
    categoryId: params?.categoryId || undefined,
    taxClassificationId: params?.taxClassificationId || undefined,
    dateFrom: params?.from || undefined,
    dateTo: params?.to || undefined,
    search: params?.q || undefined,
  };

  let filterOptions = {
    properties: [] as Array<{ id: string; name: string; address_line_1?: string }>,
    categories: [] as Array<{ id: string; name: string; type?: string }>,
    taxClassifications: [] as Array<{ id: string; name: string; code?: string }>,
  };

  let initialData: any = null;

  try {
    const [optionsRes, dataRes] = await Promise.all([
      fetchReportFilterOptionsAction(),
      fetchReportDataAction(activeTab, initialFilters),
    ]);
    filterOptions = optionsRes;
    initialData = dataRes.data;
  } catch (err) {
    console.error('Failed to pre-fetch report page data on server:', err);
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Financial Reports...</div>}>
      <ReportsHubView
        initialReportType={activeTab}
        initialFilters={initialFilters}
        filterOptions={filterOptions}
        initialData={initialData}
      />
    </Suspense>
  );
}
