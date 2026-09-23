import { test, expect } from '@playwright/test';
import {
  resolveBasDateRange,
  calculateGstPortion,
  calculateBasWorksheet,
  formatBasDetailsTransactions,
  buildBasGuidance,
} from '../../modules/finance/domain/bas-calculations';
import {
  TransactionDTO,
  BasPeriod,
  TaxClassificationDTO,
} from '../../modules/finance/domain/types';
import { PdfBasReportAdapter } from '../../lib/pdf/pdf-bas-report-adapter';

test.describe('Australian GST Tracking & BAS Activity Statement - Calculation & Reporting Tests', () => {
  // Mock Data
  const sampleWorkspaceId = '11111111-1111-4111-8111-111111111111';
  const sampleProperty1Id = '22222222-2222-4222-8222-222222222222';
  const sampleProperty2Id = '33333333-3333-4333-8333-333333333333';

  const mockProperties = [
    {
      id: sampleProperty1Id,
      name: '124 Collins Street (Commercial)',
      gst_enabled: true,
    },
    {
      id: sampleProperty2Id,
      name: '42 Bondi Road (Residential)',
      gst_enabled: false,
    },
  ];

  const mockTaxClassifications: Record<string, TaxClassificationDTO> = {
    taxableSales: {
      id: 'tc-1',
      workspace_id: sampleWorkspaceId,
      name: 'Taxable Sales (10% GST)',
      bas_code: 'G1',
      description: 'Commercial rent',
      is_active: true,
      created_at: '',
      updated_at: '',
    },
    operatingExpense: {
      id: 'tc-2',
      workspace_id: sampleWorkspaceId,
      name: 'Operating Expense (Taxable)',
      bas_code: '1B',
      description: 'Repairs & management fees with GST',
      is_active: true,
      created_at: '',
      updated_at: '',
    },
    capitalWorks: {
      id: 'tc-3',
      workspace_id: sampleWorkspaceId,
      name: 'Capital Acquisition (G10)',
      bas_code: 'G10',
      description: 'Capital improvements',
      is_active: true,
      created_at: '',
      updated_at: '',
    },
  };

  // 1. Date Range Resolution Tests
  test.describe('1. Australian Financial Year & Period Resolution', () => {
    test('Should accurately resolve Q1 of FY 2026 (1 Jul 2025 – 30 Sep 2025)', () => {
      const range = resolveBasDateRange(2026, 'Q1');
      expect(range.startDate).toBe('2025-07-01');
      expect(range.endDate).toBe('2025-09-30');
      expect(range.label).toContain('Jul 2025 – Sep 2025');
    });

    test('Should accurately resolve Q2 of FY 2026 (1 Oct 2025 – 31 Dec 2025)', () => {
      const range = resolveBasDateRange(2026, 'Q2');
      expect(range.startDate).toBe('2025-10-01');
      expect(range.endDate).toBe('2025-12-31');
    });

    test('Should accurately resolve Q3 of FY 2026 (1 Jan 2026 – 31 Mar 2026)', () => {
      const range = resolveBasDateRange(2026, 'Q3');
      expect(range.startDate).toBe('2026-01-01');
      expect(range.endDate).toBe('2026-03-31');
    });

    test('Should accurately resolve Q4 of FY 2026 (1 Apr 2026 – 30 Jun 2026)', () => {
      const range = resolveBasDateRange(2026, 'Q4');
      expect(range.startDate).toBe('2026-04-01');
      expect(range.endDate).toBe('2026-06-30');
    });

    test('Should accurately resolve Full Year (FY) of FY 2026 (1 Jul 2025 – 30 Jun 2026)', () => {
      const range = resolveBasDateRange(2026, 'FY');
      expect(range.startDate).toBe('2025-07-01');
      expect(range.endDate).toBe('2026-06-30');
    });
  });

  // 2. GST Math & Extraction Tests
  test.describe('2. Australian GST Math & 1/11th Extraction', () => {
    test('Should extract 1/11th GST from a GST-inclusive amount of $110.00', () => {
      const { net, gst } = calculateGstPortion(110.0, true);
      expect(net).toBe(100.0);
      expect(gst).toBe(10.0);
    });

    test('Should extract 1/11th GST from a GST-inclusive amount of $55.00', () => {
      const { net, gst } = calculateGstPortion(55.0, true);
      expect(net).toBe(50.0);
      expect(gst).toBe(5.0);
    });

    test('Should handle fractional cents and round correctly ($100.00 inclusive)', () => {
      // $100 / 1.1 = $90.9090... -> net = $90.91, gst = $9.09
      const { net, gst } = calculateGstPortion(100.0, true);
      expect(net).toBe(90.91);
      expect(gst).toBe(9.09);
      expect(net + gst).toBe(100.0);
    });

    test('Should return 0 GST for non-inclusive / GST-free transactions', () => {
      const { net, gst } = calculateGstPortion(2500.0, false);
      expect(net).toBe(2500.0);
      expect(gst).toBe(0.0);
    });

    test('Should honor explicit custom GST amount when provided', () => {
      const { net, gst } = calculateGstPortion(500.0, false, 45.45);
      expect(gst).toBe(45.45);
      expect(net).toBe(454.55);
    });
  });

  // 3. BAS Worksheet Aggregation Tests
  test.describe('3. BAS Worksheet Aggregation Engine', () => {
    const mockTransactions: TransactionDTO[] = [
      // Commercial Rent Income 1: $11,000 incl GST in Q1 FY2026 (Aug 2025)
      {
        id: 'tx-inc-1',
        amount: 11000.0,
        transaction_type: 'income',
        transaction_category_id: 'cat-inc-rent',
        transaction_date: '2025-08-15',
        status: 'completed',
        property_id: sampleProperty1Id,
        workspace_id: sampleWorkspaceId,
        payment_method: 'bank_transfer',
        description: 'Commercial Office Rent',
        reference: 'INV-2025-08',
        vendor_name: null,
        notes: null,
        tenant_id: null,
        lease_id: null,
        invoice_id: null,
        created_by: null,
        created_at: '2025-08-15T00:00:00Z',
        updated_at: '2025-08-15T00:00:00Z',
        gst_inclusive: true,
        gst_amount: 1000.0,
        tax_classification_id: 'tc-1',
        tax_classification: mockTaxClassifications.taxableSales,
        category: {
          id: 'cat-inc-rent',
          transaction_type: 'income',
          name: 'Commercial Rent',
          description: null,
          is_active: true,
          created_at: '',
          updated_at: '',
          category_group: {
            id: 'cg-1',
            workspace_id: sampleWorkspaceId,
            name: 'Rental Revenue',
            created_at: '',
            updated_at: '',
          },
        },
        property: {
          id: sampleProperty1Id,
          name: '124 Collins Street (Commercial)',
          gst_enabled: true,
        },
      },
      // Commercial Rent Income 2: $4,400 incl GST in Q1 FY2026 (Sep 2025)
      {
        id: 'tx-inc-2',
        amount: 4400.0,
        transaction_type: 'income',
        transaction_category_id: 'cat-inc-rent',
        transaction_date: '2025-09-10',
        status: 'completed',
        property_id: sampleProperty1Id,
        workspace_id: sampleWorkspaceId,
        payment_method: 'bank_transfer',
        description: 'Car Park Lease Income',
        reference: 'INV-2025-09',
        vendor_name: null,
        notes: null,
        tenant_id: null,
        lease_id: null,
        invoice_id: null,
        created_by: null,
        created_at: '2025-09-10T00:00:00Z',
        updated_at: '2025-09-10T00:00:00Z',
        gst_inclusive: true,
        gst_amount: 400.0,
        tax_classification_id: 'tc-1',
        tax_classification: mockTaxClassifications.taxableSales,
        category: {
          id: 'cat-inc-rent',
          transaction_type: 'income',
          name: 'Commercial Rent',
          description: null,
          is_active: true,
          created_at: '',
          updated_at: '',
          category_group: {
            id: 'cg-1',
            workspace_id: sampleWorkspaceId,
            name: 'Rental Revenue',
            created_at: '',
            updated_at: '',
          },
        },
        property: {
          id: sampleProperty1Id,
          name: '124 Collins Street (Commercial)',
          gst_enabled: true,
        },
      },
      // Operating Expense: $1,100 incl GST in Q1 FY2026 (Aug 2025)
      {
        id: 'tx-exp-1',
        amount: 1100.0,
        transaction_type: 'expense',
        transaction_category_id: 'cat-exp-repairs',
        transaction_date: '2025-08-20',
        status: 'completed',
        property_id: sampleProperty1Id,
        workspace_id: sampleWorkspaceId,
        payment_method: 'bank_transfer',
        description: 'HVAC Air Conditioning Service',
        reference: 'BILL-8812',
        vendor_name: 'Metro Climate Air',
        notes: null,
        tenant_id: null,
        lease_id: null,
        invoice_id: null,
        created_by: null,
        created_at: '2025-08-20T00:00:00Z',
        updated_at: '2025-08-20T00:00:00Z',
        gst_inclusive: true,
        gst_amount: 100.0,
        tax_classification_id: 'tc-2',
        tax_classification: mockTaxClassifications.operatingExpense,
        category: {
          id: 'cat-exp-repairs',
          transaction_type: 'expense',
          name: 'Repairs & Maintenance',
          description: null,
          is_active: true,
          created_at: '',
          updated_at: '',
          category_group: {
            id: 'cg-2',
            workspace_id: sampleWorkspaceId,
            name: 'Operating Expenses',
            created_at: '',
            updated_at: '',
          },
        },
        property: {
          id: sampleProperty1Id,
          name: '124 Collins Street (Commercial)',
          gst_enabled: true,
        },
      },
      // Capital Acquisition (G10): $5,500 incl GST in Q1 FY2026 (Sep 2025)
      {
        id: 'tx-exp-cap',
        amount: 5500.0,
        transaction_type: 'expense',
        transaction_category_id: 'cat-exp-capital',
        transaction_date: '2025-09-25',
        status: 'completed',
        property_id: sampleProperty1Id,
        workspace_id: sampleWorkspaceId,
        payment_method: 'bank_transfer',
        description: 'New Security Access System',
        reference: 'CAP-001',
        vendor_name: 'SecurePro Australia',
        notes: null,
        tenant_id: null,
        lease_id: null,
        invoice_id: null,
        created_by: null,
        created_at: '2025-09-25T00:00:00Z',
        updated_at: '2025-09-25T00:00:00Z',
        gst_inclusive: true,
        gst_amount: 500.0,
        tax_classification_id: 'tc-3',
        tax_classification: mockTaxClassifications.capitalWorks,
        category: {
          id: 'cat-exp-capital',
          transaction_type: 'expense',
          name: 'Capital Works',
          description: null,
          is_active: true,
          created_at: '',
          updated_at: '',
          category_group: {
            id: 'cg-3',
            workspace_id: sampleWorkspaceId,
            name: 'Capital Acquisitions',
            created_at: '',
            updated_at: '',
          },
        },
        property: {
          id: sampleProperty1Id,
          name: '124 Collins Street (Commercial)',
          gst_enabled: true,
        },
      },
      // Future Q2 Transaction: Should NOT be in Q1 totals
      {
        id: 'tx-q2-future',
        amount: 3300.0,
        transaction_type: 'income',
        transaction_category_id: 'cat-inc-rent',
        transaction_date: '2025-11-01',
        status: 'completed',
        property_id: sampleProperty1Id,
        workspace_id: sampleWorkspaceId,
        payment_method: 'bank_transfer',
        description: 'November Rent',
        reference: null,
        vendor_name: null,
        notes: null,
        tenant_id: null,
        lease_id: null,
        invoice_id: null,
        created_by: null,
        created_at: '2025-11-01T00:00:00Z',
        updated_at: '2025-11-01T00:00:00Z',
        gst_inclusive: true,
        gst_amount: 300.0,
      },
    ];

    test('Should accurately compute Q1 BAS figures (G1, 1A, 1B, Net GST)', () => {
      const worksheet = calculateBasWorksheet(mockTransactions, mockProperties, {
        year: 2026,
        period: 'Q1',
      });

      // Total Sales (G1) = 11,000 + 4,400 = 15,400
      expect(worksheet.totals.totalSales).toBe(15400.0);

      // GST on Sales (1A) = 1,000 + 400 = 1,400
      expect(worksheet.totals.gstOnSales).toBe(1400.0);

      // Total Purchases = 1,100 + 5,500 = 6,600
      expect(worksheet.totals.totalExpenses).toBe(6600.0);

      // GST on Purchases (1B) = 100 + 500 = 600
      expect(worksheet.totals.gstOnExpenses).toBe(600.0);

      // Net GST Position (1A - 1B) = 1,400 - 600 = 800 (Payable)
      expect(worksheet.totals.netGstPosition).toBe(800.0);

      // Capital Acquisitions (G10) = 5,500
      expect(worksheet.totals.capitalExpensesGross).toBe(5500.0);

      // Transactions count
      expect(worksheet.totalTransactionsCount).toBe(4);
    });

    test('Should format details records correctly with BAS codes and net values', () => {
      const details = formatBasDetailsTransactions(mockTransactions, {
        year: 2026,
        period: 'Q1',
      });

      expect(details.length).toBe(4);
      expect(details[0].basCode).toBeDefined();
      expect(details.every((d) => d.netAmount + d.gstAmount === d.amount)).toBe(true);
    });

    test('Should generate ATO BAS guidance field mappings', () => {
      const worksheet = calculateBasWorksheet(mockTransactions, mockProperties, {
        year: 2026,
        period: 'Q1',
      });

      const guidance = buildBasGuidance(worksheet);
      expect(guidance.length).toBeGreaterThanOrEqual(4);

      const g1Field = guidance.find((g) => g.basField.includes('G1'));
      expect(g1Field).toBeDefined();
      expect(g1Field?.amount).toBe(15400.0);

      const netField = guidance.find((g) => g.basField.includes('Net GST'));
      expect(netField?.amount).toBe(800.0);
    });
  });

  // 4. PDF Generation Engine Tests
  test.describe('4. Accountant PDF Report Generation', () => {
    test('Should generate a valid PDF byte array for download', async () => {
      const worksheet = calculateBasWorksheet([], mockProperties, {
        year: 2026,
        period: 'Q1',
      });

      const pdfBytes = await PdfBasReportAdapter.generate({
        worksheet,
        transactions: [],
        workspaceName: 'Test Commercial Portfolio',
      });

      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(1000); // Standard A4 PDF size
    });
  });
});
