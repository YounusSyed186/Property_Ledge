import { test, expect } from '@playwright/test';
import {
  calculateProportionalGst,
  resolveScheduleTaxContext,
  checkTaxClassificationMismatch,
} from '../../modules/finance/domain/taxContext';
import { generateScheduleEntries } from '../../modules/finance/domain/scheduleGenerator';
import {
  TaxClassificationDTO,
  CategoryDTO,
  CreateExpectedScheduleInput,
} from '../../modules/finance/domain/types';

const mockTaxClassifications: TaxClassificationDTO[] = [
  {
    id: 'tc-taxable-sales-g1',
    workspace_id: 'ws-1',
    name: 'Taxable Sales (GST 10%)',
    bas_code: 'G1',
    applies_to: 'income',
    description: 'Commercial rent and standard taxable sales',
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'tc-gst-free-rent',
    workspace_id: 'ws-1',
    name: 'GST-Free / Input-Taxed Sales',
    bas_code: 'G1',
    applies_to: 'income',
    description: 'Residential rent and input taxed supplies',
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'tc-operating-expense-1b',
    workspace_id: 'ws-1',
    name: 'Operating Expenses (GST 10%)',
    bas_code: '1B',
    applies_to: 'expense',
    description: 'General deductible operating costs with GST credits claimable',
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'tc-capital-g10',
    workspace_id: 'ws-1',
    name: 'Capital Purchases (G10)',
    bas_code: 'G10',
    applies_to: 'expense',
    description: 'Capital assets and property improvements',
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'tc-statutory-free',
    workspace_id: 'ws-1',
    name: 'GST-Free Expenses & Rates',
    bas_code: 'G11',
    applies_to: 'expense',
    description: 'Council rates, water rates, and government charges',
    is_active: true,
    created_at: '',
    updated_at: '',
  },
];

test.describe('Payment Schedule GST & Tax Classification Integration Unit Tests', () => {
  // =========================================================================
  // 1. Proportional GST Calculation (Partial and Full Payments)
  // =========================================================================
  test.describe('calculateProportionalGst', () => {
    test('Calculates full GST on full payment ($1,100 gross with $100 GST)', () => {
      const gst = calculateProportionalGst(1100, 100, 1100, true);
      expect(gst).toBe(100.0);
    });

    test('Calculates exact proportional GST on half payment ($550 payment against $1,100 gross / $100 GST)', () => {
      const gst = calculateProportionalGst(1100, 100, 550, true);
      expect(gst).toBe(50.0);
    });

    test('Calculates proportional GST on arbitrary partial payments ($275 payment -> $25.00 GST)', () => {
      const gst = calculateProportionalGst(1100, 100, 275, true);
      expect(gst).toBe(25.0);
    });

    test('Rounds properly to 2 decimal places on fractional split payments ($333.33 payment against $1,000 / $90.91 GST)', () => {
      const gst = calculateProportionalGst(1000, 90.91, 333.33, true);
      // (333.33 / 1000) * 90.91 = 30.3030303 -> 30.30
      expect(gst).toBe(30.3);
    });

    test('Returns 0 for non-taxable / GST-exclusive payment', () => {
      const gst = calculateProportionalGst(1100, 100, 550, false);
      expect(gst).toBe(0);
    });

    test('Returns 0 when payment gross amount is 0 or negative', () => {
      expect(calculateProportionalGst(1100, 100, 0, true)).toBe(0);
      expect(calculateProportionalGst(1100, 100, -50, true)).toBe(0);
    });

    test('Falls back to standard 1/11th Australian calculation when expected GST is not provided', () => {
      // $550 gross @ 1/11th = $50.00
      const gst = calculateProportionalGst(0, 0, 550, true);
      expect(gst).toBe(50.0);
    });
  });

  // =========================================================================
  // 2. Schedule Tax Context Resolution
  // =========================================================================
  test.describe('resolveScheduleTaxContext', () => {
    test('Resolves Commercial Lease rent to Taxable Sales (G1, 10% GST inclusive) when Property is GST registered', () => {
      const result = resolveScheduleTaxContext({
        amount: 2200,
        scheduleType: 'lease',
        property: { id: 'prop-commercial', name: 'Office Tower 1', gst_enabled: true },
        category: null,
        taxClassifications: mockTaxClassifications,
      });

      expect(result.gst_inclusive).toBe(true);
      expect(result.gst_amount).toBe(200.0); // 2200 / 11 = 200
      expect(result.tax_classification_id).toBe('tc-taxable-sales-g1');
      expect(result.origin).toBe('property_gst');
    });

    test('Resolves Residential Lease rent to GST-Free / Input-taxed (0% GST) when Property is not GST registered', () => {
      const result = resolveScheduleTaxContext({
        amount: 650,
        scheduleType: 'lease',
        property: { id: 'prop-res', name: 'Unit 4A Residential', gst_enabled: false },
        category: null,
        taxClassifications: mockTaxClassifications,
      });

      expect(result.gst_inclusive).toBe(false);
      expect(result.gst_amount).toBe(0);
      expect(result.tax_classification_id).toBe('tc-gst-free-rent');
      expect(result.origin).toBe('property_gst');
    });

    test('Respects Category authoritative default tax classification if specified', () => {
      const customCategory: CategoryDTO = {
        id: 'cat-special',
        name: 'Specialized Consultancy',
        transaction_type: 'expense',
        description: null,
        default_tax_classification_id: 'tc-capital-g10',
        is_active: true,
        created_at: '',
        updated_at: '',
      };

      const result = resolveScheduleTaxContext({
        amount: 5500,
        scheduleType: 'independent',
        property: null,
        category: customCategory,
        taxClassifications: mockTaxClassifications,
      });

      expect(result.tax_classification_id).toBe('tc-capital-g10');
      expect(result.gst_inclusive).toBe(true);
      expect(result.gst_amount).toBe(500.0);
      expect(result.origin).toBe('category_default');
    });

    test('Resolves Independent Capital Expense category to G10 Capital Purchases (10% GST)', () => {
      const capitalCat: CategoryDTO = {
        id: 'cat-cap',
        name: 'Capital Works & Structural Improvement',
        transaction_type: 'expense',
        description: null,
        default_tax_classification_id: null,
        is_active: true,
        created_at: '',
        updated_at: '',
      };

      const result = resolveScheduleTaxContext({
        amount: 11000,
        scheduleType: 'independent',
        property: null,
        category: capitalCat,
        taxClassifications: mockTaxClassifications,
      });

      expect(result.tax_classification_id).toBe('tc-capital-g10');
      expect(result.gst_inclusive).toBe(true);
      expect(result.gst_amount).toBe(1000.0);
    });

    test('Resolves Council / Water rates category to GST-Free statutory charges', () => {
      const ratesCat: CategoryDTO = {
        id: 'cat-rates',
        name: 'Council Rates & Water Levies',
        transaction_type: 'expense',
        description: null,
        default_tax_classification_id: null,
        is_active: true,
        created_at: '',
        updated_at: '',
      };

      const result = resolveScheduleTaxContext({
        amount: 1250,
        scheduleType: 'independent',
        property: null,
        category: ratesCat,
        taxClassifications: mockTaxClassifications,
      });

      expect(result.tax_classification_id).toBe('tc-statutory-free');
      expect(result.gst_inclusive).toBe(false);
      expect(result.gst_amount).toBe(0);
    });

    test('Resolves standard Operating Expense category to 1B Input Tax Credits claimable (10% GST)', () => {
      const repairsCat: CategoryDTO = {
        id: 'cat-repairs',
        name: 'Plumbing & General Maintenance',
        transaction_type: 'expense',
        description: null,
        default_tax_classification_id: null,
        is_active: true,
        created_at: '',
        updated_at: '',
      };

      const result = resolveScheduleTaxContext({
        amount: 330,
        scheduleType: 'independent',
        property: null,
        category: repairsCat,
        taxClassifications: mockTaxClassifications,
      });

      expect(result.tax_classification_id).toBe('tc-operating-expense-1b');
      expect(result.gst_inclusive).toBe(true);
      expect(result.gst_amount).toBe(30.0);
    });
  });

  // =========================================================================
  // 3. Tax Classification Mismatch Detection
  // =========================================================================
  test.describe('checkTaxClassificationMismatch', () => {
    test('Returns no mismatch when schedule and transaction tax classification IDs match', () => {
      const result = checkTaxClassificationMismatch(
        'tc-operating-expense-1b',
        'tc-operating-expense-1b',
        mockTaxClassifications
      );
      expect(result.isMismatch).toBe(false);
    });

    test('Returns mismatch details when transaction has different tax classification from schedule', () => {
      const result = checkTaxClassificationMismatch(
        'tc-operating-expense-1b',
        'tc-capital-g10',
        mockTaxClassifications
      );
      expect(result.isMismatch).toBe(true);
      expect(result.scheduleLabel).toContain('Operating Expenses');
      expect(result.scheduleLabel).toContain('[1B]');
      expect(result.txLabel).toContain('Capital Purchases');
      expect(result.txLabel).toContain('[G10]');
    });

    test('Handles missing/unassigned tax classification IDs gracefully without error', () => {
      const result1 = checkTaxClassificationMismatch(null, 'tc-operating-expense-1b', mockTaxClassifications);
      expect(result1.isMismatch).toBe(false);

      const result2 = checkTaxClassificationMismatch('tc-operating-expense-1b', undefined, mockTaxClassifications);
      expect(result2.isMismatch).toBe(false);
    });
  });

  // =========================================================================
  // 4. Schedule Entry Generation Preserves Tax Metadata
  // =========================================================================
  test.describe('generateScheduleEntries with Tax fields', () => {
    test('Preserves tax_classification_id, gst_inclusive, and gst_amount across all generated recurring installments', () => {
      const input: CreateExpectedScheduleInput = {
        schedule_name: 'Commercial Rent 2026',
        schedule_type: 'lease',
        amount: 1100,
        frequency: 'monthly',
        start_date: '2026-01-01',
        end_date: '2026-03-01',
        property_id: 'prop-1',
        lease_id: 'lease-1',
        tenant_id: 'tenant-1',
        gst_inclusive: true,
        gst_amount: 100,
        tax_classification_id: 'tc-taxable-sales-g1',
      };

      const entries = generateScheduleEntries(input);
      expect(entries.length).toBe(3);

      for (const entry of entries) {
        expect(entry.gst_inclusive).toBe(true);
        expect(entry.gst_amount).toBe(100);
        expect(entry.tax_classification_id).toBe('tc-taxable-sales-g1');
        expect(entry.amount).toBe(1100);
      }
    });

    test('Correctly sets GST-free flags when generating GST-free recurring schedules', () => {
      const input: CreateExpectedScheduleInput = {
        schedule_name: 'Quarterly Council Rates',
        schedule_type: 'independent',
        amount: 600,
        frequency: 'quarterly',
        start_date: '2026-01-01',
        end_date: '2026-07-01',
        property_id: 'prop-1',
        gst_inclusive: false,
        gst_amount: 0,
        tax_classification_id: 'tc-statutory-free',
      };

      const entries = generateScheduleEntries(input);
      expect(entries.length).toBe(3);

      for (const entry of entries) {
        expect(entry.gst_inclusive).toBe(false);
        expect(entry.gst_amount).toBe(0);
        expect(entry.tax_classification_id).toBe('tc-statutory-free');
      }
    });
  });
});