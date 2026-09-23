import {
  CategoryDTO,
  TaxClassificationDTO,
  ScheduleType,
} from './types';
import { calculateGstPortion } from './bas-calculations';

export interface ScheduleTaxContextResolution {
  gst_inclusive: boolean;
  gst_amount: number;
  tax_classification_id: string | null;
  tax_classification?: TaxClassificationDTO | null;
  origin: 'property_gst' | 'category_default' | 'lease_context' | 'manual_override' | 'unclassified';
  originExplanation: string;
}

/**
 * Calculates mathematically consistent proportional GST for partial or split payments.
 * For example: Schedule $1,100 ($100 GST) with $550 payment -> $50.00 GST.
 */
export function calculateProportionalGst(
  expectedGross: number,
  expectedGst: number,
  paymentGross: number,
  isGstInclusive: boolean = true
): number {
  const gross = Number(paymentGross) || 0;
  const expectedTotal = Number(expectedGross) || 0;
  const expectedTax = Number(expectedGst) || 0;

  if (gross <= 0 || !isGstInclusive) {
    return 0;
  }

  if (expectedTotal > 0 && expectedTax > 0) {
    const proportional = (gross / expectedTotal) * expectedTax;
    return Math.round(proportional * 100) / 100;
  }

  // Fallback to standard 1/11th Australian GST calculation
  const { gst } = calculateGstPortion(gross, true);
  return gst;
}

/**
 * Deterministically resolves default tax treatment and classification for a schedule
 * based on Property GST registration, Category defaults, and Schedule Type.
 */
export function resolveScheduleTaxContext(params: {
  amount: number;
  scheduleType: ScheduleType;
  property?: { id: string; name: string; gst_enabled?: boolean } | null;
  category?: CategoryDTO | null;
  taxClassifications: TaxClassificationDTO[];
  lease?: any;
}): ScheduleTaxContextResolution {
  const { amount, scheduleType, property, category, taxClassifications } = params;

  const propertyGstEnabled = Boolean(property?.gst_enabled);
  const gross = Number(amount) || 0;

  // 1. If category has an authoritative default tax classification configured
  if (category?.default_tax_classification_id) {
    const matched = taxClassifications.find(
      (t) => t.id === category.default_tax_classification_id && t.is_active
    );
    if (matched) {
      const isTaxable = matched.bas_code === '1B' || matched.bas_code === 'G10' || (matched.bas_code === 'G1' && propertyGstEnabled);
      const isInclusive = isTaxable;
      const { gst } = calculateGstPortion(gross, isInclusive);

      return {
        gst_inclusive: isInclusive,
        gst_amount: isInclusive ? gst : 0,
        tax_classification_id: matched.id,
        tax_classification: matched,
        origin: 'category_default',
        originExplanation: `Suggested from category default (${matched.name})`,
      };
    }
  }

  // 2. Lease-Based Schedule Context (Rent)
  if (scheduleType === 'lease') {
    if (propertyGstEnabled) {
      // Commercial or GST-Registered property rent -> Taxable Sales (G1)
      const taxableSalesClass = taxClassifications.find(
        (t) => t.applies_to === 'income' && t.bas_code === 'G1' && t.name.toLowerCase().includes('taxable')
      ) || taxClassifications.find((t) => (t.applies_to === 'income' || t.applies_to === 'both') && t.bas_code === 'G1');

      const { gst } = calculateGstPortion(gross, true);

      return {
        gst_inclusive: true,
        gst_amount: gst,
        tax_classification_id: taxableSalesClass?.id || null,
        tax_classification: taxableSalesClass || null,
        origin: 'property_gst',
        originExplanation: 'Based on property GST configuration (10% GST on Rent)',
      };
    } else {
      // Standard residential input-taxed / GST-free rent
      const gstFreeRentClass = taxClassifications.find(
        (t) => t.applies_to === 'income' && (t.name.toLowerCase().includes('free') || t.name.toLowerCase().includes('input'))
      ) || taxClassifications.find((t) => (t.applies_to === 'income' || t.applies_to === 'both') && t.bas_code === 'G1');

      return {
        gst_inclusive: false,
        gst_amount: 0,
        tax_classification_id: gstFreeRentClass?.id || null,
        tax_classification: gstFreeRentClass || null,
        origin: 'property_gst',
        originExplanation: 'Based on residential rental treatment (GST-Free / Input Taxed)',
      };
    }
  }

  // 3. Independent Schedule (Expenses, Rates, Insurance, Maintenance, Capital)
  const isCategoryExpense = category?.transaction_type === 'expense';
  
  if (category && isCategoryExpense) {
    const catName = category.name.toLowerCase();
    
    // Capital expense
    if (catName.includes('capital') || catName.includes('improvement')) {
      const capitalClass = taxClassifications.find(
        (t) => (t.applies_to === 'expense' || t.applies_to === 'both') && t.bas_code === 'G10'
      ) || taxClassifications.find((t) => t.name.toLowerCase().includes('capital'));

      const { gst } = calculateGstPortion(gross, true);
      return {
        gst_inclusive: true,
        gst_amount: gst,
        tax_classification_id: capitalClass?.id || null,
        tax_classification: capitalClass || null,
        origin: 'category_default',
        originExplanation: 'Capital acquisition (G10 Capital Purchases)',
      };
    }

    // Council rates, taxes, statutory fees -> GST-Free
    if (catName.includes('rate') || catName.includes('tax') || catName.includes('water rate') || catName.includes('council')) {
      const gstFreeExpenseClass = taxClassifications.find(
        (t) => (t.applies_to === 'expense' || t.applies_to === 'both') && (t.name.toLowerCase().includes('free') || t.name.toLowerCase().includes('input') || t.bas_code === 'G11')
      );

      return {
        gst_inclusive: false,
        gst_amount: 0,
        tax_classification_id: gstFreeExpenseClass?.id || null,
        tax_classification: gstFreeExpenseClass || null,
        origin: 'category_default',
        originExplanation: 'Statutory or government charges (GST-Free)',
      };
    }
  }

  // Standard operating expense (1B)
  const expenseClass = taxClassifications.find(
    (t) => (t.applies_to === 'expense' || t.applies_to === 'both') && (t.bas_code === '1B' || t.name.toLowerCase().includes('taxable') || t.name.toLowerCase().includes('operating'))
  );

  const { gst } = calculateGstPortion(gross, true);

  return {
    gst_inclusive: true,
    gst_amount: gst,
    tax_classification_id: expenseClass?.id || null,
    tax_classification: expenseClass || null,
    origin: 'category_default',
    originExplanation: 'Standard operating expense (1B Input Tax Credits claimable)',
  };
}

/**
 * Compares tax classifications between a schedule and a transaction to detect mismatches.
 */
export function checkTaxClassificationMismatch(
  scheduleTaxClassId: string | null | undefined,
  txTaxClassId: string | null | undefined,
  taxClassifications: TaxClassificationDTO[]
): { isMismatch: boolean; scheduleLabel: string; txLabel: string } {
  if (!scheduleTaxClassId || !txTaxClassId) {
    return { isMismatch: false, scheduleLabel: 'None', txLabel: 'None' };
  }

  if (scheduleTaxClassId === txTaxClassId) {
    return { isMismatch: false, scheduleLabel: '', txLabel: '' };
  }

  const schedClass = taxClassifications.find((t) => t.id === scheduleTaxClassId);
  const txClass = taxClassifications.find((t) => t.id === txTaxClassId);

  const scheduleLabel = schedClass ? `${schedClass.name}${schedClass.bas_code ? ` [${schedClass.bas_code}]` : ''}` : 'Unassigned';
  const txLabel = txClass ? `${txClass.name}${txClass.bas_code ? ` [${txClass.bas_code}]` : ''}` : 'Unassigned';

  return {
    isMismatch: true,
    scheduleLabel,
    txLabel,
  };
}
