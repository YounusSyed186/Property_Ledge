'use server';

import { getCurrentUser } from '@/lib/auth/queries';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import { createClient } from '@/lib/supabase/server';
import {
  FinanceReportType,
  FinanceReportFilters,
  FinancialOverviewReportDTO,
  IncomeReportDTO,
  ExpenseReportDTO,
  CashFlowReportDTO,
  RentReconciliationReportDTO,
  GstReportDTO,
  TaxClassificationReportDTO,
  PropertyPerformanceReportDTO,
  TransactionDetailReportDTO,
} from '@/modules/finance/domain/reporting-types';
import {
  getFinancialOverviewReport,
  getIncomeReport,
  getExpenseReport,
  getCashFlowReport,
  getRentReconciliationReport,
  getGstReport,
  getTaxClassificationReport,
  getPropertyPerformanceReport,
  getTransactionDetailReport,
} from '@/lib/finance/reporting-service';
import { generateFinanceCsv, generateFinancePdf } from '@/lib/finance/export-service';
import { getFinancialYearLabel } from '@/lib/finance/financial-year';

async function getAuthContext() {
  const [user, context] = await Promise.all([
    getCurrentUser(),
    resolveWorkspaceContext(),
  ]);

  if (!user || !context) {
    throw new Error('Unauthorized or no active workspace');
  }

  return { user, context };
}

/**
 * Single-roundtrip server action to load any of the 9 report datasets.
 */
export async function fetchReportDataAction(
  reportType: FinanceReportType,
  filters: FinanceReportFilters = {}
) {
  const { context } = await getAuthContext();
  const workspaceFilters: FinanceReportFilters = {
    ...filters,
    workspaceId: context.workspaceId,
  };

  switch (reportType) {
    case 'overview':
      return { type: 'overview', data: await getFinancialOverviewReport(workspaceFilters) };
    case 'income':
      return { type: 'income', data: await getIncomeReport(workspaceFilters) };
    case 'expenses':
      return { type: 'expenses', data: await getExpenseReport(workspaceFilters) };
    case 'cashflow':
      return { type: 'cashflow', data: await getCashFlowReport(workspaceFilters) };
    case 'rent-reconciliation':
      return { type: 'rent-reconciliation', data: await getRentReconciliationReport(workspaceFilters) };
    case 'gst':
      return { type: 'gst', data: await getGstReport(workspaceFilters) };
    case 'tax-classification':
      return { type: 'tax-classification', data: await getTaxClassificationReport(workspaceFilters) };
    case 'property-performance':
      return { type: 'property-performance', data: await getPropertyPerformanceReport(workspaceFilters) };
    case 'transactions':
      return { type: 'transactions', data: await getTransactionDetailReport(workspaceFilters) };
    default:
      throw new Error(`Unsupported report type: ${reportType}`);
  }
}

/**
 * Exports financial report data as a safe CSV with metadata header.
 */
export async function exportReportCsvAction(
  reportType: FinanceReportType,
  filters: FinanceReportFilters = {}
) {
  const { context } = await getAuthContext();
  const workspaceFilters: FinanceReportFilters = {
    ...filters,
    workspaceId: context.workspaceId,
  };

  const txDetailReport = await getTransactionDetailReport(workspaceFilters);
  const fyLabel = filters.financialYear ? getFinancialYearLabel(filters.financialYear) : 'Period';
  const cleanReportName = reportType.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `PropertyLedge_${cleanReportName}_${fyLabel}_${new Date().toISOString().split('T')[0]}.csv`;

  const kpis: Record<string, number | string> = {
    'Total Records': txDetailReport.totalCount,
    'Filtered Sum (AUD)': txDetailReport.netAmount,
  };

  const csvContent = generateFinanceCsv(
    `Financial Report - ${reportType.toUpperCase()}`,
    txDetailReport.transactions,
    workspaceFilters,
    kpis
  );

  return {
    success: true,
    filename,
    csvContent,
  };
}

/**
 * Exports financial report data as an executive PDF report.
 */
export async function exportReportPdfAction(
  reportType: FinanceReportType,
  filters: FinanceReportFilters = {}
) {
  const { context } = await getAuthContext();
  const workspaceFilters: FinanceReportFilters = {
    ...filters,
    workspaceId: context.workspaceId,
  };

  const txDetailReport = await getTransactionDetailReport(workspaceFilters);
  const fyLabel = filters.financialYear ? getFinancialYearLabel(filters.financialYear) : 'Period';
  const cleanReportName = reportType.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `PropertyLedge_${cleanReportName}_${fyLabel}_${new Date().toISOString().split('T')[0]}.pdf`;

  const kpis: Record<string, number | string> = {
    'Total Transactions': txDetailReport.totalCount,
    'Net Sum': txDetailReport.netAmount,
  };

  const agencyDetails = {
    agencyName: context.workspaceName || 'PropertyLedge',
    branchName: `${context.workspaceName || 'PropertyLedge'} Real Estate Management`,
    phone: '(w) +61 (02) 9000 0000',
    website: 'www.propertyledge.com.au',
    email: 'reports@propertyledge.com.au',
  };

  const fyNum = Number(filters.financialYear || new Date().getFullYear());
  const recipientDetails = {
    name: 'Property Owner / Investor',
    addressLine1: txDetailReport.transactions[0]?.property?.address_line_1 || 'Consolidated Portfolio Properties',
    addressLine2: `${txDetailReport.transactions[0]?.property?.city || 'Sydney'} ${txDetailReport.transactions[0]?.property?.state || 'NSW'} 2000`,
    folioNumber: `FOL-${fyNum}00472`,
    periodFrom: filters.dateFrom ? String(filters.dateFrom) : `1/07/${fyNum - 1}`,
    periodTo: filters.dateTo ? String(filters.dateTo) : `30/06/${fyNum}`,
  };

  const pdfBytes = await generateFinancePdf(
    `Financial Report: ${reportType.toUpperCase()}`,
    txDetailReport.transactions,
    workspaceFilters,
    kpis,
    agencyDetails,
    recipientDetails
  );

  const base64Pdf = Buffer.from(pdfBytes).toString('base64');

  return {
    success: true,
    filename,
    base64Data: `data:application/pdf;base64,${base64Pdf}`,
  };
}

/**
 * Fetches available properties, categories, and tax classifications for filter dropdowns.
 */
export async function fetchReportFilterOptionsAction() {
  const { context } = await getAuthContext();
  const supabase = await createClient();

  const [propertiesRes, categoriesRes, taxClassRes] = await Promise.all([
    supabase
      .from('properties')
      .select('id, name, address_line_1, suburb, state')
      .eq('workspace_id', context.workspaceId)
      .order('name', { ascending: true }),
    supabase
      .from('categories')
      .select('id, name, type')
      .order('name', { ascending: true }),
    supabase
      .from('tax_classifications')
      .select('id, name, code, is_deductible')
      .order('name', { ascending: true }),
  ]);

  return {
    properties: propertiesRes.data || [],
    categories: categoriesRes.data || [],
    taxClassifications: taxClassRes.data || [],
  };
}
