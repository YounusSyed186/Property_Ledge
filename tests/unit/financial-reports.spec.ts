import { test, expect } from '@playwright/test';
import {
  resolveFilterDateRange,
} from '../../lib/finance/reporting-service';
import {
  sanitizeCsvCell,
  formatExportCurrency,
  generateFinanceCsv,
  generateFinancePdf,
} from '../../lib/finance/export-service';
import {
  getFinancialYearRange,
  getFinancialYearMonths,
  getFinancialYearLabel,
} from '../../lib/finance/financial-year';
import { TransactionDTO } from '../../modules/finance/domain/types';

test.describe('Financial Reporting & Export Engine Unit Tests', () => {
  test('1. resolveFilterDateRange accurately calculates boundaries for FY and custom ranges', () => {
    // Standard FY26 filter
    const fy26Range = resolveFilterDateRange({ financialYear: '2026' });
    expect(fy26Range.start).toBe('2025-07-01');
    expect(fy26Range.end).toBe('2026-06-30');

    // Standard FY27 filter
    const fy27Range = resolveFilterDateRange({ financialYear: '2027' });
    expect(fy27Range.start).toBe('2026-07-01');
    expect(fy27Range.end).toBe('2027-06-30');

    // Custom date range filter takes precedence over FY
    const customRange = resolveFilterDateRange({
      financialYear: '2026',
      dateFrom: '2026-01-01',
      dateTo: '2026-03-31',
    });
    expect(customRange.start).toBe('2026-01-01');
    expect(customRange.end).toBe('2026-03-31');
  });

  test('2. CSV Formula Injection Sanitization (Escaping =, +, -, @)', () => {
    // Injection vectors must be prepended with a single quote
    expect(sanitizeCsvCell('=1+1')).toBe(`"'=1+1"`);
    expect(sanitizeCsvCell('+cmd|/C calc')).toBe(`"'+cmd|/C calc"`);
    expect(sanitizeCsvCell('-500')).toBe(`"'-500"`);
    expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe(`"'@SUM(A1:A10)"`);
    expect(sanitizeCsvCell('\tmalicious_tab')).toBe(`"'\tmalicious_tab"`);

    // Standard strings and double quote escaping
    expect(sanitizeCsvCell('Normal Description')).toBe(`"Normal Description"`);
    expect(sanitizeCsvCell('Plumbing "Fast" Repairs')).toBe(`"Plumbing ""Fast"" Repairs"`);
    expect(sanitizeCsvCell(null)).toBe(`""`);
    expect(sanitizeCsvCell(undefined)).toBe(`""`);
    expect(sanitizeCsvCell(1250.5)).toBe(`"1250.5"`);
  });

  test('3. Export Currency Formatting', () => {
    expect(formatExportCurrency(1500)).toBe('1500.00');
    expect(formatExportCurrency(245.891)).toBe('245.89');
    expect(formatExportCurrency(0)).toBe('0.00');
    expect(formatExportCurrency(null)).toBe('0.00');
    expect(formatExportCurrency(undefined)).toBe('0.00');
  });

  test('4. Full CSV Generation with Metadata Header, Summary KPIs, and Data Rows', () => {
    const mockTransactions: TransactionDTO[] = [
      {
        id: 'tx-1',
        workspace_id: 'ws-1',
        property_id: 'prop-1',
        transaction_type: 'income',
        amount: 2500,
        gst_amount: 0,
        gst_inclusive: false,
        transaction_date: '2025-08-15',
        description: 'Rent received',
        status: 'completed',
        created_at: '2025-08-15T00:00:00Z',
        updated_at: '2025-08-15T00:00:00Z',
        property: { id: 'prop-1', name: '10 Ocean Street', address_line_1: '10 Ocean Street' },
        category: { id: 'cat-1', name: 'Rental Income' },
        tax_classification: { id: 'tax-1', name: 'Standard Rent' },
      },
      {
        id: 'tx-2',
        workspace_id: 'ws-1',
        property_id: 'prop-1',
        transaction_type: 'expense',
        amount: 440,
        gst_amount: 40,
        gst_inclusive: true,
        transaction_date: '2025-09-02',
        description: 'Emergency plumbing repairs',
        vendor_name: 'Fast Plumbers Pty Ltd',
        status: 'completed',
        created_at: '2025-09-02T00:00:00Z',
        updated_at: '2025-09-02T00:00:00Z',
        property: { id: 'prop-1', name: '10 Ocean Street', address_line_1: '10 Ocean Street' },
        category: { id: 'cat-2', name: 'Repairs & Maintenance' },
        tax_classification: { id: 'tax-2', name: 'Immediate Deduction (100%)' },
      },
    ] as unknown as TransactionDTO[];

    const filters = { workspaceId: 'ws-1', financialYear: '2026' };
    const kpis = {
      'Total Records': 2,
      'Total Income': 2500,
      'Total Expenses': 440,
      'Net Profit': 2060,
    };

    const csv = generateFinanceCsv('Overview Report', mockTransactions, filters, kpis);

    // Verify Metadata header lines
    expect(csv).toContain('"PropertyLedge Financial Report","Overview Report"');
    expect(csv).toContain('"Financial Year","FY26 (01 Jul 2025 – 30 Jun 2026)"');
    expect(csv).toContain('"Period","2025-07-01 to 2026-06-30"');
    expect(csv).toContain('"Total Records","2"');

    // Verify KPI summary
    expect(csv).toContain('"Total Income","2500.00"');
    expect(csv).toContain('"Net Profit","2060.00"');

    // Verify Column Headers & Data Rows
    expect(csv).toContain('"Date","Type","Category","Tax Classification","Description","Vendor / Payee","Property","Amount (AUD)","GST (AUD)"');
    expect(csv).toContain('"2025-08-15","INCOME","Rental Income","Standard Rent","Rent received"');
    expect(csv).toContain('"2025-09-02","EXPENSE","Repairs & Maintenance","Immediate Deduction (100%)","Emergency plumbing repairs","Fast Plumbers Pty Ltd"');
  });

  test('5. PDF Report Document Generation', async () => {
    const mockTransactions: TransactionDTO[] = [
      {
        id: 'tx-1',
        workspace_id: 'ws-1',
        property_id: 'prop-1',
        transaction_type: 'income',
        amount: 3200,
        gst_amount: 0,
        gst_inclusive: false,
        transaction_date: '2025-10-01',
        description: 'Monthly commercial lease payment',
        status: 'completed',
        created_at: '2025-10-01T00:00:00Z',
        updated_at: '2025-10-01T00:00:00Z',
        property: { id: 'prop-1', name: 'Suite 401 Tower', address_line_1: 'Suite 401 Tower' },
        category: { id: 'cat-1', name: 'Commercial Rent' },
      },
    ] as unknown as TransactionDTO[];

    const pdfBytes = await generateFinancePdf(
      'Income Report',
      mockTransactions,
      { workspaceId: 'ws-1', financialYear: '2026' },
      { 'Total Income': 3200, 'Transactions Count': 1 }
    );

    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(1000);
    // PDF Magic bytes %PDF-
    const header = Buffer.from(pdfBytes.slice(0, 5)).toString('utf-8');
    expect(header).toBe('%PDF-');
  });
});
