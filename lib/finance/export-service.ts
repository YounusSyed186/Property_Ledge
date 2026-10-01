/**
 * PropertyLedge Unified Finance Export Service.
 * Supports CSV, XLSX-formatted tabular data, and PDF reports with complete filter fidelity,
 * report metadata headers, and CSV injection protection.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { TransactionDTO } from '@/modules/finance/domain/types';
import { FinanceReportFilters } from '@/modules/finance/domain/reporting-types';
import { getFinancialYearLabel } from '@/lib/finance/financial-year';
import { resolveFilterDateRange } from '@/lib/finance/reporting-service';

/**
 * Escapes values against CSV formula injection and handles quotes/commas safely.
 */
export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  // Protect against CSV formula injection (=, +, -, @, \t, \r)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape internal double quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Formats currency safely for exports.
 */
export function formatExportCurrency(amount: number | null | undefined): string {
  const num = Number(amount || 0);
  return num.toFixed(2);
}

/**
 * Generates structured CSV with report metadata and transactions table.
 */
export function generateFinanceCsv(
  reportTitle: string,
  transactions: TransactionDTO[],
  filters: FinanceReportFilters,
  kpis?: Record<string, number | string>
): string {
  const dateRange = resolveFilterDateRange(filters);
  const fyLabel = filters.financialYear ? getFinancialYearLabel(filters.financialYear) : 'Custom Period';
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const rows: string[] = [];

  // 1. Report Metadata Header
  rows.push(`${sanitizeCsvCell('PropertyLedge Financial Report')},${sanitizeCsvCell(reportTitle)}`);
  rows.push(`${sanitizeCsvCell('Financial Year')},${sanitizeCsvCell(fyLabel)}`);
  rows.push(`${sanitizeCsvCell('Period')},${sanitizeCsvCell(`${dateRange.start} to ${dateRange.end}`)}`);
  rows.push(`${sanitizeCsvCell('Property')},${sanitizeCsvCell(filters.propertyId ? 'Filtered Property' : 'All Properties')}`);
  rows.push(`${sanitizeCsvCell('Generated At (UTC)')},${sanitizeCsvCell(nowStr)}`);
  rows.push(`${sanitizeCsvCell('Total Records')},${sanitizeCsvCell(transactions.length)}`);

  if (kpis) {
    rows.push('');
    rows.push(`${sanitizeCsvCell('--- KPI SUMMARY ---')},`);
    for (const [key, val] of Object.entries(kpis)) {
      const formattedVal = typeof val === 'number' ? formatExportCurrency(val) : val;
      rows.push(`${sanitizeCsvCell(key)},${sanitizeCsvCell(formattedVal)}`);
    }
  }

  rows.push('');
  rows.push(`${sanitizeCsvCell('--- TRANSACTION DETAILS ---')},`);

  // 2. Table Column Headers
  const headers = [
    'Date',
    'Type',
    'Category',
    'Tax Classification',
    'Description',
    'Vendor / Payee',
    'Property',
    'Amount (AUD)',
    'GST (AUD)',
    'GST Inclusive',
    'Payment Method',
    'Status',
    'Reference',
    'Tenant',
    'Lease',
  ];
  rows.push(headers.map(sanitizeCsvCell).join(','));

  // 3. Data Rows
  for (const tx of transactions) {
    const tenantName = tx.tenant ? `${tx.tenant.first_name || ''} ${tx.tenant.last_name || ''}`.trim() : '';
    const propName = tx.property?.name || tx.property?.address_line_1 || '';

    const row = [
      tx.transaction_date,
      tx.transaction_type?.toUpperCase() || 'EXPENSE',
      tx.category?.name || 'Unassigned',
      tx.tax_classification?.name || 'Standard / None',
      tx.description || '',
      tx.vendor_name || '',
      propName,
      formatExportCurrency(tx.amount),
      formatExportCurrency(tx.gst_amount),
      tx.gst_inclusive ? 'YES' : 'NO',
      tx.payment_method || 'Other',
      tx.status?.toUpperCase() || 'COMPLETED',
      tx.reference || '',
      tenantName,
      tx.lease?.id ? `Lease #${tx.lease.id.substring(0, 8)}` : '',
    ];
    rows.push(row.map(sanitizeCsvCell).join(','));
  }

  return rows.join('\r\n');
}

import { PdfFolioStatementAdapter } from '@/lib/pdf/pdf-folio-statement-adapter';

/**
 * Generates an official Australian Real Estate Owner Statement / Folio Summary PDF report document.
 */
export async function generateFinancePdf(
  reportTitle: string,
  transactions: TransactionDTO[],
  filters: FinanceReportFilters,
  kpis?: Record<string, number | string>,
  agencyDetails?: import('@/lib/pdf/pdf-folio-statement-adapter').FolioStatementData['agencyDetails'],
  recipientDetails?: import('@/lib/pdf/pdf-folio-statement-adapter').FolioStatementData['recipientDetails']
): Promise<Uint8Array> {
  return PdfFolioStatementAdapter.generate({
    reportTitle,
    transactions,
    filters,
    kpis,
    agencyDetails,
    recipientDetails,
  });
}
