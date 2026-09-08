/**
 * PDF Invoice Document Generator Adapter.
 * Uses Headless Chromium (Playwright) to generate pixel-perfect A4 PDF invoices from canonical HTML,
 * ensuring 100% visual parity between Live Preview, Downloaded PDF, and Resend Email attachments.
 * Includes a pure pdf-lib fallback engine with proportional dynamic A4 layouts.
 */

import { PDFDocument, StandardFonts, rgb, RGB } from 'pdf-lib';
import { InvoiceRenderDTO } from '../../../application/dto/invoice-render-dto';
import { renderInvoiceHtml } from '../../../domain/documents/invoice-html-template';

function hexToRgb(hex: string, fallback: [number, number, number] = [0.13, 0.2, 0.23]): RGB {
  if (!hex || typeof hex !== 'string') return rgb(fallback[0], fallback[1], fallback[2]);
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255;
    const g = parseInt(clean[1] + clean[1], 16) / 255;
    const b = parseInt(clean[2] + clean[2], 16) / 255;
    return rgb(isNaN(r) ? fallback[0] : r, isNaN(g) ? fallback[1] : g, isNaN(b) ? fallback[2] : b);
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return rgb(isNaN(r) ? fallback[0] : r, isNaN(g) ? fallback[1] : g, isNaN(b) ? fallback[2] : b);
  }
  return rgb(fallback[0], fallback[1], fallback[2]);
}

declare const __non_webpack_require__: any;

function getSafeChromium(): any {
  try {
    const req = typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : eval('require');
    // Try available playwright packages
    try {
      const pw = req('playwright');
      if (pw?.chromium) return pw.chromium;
    } catch {}
    try {
      const pwCore = req('playwright-core');
      if (pwCore?.chromium) return pwCore.chromium;
    } catch {}
    try {
      const pwTest = req('@playwright/test');
      if (pwTest?.chromium) return pwTest.chromium;
    } catch {}
  } catch {}
  return null;
}

export class PdfInvoiceAdapter {
  /**
   * Generates a print-ready A4 PDF document for the invoice.
   */
  public static async generate(dto: InvoiceRenderDTO): Promise<Uint8Array> {
    // ── 1. Primary Engine: Headless Chromium (Playwright) ──
    const chromium = getSafeChromium();
    if (chromium) {
      try {
        const browser = await chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        });

        const page = await browser.newPage();
        const htmlContent = renderInvoiceHtml(dto);

        await page.setContent(htmlContent, { waitUntil: 'load' });

        const pdfBuffer = await page.pdf({
          format: 'A4',
          preferCSSPageSize: true,
          printBackground: true,
          margin: {
            top: '0mm',
            right: '0mm',
            bottom: '0mm',
            left: '0mm',
          },
        });

        await browser.close();
        return new Uint8Array(pdfBuffer);
      } catch (playwrightError: any) {
        console.warn(
          '[PdfInvoiceAdapter] Headless Chromium print engine failed, falling back to pdf-lib:',
          playwrightError?.message || playwrightError
        );
      }
    }

    // ── 2. Fallback Engine: High-Fidelity Pure pdf-lib Renderer ──
    return this.generatePdfLibFallback(dto);
  }

  /**
   * Pure pdf-lib fallback engine: Creates a complete, proportionate, professional A4 document.
   */
  private static async generatePdfLibFallback(dto: InvoiceRenderDTO): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // Standard A4: 210mm x 297mm (595.28pt x 841.89pt)
    const { width, height } = page.getSize();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const brandRgb = hexToRgb(dto.brandColor, [34 / 255, 51 / 255, 59 / 255]);
    const accentRgb = hexToRgb(dto.accentColor, [169 / 255, 146 / 255, 125 / 255]);
    const darkGray = rgb(30 / 255, 41 / 255, 59 / 255);
    const lightGray = rgb(248 / 255, 250 / 255, 252 / 255);
    const slateMuted = rgb(100 / 255, 116 / 255, 139 / 255);
    const borderColor = rgb(226 / 255, 232 / 255, 240 / 255);
    const white = rgb(1, 1, 1);

    const margin = 34; // ~12mm
    const contentWidth = width - margin * 2;
    let currentY = height - margin;

    // ── Header Banner ──
    const bannerHeight = 88;
    page.drawRectangle({
      x: margin,
      y: currentY - bannerHeight,
      width: contentWidth,
      height: bannerHeight,
      color: brandRgb,
    });

    // Left Branding
    page.drawText('TAX INVOICE', {
      x: margin + 18,
      y: currentY - 26,
      size: 10,
      font: fontBold,
      color: accentRgb,
    });

    const headerTitle = dto.headerText || 'PROPERTY LEDGE';
    page.drawText(headerTitle.substring(0, 36), {
      x: margin + 18,
      y: currentY - 50,
      size: 18,
      font: fontBold,
      color: white,
    });

    const issuerLine = `${dto.issuer.name || 'Property Ledge Management'} • ${dto.issuer.email || 'manager@propertyledge.com.au'}`;
    page.drawText(issuerLine.substring(0, 55), {
      x: margin + 18,
      y: currentY - 68,
      size: 8.5,
      font: fontRegular,
      color: rgb(226 / 255, 232 / 255, 240 / 255),
    });

    // Right Metadata Card
    const metaX = width - margin - 170;
    page.drawText(`Invoice No: ${dto.invoiceNumber}`, {
      x: metaX,
      y: currentY - 26,
      size: 9.5,
      font: fontBold,
      color: white,
    });

    page.drawText(`Issue Date: ${dto.issueDateFormatted}`, {
      x: metaX,
      y: currentY - 42,
      size: 8.5,
      font: fontRegular,
      color: white,
    });

    page.drawText(`Due Date: ${dto.dueDateFormatted}`, {
      x: metaX,
      y: currentY - 58,
      size: 8.5,
      font: fontBold,
      color: accentRgb,
    });

    // Status Pill
    const statusText = (dto.status || 'DRAFT').toUpperCase();
    const statusWidth = Math.max(50, fontBold.widthOfTextAtSize(statusText, 7.5) + 16);
    page.drawRectangle({
      x: metaX,
      y: currentY - 78,
      width: statusWidth,
      height: 14,
      color: white,
    });
    page.drawText(statusText, {
      x: metaX + 8,
      y: currentY - 74,
      size: 7.5,
      font: fontBold,
      color: brandRgb,
    });

    currentY -= bannerHeight + 14;

    // ── Billing Section (Bill To & Issued By) ──
    const billingHeight = 76;
    page.drawRectangle({
      x: margin,
      y: currentY - billingHeight,
      width: contentWidth,
      height: billingHeight,
      color: lightGray,
      borderColor,
      borderWidth: 1,
    });

    // Bill To
    const billToX = margin + 16;
    page.drawText('BILL TO', { x: billToX, y: currentY - 18, size: 8, font: fontBold, color: slateMuted });
    page.drawText((dto.billTo.name || 'Customer').substring(0, 35), {
      x: billToX,
      y: currentY - 32,
      size: 11,
      font: fontBold,
      color: darkGray,
    });
    if (dto.billTo.email) {
      page.drawText(dto.billTo.email.substring(0, 40), { x: billToX, y: currentY - 46, size: 8.5, font: fontRegular, color: slateMuted });
    }
    if (dto.billTo.address) {
      page.drawText(dto.billTo.address.substring(0, 42), { x: billToX, y: currentY - 60, size: 8.5, font: fontRegular, color: slateMuted });
    }

    // Issued By
    const issuedX = margin + contentWidth / 2 + 10;
    page.drawText('ISSUED BY', { x: issuedX, y: currentY - 18, size: 8, font: fontBold, color: slateMuted });
    page.drawText((dto.issuer.name || 'Property Ledge Management').substring(0, 35), {
      x: issuedX,
      y: currentY - 32,
      size: 10.5,
      font: fontBold,
      color: darkGray,
    });
    if (dto.issuer.email) {
      page.drawText(dto.issuer.email.substring(0, 40), { x: issuedX, y: currentY - 46, size: 8.5, font: fontRegular, color: slateMuted });
    }
    const phoneOrAddress = dto.issuer.phone || dto.issuer.address || '+61 2 9000 0000';
    page.drawText(phoneOrAddress.substring(0, 42), { x: issuedX, y: currentY - 60, size: 8.5, font: fontRegular, color: slateMuted });

    currentY -= billingHeight + 12;

    // Property Reference Banner (if exists)
    if (dto.propertyAddress) {
      page.drawText(`Property Reference: ${dto.propertyAddress}`, {
        x: margin + 4,
        y: currentY - 8,
        size: 8.5,
        font: fontBold,
        color: slateMuted,
      });
      currentY -= 16;
    }

    // ── Line Items Table ──
    const colDescX = margin + 12;
    const colQtyX = margin + contentWidth * 0.52;
    const colRateX = margin + contentWidth * 0.65;
    const colTaxX = margin + contentWidth * 0.79;
    const colTotalX = margin + contentWidth - 12;

    const tableHeaderHeight = 22;
    page.drawRectangle({
      x: margin,
      y: currentY - tableHeaderHeight,
      width: contentWidth,
      height: tableHeaderHeight,
      color: brandRgb,
    });

    page.drawText('Description', { x: colDescX, y: currentY - 15, size: 8.5, font: fontBold, color: white });
    page.drawText('Qty', { x: colQtyX, y: currentY - 15, size: 8.5, font: fontBold, color: white });
    page.drawText('Unit Price', { x: colRateX - 10, y: currentY - 15, size: 8.5, font: fontBold, color: white });
    page.drawText('Tax Rate', { x: colTaxX - 10, y: currentY - 15, size: 8.5, font: fontBold, color: white });
    page.drawText('Line Total', { x: colTotalX - 42, y: currentY - 15, size: 8.5, font: fontBold, color: white });

    currentY -= tableHeaderHeight;

    const rowHeight = 24;
    const itemsToRender = dto.items && dto.items.length > 0 ? dto.items : [
      {
        description: 'Standard Rental / Property Service',
        quantity: 1,
        unitPriceFormatted: dto.subtotalFormatted,
        taxRateFormatted: '0%',
        taxAmountFormatted: '$0.00',
        lineTotalFormatted: dto.totalAmountFormatted,
      },
    ];

    for (let i = 0; i < itemsToRender.length; i++) {
      const item = itemsToRender[i];

      if (i % 2 === 1) {
        page.drawRectangle({
          x: margin,
          y: currentY - rowHeight,
          width: contentWidth,
          height: rowHeight,
          color: lightGray,
        });
      }

      page.drawText(item.description.substring(0, 48), {
        x: colDescX,
        y: currentY - 16,
        size: 9,
        font: fontBold,
        color: darkGray,
      });

      page.drawText(String(item.quantity), {
        x: colQtyX + 4,
        y: currentY - 16,
        size: 9,
        font: fontRegular,
        color: darkGray,
      });

      page.drawText(item.unitPriceFormatted, {
        x: colRateX - 6,
        y: currentY - 16,
        size: 9,
        font: fontRegular,
        color: darkGray,
      });

      page.drawText(item.taxRateFormatted, {
        x: colTaxX - 4,
        y: currentY - 16,
        size: 9,
        font: fontRegular,
        color: darkGray,
      });

      const totalWidth = fontBold.widthOfTextAtSize(item.lineTotalFormatted, 9);
      page.drawText(item.lineTotalFormatted, {
        x: colTotalX - totalWidth,
        y: currentY - 16,
        size: 9,
        font: fontBold,
        color: brandRgb,
      });

      currentY -= rowHeight;
    }

    // Border below table
    page.drawLine({
      start: { x: margin, y: currentY },
      end: { x: margin + contentWidth, y: currentY },
      thickness: 1,
      color: borderColor,
    });

    currentY -= 18;

    // ── Summary & Totals Section ──
    const summaryTopY = currentY;
    const totalsCardWidth = 200;
    const totalsLeft = width - margin - totalsCardWidth;

    // Subtotal Row
    page.drawText('Subtotal:', { x: totalsLeft + 10, y: currentY - 10, size: 9, font: fontRegular, color: slateMuted });
    const subValWidth = fontRegular.widthOfTextAtSize(dto.subtotalFormatted, 9);
    page.drawText(dto.subtotalFormatted, { x: width - margin - 12 - subValWidth, y: currentY - 10, size: 9, font: fontRegular, color: darkGray });

    currentY -= 20;

    // Tax Row
    page.drawText('Tax / GST:', { x: totalsLeft + 10, y: currentY - 10, size: 9, font: fontRegular, color: slateMuted });
    const taxValWidth = fontRegular.widthOfTextAtSize(dto.taxAmountFormatted, 9);
    page.drawText(dto.taxAmountFormatted, { x: width - margin - 12 - taxValWidth, y: currentY - 10, size: 9, font: fontRegular, color: darkGray });

    currentY -= 22;

    // Amount Paid (if any)
    if (dto.amountPaidFormatted && dto.amountPaidFormatted !== '$0.00' && dto.amountPaidFormatted !== '₹0.00') {
      page.drawText('Amount Paid:', { x: totalsLeft + 10, y: currentY - 10, size: 9, font: fontRegular, color: slateMuted });
      const paidValWidth = fontRegular.widthOfTextAtSize(`-${dto.amountPaidFormatted}`, 9);
      page.drawText(`-${dto.amountPaidFormatted}`, { x: width - margin - 12 - paidValWidth, y: currentY - 10, size: 9, font: fontRegular, color: rgb(22 / 255, 163 / 255, 74 / 255) });
      currentY -= 20;
    }

    // Total Due Highlight Box
    const totalBoxHeight = 34;
    page.drawRectangle({
      x: totalsLeft,
      y: currentY - totalBoxHeight,
      width: totalsCardWidth,
      height: totalBoxHeight,
      color: brandRgb,
    });

    page.drawText('TOTAL DUE:', {
      x: totalsLeft + 12,
      y: currentY - 22,
      size: 10,
      font: fontBold,
      color: white,
    });

    const dueAmount = dto.balanceDueFormatted || dto.totalAmountFormatted;
    const dueValWidth = fontBold.widthOfTextAtSize(dueAmount, 12);
    page.drawText(dueAmount, {
      x: width - margin - 12 - dueValWidth,
      y: currentY - 23,
      size: 12,
      font: fontBold,
      color: accentRgb,
    });

    // ── Payment Instructions & Notes (Left Column) ──
    const leftColWidth = contentWidth - totalsCardWidth - 24;
    let leftY = summaryTopY;

    if (dto.paymentInstructions) {
      const insCardHeight = 65;
      page.drawRectangle({
        x: margin,
        y: leftY - insCardHeight,
        width: leftColWidth,
        height: insCardHeight,
        color: lightGray,
        borderColor,
        borderWidth: 1,
      });

      page.drawText('PAYMENT INSTRUCTIONS', {
        x: margin + 12,
        y: leftY - 16,
        size: 8,
        font: fontBold,
        color: brandRgb,
      });

      const lines = dto.paymentInstructions.split('\n').slice(0, 3);
      let pY = leftY - 30;
      for (const line of lines) {
        page.drawText(line.substring(0, 55), {
          x: margin + 12,
          y: pY,
          size: 8,
          font: fontRegular,
          color: darkGray,
        });
        pY -= 12;
      }

      leftY -= insCardHeight + 12;
    }

    if (dto.notes) {
      page.drawText(`Notes: ${dto.notes.substring(0, 75)}`, {
        x: margin + 4,
        y: leftY - 14,
        size: 8.5,
        font: fontRegular,
        color: slateMuted,
      });
    }

    // ── Footer at Page Bottom ──
    const footerY = margin + 18;
    page.drawLine({
      start: { x: margin, y: footerY + 12 },
      end: { x: margin + contentWidth, y: footerY + 12 },
      thickness: 0.5,
      color: borderColor,
    });

    const footerText = dto.footerText || 'Thank you for your business. Generated securely by Property Ledge.';
    page.drawText(footerText.substring(0, 80), {
      x: margin,
      y: footerY,
      size: 8,
      font: fontRegular,
      color: slateMuted,
    });

    page.drawText('Page 1 of 1', {
      x: width - margin - 45,
      y: footerY,
      size: 8,
      font: fontRegular,
      color: slateMuted,
    });

    return pdfDoc.save();
  }
}
