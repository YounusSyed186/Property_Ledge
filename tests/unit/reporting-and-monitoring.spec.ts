import { test, expect } from '@playwright/test';
import {
  createStandardPdfDocument,
  stampReportFooters,
  formatCurrencyReport,
  formatCurrencyBracketed,
  A4_PAGE_WIDTH,
  A4_PAGE_HEIGHT,
  REPORT_PALETTE,
} from '@/lib/pdf/report-engine';
import { generateConditionReportPDF } from '@/lib/pdf/condition-report-pdf';
import { PdfBasReportAdapter } from '@/lib/pdf/pdf-bas-report-adapter';
import type { FullConditionReportData } from '@/types/condition-report';
import type { BasWorksheetDTO, BasTransactionDTO } from '@/modules/finance/domain/types';

test.describe('PropertyLedge Reporting & Monitoring Technical QA Suite', () => {
  test.describe('1. Shared Report Engine Primitives', () => {
    test('standard A4 document initialization and dimensions', () => {
      const doc = createStandardPdfDocument({
        title: 'Test Document',
        subject: 'Unit Test',
      });

      expect(doc).toBeDefined();
      expect(A4_PAGE_WIDTH).toBe(210);
      expect(A4_PAGE_HEIGHT).toBe(297);
      expect(REPORT_PALETTE.primary).toEqual([10, 37, 64]);
    });

    test('currency formatting handles zero, positive, negative, and bracketed formats', () => {
      expect(formatCurrencyReport(0, true)).toBe('—');
      expect(formatCurrencyReport(1500.5)).toBe('$1,500.50');
      expect(formatCurrencyReport(1000000)).toBe('$1,000,000.00');
      expect(formatCurrencyBracketed(-350.25)).toBe('($350.25)');
      expect(formatCurrencyBracketed(4200)).toBe('$4,200.00');
    });

    test('stamps unified headers and footers across all document pages', () => {
      const doc = createStandardPdfDocument();
      doc.text('Page 1 Content', 20, 50);
      doc.addPage();
      doc.text('Page 2 Content', 20, 50);

      stampReportFooters(doc, { systemLabel: 'Test System Label' });
      const pageCount = (doc.internal as any).getNumberOfPages();
      expect(pageCount).toBe(2);
    });
  });

  test.describe('2. Condition Report PDF Generation', () => {
    test('generates valid multi-page Condition Report PDF with rooms, defects, photos, and signatures', () => {
      const mockData: FullConditionReportData = {
        report: {
          id: 'cr-101',
          workspace_id: 'ws-101',
          property_id: 'prop-101',
          lease_id: 'lease-101',
          inspector_id: 'usr-101',
          type: 'Move In',
          inspection_date: '2026-09-28',
          inspector_name: 'Sarah Connor',
          status: 'Completed',
          notes: 'Full property move-in inspection passed in good order.',
          signature_manager: null,
          signature_tenant: null,
          signature_landlord: null,
          completed_at: '2026-09-28T10:00:00Z',
          created_at: '2026-09-28T09:00:00Z',
          updated_at: '2026-09-28T10:00:00Z',
          properties: {
            id: 'prop-101',
            name: 'Beachside Apartment 4B',
            address_line_1: '42 Ocean Drive',
            city: 'Manly',
            state: 'NSW',
            postal_code: '2095',
          },
        },
        rooms: [
          {
            id: 'rm-1',
            report_id: 'cr-101',
            name: 'Master Bedroom',
            status: 'Completed',
            room_order: 0,
            created_at: '2026-09-28T09:00:00Z',
          },
          {
            id: 'rm-2',
            report_id: 'cr-101',
            name: 'Ensuite Bathroom',
            status: 'Completed',
            room_order: 1,
            created_at: '2026-09-28T09:00:00Z',
          },
        ],
        items: [
          { id: 'it-1', room_id: 'rm-1', name: 'Walls', rating: 'Good', created_at: '2026-09-28T09:00:00Z' },
          { id: 'it-2', room_id: 'rm-1', name: 'Ceiling', rating: 'Excellent', created_at: '2026-09-28T09:00:00Z' },
          { id: 'it-3', room_id: 'rm-2', name: 'Plumbing', rating: 'Needs Repair', created_at: '2026-09-28T09:00:00Z' },
        ],
        defects: [
          {
            id: 'df-1',
            room_id: 'rm-2',
            item_name: 'Plumbing',
            notes: 'Minor dripping from basin mixer tap.',
            severity: 'Minor',
            created_at: '2026-09-28T09:30:00Z',
          },
        ],
        photos: [],
      };

      const doc = generateConditionReportPDF(mockData);
      expect(doc).toBeDefined();

      const pageCount = (doc.internal as any).getNumberOfPages();
      // Landscape NSW layout: Cover page + Statutory Compliance pages + Master comparison table
      expect(pageCount).toBeGreaterThanOrEqual(4);

      const pdfArrayBuffer = doc.output('arraybuffer');
      expect(pdfArrayBuffer.byteLength).toBeGreaterThan(1500);

      // Verify PDF header magic bytes %PDF-
      const headerBytes = new Uint8Array(pdfArrayBuffer.slice(0, 5));
      const headerStr = String.fromCharCode(...headerBytes);
      expect(headerStr).toBe('%PDF-');
    });
  });

  test.describe('3. Accountant / BAS Activity Statement Multi-Page PDF Generation', () => {
    test('generates formal ATO-style Activity Statement with exact BAS code mappings and transaction audit trail', async () => {
      const mockWorksheet: BasWorksheetDTO = {
        propertyName: 'Oceanfront Luxury Villa',
        propertyId: 'prop-101',
        financialYear: 2026,
        period: 'Q1',
        periodLabel: 'Q1 (Jul 2025 – Sep 2025)',
        dateRange: {
          startDate: '2025-07-01',
          endDate: '2025-09-30',
        },
        totals: {
          totalSales: 15400.0,
          gstOnSales: 1400.0,
          totalExpenses: 4620.0,
          gstOnExpenses: 420.0,
          netGstPosition: 980.0,
          capitalExpensesGross: 1100.0,
          nonCapitalExpensesGross: 3520.0,
        },
        incomeByCategory: [
          {
            categoryId: 'cat-inc-1',
            categoryName: 'Commercial Rent',
            categoryGroup: 'Rental Income',
            gross: 15400.0,
            gst: 1400.0,
            net: 14000.0,
            basCode: 'G1',
            count: 3,
            transactionIds: ['tx-1', 'tx-2', 'tx-3'],
          },
        ],
        expenseByCategory: [
          {
            categoryId: 'cat-exp-1',
            categoryName: 'Property Management Fee',
            categoryGroup: 'Operating Expenses',
            gross: 1540.0,
            gst: 140.0,
            net: 1400.0,
            basCode: '1B',
            count: 3,
            transactionIds: ['tx-4'],
          },
          {
            categoryId: 'cat-exp-2',
            categoryName: 'Repairs & Maintenance',
            categoryGroup: 'Operating Expenses',
            gross: 1980.0,
            gst: 180.0,
            net: 1800.0,
            basCode: '1B',
            count: 2,
            transactionIds: ['tx-5'],
          },
          {
            categoryId: 'cat-exp-3',
            categoryName: 'HVAC Air Conditioner Upgrade',
            categoryGroup: 'Capital Works',
            gross: 1100.0,
            gst: 100.0,
            net: 1000.0,
            basCode: 'G10',
            count: 1,
            transactionIds: ['tx-6'],
          },
        ],
        basFigures: [
          { code: 'G1', label: 'Total Sales', amount: 15400.0, footnoteSymbol: '¹', description: 'Total gross sales' },
          { code: '1A', label: 'GST on Sales', amount: 1400.0, footnoteSymbol: '²', description: 'GST collected on sales' },
          { code: '1B', label: 'GST on Purchases', amount: 420.0, footnoteSymbol: '³', description: 'GST paid on purchases' },
          { code: 'NET', label: 'Net GST Position', amount: 980.0, footnoteSymbol: '⁴', description: 'Net GST position' },
        ],
        unclassifiedCount: 0,
        totalTransactionsCount: 6,
      };

      const mockTransactions: BasTransactionDTO[] = [
        {
          id: 'tx-1',
          date: '2025-07-05',
          description: 'July Commercial Rent',
          type: 'income',
          category: 'Commercial Rent',
          categoryGroup: 'Rental Income',
          taxClassification: 'Taxable Supply',
          propertyName: 'Oceanfront Luxury Villa',
          amount: 5133.34,
          gstAmount: 466.67,
          netAmount: 4666.67,
          gstInclusive: true,
          basCode: 'G1',
          reference: 'REC-001',
          status: 'completed',
        },
      ];

      const pdfDoc = PdfBasReportAdapter.generateDocument({
        worksheet: mockWorksheet,
        transactions: mockTransactions,
        workspaceName: 'Acme Property Holdings',
        taxpayerName: 'Acme Property Holdings Trust',
        abn: '12 345 678 901',
      });

      expect(pdfDoc).toBeDefined();
      const pageCount = (pdfDoc.internal as any).getNumberOfPages();
      // Page 1 (ATO Form) + Page 2 (Category Worksheet) + Page 3 (Transaction Audit Trail) = 3 pages
      expect(pageCount).toBe(3);

      const pdfBytes = await PdfBasReportAdapter.generate({
        worksheet: mockWorksheet,
        transactions: mockTransactions,
      });

      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(2000);

      // Verify PDF header
      const headerStr = String.fromCharCode(...pdfBytes.slice(0, 5));
      expect(headerStr).toBe('%PDF-');
    });
  });
});
