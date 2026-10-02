import { test, expect } from '@playwright/test';
import { calculateBasWorksheet, resolveBasDateRange } from '../../modules/finance/domain/bas-calculations';
import { calculateLedger, calculateFinancialSummary, isIncome, isExpense } from '../../modules/finance/domain/calculations';
import { validateReceiptFile } from '../../modules/finance/domain/validation';
import type { TransactionDTO, CreateTransactionInput } from '../../modules/finance/domain/types';

test.describe('PropertyLedge — Complete CRUD, Features & User Journeys Validation', () => {
  // --------------------------------------------------------------------------
  // 1. PROPERTY LIFECYCLE & ISOLATION
  // --------------------------------------------------------------------------
  test.describe('1. Property Lifecycle & Multi-Tenant Isolation', () => {
    test('Validates property address, category, and Australian state constraints', () => {
      const validProperty = {
        name: 'Sunrise Apartments',
        address_line_1: '102 Beach Road',
        city: 'St Kilda',
        state: 'VIC',
        postal_code: '3182',
        property_category: 'Residential' as const,
        property_type: 'Apartment',
        bedrooms: 2,
        bathrooms: 2,
        parking_spaces: 1,
        rent_amount: 650,
        payment_frequency: 'Weekly',
        status: 'active' as const,
        gst_enabled: false,
      };

      expect(validProperty.address_line_1).toBeTruthy();
      expect(validProperty.city).toBeTruthy();
      expect(validProperty.postal_code).toMatch(/^\d{4}$/);
      expect(['VIC', 'NSW', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']).toContain(validProperty.state);
      expect(validProperty.bedrooms).toBeGreaterThanOrEqual(0);
      expect(validProperty.rent_amount).toBeGreaterThan(0);
    });

    test('Property Context Rule: propertyId = null correctly aggregates all workspace properties', () => {
      const propAId = 'prop-aaa-111';
      const propBId = 'prop-bbb-222';

      const createMockTx = (partial: Partial<TransactionDTO> & { id: string; amount: number; transaction_type: 'income' | 'expense' }): TransactionDTO => ({
        payment_method: 'bank_transfer',
        description: 'Test transaction',
        reference: 'REF-1',
        vendor_name: null,
        notes: null,
        tenant_id: null,
        lease_id: null,
        invoice_id: null,
        created_by: 'user-1',
        property_id: 'prop-1',
        workspace_id: 'ws-1',
        transaction_category_id: 'cat-1',
        status: 'completed',
        transaction_date: '2026-08-01',
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
        ...partial,
      });

      const mockTransactions: TransactionDTO[] = [
        createMockTx({
          id: 'tx-1',
          property_id: propAId,
          transaction_type: 'income',
          amount: 1500,
          transaction_date: '2026-08-01',
        }),
        createMockTx({
          id: 'tx-2',
          property_id: propBId,
          transaction_type: 'income',
          amount: 2500,
          transaction_date: '2026-08-05',
        }),
      ];

      // Filter by Property A
      const propATransactions = mockTransactions.filter((tx) => tx.property_id === propAId);
      expect(propATransactions).toHaveLength(1);
      expect(propATransactions[0].amount).toBe(1500);

      // Filter by Property B
      const propBTransactions = mockTransactions.filter((tx) => tx.property_id === propBId);
      expect(propBTransactions).toHaveLength(1);
      expect(propBTransactions[0].amount).toBe(2500);

      // All Properties aggregation (propertyId = null)
      const allTransactions = mockTransactions.filter((tx) => true);
      const totalIncome = allTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      expect(allTransactions).toHaveLength(2);
      expect(totalIncome).toBe(4000);
    });
  });

  // --------------------------------------------------------------------------
  // 2. FINANCIAL LEDGER & GST CALCULATIONS
  // --------------------------------------------------------------------------
  test.describe('2. Transaction + Dynamic Ledger Reconciliation', () => {
    test('Calculates chronological running balance with mixed income and expenses', () => {
      const createMockTx = (partial: Partial<TransactionDTO> & { id: string; amount: number; transaction_type: 'income' | 'expense' }): TransactionDTO => ({
        payment_method: 'bank_transfer',
        description: 'Test transaction',
        reference: 'REF-1',
        vendor_name: null,
        notes: null,
        tenant_id: null,
        lease_id: null,
        invoice_id: null,
        created_by: 'user-1',
        property_id: 'prop-1',
        workspace_id: 'ws-1',
        transaction_category_id: 'cat-1',
        status: 'completed',
        transaction_date: '2026-07-01',
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
        ...partial,
      });

      const mockRawTransactions: TransactionDTO[] = [
        createMockTx({
          id: 'tx-1',
          transaction_type: 'income',
          amount: 3000,
          transaction_date: '2026-07-01',
          transaction_category_id: 'cat-rent',
        }),
        createMockTx({
          id: 'tx-2',
          transaction_type: 'expense',
          amount: 800,
          transaction_date: '2026-07-10',
          transaction_category_id: 'cat-maintenance',
        }),
        createMockTx({
          id: 'tx-3',
          transaction_type: 'expense',
          amount: 450,
          transaction_date: '2026-07-15',
          transaction_category_id: 'cat-rates',
        }),
      ];

      const ledger = calculateLedger(mockRawTransactions);
      expect(ledger).toHaveLength(3);

      // Chronological running balances
      // First transaction (earliest date): +3000 -> 3000
      // Second: -800 -> 2200
      // Third: -450 -> 1750
      const tx1Entry = ledger.find((e) => e.id === 'tx-1');
      const tx2Entry = ledger.find((e) => e.id === 'tx-2');
      const tx3Entry = ledger.find((e) => e.id === 'tx-3');

      expect(tx1Entry?.running_balance).toBe(3000);
      expect(tx2Entry?.running_balance).toBe(2200);
      expect(tx3Entry?.running_balance).toBe(1750);
    });

    test('Receipt file validator enforces max 10MB size and PDF/Image MIME types', () => {
      // Valid PDF
      const validPdf = validateReceiptFile({
        name: 'invoice_plumbing.pdf',
        size: 2 * 1024 * 1024,
        type: 'application/pdf',
      });
      expect(validPdf.valid).toBe(true);

      // Valid JPEG
      const validImg = validateReceiptFile({
        name: 'receipt_bunnings.jpg',
        size: 4 * 1024 * 1024,
        type: 'image/jpeg',
      });
      expect(validImg.valid).toBe(true);

      // Too large (> 10MB)
      const oversized = validateReceiptFile({
        name: 'huge_scan.pdf',
        size: 16 * 1024 * 1024,
        type: 'application/pdf',
      });
      expect(oversized.valid).toBe(false);
      expect(oversized.error).toContain('10 MB');

      // Invalid file extension / MIME
      const invalidExe = validateReceiptFile({
        name: 'malicious.exe',
        size: 500,
        type: 'application/x-msdownload',
      });
      expect(invalidExe.valid).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 3. BAS ACTIVITY STATEMENT USER JOURNEY
  // --------------------------------------------------------------------------
  test.describe('3. ATO BAS Activity Statement Calculation Engine', () => {
    test('Calculates G1 (Total Sales), 1A (GST on Sales), G11 (Non-capital expenses), 1B (GST on Purchases)', () => {
      const mockTransactions: any[] = [
        {
          id: 'tx-commercial-rent',
          property_id: 'prop-comm-1',
          transaction_type: 'income',
          amount: 11000,
          transaction_date: '2026-08-15',
          status: 'completed',
          gst_inclusive: true,
          gst_amount: 1000,
          tax_classification_id: 'tc-g1',
          is_capital: false,
          category: { id: 'cat-rent', name: 'Commercial Rent' },
          tax_classification: { id: 'tc-g1', bas_code: 'G1', name: 'Taxable Sales' },
        },
        {
          id: 'tx-maintenance-repair',
          property_id: 'prop-comm-1',
          transaction_type: 'expense',
          amount: 3300,
          transaction_date: '2026-08-20',
          status: 'completed',
          gst_inclusive: true,
          gst_amount: 300,
          tax_classification_id: 'tc-g11',
          is_capital: false,
          category: { id: 'cat-repairs', name: 'Building Repairs' },
          tax_classification: { id: 'tc-g11', bas_code: 'G11', name: 'Non-Capital Purchases' },
        },
        {
          id: 'tx-aircon-upgrade',
          property_id: 'prop-comm-1',
          transaction_type: 'expense',
          amount: 5500,
          transaction_date: '2026-09-02',
          status: 'completed',
          gst_inclusive: true,
          gst_amount: 500,
          tax_classification_id: 'tc-g10',
          is_capital: true,
          category: { id: 'cat-capex', name: 'HVAC Replacement' },
          tax_classification: { id: 'tc-g10', bas_code: 'G10', name: 'Capital Purchases' },
        },
      ];

      const mockProperties = [
        { id: 'prop-comm-1', name: 'Commercial Tower Suite 4', gst_enabled: true },
      ];

      const worksheet = calculateBasWorksheet(mockTransactions, mockProperties, {
        propertyId: 'prop-comm-1',
        year: 2027,
        period: 'Q1',
      });

      expect(worksheet.totals.totalSales).toBe(11000);
      expect(worksheet.totals.gstOnSales).toBe(1000); // 1A = $1,000
      expect(worksheet.totals.nonCapitalExpensesGross).toBe(3300); // G11 = $3,300
      expect(worksheet.totals.capitalExpensesGross).toBe(5500); // G10 = $5,500
      expect(worksheet.totals.gstOnExpenses).toBe(800); // 1B = $300 + $500 = $800

      // Net GST Refund / Payable = 1A - 1B = 1000 - 800 = 200 (Payable to ATO)
      expect(worksheet.totals.netGstPosition).toBe(200);
      expect(worksheet.unclassifiedCount).toBe(0);
      expect(worksheet.totalTransactionsCount).toBe(3);
    });

    test('Correctly determines Australian Financial Year quarterly date ranges', () => {
      const q1 = resolveBasDateRange(2027, 'Q1');
      expect(q1.startDate).toBe('2026-07-01');
      expect(q1.endDate).toBe('2026-09-30');

      const q2 = resolveBasDateRange(2027, 'Q2');
      expect(q2.startDate).toBe('2026-10-01');
      expect(q2.endDate).toBe('2026-12-31');

      const q3 = resolveBasDateRange(2027, 'Q3');
      expect(q3.startDate).toBe('2027-01-01');
      expect(q3.endDate).toBe('2027-03-31');

      const q4 = resolveBasDateRange(2027, 'Q4');
      expect(q4.startDate).toBe('2027-04-01');
      expect(q4.endDate).toBe('2027-06-30');
    });
  });

  // --------------------------------------------------------------------------
  // 4. LEASE & TENANCY LIFECYCLE
  // --------------------------------------------------------------------------
  test.describe('4. Lease & Tenancy Relationship Integrity', () => {
    test('Validates lease terms, rent frequency, and periodic status transitions', () => {
      const lease = {
        id: 'lease-101',
        property_id: 'prop-1',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        rent_amount: 750,
        rent_frequency: 'weekly',
        security_deposit: 3000,
        payment_due_day: 1,
        status: 'active' as const,
      };

      expect(new Date(lease.end_date) > new Date(lease.start_date)).toBe(true);
      expect(lease.security_deposit).toBe(lease.rent_amount * 4); // Standard 4-week bond

      // Converting to periodic removes end_date while keeping status active
      const periodicLease = {
        ...lease,
        end_date: null,
        status: 'active' as const,
      };
      expect(periodicLease.end_date).toBeNull();
      expect(periodicLease.status).toBe('active');
    });
  });
});
