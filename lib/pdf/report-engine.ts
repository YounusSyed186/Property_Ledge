import { jsPDF } from 'jspdf';

/**
 * Standard A4 Dimensions in millimeters
 */
export const A4_PAGE_WIDTH = 210;
export const A4_PAGE_HEIGHT = 297;
export const STANDARD_MARGIN = 15;
export const CONTENT_WIDTH = A4_PAGE_WIDTH - STANDARD_MARGIN * 2;

/**
 * Shared Report Color Palette
 */
export const REPORT_PALETTE = {
  primary: [10, 37, 64] as [number, number, number], // #0A2540 Dark Navy
  secondary: [169, 146, 125] as [number, number, number], // #A9927D Gold Accent
  darkText: [27, 28, 28] as [number, number, number], // #1B1C1C Near Black
  mutedText: [115, 120, 123] as [number, number, number], // #73787B Muted Gray
  lightBg: [248, 250, 249] as [number, number, number], // #F8FAF9
  cardBorder: [226, 232, 240] as [number, number, number], // #E2E8F0
  tableHeaderBg: [225, 237, 250] as [number, number, number], // Light Blue
  tableHeaderAltBg: [238, 245, 252] as [number, number, number], // Lighter Blue
  dangerText: [190, 40, 40] as [number, number, number],
  successText: [22, 163, 74] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

/**
 * Create a new standardized jsPDF A4 Document with PropertyLedge metadata.
 */
export function createStandardPdfDocument(options?: {
  title?: string;
  subject?: string;
  author?: string;
}): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  doc.setProperties({
    title: options?.title || 'PropertyLedge Report',
    subject: options?.subject || 'Property Management & Financial Report',
    author: options?.author || 'PropertyLedge Enterprise System',
    creator: 'PropertyLedge PDF Engine v4.0',
  });

  return doc;
}

/**
 * Draw unified standard headers across report pages.
 */
export function drawReportHeader(
  doc: jsPDF,
  title: string,
  subtitle?: string,
  rightText?: string
) {
  // Primary Banner Bar
  doc.setFillColor(...REPORT_PALETTE.primary);
  doc.rect(0, 0, A4_PAGE_WIDTH, 26, 'F');

  // Secondary Gold Accent Line
  doc.setFillColor(...REPORT_PALETTE.secondary);
  doc.rect(0, 26, A4_PAGE_WIDTH, 1.5, 'F');

  // Title Text
  doc.setTextColor(...REPORT_PALETTE.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title.toUpperCase(), STANDARD_MARGIN, 16);

  // Subtitle
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(220, 225, 230);
    doc.text(subtitle, STANDARD_MARGIN, 22);
  }

  // Right-aligned header metadata
  if (rightText) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(240, 240, 240);
    doc.text(rightText, A4_PAGE_WIDTH - STANDARD_MARGIN, 16, { align: 'right' });
  }
}

/**
 * Stamp unified standard footers and page numbering on all pages of a jsPDF document.
 */
export function stampReportFooters(
  doc: jsPDF,
  options?: {
    systemLabel?: string;
    customFooterText?: string;
  }
) {
  const pageCount = (doc.internal as any).getNumberOfPages();
  const footerLabel =
    options?.systemLabel || 'PropertyLedge — Enterprise Property Management & Compliance';

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer divider line
    doc.setDrawColor(...REPORT_PALETTE.cardBorder);
    doc.setLineWidth(0.3);
    doc.line(STANDARD_MARGIN, A4_PAGE_HEIGHT - 13, A4_PAGE_WIDTH - STANDARD_MARGIN, A4_PAGE_HEIGHT - 13);

    // Footer system label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...REPORT_PALETTE.mutedText);
    doc.text(footerLabel, STANDARD_MARGIN, A4_PAGE_HEIGHT - 8);

    // Page Number
    doc.text(
      `Page ${i} of ${pageCount}`,
      A4_PAGE_WIDTH - STANDARD_MARGIN,
      A4_PAGE_HEIGHT - 8,
      { align: 'right' }
    );
  }
}

/**
 * Format currency in Australian standard ($XX,XXX.XX).
 */
export function formatCurrencyReport(
  val: number | null | undefined,
  showDashIfZero = false
): string {
  const amount = Number(val) || 0;
  if (showDashIfZero && Math.abs(amount) < 0.005) return '—';
  return `$${amount.toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format currency with brackets for negative numbers: ($XX,XXX.XX).
 */
export function formatCurrencyBracketed(val: number | null | undefined): string {
  const amount = Number(val) || 0;
  if (amount < 0) {
    return `($${Math.abs(amount).toLocaleString('en-AU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })})`;
  }
  return formatCurrencyReport(amount);
}

/**
 * Sanitize filename and trigger browser PDF download.
 */
export function triggerPdfDownload(doc: jsPDF, filename: string): void {
  const cleanName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(cleanName);
}

export { compressImageForUpload } from '@/lib/images/compression';

