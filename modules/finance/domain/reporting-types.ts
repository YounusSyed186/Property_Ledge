/**
 * Finance Reporting Domain Data Contracts & Filter Types.
 *
 * All actual financial activity derives strictly from `transactions`.
 * Expected income derives from `expected_payment_schedule` and `transaction_schedule_allocations`.
 */

import { TransactionDTO } from '@/modules/finance/domain/types';
import { FinancialYearRange } from '@/lib/finance/financial-year';

export type ReportType =
  | 'overview'
  | 'income'
  | 'expenses'
  | 'cashflow'
  | 'rent'
  | 'rent-reconciliation'
  | 'gst'
  | 'tax'
  | 'tax-classification'
  | 'properties'
  | 'property-performance'
  | 'transactions';

export type FinanceReportType = ReportType;

export interface FinanceReportFilters {
  workspaceId?: string;
  financialYear?: string | number;
  propertyId?: string | null;
  dateFrom?: string;
  dateTo?: string;
  transactionType?: 'all' | 'income' | 'expense';
  categoryId?: string;
  taxClassificationId?: string;
  tenantId?: string;
  leaseId?: string;
  status?: string;
  search?: string;
  searchQuery?: string;
  periodType?: 'financial_year' | 'quarter' | 'month' | 'custom';
}

export interface MonthlyFinancialSummary {
  key: string;        // 'YYYY-MM'
  label: string;      // e.g. 'July 2025'
  shortLabel: string; // e.g. 'Jul 25'
  income: number;
  expenses: number;
  net: number;
  gstCollected: number;
  gstPaid: number;
  transactionCount: number;
}

export interface CategoryFinancialSummary {
  categoryId: string;
  categoryName: string;
  transactionType: 'income' | 'expense';
  totalAmount: number;
  gstAmount: number;
  transactionCount: number;
  percentage: number;
}

export interface TaxClassificationFinancialSummary {
  classificationId: string;
  classificationName: string;
  basCode?: string | null;
  totalAmount: number;
  gstAmount: number;
  transactionCount: number;
  percentage: number;
}

export interface PropertyFinancialSummary {
  propertyId: string;
  propertyName: string;
  address?: string;
  totalIncome: number;
  totalExpenses: number;
  netResult: number;
  gstCollected: number;
  gstPaid: number;
  expectedRent: number;
  actualRentReceived: number;
  outstandingRent: number;
  collectionRate: number; // percentage (0 - 100)
  transactionCount: number;
}

export interface VendorFinancialSummary {
  vendorName: string;
  totalAmount: number;
  gstAmount: number;
  transactionCount: number;
  percentage: number;
}

export interface RentScheduleReconciliationItem {
  scheduleId: string;
  leaseId: string;
  propertyId: string;
  propertyName: string;
  tenantName: string;
  dueDate: string;
  expectedAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'PENDING';
  allocatedTransactions: Array<{
    transactionId: string;
    date: string;
    amount: number;
    allocatedAmount: number;
  }>;
}

// 1. Financial Overview Report Contract
export interface FinancialOverviewReportDTO {
  filters: FinanceReportFilters;
  dateRange: FinancialYearRange;
  kpis: {
    totalIncome: number;
    totalExpenses: number;
    netResult: number;
    gstCollected: number;
    gstPaid: number;
    netGstPayable: number;
    expectedIncome: number;
    actualIncomeReceived: number;
    outstandingExpectedIncome: number;
    transactionCount: number;
  };
  monthlyTrends: MonthlyFinancialSummary[];
  incomeByCategory: CategoryFinancialSummary[];
  expenseByCategory: CategoryFinancialSummary[];
  propertyBreakdown: PropertyFinancialSummary[];
}

// 2. Income Report Contract
export interface IncomeReportDTO {
  filters: FinanceReportFilters;
  dateRange: FinancialYearRange;
  kpis: {
    totalIncome: number;
    gstCollected: number;
    expectedRent: number;
    actualRentReceived: number;
    outstandingRent: number;
    transactionCount: number;
  };
  monthlyIncome: MonthlyFinancialSummary[];
  byCategory: CategoryFinancialSummary[];
  byProperty: PropertyFinancialSummary[];
  byTenant: Array<{
    tenantId: string;
    tenantName: string;
    propertyName: string;
    totalAmount: number;
    transactionCount: number;
  }>;
  transactions: TransactionDTO[];
}

// 3. Expense Report Contract
export interface ExpenseReportDTO {
  filters: FinanceReportFilters;
  dateRange: FinancialYearRange;
  kpis: {
    totalExpenses: number;
    gstPaid: number;
    deductibleExpenses: number;
    capitalExpenses: number;
    transactionCount: number;
  };
  monthlyExpenses: MonthlyFinancialSummary[];
  byOperationalCategory: CategoryFinancialSummary[];
  byTaxClassification: TaxClassificationFinancialSummary[];
  byVendor: VendorFinancialSummary[];
  byProperty: PropertyFinancialSummary[];
  transactions: TransactionDTO[];
}

// 4. Cash Flow Report Contract
export interface CashFlowReportDTO {
  filters: FinanceReportFilters;
  dateRange: FinancialYearRange;
  kpis: {
    totalInflow: number;
    totalOutflow: number;
    netCashFlow: number;
    operatingMargin: number; // percentage
  };
  monthlyCashFlow: MonthlyFinancialSummary[];
  quarterlyCashFlow: Array<{
    quarter: string; // 'Q1 (Jul–Sep)', 'Q2 (Oct–Dec)', etc.
    inflow: number;
    outflow: number;
    net: number;
  }>;
}

// 5. Expected vs Actual Rent Reconciliation Report Contract
export interface RentReconciliationReportDTO {
  filters: FinanceReportFilters;
  dateRange: FinancialYearRange;
  kpis: {
    totalExpected: number;
    totalReceived: number;
    totalOutstanding: number;
    collectionRate: number;
    scheduleCount: number;
    fullyPaidCount: number;
    partiallyPaidCount: number;
    overdueCount: number;
  };
  schedules: RentScheduleReconciliationItem[];
  byProperty: PropertyFinancialSummary[];
}

// 6. GST / BAS Source Report Contract
export interface GstReportDTO {
  filters: FinanceReportFilters;
  dateRange: FinancialYearRange;
  kpis: {
    gstCollected: number;       // (G1 / 11) or recorded GST on sales
    gstPaidClaimable: number;   // GST on expenses / purchases (1B)
    netGstPayable: number;      // 1A - 1B
    totalSalesSubjectToGst: number;
    totalPurchasesSubjectToGst: number;
    transactionCount: number;
  };
  basQuarterSummaries: Array<{
    quarter: string; // 'Q1', 'Q2', 'Q3', 'Q4'
    label: string;
    dateRange: FinancialYearRange;
    gstCollected: number;
    gstPaid: number;
    netGst: number;
  }>;
  byCategory: CategoryFinancialSummary[];
  byTaxClassification: TaxClassificationFinancialSummary[];
  transactions: TransactionDTO[];
}

// 7. Tax Classification Report Contract
export interface TaxClassificationReportDTO {
  filters: FinanceReportFilters;
  dateRange: FinancialYearRange;
  kpis: {
    totalClassifiedAmount: number;
    deductibleAmount: number;
    capitalWorksAmount: number;
    depreciatingAssetsAmount: number;
    nonDeductibleAmount: number;
    unclassifiedAmount: number;
    transactionCount: number;
  };
  classifications: TaxClassificationFinancialSummary[];
  transactions: TransactionDTO[];
}

// 8. Property Performance Report Contract
export interface PropertyPerformanceReportDTO {
  filters: FinanceReportFilters;
  dateRange: FinancialYearRange;
  kpis: {
    totalPortfolioIncome: number;
    totalPortfolioExpenses: number;
    netPortfolioResult: number;
    overallCollectionRate: number;
    propertyCount: number;
  };
  properties: PropertyFinancialSummary[];
}

// 9. Transaction Detail Report Contract
export interface TransactionDetailReportDTO {
  filters: FinanceReportFilters;
  dateRange: FinancialYearRange;
  totalCount: number;
  totalIncome: number;
  totalExpenses: number;
  totalGst: number;
  netAmount: number;
  transactions: TransactionDTO[];
}
