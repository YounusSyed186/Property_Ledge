import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BasWorksheetDTO, BasTransactionDTO } from '@/modules/finance/domain/types';
import {
  A4_PAGE_WIDTH,
  A4_PAGE_HEIGHT,
  STANDARD_MARGIN,
  CONTENT_WIDTH,
  REPORT_PALETTE,
  createStandardPdfDocument,
  stampReportFooters,
  formatCurrencyReport,
  formatCurrencyBracketed,
  triggerPdfDownload,
} from './report-engine';

export interface BasReportPdfData {
  worksheet: BasWorksheetDTO;
  transactions: BasTransactionDTO[];
  workspaceName?: string;
  taxpayerName?: string;
  abn?: string;
  generatedAt?: string;
}

export class PdfBasReportAdapter {
  /**
   * Generates a multi-page, high-fidelity formal ATO-style Business Activity Statement (BAS)
   * and Accountant Financial Reconciliation Document.
   */
  public static generateDocument(data: BasReportPdfData): jsPDF {
    const doc = createStandardPdfDocument({
      title: `BAS Activity Statement - ${data.worksheet.period} FY${data.worksheet.financialYear}`,
      subject: `Australian Taxation Office (ATO) Compliant Activity Statement Report`,
    });

    const { worksheet, transactions } = data;
    const isPayable = worksheet.totals.netGstPosition >= 0;
    const taxpayer = data.taxpayerName || data.workspaceName || 'PropertyLedge Enterprise Investor';
    const abnDisplay = data.abn || 'XX XXX XXX XXX';
    const propertyLabel = worksheet.propertyId ? worksheet.propertyName : 'All Rental Properties (Consolidated)';

    // =========================================================================
    // PAGE 1: OFFICIAL ATO ACTIVITY STATEMENT FORM (PAPER STYLE)
    // =========================================================================
    
    // Top Formal Header
    doc.setFillColor(245, 247, 250);
    doc.rect(0, 0, A4_PAGE_WIDTH, 34, 'F');
    doc.setDrawColor(200, 210, 220);
    doc.line(0, 34, A4_PAGE_WIDTH, 34);

    // ATO Coat of Arms / Title Area
    doc.setTextColor(15, 25, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('BUSINESS ACTIVITY STATEMENT (BAS)', STANDARD_MARGIN, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(80, 90, 100);
    doc.text('Australian Taxation Office — Goods and Services Tax (GST) Return', STANDARD_MARGIN, 26);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 25, 35);
    doc.text(`FINANCIAL YEAR: FY${worksheet.financialYear}`, A4_PAGE_WIDTH - STANDARD_MARGIN, 18, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`PERIOD: ${worksheet.period} (${worksheet.periodLabel})`, A4_PAGE_WIDTH - STANDARD_MARGIN, 26, { align: 'right' });

    let currentY = 42;

    // Taxpayer & Activity Statement Metadata Boxes
    doc.setDrawColor(210, 215, 225);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(STANDARD_MARGIN, currentY, CONTENT_WIDTH, 26, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 110, 120);
    doc.text('TAXPAYER / ENTITY NAME', STANDARD_MARGIN + 5, currentY + 7);
    doc.text('ABN / CLIENT ID', STANDARD_MARGIN + 90, currentY + 7);
    doc.text('REPORTING SCOPE', STANDARD_MARGIN + 130, currentY + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 25, 35);
    doc.text(taxpayer, STANDARD_MARGIN + 5, currentY + 16);
    doc.text(abnDisplay, STANDARD_MARGIN + 90, currentY + 16);
    doc.text(propertyLabel.length > 24 ? propertyLabel.substring(0, 24) + '...' : propertyLabel, STANDARD_MARGIN + 130, currentY + 16);

    currentY += 33;

    // Section 1: GST on Sales (Supplies) Form Box
    doc.setFillColor(235, 242, 250);
    doc.rect(STANDARD_MARGIN, currentY, CONTENT_WIDTH, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...REPORT_PALETTE.primary);
    doc.text('GST ON SALES OR REVENUE (SUPPLIES)', STANDARD_MARGIN + 4, currentY + 5.5);

    currentY += 9;

    // G1 Box
    doc.setDrawColor(215, 220, 230);
    doc.setFillColor(255, 255, 255);
    doc.rect(STANDARD_MARGIN, currentY, CONTENT_WIDTH, 12, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(20, 30, 40);
    doc.text('Total sales or gross revenue (including any GST)', STANDARD_MARGIN + 4, currentY + 7.5);
    
    // G1 Label Code Tag
    doc.setFillColor(230, 238, 248);
    doc.rect(A4_PAGE_WIDTH - STANDARD_MARGIN - 65, currentY + 2, 14, 8, 'F');
    doc.setTextColor(...REPORT_PALETTE.primary);
    doc.text('G1', A4_PAGE_WIDTH - STANDARD_MARGIN - 61, currentY + 7.5);

    // G1 Amount Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 25, 35);
    doc.text(formatCurrencyReport(worksheet.totals.totalSales), A4_PAGE_WIDTH - STANDARD_MARGIN - 4, currentY + 7.5, { align: 'right' });

    currentY += 13;

    // 1A Box (GST on Sales)
    doc.rect(STANDARD_MARGIN, currentY, CONTENT_WIDTH, 12, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(20, 30, 40);
    doc.text('GST on sales or taxable supplies', STANDARD_MARGIN + 4, currentY + 7.5);

    doc.setFillColor(230, 238, 248);
    doc.rect(A4_PAGE_WIDTH - STANDARD_MARGIN - 65, currentY + 2, 14, 8, 'F');
    doc.setTextColor(...REPORT_PALETTE.primary);
    doc.text('1A', A4_PAGE_WIDTH - STANDARD_MARGIN - 61, currentY + 7.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 25, 35);
    doc.text(formatCurrencyReport(worksheet.totals.gstOnSales), A4_PAGE_WIDTH - STANDARD_MARGIN - 4, currentY + 7.5, { align: 'right' });

    currentY += 18;

    // Section 2: GST on Purchases (Acquisitions) Form Box
    doc.setFillColor(235, 242, 250);
    doc.rect(STANDARD_MARGIN, currentY, CONTENT_WIDTH, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...REPORT_PALETTE.primary);
    doc.text('GST ON PURCHASES & EXPENSES (ACQUISITIONS)', STANDARD_MARGIN + 4, currentY + 5.5);

    currentY += 9;

    // G10 Capital Purchases
    doc.rect(STANDARD_MARGIN, currentY, CONTENT_WIDTH, 11, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(20, 30, 40);
    doc.text('Capital purchases / capital works (gross)', STANDARD_MARGIN + 4, currentY + 7);

    doc.setFillColor(240, 243, 248);
    doc.rect(A4_PAGE_WIDTH - STANDARD_MARGIN - 65, currentY + 1.5, 14, 8, 'F');
    doc.setTextColor(60, 70, 80);
    doc.text('G10', A4_PAGE_WIDTH - STANDARD_MARGIN - 62, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 25, 35);
    doc.text(formatCurrencyReport(worksheet.totals.capitalExpensesGross), A4_PAGE_WIDTH - STANDARD_MARGIN - 4, currentY + 7, { align: 'right' });

    currentY += 12;

    // G11 Non-Capital Purchases
    doc.rect(STANDARD_MARGIN, currentY, CONTENT_WIDTH, 11, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(20, 30, 40);
    doc.text('Other purchases & operational expenses (gross)', STANDARD_MARGIN + 4, currentY + 7);

    doc.setFillColor(240, 243, 248);
    doc.rect(A4_PAGE_WIDTH - STANDARD_MARGIN - 65, currentY + 1.5, 14, 8, 'F');
    doc.setTextColor(60, 70, 80);
    doc.text('G11', A4_PAGE_WIDTH - STANDARD_MARGIN - 62, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 25, 35);
    doc.text(formatCurrencyReport(worksheet.totals.nonCapitalExpensesGross), A4_PAGE_WIDTH - STANDARD_MARGIN - 4, currentY + 7, { align: 'right' });

    currentY += 12;

    // 1B GST on Purchases Box
    doc.rect(STANDARD_MARGIN, currentY, CONTENT_WIDTH, 12, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(20, 30, 40);
    doc.text('GST on purchases / input tax credits', STANDARD_MARGIN + 4, currentY + 7.5);

    doc.setFillColor(230, 238, 248);
    doc.rect(A4_PAGE_WIDTH - STANDARD_MARGIN - 65, currentY + 2, 14, 8, 'F');
    doc.setTextColor(...REPORT_PALETTE.primary);
    doc.text('1B', A4_PAGE_WIDTH - STANDARD_MARGIN - 61, currentY + 7.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 25, 35);
    doc.text(formatCurrencyReport(worksheet.totals.gstOnExpenses), A4_PAGE_WIDTH - STANDARD_MARGIN - 4, currentY + 7.5, { align: 'right' });

    currentY += 18;

    // Section 3: Summary / Net Settlement Position Box
    doc.setFillColor(235, 242, 250);
    doc.rect(STANDARD_MARGIN, currentY, CONTENT_WIDTH, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...REPORT_PALETTE.primary);
    doc.text('SUMMARY & NET ACTIVITY STATEMENT OBLIGATION', STANDARD_MARGIN + 4, currentY + 5.5);

    currentY += 9;

    // Net GST Result Box (Highlighted)
    doc.setDrawColor(...REPORT_PALETTE.primary);
    doc.setLineWidth(0.6);
    doc.setFillColor(250, 252, 255);
    doc.rect(STANDARD_MARGIN, currentY, CONTENT_WIDTH, 16, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 25, 35);
    doc.text(isPayable ? 'Net GST amount you owe the ATO (1A minus 1B)' : 'Net GST amount ATO owes you (refund) (1B minus 1A)', STANDARD_MARGIN + 4, currentY + 10);

    doc.setFillColor(220, 232, 248);
    doc.rect(A4_PAGE_WIDTH - STANDARD_MARGIN - 65, currentY + 3.5, 14, 9, 'F');
    doc.setTextColor(...REPORT_PALETTE.primary);
    doc.text('9', A4_PAGE_WIDTH - STANDARD_MARGIN - 59, currentY + 9.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(isPayable ? 180 : 22, isPayable ? 35 : 130, isPayable ? 35 : 60);
    doc.text(formatCurrencyReport(Math.abs(worksheet.totals.netGstPosition)), A4_PAGE_WIDTH - STANDARD_MARGIN - 4, currentY + 10.5, { align: 'right' });

    currentY += 24;

    // Formal Declaration Box
    doc.setLineWidth(0.3);
    doc.setDrawColor(210, 215, 225);
    doc.setFillColor(248, 250, 249);
    doc.roundedRect(STANDARD_MARGIN, currentY, CONTENT_WIDTH, 34, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(90, 100, 110);
    doc.text('DECLARATION & SIGN-OFF', STANDARD_MARGIN + 4, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 110, 120);
    const declarationText =
      'I declare that the information given on this activity statement is true and correct, and that I am authorized to make this statement. The records supporting this return are held in compliance with Australian Taxation Office requirements.';
    const splitDec = doc.splitTextToSize(declarationText, CONTENT_WIDTH - 8);
    doc.text(splitDec, STANDARD_MARGIN + 4, currentY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(20, 30, 40);
    doc.text('Signature / Authorization: ____________________________', STANDARD_MARGIN + 4, currentY + 28);
    doc.text(`Date: ${new Date().toLocaleDateString('en-AU')}`, A4_PAGE_WIDTH - STANDARD_MARGIN - 45, currentY + 28);

    // =========================================================================
    // PAGE 2: CATEGORY BREAKDOWN RECONCILIATION WORKSHEET
    // =========================================================================
    doc.addPage();
    let p2Y = 20;

    // Header Banner
    doc.setFillColor(...REPORT_PALETTE.primary);
    doc.rect(STANDARD_MARGIN, p2Y, CONTENT_WIDTH, 9, 'F');
    doc.setFillColor(...REPORT_PALETTE.secondary);
    doc.rect(STANDARD_MARGIN, p2Y, 3, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('BUSINESS REVENUE & EXPENSE RECONCILIATION WORKSHEET', STANDARD_MARGIN + 7, p2Y + 6);

    p2Y += 14;

    // Income Category Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...REPORT_PALETTE.primary);
    doc.text('1. Business Income by Category', STANDARD_MARGIN, p2Y);
    p2Y += 4;

    const incomeRows = (worksheet.incomeByCategory.length > 0
      ? worksheet.incomeByCategory
      : [{ categoryName: 'Rental Income', gross: worksheet.totals.totalSales, gst: worksheet.totals.gstOnSales, net: worksheet.totals.totalSales - worksheet.totals.gstOnSales, basCode: 'G1' }]
    ).map((row) => [
      row.categoryName,
      row.basCode || 'G1',
      formatCurrencyReport(row.gross),
      formatCurrencyReport(row.gst, true),
      formatCurrencyReport(row.net),
    ]);

    // Add Income Totals row
    incomeRows.push([
      'TOTAL INCOME (G1 / 1A)',
      '—',
      formatCurrencyReport(worksheet.totals.totalSales),
      formatCurrencyReport(worksheet.totals.gstOnSales),
      formatCurrencyReport(worksheet.totals.totalSales - worksheet.totals.gstOnSales),
    ]);

    autoTable(doc, {
      startY: p2Y,
      head: [['Income Category', 'BAS Code', 'Gross Amount', 'GST Amount', 'Net Amount']],
      body: incomeRows,
      theme: 'striped',
      headStyles: {
        fillColor: REPORT_PALETTE.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
      columnStyles: {
        0: { cellWidth: 70, fontStyle: 'bold' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 'auto', halign: 'right' },
      },
      margin: { left: STANDARD_MARGIN, right: STANDARD_MARGIN },
      didParseCell: (dataCell) => {
        if (dataCell.section === 'body' && dataCell.row.index === incomeRows.length - 1) {
          dataCell.cell.styles.fontStyle = 'bold';
          dataCell.cell.styles.fillColor = REPORT_PALETTE.tableHeaderBg;
        }
      },
      didDrawPage: (dataPage) => {
        p2Y = dataPage.cursor?.y ? dataPage.cursor.y + 10 : p2Y + 25;
      },
    });

    // Expenses Category Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...REPORT_PALETTE.primary);
    doc.text('2. Business & Property Expenses by Category', STANDARD_MARGIN, p2Y);
    p2Y += 4;

    const expenseRows = (worksheet.expenseByCategory.length > 0
      ? worksheet.expenseByCategory
      : [
          { categoryName: 'Body Corporate / Strata', gross: 0, gst: 0, net: 0, basCode: '1B' },
          { categoryName: 'Council Rates', gross: 0, gst: 0, net: 0, basCode: 'G11' },
          { categoryName: 'Property Management Charges', gross: 0, gst: 0, net: 0, basCode: '1B' },
          { categoryName: 'Repairs & Maintenance', gross: 0, gst: 0, net: 0, basCode: '1B' },
          { categoryName: 'Water Rates', gross: 0, gst: 0, net: 0, basCode: 'G11' },
        ]
    ).map((row) => [
      row.categoryName,
      row.basCode || '1B',
      formatCurrencyReport(row.gross),
      formatCurrencyReport(row.gst, true),
      formatCurrencyReport(row.net),
    ]);

    // Add Expense Totals row
    expenseRows.push([
      'TOTAL EXPENSES (G11 / 1B)',
      '—',
      formatCurrencyReport(worksheet.totals.totalExpenses),
      formatCurrencyReport(worksheet.totals.gstOnExpenses),
      formatCurrencyReport(worksheet.totals.totalExpenses - worksheet.totals.gstOnExpenses),
    ]);

    autoTable(doc, {
      startY: p2Y,
      head: [['Expense Category', 'BAS Code', 'Gross Amount', 'GST Paid', 'Net Amount']],
      body: expenseRows,
      theme: 'striped',
      headStyles: {
        fillColor: REPORT_PALETTE.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
      columnStyles: {
        0: { cellWidth: 70, fontStyle: 'bold' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 'auto', halign: 'right' },
      },
      margin: { left: STANDARD_MARGIN, right: STANDARD_MARGIN },
      didParseCell: (dataCell) => {
        if (dataCell.section === 'body' && dataCell.row.index === expenseRows.length - 1) {
          dataCell.cell.styles.fontStyle = 'bold';
          dataCell.cell.styles.fillColor = REPORT_PALETTE.tableHeaderBg;
        }
      },
      didDrawPage: (dataPage) => {
        p2Y = dataPage.cursor?.y ? dataPage.cursor.y + 10 : p2Y + 25;
      },
    });

    // =========================================================================
    // PAGE 3+: UNDERLYING TRANSACTION AUDIT TRAIL TABLE
    // =========================================================================
    if (transactions.length > 0) {
      doc.addPage();
      let p3Y = 20;

      // Header Banner
      doc.setFillColor(...REPORT_PALETTE.primary);
      doc.rect(STANDARD_MARGIN, p3Y, CONTENT_WIDTH, 9, 'F');
      doc.setFillColor(...REPORT_PALETTE.secondary);
      doc.rect(STANDARD_MARGIN, p3Y, 3, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('UNDERLYING TRANSACTION AUDIT TRAIL & TAX CLASSIFICATION', STANDARD_MARGIN + 7, p3Y + 6);

      p3Y += 14;

      const txRows = transactions.map((tx) => [
        tx.date,
        tx.description.length > 30 ? tx.description.substring(0, 30) + '...' : tx.description,
        tx.category,
        tx.taxClassification || 'Standard',
        tx.basCode || '—',
        formatCurrencyReport(tx.amount),
        formatCurrencyReport(tx.gstAmount, true),
        formatCurrencyReport(tx.netAmount),
      ]);

      autoTable(doc, {
        startY: p3Y,
        head: [['Date', 'Description', 'Category', 'Tax Class', 'BAS', 'Gross', 'GST', 'Net']],
        body: txRows,
        theme: 'striped',
        headStyles: {
          fillColor: REPORT_PALETTE.primary,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
        },
        bodyStyles: { fontSize: 7, textColor: [50, 50, 50] },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 42 },
          2: { cellWidth: 32 },
          3: { cellWidth: 24 },
          4: { cellWidth: 12, halign: 'center' },
          5: { cellWidth: 18, halign: 'right' },
          6: { cellWidth: 15, halign: 'right' },
          7: { cellWidth: 'auto', halign: 'right' },
        },
        margin: { left: STANDARD_MARGIN, right: STANDARD_MARGIN },
      });
    }

    // Stamp shared footers across all pages
    stampReportFooters(doc, {
      systemLabel: 'PropertyLedge.com.au — ATO BAS Activity Statement & Reconciliation Report',
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
    const filename = `BAS_Report_${propPart}_${data.worksheet.period}_FY${data.worksheet.financialYear}.pdf`;
    triggerPdfDownload(doc, filename);
  }
}
