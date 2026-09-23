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
  TaxClassificationDTO,
  CategoryGroupDTO,
} from '../../modules/finance/domain/types';
import { PdfBasReportAdapter } from '../../lib/pdf/pdf-bas-report-adapter';

test.describe('Full User Journey Suite: Australian GST Tracking & BAS Activity Statement', () => {
  const workspaceId = 'ws-test-journey-001';
  const commercialPropertyId = 'prop-commercial-001';
  const residentialPropertyId = 'prop-residential-002';

  const mockProperties = [
    {
      id: commercialPropertyId,
      name: '120 Collins St, Melbourne VIC (Commercial)',
      address_line_1: '120 Collins St',
      city: 'Melbourne',
      state: 'VIC',
      gst_enabled: true,
    },
    {
      id: residentialPropertyId,
      name: '15 Ocean Ave, Manly NSW (Residential)',
      address_line_1: '15 Ocean Ave',
      city: 'Manly',
      state: 'NSW',
      gst_enabled: false,
    },
  ];

  const mockCategoryGroups: CategoryGroupDTO[] = [
    { id: 'cg-1', workspace_id: workspaceId, name: 'Rental Income', description: 'Rental revenue', created_at: '', updated_at: '' },
    { id: 'cg-2', workspace_id: workspaceId, name: 'Operating Expenses', description: 'Operational costs', created_at: '', updated_at: '' },
    { id: 'cg-3', workspace_id: workspaceId, name: 'Repairs & Maintenance', description: 'Property repairs', created_at: '', updated_at: '' },
    { id: 'cg-4', workspace_id: workspaceId, name: 'Capital Works & Acquisitions', description: 'CapEx & improvements', created_at: '', updated_at: '' },
    { id: 'cg-5', workspace_id: workspaceId, name: 'Statutory Levies & Rates', description: 'Council & water rates', created_at: '', updated_at: '' },
  ];

  const mockTaxClassifications: Record<string, TaxClassificationDTO> = {
    taxableSales: {
      id: 'tc-taxable-sales',
      workspace_id: workspaceId,
      name: 'Taxable Sales (10% GST)',
      bas_code: 'G1',
      description: 'Standard commercial rent',
      is_active: true,
      created_at: '',
      updated_at: '',
    },
    gstFreeIncome: {
      id: 'tc-gst-free-income',
      workspace_id: workspaceId,
      name: 'GST-Free Rental Income',
      bas_code: 'G1',
      description: 'Residential rent',
      is_active: true,
      created_at: '',
      updated_at: '',
    },
    taxableExpense: {
      id: 'tc-taxable-expense',
      workspace_id: workspaceId,
      name: 'Operating Expense (Taxable)',
      bas_code: '1B',
      description: 'Repairs & maintenance with GST',
      is_active: true,
      created_at: '',
      updated_at: '',
    },
    capitalWorks: {
      id: 'tc-capital-works',
      workspace_id: workspaceId,
      name: 'Capital Acquisition (G10)',
      bas_code: 'G10',
      description: 'Capital improvements',
      is_active: true,
      created_at: '',
      updated_at: '',
    },
    gstFreeExpense: {
      id: 'tc-gst-free-expense',
      workspace_id: workspaceId,
      name: 'GST-Free / Non-Taxable Expense',
      bas_code: null,
      description: 'Council rates and water access',
      is_active: true,
      created_at: '',
      updated_at: '',
    },
  };

  // Full Quarter 1 Ledger Transactions across commercial & residential
  const fullQuarterTransactions: TransactionDTO[] = [
    // 1. Commercial Rent #1 (July 2025): $22,000 incl GST ($20,000 net + $2,000 GST) -> Box G1, 1A
    {
      id: 'tx-01',
      amount: 22000.0,
      transaction_type: 'income',
      transaction_category_id: 'cat-rent',
      transaction_date: '2025-07-05',
      status: 'completed',
      property_id: commercialPropertyId,
      workspace_id: workspaceId,
      payment_method: 'direct_debit',
      description: 'Commercial Office Rent - Unit 1',
      reference: 'INV-2025-07-01',
      vendor_name: 'Acme Corp Pty Ltd',
      notes: null,
      tenant_id: null,
      lease_id: null,
      invoice_id: null,
      created_by: null,
      created_at: '2025-07-05T00:00:00Z',
      updated_at: '2025-07-05T00:00:00Z',
      gst_inclusive: true,
      gst_amount: 2000.0,
      tax_classification_id: mockTaxClassifications.taxableSales.id,
      tax_classification: mockTaxClassifications.taxableSales,
      category: {
        id: 'cat-rent',
        transaction_type: 'income',
        name: 'Commercial Rent',
        description: null,
        is_active: true,
        created_at: '',
        updated_at: '',
        category_group: mockCategoryGroups[0],
      },
      property: mockProperties[0],
    },
    // 2. Commercial Rent #2 (August 2025): $11,000 incl GST ($10,000 net + $1,000 GST) -> Box G1, 1A
    {
      id: 'tx-02',
      amount: 11000.0,
      transaction_type: 'income',
      transaction_category_id: 'cat-rent',
      transaction_date: '2025-08-05',
      status: 'completed',
      property_id: commercialPropertyId,
      workspace_id: workspaceId,
      payment_method: 'direct_debit',
      description: 'Commercial Office Rent - Unit 2',
      reference: 'INV-2025-08-01',
      vendor_name: 'TechFlow Australia',
      notes: null,
      tenant_id: null,
      lease_id: null,
      invoice_id: null,
      created_by: null,
      created_at: '2025-08-05T00:00:00Z',
      updated_at: '2025-08-05T00:00:00Z',
      gst_inclusive: true,
      gst_amount: 1000.0,
      tax_classification_id: mockTaxClassifications.taxableSales.id,
      tax_classification: mockTaxClassifications.taxableSales,
      category: {
        id: 'cat-rent',
        transaction_type: 'income',
        name: 'Commercial Rent',
        description: null,
        is_active: true,
        created_at: '',
        updated_at: '',
        category_group: mockCategoryGroups[0],
      },
      property: mockProperties[0],
    },
    // 3. Residential Rent (August 2025): $3,500 GST-free -> Box G1 (Total Sales), 0 GST
    {
      id: 'tx-03',
      amount: 3500.0,
      transaction_type: 'income',
      transaction_category_id: 'cat-res-rent',
      transaction_date: '2025-08-10',
      status: 'completed',
      property_id: residentialPropertyId,
      workspace_id: workspaceId,
      payment_method: 'bank_transfer',
      description: 'Residential Apartment Rent',
      reference: 'RENT-AUG',
      vendor_name: null,
      notes: null,
      tenant_id: null,
      lease_id: null,
      invoice_id: null,
      created_by: null,
      created_at: '2025-08-10T00:00:00Z',
      updated_at: '2025-08-10T00:00:00Z',
      gst_inclusive: false,
      gst_amount: 0.0,
      tax_classification_id: mockTaxClassifications.gstFreeIncome.id,
      tax_classification: mockTaxClassifications.gstFreeIncome,
      category: {
        id: 'cat-res-rent',
        transaction_type: 'income',
        name: 'Residential Rent',
        description: null,
        is_active: true,
        created_at: '',
        updated_at: '',
        category_group: mockCategoryGroups[0],
      },
      property: mockProperties[1],
    },
    // 4. Commercial Repairs (July 2025): $2,200 incl GST ($2,000 net + $200 GST) -> Box 1B
    {
      id: 'tx-04',
      amount: 2200.0,
      transaction_type: 'expense',
      transaction_category_id: 'cat-repairs',
      transaction_date: '2025-07-20',
      status: 'completed',
      property_id: commercialPropertyId,
      workspace_id: workspaceId,
      payment_method: 'credit_card',
      description: 'Lift Maintenance & Safety Inspection',
      reference: 'EXP-LIFT-991',
      vendor_name: 'Schindler Lifts Australia',
      notes: null,
      tenant_id: null,
      lease_id: null,
      invoice_id: null,
      created_by: null,
      created_at: '2025-07-20T00:00:00Z',
      updated_at: '2025-07-20T00:00:00Z',
      gst_inclusive: true,
      gst_amount: 200.0,
      tax_classification_id: mockTaxClassifications.taxableExpense.id,
      tax_classification: mockTaxClassifications.taxableExpense,
      category: {
        id: 'cat-repairs',
        transaction_type: 'expense',
        name: 'Repairs & Maintenance',
        description: null,
        is_active: true,
        created_at: '',
        updated_at: '',
        category_group: mockCategoryGroups[2],
      },
      property: mockProperties[0],
    },
    // 5. Capital Works (September 2025): $8,800 incl GST ($8,000 net + $800 GST) -> Box G10 & 1B
    {
      id: 'tx-05',
      amount: 8800.0,
      transaction_type: 'expense',
      transaction_category_id: 'cat-capital',
      transaction_date: '2025-09-15',
      status: 'completed',
      property_id: commercialPropertyId,
      workspace_id: workspaceId,
      payment_method: 'bank_transfer',
      description: 'Solar Inverter System Installation',
      reference: 'SOLAR-2025',
      vendor_name: 'CleanEnergy Direct',
      notes: null,
      tenant_id: null,
      lease_id: null,
      invoice_id: null,
      created_by: null,
      created_at: '2025-09-15T00:00:00Z',
      updated_at: '2025-09-15T00:00:00Z',
      gst_inclusive: true,
      gst_amount: 800.0,
      tax_classification_id: mockTaxClassifications.capitalWorks.id,
      tax_classification: mockTaxClassifications.capitalWorks,
      category: {
        id: 'cat-capital',
        transaction_type: 'expense',
        name: 'Capital Acquisitions',
        description: null,
        is_active: true,
        created_at: '',
        updated_at: '',
        category_group: mockCategoryGroups[3],
      },
      property: mockProperties[0],
    },
    // 6. Council Rates (August 2025): $1,450 GST-free -> 0 GST
    {
      id: 'tx-06',
      amount: 1450.0,
      transaction_type: 'expense',
      transaction_category_id: 'cat-council',
      transaction_date: '2025-08-28',
      status: 'completed',
      property_id: commercialPropertyId,
      workspace_id: workspaceId,
      payment_method: 'bpay',
      description: 'City of Melbourne Q1 Rates Notice',
      reference: 'RATE-2025-Q1',
      vendor_name: 'City of Melbourne',
      notes: null,
      tenant_id: null,
      lease_id: null,
      invoice_id: null,
      created_by: null,
      created_at: '2025-08-28T00:00:00Z',
      updated_at: '2025-08-28T00:00:00Z',
      gst_inclusive: false,
      gst_amount: 0.0,
      tax_classification_id: mockTaxClassifications.gstFreeExpense.id,
      tax_classification: mockTaxClassifications.gstFreeExpense,
      category: {
        id: 'cat-council',
        transaction_type: 'expense',
        name: 'Council Rates & Water',
        description: null,
        is_active: true,
        created_at: '',
        updated_at: '',
        category_group: mockCategoryGroups[4],
      },
      property: mockProperties[0],
    },
  ];

  test('Journey 1: GST 1/11th Math & Calculation Precision', () => {
    // Exact 10%
    const standard = calculateGstPortion(22000.0, true);
    expect(standard.net).toBe(20000.0);
    expect(standard.gst).toBe(2000.0);

    // Non-inclusive
    const nonIncl = calculateGstPortion(1450.0, false);
    expect(nonIncl.net).toBe(1450.0);
    expect(nonIncl.gst).toBe(0.0);

    // Fractional cents rounding
    const fraction = calculateGstPortion(99.95, true);
    expect(fraction.net).toBe(90.86);
    expect(fraction.gst).toBe(9.09);
    expect(fraction.net + fraction.gst).toBe(99.95);
  });

  test('Journey 2: Portfolio-Wide (All Properties) Q1 BAS Reconciliation', () => {
    const worksheet = calculateBasWorksheet(fullQuarterTransactions, mockProperties, {
      year: 2026,
      period: 'Q1',
      propertyId: null, // All Properties
    });

    // Total Sales (G1) = 22,000 (Commercial #1) + 11,000 (Commercial #2) + 3,500 (Residential) = $36,500.00
    expect(worksheet.totals.totalSales).toBe(36500.0);

    // GST on Sales (1A) = 2,000 + 1,000 + 0 = $3,000.00
    expect(worksheet.totals.gstOnSales).toBe(3000.0);

    // Total Expenses = 2,200 (Repairs) + 8,800 (Solar CapEx) + 1,450 (Council Rates) = $12,450.00
    expect(worksheet.totals.totalExpenses).toBe(12450.0);

    // GST on Purchases (1B) = 200 (Repairs) + 800 (Solar CapEx) + 0 (Rates) = $1,000.00
    expect(worksheet.totals.gstOnExpenses).toBe(1000.0);

    // Net GST Position (1A - 1B) = 3,000 - 1,000 = $2,000.00 (Net GST Payable to ATO)
    expect(worksheet.totals.netGstPosition).toBe(2000.0);

    // Capital Works / Acquisitions (G10) = $8,800.00
    expect(worksheet.totals.capitalExpensesGross).toBe(8800.0);

    // Total Transactions Processed
    expect(worksheet.totalTransactionsCount).toBe(6);
    expect(worksheet.unclassifiedCount).toBe(0);
  });

  test('Journey 3: Single-Property Filtered BAS Reconciliation (Commercial Only)', () => {
    const worksheet = calculateBasWorksheet(fullQuarterTransactions, mockProperties, {
      year: 2026,
      period: 'Q1',
      propertyId: commercialPropertyId,
    });

    expect(worksheet.propertyName).toBe('120 Collins St, Melbourne VIC (Commercial)');

    // Commercial Total Sales (G1) = 22,000 + 11,000 = $33,000.00
    expect(worksheet.totals.totalSales).toBe(33000.0);

    // Commercial GST on Sales (1A) = $3,000.00
    expect(worksheet.totals.gstOnSales).toBe(3000.0);

    // Commercial GST on Purchases (1B) = 200 + 800 = $1,000.00
    expect(worksheet.totals.gstOnExpenses).toBe(1000.0);

    // Net GST = $2,000.00
    expect(worksheet.totals.netGstPosition).toBe(2000.0);
  });

  test('Journey 4: Category Breakdown Integrity & BAS Code Annotations', () => {
    const worksheet = calculateBasWorksheet(fullQuarterTransactions, mockProperties, {
      year: 2026,
      period: 'Q1',
    });

    // Income Category Breakdown
    expect(worksheet.incomeByCategory.length).toBe(2);
    const commRent = worksheet.incomeByCategory.find((c) => c.categoryName === 'Commercial Rent');
    expect(commRent).toBeDefined();
    expect(commRent?.gross).toBe(33000.0);
    expect(commRent?.gst).toBe(3000.0);
    expect(commRent?.net).toBe(30000.0);
    expect(commRent?.basCode).toBe('G1');

    // Expense Category Breakdown
    expect(worksheet.expenseByCategory.length).toBe(3);
    const solarCapEx = worksheet.expenseByCategory.find((c) => c.categoryName === 'Capital Acquisitions');
    expect(solarCapEx).toBeDefined();
    expect(solarCapEx?.gross).toBe(8800.0);
    expect(solarCapEx?.gst).toBe(800.0);
    expect(solarCapEx?.net).toBe(8000.0);
    expect(solarCapEx?.basCode).toBe('G10');
  });

  test('Journey 5: Audit Trail Details Formatting & Ledger Linking', () => {
    const details = formatBasDetailsTransactions(fullQuarterTransactions, {
      year: 2026,
      period: 'Q1',
    });

    expect(details.length).toBe(6);

    // Verify all transactions maintain net + gst = gross mathematical truth
    for (const tx of details) {
      expect(Math.round((tx.netAmount + tx.gstAmount) * 100) / 100).toBe(tx.amount);
      expect(tx.propertyName).toBeDefined();
    }

    // Verify CapEx transaction contains G10 BAS code
    const solarTx = details.find((d) => d.id === 'tx-05');
    expect(solarTx?.basCode).toBe('G10');
    expect(solarTx?.gstAmount).toBe(800.0);
    expect(solarTx?.netAmount).toBe(8000.0);
  });

  test('Journey 6: ATO BAS Form Mapping & Step-by-Step Guidance', () => {
    const worksheet = calculateBasWorksheet(fullQuarterTransactions, mockProperties, {
      year: 2026,
      period: 'Q1',
    });

    const guidance = buildBasGuidance(worksheet);
    expect(guidance.length).toBeGreaterThanOrEqual(4);

    const g1 = guidance.find((g) => g.basField.startsWith('G1'));
    expect(g1).toBeDefined();
    expect(g1?.amount).toBe(36500.0);

    const oneA = guidance.find((g) => g.basField.startsWith('1A'));
    expect(oneA).toBeDefined();
    expect(oneA?.amount).toBe(3000.0);

    const oneB = guidance.find((g) => g.basField.startsWith('1B'));
    expect(oneB).toBeDefined();
    expect(oneB?.amount).toBe(1000.0);

    const netGst = guidance.find((g) => g.basField.includes('Net GST'));
    expect(netGst).toBeDefined();
    expect(netGst?.amount).toBe(2000.0);
  });

  test('Journey 7: Accountant BAS Report PDF Export Execution', async () => {
    const worksheet = calculateBasWorksheet(fullQuarterTransactions, mockProperties, {
      year: 2026,
      period: 'Q1',
    });

    const details = formatBasDetailsTransactions(fullQuarterTransactions, {
      year: 2026,
      period: 'Q1',
    });

    const pdfBuffer = await PdfBasReportAdapter.generate({
      worksheet,
      transactions: details,
      workspaceName: 'PropertyLedge Enterprise Portfolio',
    });

    expect(pdfBuffer).toBeInstanceOf(Uint8Array);
    expect(pdfBuffer.length).toBeGreaterThan(1500);

    // Verify PDF header magic bytes "%PDF-"
    const pdfHeader = Buffer.from(pdfBuffer.slice(0, 5)).toString('utf-8');
    expect(pdfHeader).toBe('%PDF-');
  });

  test('Journey 8: Unclassified Transaction Detection & Warning', () => {
    const unclassifiedTx: TransactionDTO = {
      id: 'tx-unclassified',
      amount: 500.0,
      transaction_type: 'expense',
      transaction_category_id: 'cat-unknown',
      transaction_date: '2025-08-15',
      status: 'completed',
      property_id: commercialPropertyId,
      workspace_id: workspaceId,
      payment_method: 'cash',
      description: 'Miscellaneous Hardware Store Supplies',
      reference: null,
      vendor_name: null,
      notes: null,
      tenant_id: null,
      lease_id: null,
      invoice_id: null,
      created_by: null,
      created_at: '2025-08-15T00:00:00Z',
      updated_at: '2025-08-15T00:00:00Z',
      gst_inclusive: false,
      gst_amount: 0.0,
      tax_classification_id: null,
      tax_classification: null,
    };

    const worksheet = calculateBasWorksheet([...fullQuarterTransactions, unclassifiedTx], mockProperties, {
      year: 2026,
      period: 'Q1',
    });

    expect(worksheet.unclassifiedCount).toBe(1);
    expect(worksheet.totalTransactionsCount).toBe(7);
  });
});
