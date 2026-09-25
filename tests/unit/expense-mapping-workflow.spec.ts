import { test, expect } from '@playwright/test';
import {
  calculateExpenseNetAndGst,
} from '@/modules/finance/domain/expenseCalculations';
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseFilterSchema,
} from '@/modules/finance/domain/validation';

test.describe('Final Finance Architecture — Transaction as Source of Truth', () => {
  test.describe('GST & Net Expense Calculations', () => {
    test('should calculate 1/11th GST on inclusive expense amount', () => {
      const res = calculateExpenseNetAndGst(1100, true);
      expect(res.totalAmount).toBe(1100);
      expect(res.gstAmount).toBe(100);
      expect(res.netAmount).toBe(1000);
    });

    test('should calculate 10% GST on exclusive expense amount', () => {
      const res = calculateExpenseNetAndGst(1000, false, 100);
      expect(res.totalAmount).toBe(1100);
      expect(res.gstAmount).toBe(100);
      expect(res.netAmount).toBe(1000);
    });

    test('should handle GST-free / zero GST expense amount', () => {
      const res = calculateExpenseNetAndGst(500, true, 0);
      expect(res.totalAmount).toBe(500);
      expect(res.gstAmount).toBe(0);
      expect(res.netAmount).toBe(500);
    });

    test('should handle small floating point cents precision gracefully', () => {
      const res = calculateExpenseNetAndGst(110.55, true);
      expect(res.totalAmount).toBe(110.55);
      expect(res.gstAmount).toBe(10.05);
      expect(res.netAmount).toBe(100.50);
    });
  });

  test.describe('Validation Schemas for Direct Expense Transactions', () => {
    test('validates creation of an expense transaction directly', () => {
      const valid = createExpenseSchema.safeParse({
        property_id: '11111111-1111-1111-1111-111111111111',
        transaction_category_id: '22222222-2222-2222-2222-222222222222',
        amount: 340.5,
        transaction_date: '2026-09-25',
        vendor_name: 'Metro Plumbing & Gas',
        description: 'Hot water service repair',
        gst_inclusive: true,
        gst_amount: 30.95,
        payment_method: 'bank_transfer',
      });

      expect(valid.success).toBe(true);
    });

    test('validates expense creation with expense_date alias', () => {
      const valid = createExpenseSchema.safeParse({
        property_id: '11111111-1111-1111-1111-111111111111',
        amount: 500,
        expense_date: '2026-09-25',
        vendor_name: 'Council Rates',
      });

      expect(valid.success).toBe(true);
    });

    test('rejects creation of an expense with zero or negative amount', () => {
      const invalid = createExpenseSchema.safeParse({
        property_id: '11111111-1111-1111-1111-111111111111',
        amount: 0,
        transaction_date: '2026-09-25',
      });

      expect(invalid.success).toBe(false);
    });

    test('validates expense filter schema', () => {
      const valid = expenseFilterSchema.safeParse({
        property_id: '11111111-1111-1111-1111-111111111111',
        status: 'completed',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        search_query: 'plumbing',
      });

      expect(valid.success).toBe(true);
    });
  });
});
