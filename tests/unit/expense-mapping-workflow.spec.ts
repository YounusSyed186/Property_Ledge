import { test, expect } from '@playwright/test';
import {
  calculateExpenseStatus,
  calculateExpenseTransactionAvailableAmount,
  validateExpenseAllocation,
} from '@/modules/finance/domain/expenseCalculations';
import {
  createExpenseSchema,
  linkExpenseTransactionSchema,
  updateExpenseSchema,
  expenseFilterSchema,
} from '@/modules/finance/domain/validation';

test.describe('Expense-Transaction Mapping Workflow & Domain Rules', () => {
  test.describe('Expense Allocation & Settlement Calculations', () => {
    test('should mark an expense as pending when 0 is allocated', () => {
      const res = calculateExpenseStatus(1000, []);
      expect(res.status).toBe('pending');
      expect(res.total_allocated).toBe(0);
      expect(res.remaining_amount).toBe(1000);
    });

    test('should mark an expense as partially_paid when partially allocated', () => {
      const res = calculateExpenseStatus(1000, [{ allocated_amount: 450 }]);
      expect(res.status).toBe('partially_paid');
      expect(res.total_allocated).toBe(450);
      expect(res.remaining_amount).toBe(550);
    });

    test('should mark an expense as paid when fully allocated', () => {
      const res = calculateExpenseStatus(1000, [{ allocated_amount: 1000 }]);
      expect(res.status).toBe('paid');
      expect(res.total_allocated).toBe(1000);
      expect(res.remaining_amount).toBe(0);
    });

    test('should handle multiple allocations correctly', () => {
      const res = calculateExpenseStatus(1000, [
        { allocated_amount: 400 },
        { allocated_amount: 600 },
      ]);
      expect(res.status).toBe('paid');
      expect(res.total_allocated).toBe(1000);
      expect(res.remaining_amount).toBe(0);
    });

    test('should handle small floating point precision gracefully', () => {
      const res = calculateExpenseStatus(100.05, [{ allocated_amount: 100.05 }]);
      expect(res.status).toBe('paid');
      expect(res.remaining_amount).toBe(0);
    });

    test('should calculate available ledger transaction capacity correctly across multiple allocations', () => {
      const transactionAmount = 500.0;
      const existingAllocations = [
        { allocated_amount: 150.0 },
        { allocated_amount: 100.0 },
      ];

      const available = calculateExpenseTransactionAvailableAmount(
        transactionAmount,
        existingAllocations
      );
      expect(available).toBe(250.0);
    });

    test('should prevent over-allocation of an expense and ledger transaction', () => {
      const expense = {
        amount: 200,
        allocations: [{ allocated_amount: 150 }], // remaining 50
      };

      const transaction = {
        amount: 300,
        allocations: [{ allocated_amount: 280 }], // remaining 20
      };

      // Trying to allocate 50: expense has 50 remaining, but transaction only has 20 available!
      const result = validateExpenseAllocation(expense, transaction, 50);

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/exceeds unallocated transaction amount/i);
    });

    test('should allow valid allocation within both expense remaining and transaction capacity', () => {
      const expense = {
        amount: 1000,
        allocations: [{ allocated_amount: 200 }], // remaining 800
      };

      const transaction = {
        amount: 500,
        allocations: [{ allocated_amount: 100 }], // remaining 400
      };

      const result = validateExpenseAllocation(expense, transaction, 400);

      expect(result.valid).toBe(true);
    });

    test('should reject allocation greater than remaining expense balance', () => {
      const expense = {
        amount: 300,
        allocations: [{ allocated_amount: 250 }], // remaining 50
      };

      const transaction = {
        amount: 1000,
        allocations: [], // remaining 1000
      };

      const result = validateExpenseAllocation(expense, transaction, 100);

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/exceeds remaining expense balance/i);
    });
  });

  test.describe('Validation Schemas for Multi-Step Workflows', () => {
    test('validates creation of an expense without a lease (vacant property)', () => {
      const valid = createExpenseSchema.safeParse({
        property_id: '11111111-1111-1111-1111-111111111111',
        transaction_category_id: '22222222-2222-2222-2222-222222222222',
        amount: 340.5,
        expense_date: '2026-09-19',
        vendor_name: 'Metro Plumbing & Gas',
        description: 'Hot water service repair',
        record_transaction: true,
      });

      expect(valid.success).toBe(true);
    });

    test('validates linking schema with positive allocated amount', () => {
      const valid = linkExpenseTransactionSchema.safeParse({
        expense_id: '11111111-1111-1111-1111-111111111111',
        transaction_id: '22222222-2222-2222-2222-222222222222',
        allocated_amount: 150.75,
      });

      expect(valid.success).toBe(true);
    });

    test('rejects linking schema with non-positive allocated amount', () => {
      const zeroAlloc = linkExpenseTransactionSchema.safeParse({
        expense_id: '11111111-1111-1111-1111-111111111111',
        transaction_id: '22222222-2222-2222-2222-222222222222',
        allocated_amount: 0,
      });

      expect(zeroAlloc.success).toBe(false);

      const negAlloc = linkExpenseTransactionSchema.safeParse({
        expense_id: '11111111-1111-1111-1111-111111111111',
        transaction_id: '22222222-2222-2222-2222-222222222222',
        allocated_amount: -50,
      });

      expect(negAlloc.success).toBe(false);
    });

    test('validates filter schema with optional property and date bounds', () => {
      const valid = expenseFilterSchema.safeParse({
        property_id: '11111111-1111-1111-1111-111111111111',
        status: 'partially_paid',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        search: 'plumbing',
      });

      expect(valid.success).toBe(true);
    });
  });
});
