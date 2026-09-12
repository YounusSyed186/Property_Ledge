/**
 * Authoritative Canonical Invoice HTML/CSS Document Template Generator.
 * Directly recreates the 8 authentic art-directed template designs from PropertyLedge V1:
 * 1. Classic Clean ('classic')
 * 2. Modern Slate ('modern')
 * 3. Minimalist Line ('minimalist')
 * 4. Corporate Blue ('corporate')
 * 5. Creative Studio ('creative')
 * 6. Elegant Serif ('elegant')
 * 7. Google Material ('google')
 * 8. Monochrome Dark ('monochrome')
 *
 * Used across:
 * - Live interactive preview in browser (iframe/srcdoc)
 * - Server-side high-resolution PDF rendering (Playwright/Chromium)
 * - Automated email invoice dispatch
 */

import { InvoiceRenderDTO } from '../../application/dto/invoice-render-dto';
import { InvoiceLayoutStyle } from '../entities/invoice-template';

const GOOGLE_FONTS_LINK = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700;900&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
`;

const BASE_PAGE_STYLES = `
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  @page {
    size: A4 portrait;
    margin: 12mm 12mm 14mm 12mm;
  }
  thead {
    display: table-header-group;
  }
  tr, .invoice-table tr, table tr {
    page-break-inside: avoid;
  }
  html, body {
    width: 100%;
    min-height: 100%;
    background-color: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
  }
  .a4-sheet {
    width: 794px;
    min-height: 1123px;
    margin: 0 auto;
    position: relative;
    background: #ffffff;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  table {
    border-collapse: collapse;
    width: 100%;
  }
  .whitespace-pre {
    white-space: pre-line;
  }
`;

function escapeHtml(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeDto(dto: InvoiceRenderDTO) {
  const billTo = dto.billTo || (dto as any).customer || { name: 'Tenant', address: dto.propertyAddress || '' };
  const issuer = dto.issuer || { name: 'Property Ledge', address: '' };
  const currency = dto.currencyCode || (dto as any).currency || 'AUD';
  const totalDisplay = dto.balanceDueFormatted || dto.totalAmountFormatted || '$0.00';
  return { billTo, issuer, currency, totalDisplay };
}

// -------------------------------------------------------------
// 1. CLASSIC CLEAN ('classic')
// -------------------------------------------------------------
function renderClassicTemplate(dto: InvoiceRenderDTO): string {
  const { billTo, issuer, currency, totalDisplay } = normalizeDto(dto);
  const brand = dto.brandColor || '#2962ff';
  const accent = dto.accentColor || brand;
  return `
    <style>
      .classic-sheet {
        font-family: 'Space Grotesk', 'Inter', -apple-system, sans-serif;
        color: #162129;
        padding: 60px;
        box-sizing: border-box;
      }
      .classic-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 50px;
      }
      .classic-title {
        font-size: 48px;
        font-weight: 800;
        color: #0a1432;
        letter-spacing: -1px;
        line-height: 1;
      }
      .classic-meta-box {
        background: #f8fafc;
        border-radius: 16px;
        padding: 20px;
        width: 260px;
        border-top: 3px solid ${brand};
      }
      .classic-meta-row {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        margin-bottom: 12px;
      }
      .classic-meta-label { color: #646e82; }
      .classic-meta-val { font-weight: 600; color: #0a1432; }
      .classic-meta-due-row {
        border-top: 1px solid #e2e8f0;
        padding-top: 14px;
        margin-top: 6px;
      }
      .classic-due-label { font-size: 11px; font-weight: 700; color: #0a1432; display: block; margin-bottom: 4px; text-transform: uppercase; }
      .classic-due-amount { font-size: 28px; font-weight: 800; color: ${brand}; }
      .classic-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 40px;
        margin-bottom: 50px;
      }
      .classic-col-title {
        font-size: 12px;
        font-weight: 800;
        color: ${brand};
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 8px;
      }
      .classic-party-name { font-size: 15px; font-weight: 700; color: #0a1432; margin-bottom: 4px; }
      .classic-party-text { font-size: 12px; color: #646e82; line-height: 1.6; }
      .classic-table {
        margin-bottom: 30px;
      }
      .classic-table th {
        background: #f8fafc;
        color: #646e82;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 14px 16px;
        border-bottom: 2px solid ${brand};
        text-align: left;
      }
      .classic-table td {
        padding: 16px;
        font-size: 13px;
        color: #162129;
        border-bottom: 1px solid #f1f5f9;
      }
      .classic-table tr:hover { background: #fafbfc; }
      .classic-summary-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 40px;
      }
      .classic-due-pill {
        background: #f8fafc;
        border-radius: 12px;
        padding: 14px 18px;
        width: 240px;
        margin-bottom: 12px;
        border-left: 3px solid ${brand};
      }
      .classic-total-col {
        width: 280px;
      }
      .classic-total-line {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        font-size: 13px;
        color: #0a1432;
      }
      .classic-grand-pill {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8fafc;
        border-radius: 12px;
        padding: 16px 20px;
        margin-top: 12px;
        border-right: 3px solid ${brand};
      }
      .classic-grand-label { font-size: 12px; font-weight: 800; color: ${brand}; text-transform: uppercase; }
      .classic-grand-val { font-size: 20px; font-weight: 800; color: ${brand}; }
      .classic-notes-card {
        background: #f8fafc;
        border-radius: 16px;
        padding: 24px;
        margin-top: auto;
      }
      .classic-notes-title { font-size: 13px; font-weight: 800; color: #0a1432; margin-bottom: 8px; }
      .classic-notes-body { font-size: 12px; color: #646e82; line-height: 1.6; }
    </style>

    <div class="a4-sheet classic-sheet">
      <div class="classic-header">
        <div>
          <h1 class="classic-title">INVOICE</h1>
          ${dto.headerText ? `<div style="font-size: 13px; color: #646e82; margin-top: 6px; font-weight: 600;">${escapeHtml(dto.headerText)}</div>` : ''}
          <div style="font-size: 12px; color: #646e82; margin-top: 4px;"># ${escapeHtml(dto.invoiceNumber)}</div>
        </div>
        <div class="classic-meta-box">
          <div class="classic-meta-row">
            <span class="classic-meta-label">Invoice Date</span>
            <span class="classic-meta-val">${escapeHtml(dto.issueDateFormatted)}</span>
          </div>
          <div class="classic-meta-row">
            <span class="classic-meta-label">Due Date</span>
            <span class="classic-meta-val">${escapeHtml(dto.dueDateFormatted)}</span>
          </div>
          <div class="classic-meta-due-row">
            <span class="classic-due-label">Amount Due (${escapeHtml(currency)})</span>
            <span class="classic-due-amount">${escapeHtml(totalDisplay)}</span>
          </div>
        </div>
      </div>

      <div class="classic-grid">
        <div>
          <div class="classic-col-title">From</div>
          <div class="classic-party-name">${escapeHtml(issuer.name || 'Property Management')}</div>
          ${issuer.taxId ? `<div class="classic-party-text">ABN: ${escapeHtml(issuer.taxId)}</div>` : ''}
          <div class="classic-party-text whitespace-pre">${escapeHtml(issuer.address)}</div>
          ${issuer.phone ? `<div class="classic-party-text">${escapeHtml(issuer.phone)}</div>` : ''}
        </div>
        <div>
          <div class="classic-col-title">Invoice Sent To</div>
          <div class="classic-party-name">${escapeHtml(billTo.name || 'Tenant')}</div>
          ${billTo.taxId ? `<div class="classic-party-text">ABN: ${escapeHtml(billTo.taxId)}</div>` : ''}
          <div class="classic-party-text whitespace-pre">${escapeHtml(billTo.address || dto.propertyAddress)}</div>
          ${billTo.email ? `<div class="classic-party-text">${escapeHtml(billTo.email)}</div>` : ''}
        </div>
      </div>

      <table class="classic-table">
        <thead>
          <tr>
            <th style="width: 55%;">Description</th>
            <th style="text-align: center; width: 12%;">Qty</th>
            <th style="text-align: right; width: 15%;">Rate</th>
            <th style="text-align: right; width: 18%;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${dto.items.map(item => `
            <tr>
              <td>
                <div style="font-weight: 700; color: #0a1432;">${escapeHtml(item.description)}</div>
                ${item.taxRateFormatted && item.taxRateFormatted !== '0%' ? `<div style="font-size: 11px; color: #646e82; margin-top: 2px;">GST: ${escapeHtml(item.taxRateFormatted)}</div>` : ''}
              </td>
              <td style="text-align: center; color: #646e82;">${item.quantity}</td>
              <td style="text-align: right; color: #646e82;">${escapeHtml(item.unitPriceFormatted)}</td>
              <td style="text-align: right; font-weight: 700; color: #0a1432;">${escapeHtml(item.lineTotalFormatted)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="classic-summary-row">
        <div>
          <div class="classic-due-pill">
            <span style="font-size: 11px; font-weight: 700; color: #2962ff; text-transform: uppercase;">Due Date: </span>
            <span style="font-size: 12px; font-weight: 700; color: #0a1432;">${escapeHtml(dto.dueDateFormatted)}</span>
          </div>
          ${dto.notes ? `<div style="font-size: 12px; color: #646e82; max-width: 260px; line-height: 1.5;">${escapeHtml(dto.notes)}</div>` : ''}
        </div>
        <div class="classic-total-col">
          <div class="classic-total-line">
            <span>Subtotal</span>
            <span style="font-weight: 700;">${escapeHtml(dto.subtotalFormatted)}</span>
          </div>
          <div class="classic-total-line">
            <span>Tax / GST:</span>
            <span style="font-weight: 700;">${escapeHtml(dto.taxAmountFormatted)}</span>
          </div>
          <div class="classic-grand-pill">
            <span class="classic-grand-label">Total Amount Due</span>
            <span class="classic-grand-val">${escapeHtml(totalDisplay)}</span>
          </div>
        </div>
      </div>

      ${dto.paymentInstructions ? `
        <div class="classic-notes-card">
          <div class="classic-notes-title">Payment Instructions</div>
          <div class="classic-notes-body whitespace-pre">${escapeHtml(dto.paymentInstructions)}</div>
        </div>
      ` : ''}
    </div>
  `;
}

// -------------------------------------------------------------
// 2. MODERN SLATE ('modern')
// -------------------------------------------------------------
function renderModernTemplate(dto: InvoiceRenderDTO): string {
  const { billTo, issuer, currency, totalDisplay } = normalizeDto(dto);
  const brand = dto.brandColor || '#22333b';
  const accent = dto.accentColor || '#3b82f6';
  return `
    <style>
      .modern-sheet {
        font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
        color: #162129;
        position: relative;
      }
      .modern-accent-stripe {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        width: 14px;
        background: ${accent};
        z-index: 10;
      }
      .modern-banner {
        background: ${brand};
        color: #ffffff;
        padding: 48px 50px 48px 60px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .modern-brand-name {
        font-size: 28px;
        font-weight: 900;
        letter-spacing: -0.5px;
      }
      .modern-brand-sub {
        font-size: 11px;
        color: #b4c8d2;
        letter-spacing: 2px;
        text-transform: uppercase;
        margin-top: 4px;
        font-weight: 600;
      }
      .modern-invoice-tag {
        font-size: 34px;
        font-weight: 900;
        letter-spacing: 1px;
      }
      .modern-body {
        padding: 40px 50px 50px 60px;
        display: flex;
        flex-direction: column;
        flex: 1;
      }
      .modern-grid-3 {
        display: grid;
        grid-template-columns: 1fr 1fr 180px;
        gap: 30px;
        margin-bottom: 40px;
      }
      .modern-col-label {
        font-size: 10px;
        font-weight: 800;
        color: #647482;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        margin-bottom: 10px;
      }
      .modern-party-name { font-size: 15px; font-weight: 800; color: #162129; margin-bottom: 4px; }
      .modern-party-addr { font-size: 12px; color: #647482; line-height: 1.6; }
      .modern-due-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 18px;
        text-align: center;
        border-top: 3px solid ${accent};
      }
      .modern-due-date { font-size: 15px; font-weight: 800; color: #162129; margin-bottom: 10px; }
      .modern-due-total { font-size: 24px; font-weight: 900; color: ${brand}; }
      .modern-table {
        margin-bottom: 30px;
        border-radius: 12px;
        overflow: hidden;
      }
      .modern-table th {
        background: ${brand};
        color: #ffffff;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 1px;
        padding: 14px 18px;
        text-align: left;
      }
      .modern-table td {
        padding: 16px 18px;
        font-size: 13px;
        color: #162129;
        border-bottom: 1px solid #e2e8f0;
      }
      .modern-totals-wrap {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 30px;
      }
      .modern-totals-box { width: 300px; }
      .modern-line {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        font-size: 13px;
        color: #647482;
      }
      .modern-line-val { color: #162129; font-weight: 700; }
      .modern-total-pill {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: ${brand};
        color: #ffffff;
        padding: 16px 20px;
        border-radius: 12px;
        margin-top: 10px;
      }
      .modern-total-pill-label { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
      .modern-total-pill-val { font-size: 22px; font-weight: 900; color: ${accent}; }
      .modern-notes-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 22px;
        border-left: 3px solid ${accent};
        max-width: 500px;
        margin-top: auto;
      }
    </style>

    <div class="a4-sheet modern-sheet">
      <div class="modern-accent-stripe"></div>
      <div class="modern-banner">
        <div>
          <div class="modern-brand-name">${escapeHtml(issuer.name || dto.headerText || 'Property Ledge')}</div>
          <div class="modern-brand-sub">PROPERTY MANAGEMENT • # ${escapeHtml(dto.invoiceNumber)}</div>
        </div>
        <div style="text-align: right;">
          <div class="modern-invoice-tag">INVOICE</div>
        </div>
      </div>

      <div class="modern-body">
        <div class="modern-grid-3">
          <div>
            <div class="modern-col-label">From</div>
            <div class="modern-party-name">${escapeHtml(issuer.name || 'Property Ledge')}</div>
            ${issuer.taxId ? `<div class="modern-party-addr">ABN: ${escapeHtml(issuer.taxId)}</div>` : ''}
            <div class="modern-party-addr whitespace-pre">${escapeHtml(issuer.address)}</div>
          </div>
          <div>
            <div class="modern-col-label">Bill To</div>
            <div class="modern-party-name">${escapeHtml(billTo.name || 'Tenant')}</div>
            <div class="modern-party-addr whitespace-pre">${escapeHtml(billTo.address || dto.propertyAddress)}</div>
          </div>
          <div class="modern-due-box">
            <div class="modern-col-label" style="margin-bottom: 6px;">Due Date</div>
            <div class="modern-due-date">${escapeHtml(dto.dueDateFormatted)}</div>
            <div class="modern-due-total">${escapeHtml(totalDisplay)}</div>
          </div>
        </div>

        <table class="modern-table">
          <thead>
            <tr>
              <th style="width: 55%;">Description</th>
              <th style="text-align: center; width: 12%;">Qty</th>
              <th style="text-align: right; width: 15%;">Rate</th>
              <th style="text-align: right; width: 18%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${dto.items.map(item => `
              <tr>
                <td>
                  <div style="font-weight: 700;">${escapeHtml(item.description)}</div>
                  ${item.taxRateFormatted && item.taxRateFormatted !== '0%' ? `<div style="font-size: 11px; color: #647482; margin-top: 2px;">Includes GST (${escapeHtml(item.taxRateFormatted)})</div>` : ''}
                </td>
                <td style="text-align: center; color: #647482;">${item.quantity}</td>
                <td style="text-align: right; color: #647482;">${escapeHtml(item.unitPriceFormatted)}</td>
                <td style="text-align: right; font-weight: 800; color: #162129;">${escapeHtml(item.lineTotalFormatted)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="modern-totals-wrap">
          <div class="modern-totals-box">
            <div class="modern-line"><span>Subtotal</span><span class="modern-line-val">${escapeHtml(dto.subtotalFormatted)}</span></div>
            <div class="modern-line" style="border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;"><span>GST</span><span class="modern-line-val">${escapeHtml(dto.taxAmountFormatted)}</span></div>
            <div class="modern-total-pill">
              <span class="modern-total-pill-label">Total Due</span>
              <span class="modern-total-pill-val">${escapeHtml(totalDisplay)}</span>
            </div>
          </div>
        </div>

        ${(dto.paymentInstructions || dto.notes) ? `
          <div class="modern-notes-box">
            <div class="modern-col-label" style="color: #22333b; margin-bottom: 8px;">Instructions & Notes</div>
            ${dto.notes ? `<div style="font-size: 12px; color: #647482; line-height: 1.6; margin-bottom: 8px;" class="whitespace-pre">${escapeHtml(dto.notes)}</div>` : ''}
            <div style="font-size: 12px; color: #647482; line-height: 1.6;" class="whitespace-pre">${escapeHtml(dto.paymentInstructions)}</div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// 3. MINIMALIST LINE ('minimalist')
// -------------------------------------------------------------
function renderMinimalistTemplate(dto: InvoiceRenderDTO): string {
  const { billTo, issuer, currency, totalDisplay } = normalizeDto(dto);
  const brand = dto.brandColor || '#000000';
  const accent = dto.accentColor || '#2563eb';
  return `
    <style>
      .minimalist-sheet {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #000000;
        padding: 70px 60px;
        box-sizing: border-box;
      }
      .minimalist-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-bottom: 50px;
      }
      .minimalist-h1 {
        font-size: 38px;
        font-weight: 700;
        letter-spacing: 8px;
        text-transform: uppercase;
        color: ${brand};
      }
      .minimalist-due {
        font-size: 13px;
        color: #6b7280;
      }
      .minimalist-sender {
        margin-bottom: 30px;
      }
      .minimalist-sender-name { font-size: 15px; font-weight: 700; color: ${brand}; margin-bottom: 4px; }
      .minimalist-sender-addr { font-size: 12px; color: #6b7280; line-height: 1.6; }
      .minimalist-divider {
        border-top: 2px solid ${brand};
        padding-top: 24px;
        margin-bottom: 40px;
      }
      .minimalist-recipient-label {
        font-size: 10px;
        font-weight: 700;
        color: ${accent};
        text-transform: uppercase;
        letter-spacing: 2px;
        margin-bottom: 6px;
      }
      .minimalist-table {
        margin-bottom: 30px;
      }
      .minimalist-table th {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        padding: 12px 10px;
        border-bottom: 2px solid ${brand};
        text-align: left;
      }
      .minimalist-table td {
        padding: 16px 10px;
        font-size: 13px;
        border-bottom: 1px solid #f3f4f6;
      }
      .minimalist-totals-wrap {
        display: flex;
        justify-content: flex-end;
        border-top: 1px solid #e5e7eb;
        padding-top: 24px;
        margin-bottom: 30px;
      }
      .minimalist-totals-box { width: 280px; }
      .minimalist-total-line {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        font-size: 13px;
        color: #4b5563;
      }
      .minimalist-grand-line {
        display: flex;
        justify-content: space-between;
        border-top: 2px solid ${brand};
        padding-top: 14px;
        margin-top: 10px;
        font-size: 20px;
        font-weight: 900;
        color: ${brand};
      }
      .minimalist-footer {
        border-top: 1px solid #f3f4f6;
        padding-top: 24px;
        margin-top: auto;
        font-size: 12px;
        color: #6b7280;
        line-height: 1.6;
      }
    </style>

    <div class="a4-sheet minimalist-sheet">
      <div class="minimalist-top">
        <h1 class="minimalist-h1">INVOICE</h1>
        <div class="minimalist-due">Due: ${escapeHtml(dto.dueDateFormatted)}</div>
      </div>

      <div class="minimalist-sender">
        <div class="minimalist-sender-name">${escapeHtml(issuer.name || 'Property Ledge')}</div>
        <div class="minimalist-sender-addr whitespace-pre">${escapeHtml(issuer.address)}</div>
      </div>

      <div class="minimalist-divider">
        <div class="minimalist-recipient-label">Bill To</div>
        <div class="minimalist-sender-name">${escapeHtml(billTo.name || 'Tenant')}</div>
        <div class="minimalist-sender-addr whitespace-pre">${escapeHtml(billTo.address || dto.propertyAddress)}</div>
      </div>

      <table class="minimalist-table">
        <thead>
          <tr>
            <th style="width: 55%;">Description</th>
            <th style="text-align: center; width: 12%;">Qty</th>
            <th style="text-align: right; width: 15%;">Rate</th>
            <th style="text-align: right; width: 18%;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${dto.items.map(item => `
            <tr>
              <td>
                <div style="font-weight: 600;">${escapeHtml(item.description)}</div>
              </td>
              <td style="text-align: center; color: #6b7280;">${item.quantity}</td>
              <td style="text-align: right; color: #6b7280;">${escapeHtml(item.unitPriceFormatted)}</td>
              <td style="text-align: right; font-weight: 700;">${escapeHtml(item.lineTotalFormatted)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="minimalist-totals-wrap">
        <div class="minimalist-totals-box">
          <div class="minimalist-total-line"><span>Subtotal</span><span style="font-weight: 600; color: #000;">${escapeHtml(dto.subtotalFormatted)}</span></div>
          <div class="minimalist-total-line"><span>GST</span><span style="font-weight: 600; color: #000;">${escapeHtml(dto.taxAmountFormatted)}</span></div>
          <div class="minimalist-grand-line">
            <span>Total Due</span>
            <span>${escapeHtml(totalDisplay)}</span>
          </div>
        </div>
      </div>

      ${(dto.paymentInstructions || dto.notes) ? `
        <div class="minimalist-footer">
          <div style="font-weight: 700; color: #000000; text-transform: uppercase; font-size: 11px; margin-bottom: 6px; letter-spacing: 1px;">Instructions & Notes</div>
          ${dto.notes ? `<div class="whitespace-pre" style="margin-bottom: 8px;">${escapeHtml(dto.notes)}</div>` : ''}
          <div class="whitespace-pre">${escapeHtml(dto.paymentInstructions)}</div>
        </div>
      ` : ''}
    </div>
  `;
}

// -------------------------------------------------------------
// 4. CORPORATE BLUE ('corporate')
// -------------------------------------------------------------
function renderCorporateTemplate(dto: InvoiceRenderDTO): string {
  const { billTo, issuer, currency, totalDisplay } = normalizeDto(dto);
  const brand = dto.brandColor || '#0f172a';
  const accent = dto.accentColor || '#2563eb';
  return `
    <style>
      .corporate-sheet {
        font-family: 'Inter', sans-serif;
        color: #0f172a;
      }
      .corporate-header {
        background: ${brand};
        color: #ffffff;
        padding: 44px 60px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 4px solid ${accent};
      }
      .corporate-title { font-size: 36px; font-weight: 800; letter-spacing: 1px; }
      .corporate-due-sub { font-size: 13px; opacity: 0.85; }
      .corporate-body {
        padding: 40px 60px 50px 60px;
        display: flex;
        flex-direction: column;
        flex: 1;
      }
      .corporate-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 40px;
        margin-bottom: 40px;
      }
      .corporate-party-title { font-size: 16px; font-weight: 800; color: ${brand}; margin-bottom: 6px; }
      .corporate-party-addr { font-size: 13px; color: #64748b; line-height: 1.6; }
      .corporate-table {
        margin-bottom: 30px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        overflow: hidden;
      }
      .corporate-table th {
        background: #f8fafc;
        color: ${brand};
        font-size: 12px;
        font-weight: 700;
        padding: 14px 18px;
        border-bottom: 2px solid ${accent};
        text-align: left;
      }
      .corporate-table td {
        padding: 16px 18px;
        font-size: 13px;
        border-bottom: 1px solid #e2e8f0;
      }
      .corporate-totals-wrap {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 30px;
      }
      .corporate-totals-box { width: 320px; }
      .corporate-line {
        display: flex;
        justify-content: space-between;
        padding: 6px 20px;
        font-size: 13px;
        color: #64748b;
      }
      .corporate-total-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8fafc;
        color: ${brand};
        border-top: 3px solid ${accent};
        padding: 18px 24px;
        border-radius: 12px;
        font-size: 20px;
        font-weight: 800;
        margin-top: 10px;
      }
      .corporate-footer {
        border-top: 1px solid #e2e8f0;
        padding-top: 24px;
        margin-top: auto;
      }
      .corporate-footer-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; color: ${brand}; }
      .corporate-footer-text { font-size: 12px; color: #64748b; line-height: 1.6; }
    </style>

    <div class="a4-sheet corporate-sheet">
      <div class="corporate-header">
        <div>
          <div class="corporate-title">INVOICE</div>
          <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;"># ${escapeHtml(dto.invoiceNumber)}</div>
        </div>
        <div style="text-align: right;">
          <div class="corporate-due-sub">Due: ${escapeHtml(dto.dueDateFormatted)}</div>
        </div>
      </div>

      <div class="corporate-body">
        <div class="corporate-grid">
          <div>
            <div class="corporate-party-title">${escapeHtml(issuer.name || 'Property Ledge')}</div>
            <div class="corporate-party-addr whitespace-pre">${escapeHtml(issuer.address)}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Bill To:</div>
            <div class="corporate-party-title">${escapeHtml(billTo.name || 'Tenant')}</div>
            <div class="corporate-party-addr whitespace-pre">${escapeHtml(billTo.address || dto.propertyAddress)}</div>
          </div>
        </div>

        <table class="corporate-table">
          <thead>
            <tr>
              <th style="width: 55%;">Description</th>
              <th style="text-align: center; width: 12%;">Qty</th>
              <th style="text-align: right; width: 15%;">Rate</th>
              <th style="text-align: right; width: 18%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${dto.items.map(item => `
              <tr>
                <td><div style="font-weight: 600;">${escapeHtml(item.description)}</div></td>
                <td style="text-align: center; color: #64748b;">${item.quantity}</td>
                <td style="text-align: right; color: #64748b;">${escapeHtml(item.unitPriceFormatted)}</td>
                <td style="text-align: right; font-weight: 700; color: #0f172a;">${escapeHtml(item.lineTotalFormatted)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="corporate-totals-wrap">
          <div class="corporate-totals-box">
            <div class="corporate-line"><span>Subtotal</span><span style="font-weight: 600; color: #0f172a;">${escapeHtml(dto.subtotalFormatted)}</span></div>
            <div class="corporate-line"><span>GST</span><span style="font-weight: 600; color: #0f172a;">${escapeHtml(dto.taxAmountFormatted)}</span></div>
            <div class="corporate-total-card">
              <span>Total Due</span>
              <span>${escapeHtml(totalDisplay)}</span>
            </div>
          </div>
        </div>

        ${(dto.paymentInstructions || dto.notes) ? `
          <div class="corporate-footer">
            <div class="corporate-footer-title">Instructions & Notes</div>
            ${dto.notes ? `<div class="corporate-footer-text whitespace-pre" style="margin-bottom: 6px;">${escapeHtml(dto.notes)}</div>` : ''}
            <div class="corporate-footer-text whitespace-pre">${escapeHtml(dto.paymentInstructions)}</div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// 5. CREATIVE STUDIO ('creative')
// -------------------------------------------------------------
function renderCreativeTemplate(dto: InvoiceRenderDTO): string {
  const { billTo, issuer, currency, totalDisplay } = normalizeDto(dto);
  const brand = dto.brandColor || '#f97316';
  const accent = dto.accentColor || '#fb923c';
  return `
    <style>
      .creative-sheet {
        font-family: 'Space Grotesk', 'Inter', sans-serif;
        color: #18181b;
        padding: 60px;
        position: relative;
        overflow: hidden;
        box-sizing: border-box;
      }
      .creative-blob-tr {
        position: absolute;
        top: -120px;
        right: -120px;
        width: 380px;
        height: 380px;
        background: ${brand};
        border-radius: 50%;
        opacity: 0.12;
        pointer-events: none;
      }
      .creative-blob-bl {
        position: absolute;
        bottom: -100px;
        left: -100px;
        width: 280px;
        height: 280px;
        background: ${accent};
        border-radius: 50%;
        opacity: 0.10;
        pointer-events: none;
      }
      .creative-h1 {
        font-size: 72px;
        font-weight: 900;
        letter-spacing: -3px;
        line-height: 0.95;
        margin-bottom: 36px;
        color: ${brand};
      }
      .creative-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 40px;
        margin-bottom: 40px;
      }
      .creative-tag {
        font-size: 11px;
        font-weight: 800;
        color: #a1a1aa;
        text-transform: uppercase;
        letter-spacing: 2px;
        margin-bottom: 8px;
      }
      .creative-table {
        margin-bottom: 30px;
      }
      .creative-table th {
        color: ${brand};
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 1px;
        padding: 12px 14px;
        border-bottom: 2px solid ${brand};
        text-align: left;
      }
      .creative-table td {
        padding: 16px 14px;
        font-size: 13px;
        border-bottom: 1px solid #f4f4f5;
      }
      .creative-totals-wrap {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 30px;
      }
      .creative-totals-box { width: 300px; text-align: right; }
      .creative-sub-line {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        margin-bottom: 6px;
        color: #71717a;
      }
      .creative-total-title {
        font-size: 16px;
        font-weight: 900;
        text-transform: uppercase;
        margin-top: 14px;
        margin-bottom: 4px;
        color: ${brand};
      }
      .creative-total-huge {
        font-size: 46px;
        font-weight: 900;
        color: ${brand};
        line-height: 1;
      }
      .creative-notes-box {
        background: #fafafa;
        border: 1px solid #f4f4f5;
        border-left: 3px solid ${brand};
        border-radius: 20px;
        padding: 24px;
        margin-top: auto;
      }
    </style>

    <div class="a4-sheet creative-sheet">
      <div class="creative-blob-tr"></div>
      <div class="creative-blob-bl"></div>

      <h1 class="creative-h1">INVOICE.</h1>

      <div class="creative-grid">
        <div>
          <div class="creative-tag">Invoice To</div>
          <div style="font-size: 22px; font-weight: 800; margin-bottom: 4px;">${escapeHtml(billTo.name || 'Tenant')}</div>
          <div style="font-size: 13px; color: #71717a; line-height: 1.6;" class="whitespace-pre">${escapeHtml(billTo.address || dto.propertyAddress)}</div>
        </div>
        <div style="text-align: right;">
          <div class="creative-tag">From</div>
          <div style="font-size: 18px; font-weight: 800; margin-bottom: 4px;">${escapeHtml(issuer.name || 'Property Ledge')}</div>
          <div style="font-size: 13px; color: #71717a; line-height: 1.6;" class="whitespace-pre">${escapeHtml(issuer.address)}</div>
          <div style="font-size: 13px; font-weight: 800; color: ${brand}; margin-top: 12px;">Due: ${escapeHtml(dto.dueDateFormatted)}</div>
        </div>
      </div>

      <table class="creative-table">
        <thead>
          <tr>
            <th style="width: 55%;">Description</th>
            <th style="text-align: center; width: 12%;">Qty</th>
            <th style="text-align: right; width: 15%;">Rate</th>
            <th style="text-align: right; width: 18%;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${dto.items.map(item => `
            <tr>
              <td><div style="font-weight: 700;">${escapeHtml(item.description)}</div></td>
              <td style="text-align: center; color: #71717a;">${item.quantity}</td>
              <td style="text-align: right; color: #71717a;">${escapeHtml(item.unitPriceFormatted)}</td>
              <td style="text-align: right; font-weight: 800; color: #18181b;">${escapeHtml(item.lineTotalFormatted)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="creative-totals-wrap">
        <div class="creative-totals-box">
          <div class="creative-sub-line"><span>Subtotal</span><span style="font-weight: 700; color: #18181b;">${escapeHtml(dto.subtotalFormatted)}</span></div>
          <div class="creative-sub-line"><span>GST</span><span style="font-weight: 700; color: #18181b;">${escapeHtml(dto.taxAmountFormatted)}</span></div>
          <div class="creative-total-title">Total Amount</div>
          <div class="creative-total-huge">${escapeHtml(totalDisplay)}</div>
        </div>
      </div>

      ${(dto.paymentInstructions || dto.notes) ? `
        <div class="creative-notes-box">
          <div style="font-weight: 800; color: ${brand}; font-size: 13px; margin-bottom: 8px;">Instructions & Notes</div>
          ${dto.notes ? `<div style="font-size: 12px; color: #71717a; line-height: 1.6; margin-bottom: 6px;" class="whitespace-pre">${escapeHtml(dto.notes)}</div>` : ''}
          <div style="font-size: 12px; color: #71717a; line-height: 1.6;" class="whitespace-pre">${escapeHtml(dto.paymentInstructions)}</div>
        </div>
      ` : ''}
    </div>
  `;
}

// -------------------------------------------------------------
// 6. ELEGANT SERIF ('elegant')
// -------------------------------------------------------------
function renderElegantTemplate(dto: InvoiceRenderDTO): string {
  const { billTo, issuer, currency, totalDisplay } = normalizeDto(dto);
  const brand = dto.brandColor || '#c0a060';
  const accent = dto.accentColor || brand;
  return `
    <style>
      .elegant-sheet {
        font-family: Georgia, 'Times New Roman', serif;
        color: #2d2d2d;
        padding: 60px;
        box-sizing: border-box;
      }
      .elegant-title {
        font-size: 46px;
        text-align: center;
        letter-spacing: 10px;
        margin-bottom: 16px;
        font-weight: normal;
        color: ${brand};
      }
      .elegant-gold-line {
        width: 100px;
        height: 2px;
        background: ${brand};
        margin: 0 auto 24px auto;
      }
      .elegant-due {
        text-align: center;
        font-size: 13px;
        font-weight: bold;
        color: ${brand};
        margin-bottom: 40px;
        letter-spacing: 1px;
      }
      .elegant-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 40px;
        text-align: center;
        margin-bottom: 40px;
      }
      .elegant-tag {
        font-size: 11px;
        font-weight: bold;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 3px;
        margin-bottom: 10px;
      }
      .elegant-party-name { font-size: 18px; font-weight: bold; margin-bottom: 6px; }
      .elegant-party-addr { font-size: 13px; color: #4b5563; line-height: 1.7; }
      .elegant-table {
        margin-bottom: 30px;
      }
      .elegant-table th {
        color: ${brand};
        font-size: 12px;
        font-weight: bold;
        padding: 12px 14px;
        border-bottom: 2px solid ${brand};
        text-align: left;
      }
      .elegant-table td {
        padding: 16px 14px;
        font-size: 13px;
        border-bottom: 1px solid #f3f4f6;
      }
      .elegant-totals-wrap {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 40px;
      }
      .elegant-totals-box {
        width: 320px;
        border-top: 2px solid ${brand};
        padding-top: 16px;
      }
      .elegant-line {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        margin-bottom: 8px;
      }
      .elegant-grand-line {
        display: flex;
        justify-content: space-between;
        font-size: 22px;
        font-weight: bold;
        margin-top: 12px;
      }
      .elegant-notes {
        text-align: center;
        border-top: 1px solid #f3f4f6;
        padding-top: 30px;
        margin-top: auto;
      }
    </style>

    <div class="a4-sheet elegant-sheet">
      <h1 class="elegant-title">INVOICE</h1>
      <div class="elegant-gold-line"></div>
      <div class="elegant-due">Due Date: ${escapeHtml(dto.dueDateFormatted)}</div>

      <div class="elegant-grid">
        <div>
          <div class="elegant-tag">From</div>
          <div class="elegant-party-name">${escapeHtml(issuer.name || 'Property Ledge')}</div>
          <div class="elegant-party-addr whitespace-pre">${escapeHtml(issuer.address)}</div>
        </div>
        <div>
          <div class="elegant-tag">To</div>
          <div class="elegant-party-name">${escapeHtml(billTo.name || 'Tenant')}</div>
          <div class="elegant-party-addr whitespace-pre">${escapeHtml(billTo.address || dto.propertyAddress)}</div>
        </div>
      </div>

      <table class="elegant-table">
        <thead>
          <tr>
            <th style="width: 55%;">Description</th>
            <th style="text-align: center; width: 12%;">Qty</th>
            <th style="text-align: right; width: 15%;">Rate</th>
            <th style="text-align: right; width: 18%;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${dto.items.map(item => `
            <tr>
              <td><div style="font-weight: bold;">${escapeHtml(item.description)}</div></td>
              <td style="text-align: center; color: #6b7280;">${item.quantity}</td>
              <td style="text-align: right; color: #6b7280;">${escapeHtml(item.unitPriceFormatted)}</td>
              <td style="text-align: right; font-weight: bold;">${escapeHtml(item.lineTotalFormatted)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="elegant-totals-wrap">
        <div class="elegant-totals-box">
          <div class="elegant-line"><span style="color: #6b7280; font-style: italic;">Subtotal</span><span style="font-weight: bold;">${escapeHtml(dto.subtotalFormatted)}</span></div>
          <div class="elegant-line"><span style="color: #6b7280; font-style: italic;">GST</span><span style="font-weight: bold;">${escapeHtml(dto.taxAmountFormatted)}</span></div>
          <div class="elegant-grand-line">
            <span>Total Due</span>
            <span style="color: #c0a060;">${escapeHtml(totalDisplay)}</span>
          </div>
        </div>
      </div>

      ${(dto.paymentInstructions || dto.notes) ? `
        <div class="elegant-notes">
          <div class="elegant-tag">Payment Information & Notes</div>
          ${dto.notes ? `<div style="font-size: 13px; color: #4b5563; line-height: 1.7; margin-bottom: 8px;" class="whitespace-pre">${escapeHtml(dto.notes)}</div>` : ''}
          <div style="font-size: 13px; color: #4b5563; line-height: 1.7;" class="whitespace-pre">${escapeHtml(dto.paymentInstructions)}</div>
        </div>
      ` : ''}
    </div>
  `;
}

// -------------------------------------------------------------
// 7. GOOGLE MATERIAL ('google')
// -------------------------------------------------------------
function renderGoogleTemplate(dto: InvoiceRenderDTO): string {
  const { billTo, issuer, currency, totalDisplay } = normalizeDto(dto);
  const brand = dto.brandColor || '#1a73e8';
  const accent = dto.accentColor || '#34a853';
  return `
    <style>
      .google-sheet {
        font-family: 'Roboto', -apple-system, sans-serif;
        color: #202124;
        padding: 50px 60px;
        box-sizing: border-box;
        border: 8px solid #f8f9fa;
      }
      .google-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 30px;
        border-bottom: 2px solid #f1f3f4;
        margin-bottom: 36px;
      }
      .google-brand-row {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .google-dot-grid {
        display: grid;
        grid-template-columns: 14px 14px;
        gap: 4px;
        padding-right: 16px;
        border-right: 2px solid #f1f3f4;
      }
      .google-dot { width: 14px; height: 14px; border-radius: 50%; }
      .google-dot-red { background: #ea4335; }
      .google-dot-blue { background: ${brand}; }
      .google-dot-yellow { background: #fbbc04; }
      .google-dot-green { background: ${accent}; }
      .google-h1 { font-size: 26px; font-weight: 500; color: #202124; }
      .google-h2 { font-size: 30px; font-weight: normal; color: ${brand}; }
      .google-grid-cards {
        display: flex;
        gap: 30px;
        margin-bottom: 36px;
      }
      .google-card-billed {
        flex: 1;
        background: #f8fafd;
        border: 1px solid #e8eaed;
        border-radius: 16px;
        padding: 22px;
        border-top: 3px solid ${brand};
      }
      .google-card-dates {
        width: 260px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .google-date-pill {
        background: #f8f9fa;
        border: 1px solid #e8eaed;
        border-radius: 12px;
        padding: 14px 18px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .google-due-pill {
        background: #fce8e6;
        border: 1px solid #fad2cf;
        border-radius: 12px;
        padding: 14px 18px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #d93025;
      }
      .google-table-wrap {
        border: 1px solid #e8eaed;
        border-radius: 16px;
        overflow: hidden;
        margin-bottom: 30px;
      }
      .google-table th {
        background: #f8f9fa;
        color: #202124;
        font-size: 12px;
        font-weight: 500;
        padding: 14px 18px;
        border-bottom: 2px solid ${brand};
        text-align: left;
      }
      .google-table td {
        padding: 16px 18px;
        font-size: 13px;
        border-top: 1px solid #f1f3f4;
      }
      .google-totals-wrap {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 30px;
      }
      .google-totals-box { width: 320px; }
      .google-sub-line {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        font-size: 13px;
        color: #5f6368;
      }
      .google-total-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8fafd;
        border: 2px solid ${brand};
        border-radius: 16px;
        padding: 18px 22px;
        margin-top: 10px;
      }
      .google-notes-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        border-top: 2px solid #f1f3f4;
        padding-top: 24px;
        margin-top: auto;
      }
      .google-note-card {
        background: #f8f9fa;
        border: 1px solid #e8eaed;
        border-radius: 14px;
        padding: 18px;
      }
    </style>

    <div class="a4-sheet google-sheet">
      <div class="google-header">
        <div class="google-brand-row">
          <div class="google-dot-grid">
            <div class="google-dot google-dot-red"></div>
            <div class="google-dot google-dot-blue"></div>
            <div class="google-dot google-dot-yellow"></div>
            <div class="google-dot google-dot-green"></div>
          </div>
          <div>
            <h1 class="google-h1">${escapeHtml(issuer.name || 'Property Ledge')}</h1>
            <div style="font-size: 12px; color: #5f6368; margin-top: 2px;" class="whitespace-pre">${escapeHtml(issuer.address)}</div>
          </div>
        </div>
        <div class="google-h2">INVOICE</div>
      </div>

      <div class="google-grid-cards">
        <div class="google-card-billed">
          <div style="font-size: 11px; font-weight: 700; color: ${brand}; text-transform: uppercase; margin-bottom: 8px;">Billed To</div>
          <div style="font-size: 18px; font-weight: 500; color: #202124; margin-bottom: 4px;">${escapeHtml(billTo.name || 'Tenant')}</div>
          <div style="font-size: 12px; color: #5f6368; line-height: 1.6;" class="whitespace-pre">${escapeHtml(billTo.address || dto.propertyAddress)}</div>
        </div>
        <div class="google-card-dates">
          <div class="google-date-pill">
            <span style="font-size: 11px; font-weight: 500; color: #5f6368; text-transform: uppercase;">Issue Date</span>
            <span style="font-size: 13px; font-weight: 500; color: #202124;">${escapeHtml(dto.issueDateFormatted)}</span>
          </div>
          <div class="google-due-pill">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase;">Due Date</span>
            <span style="font-size: 13px; font-weight: 700;">${escapeHtml(dto.dueDateFormatted)}</span>
          </div>
        </div>
      </div>

      <div class="google-table-wrap">
        <table class="google-table">
          <thead>
            <tr>
              <th style="width: 55%;">Description</th>
              <th style="text-align: center; width: 12%;">Qty</th>
              <th style="text-align: right; width: 15%;">Rate</th>
              <th style="text-align: right; width: 18%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${dto.items.map(item => `
              <tr>
                <td><div style="font-weight: 500; color: #202124;">${escapeHtml(item.description)}</div></td>
                <td style="text-align: center; color: #5f6368;">${item.quantity}</td>
                <td style="text-align: right; color: #5f6368;">${escapeHtml(item.unitPriceFormatted)}</td>
                <td style="text-align: right; font-weight: 500; color: #202124;">${escapeHtml(item.lineTotalFormatted)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="google-totals-wrap">
        <div class="google-totals-box">
          <div class="google-sub-line"><span>Subtotal</span><span style="color: #202124; font-weight: 500;">${escapeHtml(dto.subtotalFormatted)}</span></div>
          <div class="google-sub-line" style="border-bottom: 2px solid #f1f3f4; padding-bottom: 10px;"><span>Tax (GST)</span><span style="color: #202124; font-weight: 500;">${escapeHtml(dto.taxAmountFormatted)}</span></div>
          <div class="google-total-card">
            <span style="font-size: 12px; font-weight: 700; color: ${brand}; text-transform: uppercase; letter-spacing: 1px;">Total Due</span>
            <span style="font-size: 26px; font-weight: 500; color: ${brand};">${escapeHtml(totalDisplay)}</span>
          </div>
        </div>
      </div>

      ${(dto.paymentInstructions || dto.notes) ? `
        <div class="google-notes-grid">
          <div class="google-note-card">
            <div style="font-size: 11px; font-weight: 700; color: #5f6368; text-transform: uppercase; margin-bottom: 6px;">Instructions</div>
            <div style="font-size: 12px; color: #5f6368; line-height: 1.6;" class="whitespace-pre">${escapeHtml(dto.paymentInstructions)}</div>
          </div>
          ${dto.notes ? `
            <div class="google-note-card">
              <div style="font-size: 11px; font-weight: 700; color: #5f6368; text-transform: uppercase; margin-bottom: 6px;">Additional Notes</div>
              <div style="font-size: 12px; color: #5f6368; line-height: 1.6;" class="whitespace-pre">${escapeHtml(dto.notes)}</div>
            </div>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

// -------------------------------------------------------------
// 8. MONOCHROME DARK ('monochrome')
// -------------------------------------------------------------
function renderMonochromeTemplate(dto: InvoiceRenderDTO): string {
  const { billTo, issuer, currency, totalDisplay } = normalizeDto(dto);
  const brand = dto.brandColor || '#000000';
  const accent = dto.accentColor || brand;
  return `
    <style>
      .mono-sheet {
        font-family: 'Courier New', Courier, monospace;
        color: #000000;
        padding: 50px;
        box-sizing: border-box;
        border: 12px solid ${brand};
      }
      .mono-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        border-bottom: 4px solid ${brand};
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      .mono-title {
        font-size: 54px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: -2px;
        color: ${brand};
      }
      .mono-due {
        font-size: 14px;
        font-weight: bold;
        text-transform: uppercase;
      }
      .mono-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 40px;
        margin-bottom: 36px;
      }
      .mono-badge {
        background: ${brand};
        color: #ffffff;
        display: inline-block;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 10px;
      }
      .mono-party-name { font-size: 18px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; }
      .mono-party-addr { font-size: 12px; font-weight: 500; text-transform: uppercase; line-height: 1.6; }
      .mono-table {
        margin-bottom: 24px;
      }
      .mono-table th {
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
        padding: 12px 10px;
        border-top: 2px solid ${brand};
        border-bottom: 2px solid ${brand};
        text-align: left;
      }
      .mono-table td {
        padding: 14px 10px;
        font-size: 13px;
        border-bottom: 1px dashed #000000;
      }
      .mono-totals-wrap {
        display: flex;
        justify-content: flex-end;
        border-top: 4px solid ${brand};
        padding-top: 20px;
        margin-bottom: 24px;
      }
      .mono-totals-box { width: 320px; }
      .mono-line {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 8px;
      }
      .mono-grand-box {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: ${brand};
        color: #ffffff;
        padding: 16px 20px;
        font-size: 26px;
        font-weight: 900;
        text-transform: uppercase;
        margin-top: 12px;
      }
      .mono-notes-card {
        background: #f4f4f5;
        border: 2px solid ${brand};
        padding: 20px;
        margin-top: auto;
      }
    </style>

    <div class="a4-sheet mono-sheet">
      <div class="mono-header">
        <h1 class="mono-title">INVOICE</h1>
        <div class="mono-due">DUE: ${escapeHtml(dto.dueDateFormatted)}</div>
      </div>

      <div class="mono-grid">
        <div>
          <div class="mono-badge">FROM</div>
          <div class="mono-party-name">${escapeHtml(issuer.name || 'Property Ledge')}</div>
          <div class="mono-party-addr whitespace-pre">${escapeHtml(issuer.address)}</div>
        </div>
        <div style="text-align: right;">
          <div class="mono-badge">BILL TO</div>
          <div class="mono-party-name">${escapeHtml(billTo.name || 'Tenant')}</div>
          <div class="mono-party-addr whitespace-pre">${escapeHtml(billTo.address || dto.propertyAddress)}</div>
        </div>
      </div>

      <table class="mono-table">
        <thead>
          <tr>
            <th style="width: 55%;">Description</th>
            <th style="text-align: center; width: 12%;">Qty</th>
            <th style="text-align: right; width: 15%;">Rate</th>
            <th style="text-align: right; width: 18%;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${dto.items.map(item => `
            <tr>
              <td><div style="font-weight: bold; text-transform: uppercase;">${escapeHtml(item.description)}</div></td>
              <td style="text-align: center;">${item.quantity}</td>
              <td style="text-align: right;">${escapeHtml(item.unitPriceFormatted)}</td>
              <td style="text-align: right; font-weight: 900;">${escapeHtml(item.lineTotalFormatted)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="mono-totals-wrap">
        <div class="mono-totals-box">
          <div class="mono-line"><span>Subtotal</span><span>${escapeHtml(dto.subtotalFormatted)}</span></div>
          <div class="mono-line"><span>GST</span><span>${escapeHtml(dto.taxAmountFormatted)}</span></div>
          <div class="mono-grand-box">
            <span>Total</span>
            <span>${escapeHtml(totalDisplay)}</span>
          </div>
        </div>
      </div>

      ${(dto.paymentInstructions || dto.notes) ? `
        <div class="mono-notes-card">
          <div style="font-size: 12px; font-weight: 900; text-transform: uppercase; margin-bottom: 8px;">Instructions & Notes</div>
          ${dto.notes ? `<div style="font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;" class="whitespace-pre">${escapeHtml(dto.notes)}</div>` : ''}
          <div style="font-size: 12px; font-weight: 600; text-transform: uppercase;" class="whitespace-pre">${escapeHtml(dto.paymentInstructions)}</div>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Master HTML Generator dispatching to the 8 authentic art-directed renderers.
 */
export function renderInvoiceHtml(dto: InvoiceRenderDTO): string {
  const style = (dto.layoutStyle as InvoiceLayoutStyle) || 'classic';

  let innerHtml = '';
  switch (style) {
    case 'modern':
      innerHtml = renderModernTemplate(dto);
      break;
    case 'minimalist':
      innerHtml = renderMinimalistTemplate(dto);
      break;
    case 'corporate':
      innerHtml = renderCorporateTemplate(dto);
      break;
    case 'creative':
      innerHtml = renderCreativeTemplate(dto);
      break;
    case 'elegant':
      innerHtml = renderElegantTemplate(dto);
      break;
    case 'google':
      innerHtml = renderGoogleTemplate(dto);
      break;
    case 'monochrome':
      innerHtml = renderMonochromeTemplate(dto);
      break;
    case 'classic':
    default:
      innerHtml = renderClassicTemplate(dto);
      break;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${escapeHtml(dto.invoiceNumber)}</title>
  ${GOOGLE_FONTS_LINK}
  <style>
    ${BASE_PAGE_STYLES}
  </style>
</head>
<body>
  ${innerHtml}
</body>
</html>`;
}
