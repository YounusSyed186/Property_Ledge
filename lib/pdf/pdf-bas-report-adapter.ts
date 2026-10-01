import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BasWorksheetDTO, BasTransactionDTO } from '@/modules/finance/domain/types';
import {
  A4_PAGE_WIDTH,
  A4_PAGE_HEIGHT,
  STANDARD_MARGIN,
  CONTENT_WIDTH,
  createStandardPdfDocument,
  stampReportFooters,
  formatCurrencyReport,
  triggerPdfDownload,
} from './report-engine';

export interface BasReportCustomDetails {
  taxpayerName?: string;
  address?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  abn?: string;
  abnBranch?: string;
  paymentReferenceNumber?: string;
  bpayBillerCode?: string;
  chequeRecipient?: string;
  chequeAddress?: string;
  chequeSuburb?: string;
  chequeState?: string;
  chequePostcode?: string;
  directCreditBank?: string;
  directCreditBsb?: string;
  directCreditAccount?: string;
  directCreditName?: string;
  documentIdNumber?: string;
  gstAccountingMethod?: string;
  simplifiedBas?: boolean;
}

export interface BasReportPdfData {
  worksheet: BasWorksheetDTO;
  transactions: BasTransactionDTO[];
  workspaceName?: string;
  taxpayerName?: string;
  abn?: string;
  customDetails?: BasReportCustomDetails;
  generatedAt?: string;
}

// Crisp ATO Matte Grayish Slate Palette
const BW_DARK = [51, 65, 85] as const; // #334155 (Matte Slate Gray Header & Pills)
const BW_WHITE = [255, 255, 255] as const;
const BW_BORDER = [203, 213, 225] as const; // #CBD5E1 (Crisp box border)
const BW_FIELD_BG = [255, 255, 255] as const; // White form input box
const BW_TEXT_DARK = [15, 23, 42] as const; // #0F172A (Crisp dark text)
const BW_TEXT_MUTED = [100, 116, 139] as const; // #64748B (Muted labels)

export class PdfBasReportAdapter {
  /**
   * Helper to draw standard top Activity Statement header and sub-box
   */
  private static drawPageHeader(
    doc: jsPDF,
    worksheet: BasWorksheetDTO,
    taxpayerName: string,
    pageNum: number,
    totalPages: number,
    customTitle?: string
  ): number {
    let y = 14;

    // Header Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...BW_TEXT_DARK);
    const titleText =
      customTitle ||
      (worksheet.period === 'FY'
        ? `${worksheet.financialYear} Annual GST – Activity Statement`
        : `${worksheet.financialYear} ${worksheet.period} BAS – Activity Statement`);
    doc.text(titleText, STANDARD_MARGIN, y);

    // Page Number Top Right
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...BW_TEXT_MUTED);
    doc.text(`Page ${pageNum} of ${totalPages}`, A4_PAGE_WIDTH - STANDARD_MARGIN, y, { align: 'right' });

    y += 5;

    // Subheader Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...BW_TEXT_MUTED);
    doc.text('Activity statement', STANDARD_MARGIN, y + 3.5);

    // Name label & Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...BW_TEXT_DARK);
    doc.text('Name', STANDARD_MARGIN, y + 8);

    doc.setDrawColor(...BW_BORDER);
    doc.setFillColor(...BW_FIELD_BG);
    doc.roundedRect(STANDARD_MARGIN + 12, y + 4.5, 95, 5.5, 0.5, 0.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...BW_TEXT_DARK);
    doc.text((taxpayerName || '').substring(0, 50), STANDARD_MARGIN + 14, y + 8.5);

    // Date range
    const periodStart = worksheet.dateRange?.startDate || `${worksheet.financialYear - 1}-07-01`;
    const periodEnd = worksheet.dateRange?.endDate || `${worksheet.financialYear}-06-30`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...BW_TEXT_MUTED);
    doc.text(`${periodStart} to ${periodEnd}`, STANDARD_MARGIN, y + 13);

    return y + 16;
  }

  /**
   * Helper to draw a dark section header bar with white title
   */
  private static drawSectionBanner(doc: jsPDF, title: string, y: number): number {
    doc.setFillColor(...BW_DARK);
    doc.rect(STANDARD_MARGIN, y, CONTENT_WIDTH, 6.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BW_WHITE);
    doc.text(title, STANDARD_MARGIN + 3.5, y + 4.6);

    // Always reset text and fill colors after drawing banner
    doc.setTextColor(...BW_TEXT_DARK);
    doc.setFillColor(...BW_FIELD_BG);
    doc.setDrawColor(...BW_BORDER);

    return y + 7.5;
  }

  /**
   * Helper to draw a form label text in crisp dark ink
   */
  private static drawFieldLabel(
    doc: jsPDF,
    x: number,
    y: number,
    text: string,
    isBold = false,
    fontSize = 7.5
  ) {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(...BW_TEXT_DARK);
    doc.text(text, x, y);
  }

  /**
   * Helper to draw a bordered white form input box with text inside (leaves blank if text is empty)
   */
  private static drawFieldBox(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    text = '',
    isBold = false,
    align: 'left' | 'right' | 'center' = 'left',
    fontSize = 7.5
  ) {
    doc.setDrawColor(...BW_BORDER);
    doc.setFillColor(...BW_FIELD_BG);
    doc.rect(x, y, width, height, 'FD');

    if (text && text.trim().length > 0) {
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(...BW_TEXT_DARK);

      if (align === 'right') {
        doc.text(text, x + width - 2, y + height - 1.5, { align: 'right' });
      } else if (align === 'center') {
        doc.text(text, x + width / 2, y + height - 1.5, { align: 'center' });
      } else {
        doc.text(text, x + 2, y + height - 1.5);
      }
    }
  }

  /**
   * Helper to draw an ATO-style calculation row with dark code tag and single clean dollar sign box
   */
  private static drawCalculationRow(
    doc: jsPDF,
    y: number,
    label: string,
    code: string,
    amountStr: string,
    rowHeight = 6.5
  ): number {
    // Label
    this.drawFieldLabel(doc, STANDARD_MARGIN + 2, y + 4.2, label, false, 7.5);

    const rightEdge = A4_PAGE_WIDTH - STANDARD_MARGIN;
    const boxWidth = 34;
    const boxX = rightEdge - boxWidth;
    const codeWidth = 10;
    const codeX = boxX - codeWidth - 2;

    // Dark Code Pill Box
    doc.setFillColor(...BW_DARK);
    doc.rect(codeX, y + 0.8, codeWidth, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...BW_WHITE);
    doc.text(code, codeX + codeWidth / 2, y + 4.3, { align: 'center' });

    // Amount Box
    this.drawFieldBox(doc, boxX, y + 0.8, boxWidth, 5, '', false);

    // Dollar sign inside box on the left
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...BW_TEXT_MUTED);
    doc.text('$', boxX + 2, y + 4.3);

    // Strip leading $ from amountStr so there is NEVER duplicate dollar sign!
    const cleanAmount = amountStr.trim().startsWith('$')
      ? amountStr.trim().substring(1).trim()
      : amountStr.trim();

    // Amount value on the right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...BW_TEXT_DARK);
    doc.text(cleanAmount, boxX + boxWidth - 2, y + 4.3, { align: 'right' });

    return y + rowHeight;
  }

  /**
   * Generates a multi-page, high-fidelity formal ATO Activity Statement & GST Calculation Worksheet.
   */
  public static generateDocument(data: BasReportPdfData): jsPDF {
    const doc = createStandardPdfDocument({
      title: `BAS Activity Statement - ${data.worksheet.period} FY${data.worksheet.financialYear}`,
      subject: `Australian Taxation Office (ATO) Compliant Activity Statement Report`,
    });

    const { worksheet, transactions, customDetails } = data;
    const isPayable = worksheet.totals.netGstPosition >= 0;

    // User-entered or known fields
    const taxpayer = customDetails?.taxpayerName || data.taxpayerName || data.workspaceName || worksheet.propertyName || '';
    const taxpayerAddress = customDetails?.address || (worksheet.propertyId ? worksheet.propertyName : '');
    const suburb = customDetails?.suburb || '';
    const state = customDetails?.state || '';
    const postcode = customDetails?.postcode || '';
    const abnDisplay = customDetails?.abn || data.abn || '';
    const prnDisplay = customDetails?.paymentReferenceNumber || '';
    const bpayBiller = customDetails?.bpayBillerCode || '';
    const chequeRecipient = customDetails?.chequeRecipient || '';
    const chequeAddress = customDetails?.chequeAddress || '';
    const chequeSuburb = customDetails?.chequeSuburb || '';
    const chequeState = customDetails?.chequeState || '';
    const chequePostcode = customDetails?.chequePostcode || '';
    const bankName = customDetails?.directCreditBank || '';
    const bsb = customDetails?.directCreditBsb || '';
    const accountNum = customDetails?.directCreditAccount || '';
    const accountName = customDetails?.directCreditName || '';
    const din = customDetails?.documentIdNumber || '';
    const accountingMethod = customDetails?.gstAccountingMethod || 'Cash';
    const simplifiedBas = customDetails?.simplifiedBas ?? true;

    const totalPages = 3;

    // Calculate Purchases without GST in the price (G14)
    let purchasesWithoutGst = 0;
    if (worksheet.expenseByCategory && worksheet.expenseByCategory.length > 0) {
      worksheet.expenseByCategory.forEach((exp) => {
        if (!exp.gst || exp.gst < 0.005) {
          purchasesWithoutGst += Number(exp.gross || 0);
        }
      });
    } else if (transactions && transactions.length > 0) {
      transactions.forEach((tx) => {
        if (tx.type === 'expense' && (!tx.gstAmount || tx.gstAmount < 0.005)) {
          purchasesWithoutGst += Number(tx.amount || 0);
        }
      });
    }

    const g1TotalSales = worksheet.totals.totalSales;
    const g3OtherGstFree = 0;
    const g5TotalSalesWithoutGst = g3OtherGstFree;
    const g6SalesSubjectToGst = Math.max(0, g1TotalSales - g5TotalSalesWithoutGst);
    const g8SalesAfterAdjustments = g6SalesSubjectToGst;
    const g9GstOnSales = worksheet.totals.gstOnSales;

    const g11NonCapitalPurchases = worksheet.totals.totalExpenses;
    const g12TotalPurchases = g11NonCapitalPurchases;
    const g14PurchasesWithoutGst = purchasesWithoutGst;
    const g16PurchasesCannotClaim = g14PurchasesWithoutGst;
    const g17PurchasesSubjectToGst = Math.max(0, g12TotalPurchases - g16PurchasesCannotClaim);
    const g19PurchasesAfterAdjustments = g17PurchasesSubjectToGst;
    const g20GstOnPurchases = worksheet.totals.gstOnExpenses;

    // =========================================================================
    // PAGE 1: TAXPAYER DETAILS, PAYMENT OPTIONS, DETAILS & GST DECLARATION
    // =========================================================================
    let currentY = this.drawPageHeader(doc, worksheet, taxpayer, 1, totalPages);

    // 1. Taxpayer Details Section
    currentY = this.drawSectionBanner(doc, 'Taxpayer details', currentY);

    // Name
    this.drawFieldLabel(doc, STANDARD_MARGIN + 2, currentY + 4, 'Name');
    this.drawFieldBox(doc, STANDARD_MARGIN + 25, currentY + 0.5, CONTENT_WIDTH - 27, 5, taxpayer, true);

    currentY += 6.5;

    // Address
    this.drawFieldLabel(doc, STANDARD_MARGIN + 2, currentY + 4, 'Address');
    this.drawFieldBox(doc, STANDARD_MARGIN + 25, currentY + 0.5, CONTENT_WIDTH - 27, 5, taxpayerAddress, false);

    currentY += 6.5;

    // Suburb / State / Postcode
    this.drawFieldLabel(doc, STANDARD_MARGIN + 25, currentY + 4, 'Suburb');
    this.drawFieldBox(doc, STANDARD_MARGIN + 36, currentY + 0.5, 48, 5, suburb, false);

    this.drawFieldLabel(doc, STANDARD_MARGIN + 87, currentY + 4, 'State');
    this.drawFieldBox(doc, STANDARD_MARGIN + 96, currentY + 0.5, 16, 5, state, false);

    this.drawFieldLabel(doc, STANDARD_MARGIN + 115, currentY + 4, 'Postcode');
    this.drawFieldBox(doc, STANDARD_MARGIN + 128, currentY + 0.5, 20, 5, postcode, false);

    currentY += 9;

    // 2. Payment Options Section
    currentY = this.drawSectionBanner(doc, 'Payment options', currentY);

    // PRN
    this.drawFieldLabel(doc, STANDARD_MARGIN + 2, currentY + 4, 'Payment reference number');
    this.drawFieldBox(doc, STANDARD_MARGIN + 45, currentY + 0.5, 55, 5, prnDisplay, true);

    currentY += 6.5;

    // BPAY
    this.drawFieldLabel(doc, STANDARD_MARGIN + 2, currentY + 4, 'BPAY Biller code');
    this.drawFieldBox(doc, STANDARD_MARGIN + 45, currentY + 0.5, 55, 5, bpayBiller, true);

    currentY += 6.5;

    // Cheque
    this.drawFieldLabel(doc, STANDARD_MARGIN + 2, currentY + 4, 'Cheque');
    this.drawFieldBox(doc, STANDARD_MARGIN + 45, currentY + 0.5, 110, 5, chequeRecipient, false);

    currentY += 5.5;
    this.drawFieldBox(doc, STANDARD_MARGIN + 45, currentY + 0.5, 110, 5, chequeAddress, false);

    currentY += 5.5;
    this.drawFieldLabel(doc, STANDARD_MARGIN + 45, currentY + 4, 'Suburb');
    this.drawFieldBox(doc, STANDARD_MARGIN + 55, currentY + 0.5, 40, 5, chequeSuburb, false);

    this.drawFieldLabel(doc, STANDARD_MARGIN + 98, currentY + 4, 'State');
    this.drawFieldBox(doc, STANDARD_MARGIN + 107, currentY + 0.5, 14, 5, chequeState, false);

    this.drawFieldLabel(doc, STANDARD_MARGIN + 124, currentY + 4, 'Postcode');
    this.drawFieldBox(doc, STANDARD_MARGIN + 137, currentY + 0.5, 18, 5, chequePostcode, false);

    currentY += 7.5;

    // Direct Credit
    this.drawFieldLabel(doc, STANDARD_MARGIN + 2, currentY + 4, 'Direct credit');
    this.drawFieldLabel(doc, STANDARD_MARGIN + 45, currentY + 4, 'Bank name');
    this.drawFieldBox(doc, STANDARD_MARGIN + 68, currentY + 0.5, 87, 5, bankName, false);

    currentY += 5.5;
    this.drawFieldLabel(doc, STANDARD_MARGIN + 45, currentY + 4, 'BSB number');
    this.drawFieldBox(doc, STANDARD_MARGIN + 68, currentY + 0.5, 87, 5, bsb, false);

    currentY += 5.5;
    this.drawFieldLabel(doc, STANDARD_MARGIN + 45, currentY + 4, 'Account number');
    this.drawFieldBox(doc, STANDARD_MARGIN + 68, currentY + 0.5, 87, 5, accountNum, false);

    currentY += 5.5;
    this.drawFieldLabel(doc, STANDARD_MARGIN + 45, currentY + 4, 'Account name');
    this.drawFieldBox(doc, STANDARD_MARGIN + 68, currentY + 0.5, 87, 5, accountName, false);

    currentY += 9;

    // 3. Activity Statement Details Section
    currentY = this.drawSectionBanner(doc, 'Activity statement details', currentY);

    const drawDetailRow = (lbl: string, val: string) => {
      this.drawFieldLabel(doc, STANDARD_MARGIN + 2, currentY + 4, lbl);
      this.drawFieldBox(doc, STANDARD_MARGIN + 55, currentY + 0.5, CONTENT_WIDTH - 57, 5, val, true);
      currentY += 5.5;
    };

    drawDetailRow('Form type', worksheet.period === 'FY' ? 'Annual GST return (G1, 1A, 1B)' : `Quarterly BAS Return (${worksheet.period})`);
    drawDetailRow('Activity statement period', `${worksheet.periodLabel} (FY${worksheet.financialYear})`);
    drawDetailRow('Processing status code', 'Active (Original Return)');
    drawDetailRow('Document identification number', din);

    // ABN Structured boxes
    this.drawFieldLabel(doc, STANDARD_MARGIN + 2, currentY + 4, 'Australian business number (ABN)');
    const cleanAbn = abnDisplay.replace(/\s+/g, '');
    let abnX = STANDARD_MARGIN + 55;
    if (cleanAbn.length >= 11) {
      const p1 = cleanAbn.substring(0, 2);
      const p2 = cleanAbn.substring(2, 5);
      const p3 = cleanAbn.substring(5, 8);
      const p4 = cleanAbn.substring(8, 11);
      [p1, p2, p3, p4].forEach((part) => {
        const w = part.length * 5 + 4;
        this.drawFieldBox(doc, abnX, currentY + 0.5, w, 5, part, true, 'center');
        abnX += w + 2;
      });
    } else if (cleanAbn.length > 0) {
      this.drawFieldBox(doc, abnX, currentY + 0.5, 55, 5, abnDisplay, true, 'left');
      abnX += 57;
    } else {
      this.drawFieldBox(doc, abnX, currentY + 0.5, 55, 5, '', false, 'left');
      abnX += 57;
    }
    // Branch code
    const branchCode = customDetails?.abnBranch || (cleanAbn.length > 0 ? '001' : '');
    this.drawFieldBox(doc, abnX + 2, currentY + 0.5, 12, 5, branchCode, true, 'center');
    currentY += 6.5;

    drawDetailRow('Original date from due', worksheet.dateRange?.startDate || `${worksheet.financialYear - 1}-07-01`);
    drawDetailRow('Original date payment due', worksheet.dateRange?.endDate || `${worksheet.financialYear}-10-28`);
    drawDetailRow('GST accounting method', `${accountingMethod} Basis`);

    currentY += 3.5;

    // 4. Goods and Services Tax (GST) Section
    currentY = this.drawSectionBanner(doc, 'Goods and services tax (GST)', currentY);

    drawDetailRow('GST period', `${worksheet.dateRange?.startDate || '01/07/2025'} to ${worksheet.dateRange?.endDate || '30/09/2025'}`);

    this.drawFieldLabel(doc, STANDARD_MARGIN + 2, currentY + 4, 'Using Simplified BAS option?');
    this.drawFieldLabel(doc, STANDARD_MARGIN + 75, currentY + 4, simplifiedBas ? '[X] Yes    [ ] No' : '[ ] Yes    [X] No', true);
    currentY += 5.5;

    // Total sales with single clean dollar sign
    this.drawFieldLabel(doc, STANDARD_MARGIN + 2, currentY + 4, 'Total sales (including GST)');
    const cleanSalesStr = formatCurrencyReport(worksheet.totals.totalSales).replace(/^\$/, '');
    this.drawFieldBox(doc, STANDARD_MARGIN + 75, currentY + 0.5, 55, 5, `$ ${cleanSalesStr}`, true, 'left');
    currentY += 5.5;

    this.drawFieldLabel(doc, STANDARD_MARGIN + 2, currentY + 4, 'Does the amount shown at G1 include GST?');
    this.drawFieldLabel(doc, STANDARD_MARGIN + 75, currentY + 4, '[X] Yes    [ ] No', true);

    // =========================================================================
    // PAGE 2: SUMMARY & BUSINESS INCOME & EXPENSES TABLES
    // =========================================================================
    doc.addPage();
    let p2Y = this.drawPageHeader(doc, worksheet, taxpayer, 2, totalPages);

    // 1. Summary Box
    p2Y = this.drawSectionBanner(doc, 'Summary', p2Y);

    // Amounts owing to the ATO
    this.drawFieldLabel(doc, STANDARD_MARGIN + 2, p2Y + 4, 'Amounts owing to the ATO', true, 8);
    p2Y += 5.5;

    p2Y = this.drawCalculationRow(doc, p2Y, 'GST on sales or GST instalments', '1A', formatCurrencyReport(worksheet.totals.gstOnSales));
    p2Y = this.drawCalculationRow(doc, p2Y, 'Total amount owing to the ATO', '1B', formatCurrencyReport(worksheet.totals.gstOnSales));

    p2Y += 2;

    // Amounts owing from the ATO
    this.drawFieldLabel(doc, STANDARD_MARGIN + 2, p2Y + 4, 'Amounts owing from the ATO', true, 8);
    p2Y += 5.5;

    p2Y = this.drawCalculationRow(doc, p2Y, 'GST on purchases', '1B', formatCurrencyReport(worksheet.totals.gstOnExpenses));
    p2Y = this.drawCalculationRow(doc, p2Y, 'Total amount owing from the ATO', '1C', formatCurrencyReport(worksheet.totals.gstOnExpenses));

    p2Y += 2;

    // Payment or refund amount
    this.drawFieldLabel(doc, STANDARD_MARGIN + 2, p2Y + 4, 'Payment or refund amount', true, 8);
    p2Y += 5.5;

    const netAmountDisplay = isPayable
      ? formatCurrencyReport(worksheet.totals.netGstPosition)
      : `-$${Math.abs(worksheet.totals.netGstPosition).toFixed(2)} (Refund)`;
    p2Y = this.drawCalculationRow(doc, p2Y, isPayable ? 'Total amount due to ATO' : 'Total refund amount from ATO', '5', netAmountDisplay);

    p2Y += 6;

    // 2. Business Income Table
    p2Y = this.drawSectionBanner(doc, 'Business Income', p2Y);

    const incomeTableRows = (worksheet.incomeByCategory.length > 0
      ? worksheet.incomeByCategory
      : [{ categoryName: 'Rental Income', gross: worksheet.totals.totalSales, gst: worksheet.totals.gstOnSales, net: worksheet.totals.totalSales - worksheet.totals.gstOnSales, basCode: 'G1' }]
    ).map((row) => [
      worksheet.periodLabel.split(' ')[0] || worksheet.period,
      row.categoryName,
      formatCurrencyReport(row.gross),
      formatCurrencyReport(row.gst, true),
      formatCurrencyReport(row.net),
    ]);

    // Totals Row
    incomeTableRows.push([
      'Totals',
      '—',
      `${formatCurrencyReport(worksheet.totals.totalSales)} (G1)`,
      `${formatCurrencyReport(worksheet.totals.gstOnSales)} (1A)`,
      formatCurrencyReport(worksheet.totals.totalSales - worksheet.totals.gstOnSales),
    ]);

    autoTable(doc, {
      startY: p2Y,
      head: [['Date', 'Source', 'Gross', 'GST', 'Net']],
      body: incomeTableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 2,
      },
      bodyStyles: { fontSize: 7.5, textColor: [15, 23, 42], cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 65, fontStyle: 'bold' },
        2: { cellWidth: 32, halign: 'right' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 'auto', halign: 'right' },
      },
      margin: { left: STANDARD_MARGIN, right: STANDARD_MARGIN },
      didParseCell: (dataCell) => {
        if (dataCell.section === 'body' && dataCell.row.index === incomeTableRows.length - 1) {
          dataCell.cell.styles.fontStyle = 'bold';
          dataCell.cell.styles.fillColor = [240, 243, 248];
        }
      },
      didDrawPage: (dataPage) => {
        p2Y = dataPage.cursor?.y ? dataPage.cursor.y + 6 : p2Y + 30;
      },
    });

    // 3. Business Expenses Table
    p2Y = this.drawSectionBanner(doc, 'Business Expenses', p2Y);

    const expenseTableRows = (worksheet.expenseByCategory.length > 0
      ? worksheet.expenseByCategory
      : [
          { categoryName: 'Property Maintenance', gross: 0, gst: 0, net: 0 },
          { categoryName: 'Council Rates', gross: 0, gst: 0, net: 0 },
        ]
    ).map((row) => [
      worksheet.periodLabel.split(' ')[0] || worksheet.period,
      row.categoryName,
      formatCurrencyReport(row.gross),
      formatCurrencyReport(row.gst, true),
      formatCurrencyReport(row.net),
    ]);

    // Totals Row
    expenseTableRows.push([
      'Totals',
      '—',
      `${formatCurrencyReport(worksheet.totals.totalExpenses)} (G11)`,
      `${formatCurrencyReport(worksheet.totals.gstOnExpenses)} (1B)`,
      formatCurrencyReport(worksheet.totals.totalExpenses - worksheet.totals.gstOnExpenses),
    ]);

    autoTable(doc, {
      startY: p2Y,
      head: [['Date', 'Expenses', 'Gross', 'GST', 'Net']],
      body: expenseTableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 2,
      },
      bodyStyles: { fontSize: 7.5, textColor: [15, 23, 42], cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 65, fontStyle: 'bold' },
        2: { cellWidth: 32, halign: 'right' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 'auto', halign: 'right' },
      },
      margin: { left: STANDARD_MARGIN, right: STANDARD_MARGIN },
      didParseCell: (dataCell) => {
        if (dataCell.section === 'body' && dataCell.row.index === expenseTableRows.length - 1) {
          dataCell.cell.styles.fontStyle = 'bold';
          dataCell.cell.styles.fillColor = [240, 243, 248];
        }
      },
      didDrawPage: (dataPage) => {
        p2Y = dataPage.cursor?.y ? dataPage.cursor.y + 6 : p2Y + 30;
      },
    });

    // Net GST Position Summary Box on Page 2
    doc.setFillColor(240, 243, 248);
    doc.setDrawColor(...BW_BORDER);
    doc.rect(STANDARD_MARGIN, p2Y, CONTENT_WIDTH, 8, 'FD');

    this.drawFieldLabel(doc, STANDARD_MARGIN + 3.5, p2Y + 5.2, 'Net GST Payable / (Refundable)', true, 8.5);

    const netBannerText = isPayable
      ? `${formatCurrencyReport(worksheet.totals.netGstPosition)} (1A - 1B)`
      : `-$${Math.abs(worksheet.totals.netGstPosition).toFixed(2)} (Refund) (1A - 1B)`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BW_TEXT_DARK);
    doc.text(netBannerText, A4_PAGE_WIDTH - STANDARD_MARGIN - 3.5, p2Y + 5.2, { align: 'right' });

    // =========================================================================
    // PAGE 3: OFFICIAL GST CALCULATION WORKSHEET (Matching Annotated Reference)
    // =========================================================================
    doc.addPage();
    let p3Y = this.drawPageHeader(
      doc,
      worksheet,
      taxpayer,
      3,
      totalPages,
      'GST Calculation Worksheet'
    );

    // Section 1: GST amounts you owe the Tax Office from sales
    p3Y = this.drawSectionBanner(doc, 'GST amounts you owe the Tax Office from sales', p3Y);

    p3Y = this.drawCalculationRow(
      doc,
      p3Y,
      'Total sales (including any GST)',
      'G1',
      formatCurrencyReport(g1TotalSales)
    );

    p3Y = this.drawCalculationRow(
      doc,
      p3Y,
      'Other GST-free sales',
      'G3',
      formatCurrencyReport(g3OtherGstFree)
    );

    p3Y = this.drawCalculationRow(
      doc,
      p3Y,
      'Total sales without GST (G2 + G3 + G4)',
      'G5',
      formatCurrencyReport(g5TotalSalesWithoutGst)
    );

    p3Y = this.drawCalculationRow(
      doc,
      p3Y,
      'Total sales subject to GST (G1 minus G5)',
      'G6',
      formatCurrencyReport(g6SalesSubjectToGst)
    );

    p3Y = this.drawCalculationRow(
      doc,
      p3Y,
      'Total sales subject to GST after adjustments (G6 + G7)',
      'G8',
      formatCurrencyReport(g8SalesAfterAdjustments)
    );

    p3Y = this.drawCalculationRow(
      doc,
      p3Y,
      'GST on sales (G8 divided by 11)',
      'G9',
      formatCurrencyReport(g9GstOnSales)
    );

    p3Y += 6;

    // Section 2: GST amounts the Tax Office owes you from purchases
    p3Y = this.drawSectionBanner(doc, 'GST amounts the Tax Office owes you from purchases', p3Y);

    p3Y = this.drawCalculationRow(
      doc,
      p3Y,
      'Non-capital purchases (including any GST)',
      'G11',
      formatCurrencyReport(g11NonCapitalPurchases)
    );

    p3Y = this.drawCalculationRow(
      doc,
      p3Y,
      'Total purchases (G10 + G11)',
      'G12',
      formatCurrencyReport(g12TotalPurchases)
    );

    p3Y = this.drawCalculationRow(
      doc,
      p3Y,
      'Purchases without GST in the price',
      'G14',
      formatCurrencyReport(g14PurchasesWithoutGst)
    );

    p3Y = this.drawCalculationRow(
      doc,
      p3Y,
      'Total purchases where GST cannot be claimed (G13 + G14 + G15)',
      'G16',
      formatCurrencyReport(g16PurchasesCannotClaim)
    );

    p3Y = this.drawCalculationRow(
      doc,
      p3Y,
      'Total purchases subject to GST (G12 minus G16)',
      'G17',
      formatCurrencyReport(g17PurchasesSubjectToGst)
    );

    p3Y = this.drawCalculationRow(
      doc,
      p3Y,
      'Total purchases subject to GST after adjustments (G17 + G18)',
      'G19',
      formatCurrencyReport(g19PurchasesAfterAdjustments)
    );

    p3Y = this.drawCalculationRow(
      doc,
      p3Y,
      'GST on purchases (G19 divided by 11)',
      'G20',
      formatCurrencyReport(g20GstOnPurchases)
    );

    p3Y += 8;

    // Section 3: Bottom Calculation Reconciliation Box
    doc.setFillColor(240, 243, 248);
    doc.setDrawColor(...BW_BORDER);
    doc.rect(STANDARD_MARGIN, p3Y, CONTENT_WIDTH, 16, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...BW_TEXT_DARK);
    doc.text('ATO Calculation Reconciliation Summary', STANDARD_MARGIN + 3.5, p3Y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...BW_TEXT_MUTED);
    doc.text(
      `GST on sales (G9 / 1A): ${formatCurrencyReport(g9GstOnSales)}   —   GST on purchases (G20 / 1B): ${formatCurrencyReport(g20GstOnPurchases)}`,
      STANDARD_MARGIN + 3.5,
      p3Y + 9.5
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...BW_TEXT_DARK);
    doc.text(
      `Net GST Position (1A - 1B): ${isPayable ? formatCurrencyReport(worksheet.totals.netGstPosition) + ' (Payment Due to ATO)' : '-$' + Math.abs(worksheet.totals.netGstPosition).toFixed(2) + ' (Refund from ATO)'}`,
      STANDARD_MARGIN + 3.5,
      p3Y + 13.5
    );

    // Stamp footers across all pages
    stampReportFooters(doc, {
      systemLabel: 'PropertyLedge.com.au — ATO BAS Activity Statement Return & GST Worksheet',
    });

    return doc;
  }

  /**
   * Generates PDF bytes as Uint8Array for server actions / email attachments.
   */
  public static async generate(data: BasReportPdfData): Promise<Uint8Array> {
    const doc = this.generateDocument(data);
    return new Uint8Array(doc.output('arraybuffer'));
  }

  /**
   * Generates and triggers automatic PDF download in browser.
   */
  public static downloadPdf(data: BasReportPdfData): void {
    const doc = this.generateDocument(data);
    const propPart = (data.worksheet.propertyName || 'Portfolio').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Activity_Statement_${propPart}_${data.worksheet.period}_FY${data.worksheet.financialYear}.pdf`;
    triggerPdfDownload(doc, filename);
  }
}
