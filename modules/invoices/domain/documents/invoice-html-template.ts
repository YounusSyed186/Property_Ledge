/**
 * Canonical Invoice HTML/CSS Document Template Generator.
 * Defines the single source of truth for A4 invoice layout across:
 * 1. Browser Live Preview
 * 2. Server-side PDF Generation (Headless Chromium)
 * 3. Resend Email Attachments
 * 4. Browser Print / Save-as-PDF
 */

import { InvoiceRenderDTO } from '../../application/dto/invoice-render-dto';
import { InvoiceLayoutStyle } from '../entities/invoice-template';

interface ThemeStyles {
  primaryColor: string;
  accentColor: string;
  headerBg: string;
  headerText: string;
  badgeBg: string;
  badgeText: string;
  tableHeaderBg: string;
  tableHeaderText: string;
  fontFamily: string;
  borderStyle: string;
}

function getThemeStyles(style: InvoiceLayoutStyle = 'classic', customBrandColor?: string, customAccentColor?: string): ThemeStyles {
  const brand = customBrandColor || '#22333b';
  const accent = customAccentColor || '#a9927d';

  switch (style) {
    case 'modern':
      return {
        primaryColor: brand,
        accentColor: accent,
        headerBg: `linear-gradient(135deg, ${brand} 0%, #1a252c 100%)`,
        headerText: '#ffffff',
        badgeBg: '#f0fdf4',
        badgeText: '#16a34a',
        tableHeaderBg: '#f8fafc',
        tableHeaderText: '#475569',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        borderStyle: '1px solid #e2e8f0',
      };
    case 'minimalist':
      return {
        primaryColor: '#18181b',
        accentColor: '#71717a',
        headerBg: '#ffffff',
        headerText: '#09090b',
        badgeBg: '#f4f4f5',
        badgeText: '#27272a',
        tableHeaderBg: '#fafafa',
        tableHeaderText: '#52525b',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        borderStyle: '1px solid #e4e4e7',
      };
    case 'corporate':
      return {
        primaryColor: '#1e3a8a',
        accentColor: '#d97706',
        headerBg: '#1e3a8a',
        headerText: '#ffffff',
        badgeBg: '#fef3c7',
        badgeText: '#92400e',
        tableHeaderBg: '#1e3a8a',
        tableHeaderText: '#ffffff',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        borderStyle: '1px solid #cbd5e1',
      };
    case 'elegant':
      return {
        primaryColor: '#292524',
        accentColor: '#a16207',
        headerBg: '#fafaf9',
        headerText: '#1c1917',
        badgeBg: '#fef9c3',
        badgeText: '#854d0e',
        tableHeaderBg: '#f5f5f4',
        tableHeaderText: '#44403c',
        fontFamily: "Georgia, 'Times New Roman', Times, serif",
        borderStyle: '1px solid #e7e5e4',
      };
    case 'creative':
      return {
        primaryColor: '#4f46e5',
        accentColor: '#06b6d4',
        headerBg: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
        headerText: '#ffffff',
        badgeBg: '#e0e7ff',
        badgeText: '#3730a3',
        tableHeaderBg: '#eef2ff',
        tableHeaderText: '#4338ca',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        borderStyle: '1px solid #e0e7ff',
      };
    case 'monochrome':
      return {
        primaryColor: '#000000',
        accentColor: '#52525b',
        headerBg: '#000000',
        headerText: '#ffffff',
        badgeBg: '#f4f4f5',
        badgeText: '#000000',
        tableHeaderBg: '#f4f4f5',
        tableHeaderText: '#000000',
        fontFamily: "'Courier New', Courier, monospace",
        borderStyle: '1px solid #d4d4d8',
      };
    case 'classic':
    default:
      return {
        primaryColor: brand,
        accentColor: accent,
        headerBg: brand,
        headerText: '#ffffff',
        badgeBg: '#f8fafc',
        badgeText: brand,
        tableHeaderBg: brand,
        tableHeaderText: '#ffffff',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        borderStyle: '1px solid #e2e8f0',
      };
  }
}

/**
 * Generates the unified, print-ready A4 HTML document string.
 */
export function renderInvoiceHtml(dto: InvoiceRenderDTO): string {
  const theme = getThemeStyles(dto.layoutStyle as InvoiceLayoutStyle, dto.brandColor, dto.accentColor);
  const statusUpper = (dto.status || 'draft').toUpperCase();

  const isMinimalist = dto.layoutStyle === 'minimalist';
  const isElegant = dto.layoutStyle === 'elegant';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${dto.invoiceNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 12mm 14mm 12mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: ${theme.fontFamily};
      color: #1e293b;
      background-color: #ffffff;
      font-size: 12px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .invoice-container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      min-height: 270mm;
      position: relative;
    }

    /* ── HEADER ── */
    .invoice-header {
      background: ${theme.headerBg};
      color: ${theme.headerText};
      padding: ${isMinimalist ? '20px 0 16px 0' : '24px 28px'};
      border-radius: ${isMinimalist ? '0' : '10px'};
      border-bottom: ${isMinimalist ? '2px solid #18181b' : 'none'};
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .header-branding {
      max-width: 60%;
    }

    .doc-type-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: ${isMinimalist ? '#71717a' : theme.accentColor};
      margin-bottom: 4px;
    }

    .company-title {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.02em;
      line-height: 1.2;
      color: ${theme.headerText};
    }

    .company-subtext {
      font-size: 11px;
      opacity: 0.85;
      margin-top: 4px;
      color: ${theme.headerText};
    }

    .header-metadata {
      text-align: right;
      background: ${isMinimalist ? 'transparent' : 'rgba(0, 0, 0, 0.18)'};
      padding: ${isMinimalist ? '0' : '10px 14px'};
      border-radius: ${isMinimalist ? '0' : '8px'};
      border: ${isMinimalist ? 'none' : '1px solid rgba(255, 255, 255, 0.15)'};
    }

    .meta-row {
      font-size: 11px;
      margin-bottom: 3px;
    }

    .meta-label {
      opacity: 0.75;
      margin-right: 6px;
    }

    .meta-value {
      font-weight: 700;
    }

    .status-pill {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background: ${theme.badgeBg};
      color: ${theme.badgeText};
      border: 1px solid rgba(0, 0, 0, 0.08);
    }

    /* ── BILLING PARTICULARS ── */
    .billing-section {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      padding: 16px 20px;
      background: #f8fafc;
      border: ${theme.borderStyle};
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .billing-col {
      flex: 1;
    }

    .section-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      margin-bottom: 6px;
    }

    .party-name {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 2px;
    }

    .party-detail {
      font-size: 11px;
      color: #475569;
      line-height: 1.4;
    }

    .property-banner {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px dashed #cbd5e1;
      font-size: 11px;
      color: #334155;
    }

    /* ── TABLE ── */
    .table-container {
      width: 100%;
      margin-bottom: 20px;
    }

    table.invoice-table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }

    table.invoice-table thead {
      display: table-header-group;
    }

    table.invoice-table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    table.invoice-table th {
      background: ${theme.tableHeaderBg};
      color: ${theme.tableHeaderText};
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 9px 12px;
      text-align: left;
      border-top: ${theme.borderStyle};
      border-bottom: 2px solid ${theme.primaryColor};
    }

    table.invoice-table td {
      padding: 10px 12px;
      font-size: 11.5px;
      color: #1e293b;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }

    table.invoice-table tbody tr:nth-child(even) {
      background-color: #fafbfc;
    }

    .col-desc { width: 50%; }
    .col-qty { width: 10%; text-align: center; }
    .col-rate { width: 14%; text-align: right; }
    .col-tax { width: 12%; text-align: right; }
    .col-total { width: 14%; text-align: right; font-weight: 700; }

    .tax-subtext {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 2px;
    }

    /* ── SUMMARY SECTION ── */
    .summary-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      margin-top: 8px;
      margin-bottom: 24px;
      page-break-inside: avoid;
    }

    .instructions-col {
      flex: 1.2;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .instruction-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
    }

    .instruction-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #475569;
      margin-bottom: 4px;
    }

    .instruction-body {
      font-size: 11px;
      color: #334155;
      white-space: pre-line;
      line-height: 1.45;
    }

    .notes-box {
      font-size: 11px;
      color: #475569;
      background: #fffbeb;
      border-left: 3px solid #f59e0b;
      padding: 8px 12px;
      border-radius: 4px;
    }

    .totals-col {
      width: 240px;
      flex-shrink: 0;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 0;
      font-size: 11px;
      color: #475569;
    }

    .totals-row.total-due-card {
      margin-top: 8px;
      padding: 10px 14px;
      background: ${theme.primaryColor};
      color: #ffffff;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 800;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
    }

    .totals-row.total-due-card .total-value {
      font-size: 16px;
      font-weight: 900;
      color: ${theme.accentColor};
    }

    /* ── FOOTER ── */
    .invoice-footer {
      margin-top: auto;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #94a3b8;
      page-break-inside: avoid;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .invoice-container {
        min-height: 0;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- HEADER -->
    <div class="invoice-header">
      <div class="header-branding">
        <div class="doc-type-label">Tax Invoice</div>
        <h1 class="company-title">${dto.issuer.name || dto.headerText || 'PROPERTY LEDGE'}</h1>
        <p class="company-subtext">
          ${dto.issuer.email || 'billing@propertyledge.com.au'}${dto.issuer.phone ? ` • ${dto.issuer.phone}` : ''}${dto.issuer.taxId ? ` • ${dto.issuer.taxId}` : ''}
        </p>
      </div>

      <div class="header-metadata">
        <div class="meta-row"><span class="meta-label">Invoice No:</span><span class="meta-value">${dto.invoiceNumber}</span></div>
        <div class="meta-row"><span class="meta-label">Issue Date:</span><span class="meta-value">${dto.issueDateFormatted}</span></div>
        <div class="meta-row"><span class="meta-label">Due Date:</span><span class="meta-value">${dto.dueDateFormatted}</span></div>
        ${dto.billingPeriodFormatted ? `<div class="meta-row"><span class="meta-label">Period:</span><span class="meta-value">${dto.billingPeriodFormatted}</span></div>` : ''}
        <div><span class="status-pill">${statusUpper}</span></div>
      </div>
    </div>

    <!-- BILLING SECTION -->
    <div class="billing-section">
      <div class="billing-col">
        <div class="section-title">Bill To</div>
        <div class="party-name">${dto.billTo.name || 'Customer'}</div>
        ${dto.billTo.email ? `<div class="party-detail">${dto.billTo.email}</div>` : ''}
        ${dto.billTo.phone ? `<div class="party-detail">${dto.billTo.phone}</div>` : ''}
        ${dto.billTo.address ? `<div class="party-detail">${dto.billTo.address}</div>` : ''}
        ${dto.billTo.taxId ? `<div class="party-detail"><strong>Tax ID:</strong> ${dto.billTo.taxId}</div>` : ''}
      </div>

      <div class="billing-col" style="text-align: right;">
        <div class="section-title">Issued By</div>
        <div class="party-name">${dto.issuer.name || 'Property Ledge Management'}</div>
        ${dto.issuer.email ? `<div class="party-detail">${dto.issuer.email}</div>` : ''}
        ${dto.issuer.phone ? `<div class="party-detail">${dto.issuer.phone}</div>` : ''}
        ${dto.issuer.address ? `<div class="party-detail">${dto.issuer.address}</div>` : ''}
        ${dto.issuer.taxId ? `<div class="party-detail"><strong>ABN / Tax ID:</strong> ${dto.issuer.taxId}</div>` : ''}
      </div>
    </div>

    ${dto.propertyAddress ? `<div class="property-banner"><strong>Property Reference:</strong> ${dto.propertyAddress}</div>` : ''}

    <!-- LINE ITEMS TABLE -->
    <div class="table-container">
      <table class="invoice-table">
        <thead>
          <tr>
            <th class="col-desc">Description</th>
            <th class="col-qty">Qty</th>
            <th class="col-rate" style="text-align: right;">Unit Price</th>
            <th class="col-tax" style="text-align: right;">Tax Rate</th>
            <th class="col-total" style="text-align: right;">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${dto.items.map((item) => `
            <tr>
              <td class="col-desc">
                <strong>${item.description}</strong>
                ${item.taxRateFormatted && item.taxRateFormatted !== '0%' ? `<div class="tax-subtext">Includes Tax (${item.taxRateFormatted})</div>` : ''}
              </td>
              <td class="col-qty">${item.quantity}</td>
              <td class="col-rate" style="text-align: right;">${item.unitPriceFormatted}</td>
              <td class="col-tax" style="text-align: right;">${item.taxRateFormatted}</td>
              <td class="col-total" style="text-align: right;">${item.lineTotalFormatted}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- SUMMARY SECTION -->
    <div class="summary-container">
      <div class="instructions-col">
        ${dto.paymentInstructions ? `
          <div class="instruction-card">
            <div class="instruction-title">Payment Instructions</div>
            <div class="instruction-body">${dto.paymentInstructions}</div>
          </div>
        ` : ''}

        ${dto.notes ? `
          <div class="notes-box">
            <strong>Notes:</strong> ${dto.notes}
          </div>
        ` : ''}
      </div>

      <div class="totals-col">
        <div class="totals-row">
          <span>Subtotal:</span>
          <span>${dto.subtotalFormatted}</span>
        </div>
        <div class="totals-row">
          <span>Tax / GST:</span>
          <span>${dto.taxAmountFormatted}</span>
        </div>
        ${dto.amountPaidFormatted && dto.amountPaidFormatted !== '$0.00' ? `
          <div class="totals-row">
            <span>Amount Paid:</span>
            <span>-${dto.amountPaidFormatted}</span>
          </div>
        ` : ''}
        <div class="totals-row total-due-card">
          <span>TOTAL DUE:</span>
          <span class="total-value">${dto.balanceDueFormatted || dto.totalAmountFormatted}</span>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="invoice-footer">
      <span>${dto.footerText || 'Thank you for your business. Generated securely by Property Ledge.'}</span>
      <span>Page 1 of 1</span>
    </div>
  </div>
</body>
</html>`;
}
