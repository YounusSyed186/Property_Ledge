'use client';

import React from 'react';
import { FinancialOverviewReportDTO } from '@/modules/finance/domain/reporting-types';
import { FinancialKpiCards } from '@/components/reports/FinancialKpiCards';
import { IncomeExpenseAnalytics } from '@/components/reports/IncomeExpenseAnalytics';
import { MonthlyBreakdownTable } from '@/components/reports/MonthlyBreakdownTable';
import { CategoryBreakdownSection } from '@/components/reports/CategoryBreakdownSection';

interface FinancialOverviewTabProps {
  data: FinancialOverviewReportDTO;
}

export function FinancialOverviewTab({ data }: FinancialOverviewTabProps) {
  const { kpis, monthlyTrends, incomeByCategory, expenseByCategory } = data;

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* 1. Primary 3-KPI Cards Row */}
      <FinancialKpiCards
        totalIncome={kpis.totalIncome}
        totalExpenses={kpis.totalExpenses}
        netResult={kpis.netResult}
        transactionCount={kpis.transactionCount}
      />

      {/* 2. Main Analytics Section (68% / 32% Grid): Chart & Financial Snapshot */}
      <IncomeExpenseAnalytics
        monthlyTrends={monthlyTrends}
        totalIncome={kpis.totalIncome}
        totalExpenses={kpis.totalExpenses}
        netResult={kpis.netResult}
        gstCollected={kpis.gstCollected}
        gstPaid={kpis.gstPaid}
        netGstPayable={kpis.netGstPayable}
      />

      {/* 3. Monthly Financial Breakdown Table */}
      <MonthlyBreakdownTable
        monthlyTrends={monthlyTrends}
        totalIncome={kpis.totalIncome}
        totalExpenses={kpis.totalExpenses}
        netResult={kpis.netResult}
        totalGstCollected={kpis.gstCollected}
        totalGstPaid={kpis.gstPaid}
      />

      {/* 4. Category Analytics Section (Two Columns) */}
      <CategoryBreakdownSection
        incomeCategories={incomeByCategory}
        expenseCategories={expenseByCategory}
        totalIncome={kpis.totalIncome}
        totalExpenses={kpis.totalExpenses}
      />
    </div>
  );
}
export default FinancialOverviewTab;
