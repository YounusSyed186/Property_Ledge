import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TransactionDTO } from '@/modules/finance/domain/types';
import { FinanceReportFilters } from '@/modules/finance/domain/reporting-types';
import {
  A4_PAGE_WIDTH,
  A4_PAGE_HEIGHT,
  STANDARD_MARGIN,
  CONTENT_WIDTH,
  createStandardPdfDocument,
  stampReportFooters,
  formatCurrencyReport,
} from './report-engine';

export interface FolioStatementData {
  reportTitle?: string;
  transactions: TransactionDTO[];
  filters?: FinanceReportFilters;
  kpis?: Record<string, number | string>;
  agencyDetails?: {
    agencyName?: string;
    branchName?: string;
    phone?: string;
    website?: string;
    email?: string;
    abn?: string;
    licence?: string;
  };
  recipientDetails?: {
    name?: string;
    addressLine1?: string;
    addressLine2?: string;
    folioNumber?: string;
    periodFrom?: string;
    periodTo?: string;
    createdDate?: string;
  };
}

// Executive Minimalist Australian Financial Palette
const PALETTE = {
  navyPrimary: [10, 37, 64] as [number, number, number], // #0A2540 Deep Trust Navy
  slate900: [15, 23, 42] as [number, number, number], // #0F172A Slate 900
  slate800: [30, 41, 59] as [number, number, number], // #1E293B
  slate700: [51, 65, 85] as [number, number, number], // #334155
  slate500: [100, 116, 139] as [number, number, number], // #64748B
  slate400: [148, 163, 184] as [number, number, number], // #94A3B8
  slate200: [226, 232, 240] as [number, number, number], // #E2E8F0
  slate100: [241, 245, 249] as [number, number, number], // #F1F5F9
  slate50: [248, 250, 252] as [number, number, number], // #F8FAFC
  cyanAccent: [14, 165, 233] as [number, number, number], // #0EA5E9
  emerald: [16, 185, 129] as [number, number, number], // #10B981
  white: [255, 255, 255] as [number, number, number],
};

export class PdfFolioStatementAdapter {
  /**
   * Generates a modern, clean, breathable Australian Real Estate Owner Statement / Folio Summary PDF.
   */
  public static generateDocument(data: FolioStatementData): jsPDF {
    const reportTitle = data.reportTitle || 'Folio Summary';
    const doc = createStandardPdfDocument({
      title: reportTitle,
      subject: 'Australian Real Estate Property Management Financial Statement',
    });

    const transactions = data.transactions || [];
    const agency = data.agencyDetails || {};
    const recipient = data.recipientDetails || {};

    // 1. Financial Aggregates
    let totalMoneyIn = 0;
    let totalMoneyOut = 0;
    let totalTaxOnMoneyIn = 0;
    let totalTaxOnMoneyOut = 0;

    // Group transactions by property name
    const propertyGroups: Record<string, TransactionDTO[]> = {};

    transactions.forEach((tx) => {
      const propKey =
        tx.property?.name ||
        tx.property?.address_line_1 ||
        'sunShine';

      if (!propertyGroups[propKey]) {
        propertyGroups[propKey] = [];
      }
      propertyGroups[propKey].push(tx);

      const amount = Math.abs(Number(tx.amount || 0));
      const gstAmount =
        tx.gst_amount !== undefined
          ? Number(tx.gst_amount)
          : tx.category?.name?.toLowerCase().includes('insurance') ||
            tx.category?.name?.toLowerCase().includes('repairs') ||
            tx.category?.name?.toLowerCase().includes('maintenance')
          ? amount / 11
          : 0;

      if (tx.transaction_type === 'income') {
        totalMoneyIn += amount;
        totalTaxOnMoneyIn += gstAmount;
      } else {
        totalMoneyOut += amount;
        totalTaxOnMoneyOut += gstAmount;
      }
    });

    if (Object.keys(propertyGroups).length === 0) {
      propertyGroups['General Account'] = [];
    }

    const netBalance = totalMoneyIn - totalMoneyOut;

    // Robust Date & Metadata Fallbacks (avoid any 'NaN')
    const agencyName = agency.agencyName || 'MY home';
    const branchName = agency.branchName || `${agencyName} Real Estate Management`;
    const phone = agency.phone || '(w) +61 (02) 9000 0000';
    const website = agency.website || 'www.propertyledge.com.au';
    const email = agency.email || 'reports@propertyledge.com.au';
    const abn = agency.abn?.startsWith('ABN:') ? agency.abn : `ABN: ${agency.abn || '84 123 456 789'}`;
    const licence = agency.licence?.startsWith('Licence:') ? agency.licence : `Licence: ${agency.licence || '10046321TA001'}`;

    const ownerName = recipient.name || 'Property Owner / Investor';
    const ownerAddr1 = recipient.addressLine1 || (transactions[0]?.property?.address_line_1 || 'Pvn Colony 10-474 malkajgiri');
    const ownerAddr2 = recipient.addressLine2 || `${transactions[0]?.property?.city || 'Hyderabad'} ${transactions[0]?.property?.state || 'Telangana'} 2000`;

    const rawFy = data.filters?.financialYear;
    const currentYear = new Date().getFullYear();
    const fyNum = rawFy && !isNaN(Number(rawFy)) && Number(rawFy) > 2000 ? Number(rawFy) : currentYear;

    const dateFrom = recipient.periodFrom && !recipient.periodFrom.includes('NaN')
      ? recipient.periodFrom
      : (data.filters?.dateFrom ? String(data.filters.dateFrom) : `01/07/${fyNum - 1}`);

    const dateTo = recipient.periodTo && !recipient.periodTo.includes('NaN')
      ? recipient.periodTo
      : (data.filters?.dateTo ? String(data.filters.dateTo) : `30/06/${fyNum}`);

    const folioNum = recipient.folioNumber && !recipient.folioNumber.includes('NaN')
      ? recipient.folioNumber
      : `FOL-${fyNum}00472`;

    const createdDate = recipient.createdDate || new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // =========================================================================
    // SECTION 1: HEADER (Left Navy Brand Box + Right Agency Info)
    // =========================================================================
    let currentY = 15;

    // Left Brand Box
    const brandBoxW = 74;
    const brandBoxH = 16;
    doc.setFillColor(...PALETTE.navyPrimary);
    doc.roundedRect(STANDARD_MARGIN, currentY, brandBoxW, brandBoxH, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.setTextColor(255, 255, 255);
    doc.text(agencyName, STANDARD_MARGIN + 6, currentY + 10.5);

    doc.setFontSize(14);
    doc.setTextColor(...PALETTE.cyanAccent);
    doc.text('+', STANDARD_MARGIN + 6 + doc.getTextWidth(agencyName) + 2, currentY + 10.5);

    // Right Agency Contact Info (Right Aligned)
    const rightMarginX = A4_PAGE_WIDTH - STANDARD_MARGIN;
    let agencyY = currentY + 3;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...PALETTE.slate900);
    doc.text(branchName, rightMarginX, agencyY, { align: 'right' });

    agencyY += 3.8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...PALETTE.slate500);
    doc.text(phone, rightMarginX, agencyY, { align: 'right' });

    agencyY += 3.2;
    doc.text(website, rightMarginX, agencyY, { align: 'right' });

    agencyY += 3.2;
    doc.text(email, rightMarginX, agencyY, { align: 'right' });

    agencyY += 3.2;
    doc.text(abn, rightMarginX, agencyY, { align: 'right' });

    agencyY += 3.2;
    doc.text(licence, rightMarginX, agencyY, { align: 'right' });

    currentY = Math.max(currentY + brandBoxH, agencyY) + 12;

    // =========================================================================
    // SECTION 2: METADATA (Left: Recipient | Right: Folio Summary)
    // =========================================================================
    const metaY = currentY;

    // Left: Property Owner / Investor
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...PALETTE.slate900);
    doc.text(ownerName, STANDARD_MARGIN, metaY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...PALETTE.slate500);
    doc.text(ownerAddr1, STANDARD_MARGIN, metaY + 4.5);
    doc.text(ownerAddr2, STANDARD_MARGIN, metaY + 8.5);

    // Right: Folio Summary
    const folioColLabelX = rightMarginX - 38;
    const folioColValX = rightMarginX;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...PALETTE.slate900);
    doc.text('Folio Summary', folioColValX, metaY, { align: 'right' });

    let folY = metaY + 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...PALETTE.slate700);

    doc.text('Folio:', folioColLabelX, folY);
    doc.text(folioNum, folioColValX, folY, { align: 'right' });

    folY += 3.6;
    doc.text('From:', folioColLabelX, folY);
    doc.text(dateFrom, folioColValX, folY, { align: 'right' });

    folY += 3.6;
    doc.text('To:', folioColLabelX, folY);
    doc.text(dateTo, folioColValX, folY, { align: 'right' });

    folY += 3.6;
    doc.text('Created:', folioColLabelX, folY);
    doc.text(createdDate, folioColValX, folY, { align: 'right' });

    currentY = folY + 10;

    // =========================================================================
    // SECTION 3: 3-COLUMN KPI SUMMARY BOX (Money In | Money Out | Balance)
    // =========================================================================
    const kpiBoxH = 15;
    const kpiBoxW = CONTENT_WIDTH;
    const colW = kpiBoxW / 3;

    // Outer subtle border
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...PALETTE.slate200);
    doc.setLineWidth(0.3);
    doc.rect(STANDARD_MARGIN, currentY, kpiBoxW, kpiBoxH, 'FD');

    // Vertical dividers between columns
    doc.line(STANDARD_MARGIN + colW, currentY, STANDARD_MARGIN + colW, currentY + kpiBoxH);
    doc.line(STANDARD_MARGIN + colW * 2, currentY, STANDARD_MARGIN + colW * 2, currentY + kpiBoxH);

    // Col 1: Money In
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...PALETTE.slate500);
    doc.text('Money In', STANDARD_MARGIN + colW / 2, currentY + 4.8, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...PALETTE.slate900);
    doc.text(formatCurrencyReport(totalMoneyIn), STANDARD_MARGIN + colW / 2, currentY + 11.2, { align: 'center' });

    // Col 2: Money Out
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...PALETTE.slate500);
    doc.text('Money Out', STANDARD_MARGIN + colW + colW / 2, currentY + 4.8, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...PALETTE.slate900);
    doc.text(formatCurrencyReport(totalMoneyOut), STANDARD_MARGIN + colW + colW / 2, currentY + 11.2, { align: 'center' });

    // Col 3: Balance
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...PALETTE.slate500);
    doc.text('Balance', STANDARD_MARGIN + colW * 2 + colW / 2, currentY + 4.8, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...PALETTE.slate900);
    doc.text(formatCurrencyReport(netBalance), STANDARD_MARGIN + colW * 2 + colW / 2, currentY + 11.2, { align: 'center' });

    currentY += kpiBoxH + 8;

    // =========================================================================
    // SECTION 4: UNIFIED STATEMENT TABLE (Matching Reference Layout)
    // =========================================================================
    const tableBody: any[] = [];
    const propKeys = Object.keys(propertyGroups);

    propKeys.forEach((propKey) => {
      const groupTxs = propertyGroups[propKey];
      let subMoneyIn = 0;
      let subMoneyOut = 0;
      let subTax = 0;

      // 1. Property Header Row
      tableBody.push([
        {
          content: propKey,
          colSpan: 4,
          styles: {
            fontStyle: 'bold',
            fontSize: 7.8,
            textColor: PALETTE.slate900,
            cellPadding: { top: 3.5, bottom: 1.5, left: 1, right: 1 },
          },
        },
      ]);

      // 2. Individual Line Items
      groupTxs.forEach((tx) => {
        const amount = Math.abs(Number(tx.amount || 0));
        const gstAmount =
          tx.gst_amount !== undefined
            ? Number(tx.gst_amount)
            : tx.category?.name?.toLowerCase().includes('insurance') ||
              tx.category?.name?.toLowerCase().includes('repairs') ||
              tx.category?.name?.toLowerCase().includes('maintenance')
            ? amount / 11
            : 0;

        const isIncome = tx.transaction_type === 'income';
        const category = tx.category?.name || 'General';

        if (isIncome) {
          subMoneyIn += amount;
          subTax += gstAmount;
        } else {
          subMoneyOut += amount;
          subTax += gstAmount;
        }

        tableBody.push([
          {
            content: `   ${category}`,
            styles: {
              textColor: PALETTE.slate700,
              fontSize: 7.2,
              cellPadding: { top: 1.6, bottom: 1.6, left: 4, right: 1 },
            },
          },
          {
            content: gstAmount > 0.005 ? formatCurrencyReport(gstAmount) : '',
            styles: {
              halign: 'right',
              textColor: PALETTE.slate700,
              fontSize: 7.2,
              cellPadding: { top: 1.6, bottom: 1.6, left: 1, right: 1 },
            },
          },
          {
            content: !isIncome ? formatCurrencyReport(amount) : '',
            styles: {
              halign: 'right',
              textColor: PALETTE.slate700,
              fontSize: 7.2,
              cellPadding: { top: 1.6, bottom: 1.6, left: 1, right: 1 },
            },
          },
          {
            content: isIncome ? formatCurrencyReport(amount) : '',
            styles: {
              halign: 'right',
              textColor: PALETTE.slate700,
              fontSize: 7.2,
              cellPadding: { top: 1.6, bottom: 1.6, left: 1, right: 1 },
            },
          },
        ]);
      });

      // 3. Subtotal Row (with clean top border line and double bottom rule)
      tableBody.push([
        {
          content: '   Subtotal',
          styles: {
            fontStyle: 'bold',
            fontSize: 7.5,
            textColor: PALETTE.slate900,
            cellPadding: { top: 3, bottom: 4, left: 4, right: 1 },
            lineWidth: { top: 0.3, bottom: 0.8 },
            lineColor: PALETTE.slate900,
          },
        },
        {
          content: formatCurrencyReport(subTax),
          styles: {
            fontStyle: 'bold',
            fontSize: 7.5,
            halign: 'right',
            textColor: PALETTE.slate900,
            cellPadding: { top: 3, bottom: 4, left: 1, right: 1 },
            lineWidth: { top: 0.3, bottom: 0.8 },
            lineColor: PALETTE.slate900,
          },
        },
        {
          content: subMoneyOut > 0 ? formatCurrencyReport(subMoneyOut) : '$0.00',
          styles: {
            fontStyle: 'bold',
            fontSize: 7.5,
            halign: 'right',
            textColor: PALETTE.slate900,
            cellPadding: { top: 3, bottom: 4, left: 1, right: 1 },
            lineWidth: { top: 0.3, bottom: 0.8 },
            lineColor: PALETTE.slate900,
          },
        },
        {
          content: subMoneyIn > 0 ? formatCurrencyReport(subMoneyIn) : '$0.00',
          styles: {
            fontStyle: 'bold',
            fontSize: 7.5,
            halign: 'right',
            textColor: PALETTE.slate900,
            cellPadding: { top: 3, bottom: 4, left: 1, right: 1 },
            lineWidth: { top: 0.3, bottom: 0.8 },
            lineColor: PALETTE.slate900,
          },
        },
      ]);
    });

    // 4. Grand Total Row
    tableBody.push([
      {
        content: 'Total',
        styles: {
          fontStyle: 'bold',
          fontSize: 8,
          textColor: PALETTE.slate900,
          cellPadding: { top: 4, bottom: 4, left: 1, right: 1 },
          lineWidth: { top: 0.4, bottom: 1.2 },
          lineColor: PALETTE.slate900,
        },
      },
      {
        content: '',
        styles: {
          cellPadding: { top: 4, bottom: 4, left: 1, right: 1 },
          lineWidth: { top: 0.4, bottom: 1.2 },
          lineColor: PALETTE.slate900,
        },
      },
      {
        content: formatCurrencyReport(totalMoneyOut),
        styles: {
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'right',
          textColor: PALETTE.slate900,
          cellPadding: { top: 4, bottom: 4, left: 1, right: 1 },
          lineWidth: { top: 0.4, bottom: 1.2 },
          lineColor: PALETTE.slate900,
        },
      },
      {
        content: formatCurrencyReport(totalMoneyIn),
        styles: {
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'right',
          textColor: PALETTE.slate900,
          cellPadding: { top: 4, bottom: 4, left: 1, right: 1 },
          lineWidth: { top: 0.4, bottom: 1.2 },
          lineColor: PALETTE.slate900,
        },
      },
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          { content: 'Account', styles: { cellWidth: 84, fontStyle: 'bold', halign: 'left' } },
          { content: 'Included Tax', styles: { cellWidth: 32, fontStyle: 'bold', halign: 'right' } },
          { content: 'Money Out', styles: { cellWidth: 32, fontStyle: 'bold', halign: 'right' } },
          { content: 'Money In', styles: { cellWidth: 32, fontStyle: 'bold', halign: 'right' } },
        ],
      ],
      body: tableBody,
      theme: 'plain',
      styles: {
        fontSize: 7.2,
        cellPadding: 1.5,
        textColor: PALETTE.slate900,
        valign: 'middle',
      },
      headStyles: {
        fillColor: 255,
        textColor: PALETTE.slate900,
        fontSize: 7.5,
        cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
        lineWidth: { top: 0.5, bottom: 0.5 },
        lineColor: PALETTE.slate900,
      },
      columnStyles: {
        0: { cellWidth: 84, halign: 'left' },
        1: { cellWidth: 32, halign: 'right' },
        2: { cellWidth: 32, halign: 'right' },
        3: { cellWidth: 32, halign: 'right' },
      },
      margin: { left: STANDARD_MARGIN, right: STANDARD_MARGIN },
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8;

    // =========================================================================
    // SECTION 5: BOTTOM TAX BREAKDOWN (Clean Minimalist Notes)
    // =========================================================================
    if (currentY > A4_PAGE_HEIGHT - 35) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...PALETTE.slate700);

    doc.text(`Total Tax on Money Out: ${formatCurrencyReport(totalTaxOnMoneyOut)}`, STANDARD_MARGIN, currentY);
    doc.text(`Total Tax on Money In: ${formatCurrencyReport(totalTaxOnMoneyIn)}`, STANDARD_MARGIN, currentY + 4);

    // Stamp standardized footers across all pages
    stampReportFooters(doc, {
      systemLabel: 'PropertyLedge — Australian Real Estate Financial Reporting',
    });

    return doc;
  }

  /**
   * Generates PDF bytes as Uint8Array for server actions / email attachments.
   */
  public static async generate(data: FolioStatementData): Promise<Uint8Array> {
    const doc = this.generateDocument(data);
    return new Uint8Array(doc.output('arraybuffer'));
  }
}
