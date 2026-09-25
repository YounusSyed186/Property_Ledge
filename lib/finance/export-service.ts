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

/**
 * Generates an official PDF report document using pdf-lib.
 */
export async function generateFinancePdf(
  reportTitle: string,
  transactions: TransactionDTO[],
  filters: FinanceReportFilters,
  kpis?: Record<string, number | string>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait in points (210mm x 297mm)
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let y = height - 40;
  const margin = 40;

  // Header Title
  page.drawText('PropertyLedge', {
    x: margin,
    y,
    size: 20,
    font: fontBold,
    color: rgb(0.05, 0.45, 0.45), // Teal primary
  });

  page.drawText(reportTitle, {
    x: margin,
    y: y - 22,
    size: 14,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  const dateRange = resolveFilterDateRange(filters);
  const fyLabel = filters.financialYear ? getFinancialYearLabel(filters.financialYear) : `${dateRange.start} to ${dateRange.end}`;

  page.drawText(`Financial Year: ${fyLabel} | Generated: ${new Date().toISOString().split('T')[0]}`, {
    x: margin,
    y: y - 38,
    size: 9,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.55),
  });

  y -= 60;

  // Draw Horizontal Divider
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  });

  y -= 20;

  // KPI Summary Section if present
  if (kpis && Object.keys(kpis).length > 0) {
    page.drawText('Executive Summary', {
      x: margin,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });
    y -= 16;

    const entries = Object.entries(kpis);
    let kpiX = margin;
    let kpiCount = 0;

    for (const [key, val] of entries) {
      const formattedVal = typeof val === 'number' ? `$${val.toLocaleString('en-AU', { minimumFractionDigits: 2 })}` : String(val);

      page.drawRectangle({
        x: kpiX,
        y: y - 28,
        width: 120,
        height: 32,
        color: rgb(0.96, 0.98, 0.98),
        borderColor: rgb(0.85, 0.9, 0.9),
        borderWidth: 1,
      });

      page.drawText(key.substring(0, 18), {
        x: kpiX + 6,
        y: y - 10,
        size: 7,
        font: fontBold,
        color: rgb(0.4, 0.45, 0.55),
      });

      page.drawText(formattedVal, {
        x: kpiX + 6,
        y: y - 22,
        size: 10,
        font: fontBold,
        color: rgb(0.05, 0.4, 0.4),
      });

      kpiX += 128;
      kpiCount++;
      if (kpiCount % 4 === 0) {
        kpiX = margin;
        y -= 40;
      }
    }

    if (kpiCount % 4 !== 0) {
      y -= 40;
    }
  }

  // Transactions Table Header
  page.drawText(`Transactions (${transactions.length} items)`, {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  });
  y -= 16;

  const colWidths = [65, 55, 90, 140, 85, 80]; // Date, Type, Category, Description, Property, Amount
  const colX = [margin, margin + 65, margin + 120, margin + 210, margin + 350, margin + 435];

  // Header Bar
  page.drawRectangle({
    x: margin,
    y: y - 14,
    width: width - margin * 2,
    height: 18,
    color: rgb(0.92, 0.95, 0.96),
  });

  const headers = ['Date', 'Type', 'Category', 'Description', 'Property', 'Amount ($)'];
  headers.forEach((h, i) => {
    page.drawText(h, {
      x: colX[i] + 4,
      y: y - 10,
      size: 8,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });
  });

  y -= 22;

  // Table Data Rows
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];

    // Check page overflow and paginate
    if (y < 40) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - 40;

      // Repeat Table Header
      page.drawRectangle({
        x: margin,
        y: y - 14,
        width: width - margin * 2,
        height: 18,
        color: rgb(0.92, 0.95, 0.96),
      });

      headers.forEach((h, idx) => {
        page.drawText(h, {
          x: colX[idx] + 4,
          y: y - 10,
          size: 8,
          font: fontBold,
          color: rgb(0.1, 0.15, 0.25),
        });
      });
      y -= 22;
    }

    // Alternating row background
    if (i % 2 === 1) {
      page.drawRectangle({
        x: margin,
        y: y - 10,
        width: width - margin * 2,
        height: 14,
        color: rgb(0.98, 0.99, 1.0),
      });
    }

    const typeColor = tx.transaction_type === 'income' ? rgb(0.1, 0.6, 0.3) : rgb(0.7, 0.2, 0.2);
    const amountStr = `$${Number(tx.amount || 0).toFixed(2)}`;

    page.drawText(tx.transaction_date || '', { x: colX[0] + 4, y: y - 8, size: 7.5, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(tx.transaction_type?.toUpperCase() || '', { x: colX[1] + 4, y: y - 8, size: 7, font: fontBold, color: typeColor });
    page.drawText((tx.category?.name || 'Unassigned').substring(0, 18), { x: colX[2] + 4, y: y - 8, size: 7.5, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page.drawText((tx.description || tx.vendor_name || '—').substring(0, 30), { x: colX[3] + 4, y: y - 8, size: 7.5, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page.drawText((tx.property?.name || tx.property?.address_line_1 || '—').substring(0, 16), { x: colX[4] + 4, y: y - 8, size: 7.5, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(amountStr, { x: colX[5] + 4, y: y - 8, size: 7.5, font: fontBold, color: rgb(0.1, 0.15, 0.25) });

    y -= 14;
  }

  return pdfDoc.save();
}
