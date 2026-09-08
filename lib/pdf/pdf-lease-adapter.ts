import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface LeasePdfData {
  leaseNumber?: string;
  propertyName: string;
  propertyAddress?: string;
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  startDate: string;
  endDate?: string | null;
  rentAmount: number;
  rentFrequency: string;
  depositAmount?: number;
  termsNotes?: string;
}

export class PdfLeaseAdapter {
  /**
   * Generates a clean A4 PDF Lease Summary Document using pdf-lib.
   */
  public static async generate(data: LeasePdfData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size in points
    const { width, height } = page.getSize();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const primaryColor = rgb(0.13, 0.2, 0.23); // Dark slate
    const mutedColor = rgb(0.4, 0.45, 0.5);
    const accentColor = rgb(0.15, 0.45, 0.7);

    // Header Background Bar
    page.drawRectangle({
      x: 0,
      y: height - 100,
      width,
      height: 100,
      color: primaryColor,
    });

    // Header Title
    page.drawText('RESIDENTIAL LEASE AGREEMENT SUMMARY', {
      x: 40,
      y: height - 50,
      size: 18,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(`Property Ledge • Official Lease Record ${data.leaseNumber ? `#${data.leaseNumber}` : ''}`, {
      x: 40,
      y: height - 75,
      size: 10,
      font: fontRegular,
      color: rgb(0.8, 0.85, 0.9),
    });

    let currentY = height - 140;

    // Section 1: Property & Tenant Information
    page.drawText('1. PARTIES & PROPERTY DETAILS', {
      x: 40,
      y: currentY,
      size: 12,
      font: fontBold,
      color: primaryColor,
    });

    currentY -= 20;

    // Property Box
    page.drawRectangle({
      x: 40,
      y: currentY - 50,
      width: 250,
      height: 60,
      borderColor: rgb(0.85, 0.88, 0.9),
      borderWidth: 1,
    });

    page.drawText('PROPERTY', {
      x: 50,
      y: currentY - 10,
      size: 9,
      font: fontBold,
      color: mutedColor,
    });

    page.drawText(data.propertyName, {
      x: 50,
      y: currentY - 25,
      size: 11,
      font: fontBold,
      color: primaryColor,
    });

    if (data.propertyAddress) {
      page.drawText(data.propertyAddress, {
        x: 50,
        y: currentY - 40,
        size: 9,
        font: fontRegular,
        color: mutedColor,
      });
    }

    // Tenant Box
    page.drawRectangle({
      x: 305,
      y: currentY - 50,
      width: 250,
      height: 60,
      borderColor: rgb(0.85, 0.88, 0.9),
      borderWidth: 1,
    });

    page.drawText('TENANT / LESSEE', {
      x: 315,
      y: currentY - 10,
      size: 9,
      font: fontBold,
      color: mutedColor,
    });

    page.drawText(data.tenantName, {
      x: 315,
      y: currentY - 25,
      size: 11,
      font: fontBold,
      color: primaryColor,
    });

    if (data.tenantEmail) {
      page.drawText(data.tenantEmail, {
        x: 315,
        y: currentY - 40,
        size: 9,
        font: fontRegular,
        color: mutedColor,
      });
    }

    currentY -= 90;

    // Section 2: Lease Terms & Rent Details
    page.drawText('2. LEASE TERMS & FINANCIAL DETAILS', {
      x: 40,
      y: currentY,
      size: 12,
      font: fontBold,
      color: primaryColor,
    });

    currentY -= 25;

    // Table Header
    page.drawRectangle({
      x: 40,
      y: currentY - 20,
      width: 515,
      height: 25,
      color: rgb(0.95, 0.96, 0.98),
    });

    page.drawText('TERM ITEM', { x: 50, y: currentY - 13, size: 9, font: fontBold, color: mutedColor });
    page.drawText('DETAILS', { x: 260, y: currentY - 13, size: 9, font: fontBold, color: mutedColor });

    currentY -= 25;

    const rows = [
      ['Start Date', data.startDate],
      ['End Date', data.endDate || 'Month-to-Month'],
      ['Rent Amount', `$${data.rentAmount.toLocaleString()} / ${data.rentFrequency}`],
      ['Security Deposit', data.depositAmount ? `$${data.depositAmount.toLocaleString()}` : 'N/A'],
    ];

    for (const [label, val] of rows) {
      page.drawText(label, { x: 50, y: currentY - 15, size: 10, font: fontBold, color: primaryColor });
      page.drawText(val, { x: 260, y: currentY - 15, size: 10, font: fontRegular, color: primaryColor });
      page.drawLine({
        start: { x: 40, y: currentY - 22 },
        end: { x: 555, y: currentY - 22 },
        thickness: 0.5,
        color: rgb(0.9, 0.92, 0.94),
      });
      currentY -= 25;
    }

    currentY -= 20;

    // Section 3: Notes & Terms
    if (data.termsNotes) {
      page.drawText('3. SPECIAL TERMS & CONDITIONS', {
        x: 40,
        y: currentY,
        size: 12,
        font: fontBold,
        color: primaryColor,
      });

      currentY -= 15;
      page.drawText(data.termsNotes, {
        x: 40,
        y: currentY - 10,
        size: 9,
        font: fontRegular,
        color: mutedColor,
      });
      currentY -= 50;
    }

    // Footer Signature Area
    page.drawLine({
      start: { x: 40, y: 100 },
      end: { x: 555, y: 100 },
      thickness: 1,
      color: rgb(0.85, 0.88, 0.9),
    });

    page.drawText('Lessor / Property Manager Signature: _______________________', {
      x: 40,
      y: 75,
      size: 9,
      font: fontRegular,
      color: mutedColor,
    });

    page.drawText('Lessee / Tenant Signature: _______________________', {
      x: 320,
      y: 75,
      size: 9,
      font: fontRegular,
      color: mutedColor,
    });

    page.drawText('Generated by Property Ledge Management System', {
      x: 40,
      y: 35,
      size: 8,
      font: fontRegular,
      color: mutedColor,
    });

    return pdfDoc.save();
  }
}
