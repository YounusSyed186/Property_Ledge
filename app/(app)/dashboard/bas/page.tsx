import React, { Suspense } from 'react';
import { BasActivityStatementView } from '@/components/bas/BasActivityStatementView';
import { fetchBasPageDataAction } from '@/app/actions/bas';

export const metadata = {
  title: 'BAS Activity Statement | PropertyLedge',
  description: 'Australian GST tracking, category classification, and single-source-of-truth BAS reconciliation worksheet for property investors.',
};

export default async function BasActivityStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string; year?: string; period?: string }>;
}) {
  const params = await searchParams;
  const initialYear = params?.year ? parseInt(params.year, 10) : undefined;
  const initialPeriod = params?.period as any;
  const initialPropertyId = params?.propertyId || null;

  let initialData;
  try {
    initialData = await fetchBasPageDataAction({
      propertyId: initialPropertyId,
      financialYear: initialYear,
      period: initialPeriod,
    });
  } catch (err) {
    console.error('Failed to pre-fetch BAS page data on server:', err);
    // Fallback default state
    const defaultFY = new Date().getFullYear();
    initialData = {
      worksheet: {
        propertyName: 'All Properties',
        propertyId: null,
        financialYear: defaultFY,
        period: 'Q1' as const,
        periodLabel: `Q1 (Jul ${defaultFY - 1} – Sep ${defaultFY - 1})`,
        dateRange: {
          startDate: `${defaultFY - 1}-07-01`,
          endDate: `${defaultFY - 1}-09-30`,
        },
        totals: {
          totalSales: 0,
          gstOnSales: 0,
          totalExpenses: 0,
          gstOnExpenses: 0,
          netGstPosition: 0,
          capitalExpensesGross: 0,
          nonCapitalExpensesGross: 0,
        },
        incomeByCategory: [],
        expenseByCategory: [],
        basFigures: [],
        unclassifiedCount: 0,
        totalTransactionsCount: 0,
      },
      details: [],
      guidance: [],
      properties: [],
      taxClassifications: [],
      categoryGroups: [],
      availableYears: [defaultFY + 1, defaultFY, defaultFY - 1],
    };
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading BAS Activity Statement...</div>}>
      <BasActivityStatementView initialData={initialData} />
    </Suspense>
  );
}
