import { test, expect } from '@playwright/test';
import {
  assertPropertyWorkspaceMatch,
  createTransactionSchema,
  updateTransactionSchema,
  transactionFilterSchema,
} from '../../modules/finance/domain/validation';
import {
  calculateLedger,
  calculateFinancialSummary,
  isIncome,
  isExpense,
} from '../../modules/finance/domain/calculations';
import {
  TransactionDTO,
  CreateTransactionInput,
  CategoryDTO,
} from '../../modules/finance/domain/types';

test.describe('PropertyLedge Expense Tracking - Unit, Integrity & Ledger Tests', () => {
  const sampleWorkspaceId = '11111111-1111-4111-8111-111111111111';
  const samplePropertyId = '22222222-2222-4222-8222-222222222222';
  const otherPropertyId = '33333333-3333-4333-8333-333333333333';
  const sampleLeaseId = '44444444-4444-4444-8444-444444444444';
  const sampleExpenseCategoryId = '55555555-5555-4555-8555-555555555555';

  const mockExpenseCategory: CategoryDTO = {
    id: sampleExpenseCategoryId,
    transaction_type: 'expense',
    name: 'Maintenance',
    description: 'Routine and preventative maintenance',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Validation Tests
  test.describe('1. Expense Validation Rules', () => {
    test('rejects transactions whose property belongs to another workspace', () => {
      expect(() => assertPropertyWorkspaceMatch(sampleWorkspaceId, '99999999-9999-4999-8999-999999999999'))
        .toThrow('Selected property does not belong to the active workspace.');
      expect(() => assertPropertyWorkspaceMatch(sampleWorkspaceId, sampleWorkspaceId)).not.toThrow();
    });

    test('Should successfully validate a standard expense with mandatory fields and no lease', () => {
      const validExpenseInput: CreateTransactionInput = {
        amount: 350.5,
        transaction_type: 'expense',
        transaction_category_id: sampleExpenseCategoryId,
        transaction_date: '2026-09-19',
        property_id: samplePropertyId,
        workspace_id: sampleWorkspaceId,
        description: 'Council water bill for vacant property',
        vendor_name: 'City Water Authority',
        reference: 'BILL-90812',
        payment_method: 'bank_transfer',
        status: 'completed',
        lease_id: null,
      };

      const result = createTransactionSchema.safeParse(validExpenseInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe(350.5);
        expect(result.data.transaction_type).toBe('expense');
        expect(result.data.property_id).toBe(samplePropertyId);
        expect(result.data.lease_id).toBeNull();
      }
    });

    test('Should successfully validate an expense with an optional lease', () => {
      const validExpenseWithLease: CreateTransactionInput = {
        amount: 820.0,
        transaction_type: 'expense',
        transaction_category_id: sampleExpenseCategoryId,
        transaction_date: '2026-09-18',
        property_id: samplePropertyId,
        workspace_id: sampleWorkspaceId,
        lease_id: sampleLeaseId,
        description: 'Emergency plumbing repairs requested by tenant',
        vendor_name: 'Apex Plumbing',
        status: 'completed',
      };

      const result = createTransactionSchema.safeParse(validExpenseWithLease);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lease_id).toBe(sampleLeaseId);
      }
    });

    test('Should reject expense when amount is missing, zero, or negative', () => {
      const zeroAmountInput = {
        amount: 0,
        transaction_type: 'expense',
        transaction_category_id: sampleExpenseCategoryId,
        transaction_date: '2026-09-19',
        property_id: samplePropertyId,
      };
      const zeroRes = createTransactionSchema.safeParse(zeroAmountInput);
      expect(zeroRes.success).toBe(false);

      const negativeAmountInput = {
        amount: -150.0,
        transaction_type: 'expense',
        transaction_category_id: sampleExpenseCategoryId,
        transaction_date: '2026-09-19',
        property_id: samplePropertyId,
      };
      const negRes = createTransactionSchema.safeParse(negativeAmountInput);
      expect(negRes.success).toBe(false);
    });

    test('Should reject expense when property_id is missing or invalid UUID', () => {
      const missingPropInput = {
        amount: 200,
        transaction_type: 'expense',
        transaction_category_id: sampleExpenseCategoryId,
        transaction_date: '2026-09-19',
      };
      const res = createTransactionSchema.safeParse(missingPropInput);
      expect(res.success).toBe(false);

      const invalidPropInput = {
        amount: 200,
        transaction_type: 'expense',
        transaction_category_id: sampleExpenseCategoryId,
        transaction_date: '2026-09-19',
        property_id: 'invalid-not-a-uuid',
      };
      const invalidRes = createTransactionSchema.safeParse(invalidPropInput);
      expect(invalidRes.success).toBe(false);
    });

    test('Should reject expense when category_id is missing or invalid UUID', () => {
      const missingCatInput = {
        amount: 200,
        transaction_type: 'expense',
        transaction_date: '2026-09-19',
        property_id: samplePropertyId,
      };
      const res = createTransactionSchema.safeParse(missingCatInput);
      expect(res.success).toBe(false);
    });

    test('Should reject expense when transaction_date is invalid or malformed', () => {
      const invalidDateInput = {
        amount: 200,
        transaction_type: 'expense',
        transaction_category_id: sampleExpenseCategoryId,
        transaction_date: '19/09/2026', // Not YYYY-MM-DD
        property_id: samplePropertyId,
      };
      const res = createTransactionSchema.safeParse(invalidDateInput);
      expect(res.success).toBe(false);
    });
  });

  // 2. Business Logic & Type Helpers
  test.describe('2. Expense Classification & Helper Functions', () => {
    test('isExpense and isIncome accurately classify transaction types', () => {
      expect(isExpense('expense')).toBe(true);
      expect(isExpense('income')).toBe(false);
      expect(isIncome('income')).toBe(true);
      expect(isIncome('expense')).toBe(false);
    });
  });

  // 3. Unified Ledger Integration & Balance Calculations
  test.describe('3. Unified Transaction Ledger Integration', () => {
    test('Recording an expense creates exactly one ledger entry with money_out and correct running balance', () => {
      const mockTransactions: TransactionDTO[] = [
        // Prior Income: $2,000 rent
        {
          id: 'tx-1',
          amount: 2000,
          transaction_type: 'income',
          transaction_category_id: 'cat-rent',
          transaction_date: '2026-09-01',
          payment_method: 'bank_transfer',
          description: 'September Rent',
          reference: 'RENT-01',
          vendor_name: null,
          notes: null,
          status: 'completed',
          tenant_id: 'tenant-1',
          lease_id: sampleLeaseId,
          invoice_id: null,
          property_id: samplePropertyId,
          workspace_id: sampleWorkspaceId,
          created_by: 'user-1',
          created_at: '2026-09-01T10:00:00Z',
          updated_at: '2026-09-01T10:00:00Z',
          category: {
            id: 'cat-rent',
            transaction_type: 'income',
            name: 'Rent',
            description: null,
            is_active: true,
            created_at: '',
            updated_at: '',
          },
          property: {
            id: samplePropertyId,
            name: 'Unit 4, 12 Smith St',
            address_line_1: '12 Smith St',
            city: 'Sydney',
            state: 'NSW',
          },
        },
        // Newly Recorded Expense: $450 council rates (No lease)
        {
          id: 'tx-2',
          amount: 450,
          transaction_type: 'expense',
          transaction_category_id: sampleExpenseCategoryId,
          transaction_date: '2026-09-10',
          payment_method: 'bank_transfer',
          description: 'Quarterly Council Rates',
          reference: 'RATES-Q3',
          vendor_name: 'Sydney City Council',
          notes: 'Deductible operating expense',
          status: 'completed',
          tenant_id: null,
          lease_id: null, // Vacant/property-level expense
          invoice_id: null,
          property_id: samplePropertyId,
          workspace_id: sampleWorkspaceId,
          created_by: 'user-1',
          created_at: '2026-09-10T14:00:00Z',
          updated_at: '2026-09-10T14:00:00Z',
          category: mockExpenseCategory,
          property: {
            id: samplePropertyId,
            name: 'Unit 4, 12 Smith St',
            address_line_1: '12 Smith St',
            city: 'Sydney',
            state: 'NSW',
          },
        },
      ];

      const ledgerEntries = calculateLedger(mockTransactions);

      expect(ledgerEntries.length).toBe(2);

      // Entry 1: Income ($2000 in, running balance = $2000)
      const incomeEntry = ledgerEntries.find((e) => e.id === 'tx-1');
      expect(incomeEntry).toBeDefined();
      expect(incomeEntry?.money_in).toBe(2000);
      expect(incomeEntry?.money_out).toBe(0);
      expect(incomeEntry?.running_balance).toBe(2000);

      // Entry 2: Expense ($450 out, running balance = $1550)
      const expenseEntry = ledgerEntries.find((e) => e.id === 'tx-2');
      expect(expenseEntry).toBeDefined();
      expect(expenseEntry?.money_in).toBe(0);
      expect(expenseEntry?.money_out).toBe(450);
      expect(expenseEntry?.running_balance).toBe(1550);
      expect(expenseEntry?.category_name).toBe('Maintenance');
    });

    test('Financial summary accurately aggregates total expenses and net profit', () => {
      const mockTransactions: TransactionDTO[] = [
        {
          id: 'tx-1',
          amount: 3000,
          transaction_type: 'income',
          transaction_category_id: 'cat-rent',
          transaction_date: '2026-09-01',
          payment_method: 'bank_transfer',
          description: null,
          reference: null,
          vendor_name: null,
          notes: null,
          status: 'completed',
          tenant_id: null,
          lease_id: null,
          invoice_id: null,
          property_id: samplePropertyId,
          workspace_id: sampleWorkspaceId,
          created_by: null,
          created_at: '',
          updated_at: '',
          category: {
            id: 'cat-rent',
            transaction_type: 'income',
            name: 'Rent',
            description: null,
            is_active: true,
            created_at: '',
            updated_at: '',
          },
        },
        {
          id: 'tx-2',
          amount: 600,
          transaction_type: 'expense',
          transaction_category_id: 'cat-maint',
          transaction_date: '2026-09-05',
          payment_method: 'bank_transfer',
          description: null,
          reference: null,
          vendor_name: null,
          notes: null,
          status: 'completed',
          tenant_id: null,
          lease_id: null,
          invoice_id: null,
          property_id: samplePropertyId,
          workspace_id: sampleWorkspaceId,
          created_by: null,
          created_at: '',
          updated_at: '',
          category: {
            id: 'cat-maint',
            transaction_type: 'expense',
            name: 'Maintenance',
            description: null,
            is_active: true,
            created_at: '',
            updated_at: '',
          },
        },
        {
          id: 'tx-3',
          amount: 400,
          transaction_type: 'expense',
          transaction_category_id: 'cat-util',
          transaction_date: '2026-09-12',
          payment_method: 'card',
          description: null,
          reference: null,
          vendor_name: null,
          notes: null,
          status: 'completed',
          tenant_id: null,
          lease_id: null,
          invoice_id: null,
          property_id: samplePropertyId,
          workspace_id: sampleWorkspaceId,
          created_by: null,
          created_at: '',
          updated_at: '',
          category: {
            id: 'cat-util',
            transaction_type: 'expense',
            name: 'Utilities',
            description: null,
            is_active: true,
            created_at: '',
            updated_at: '',
          },
        },
      ];

      const summary = calculateFinancialSummary(mockTransactions);

      expect(summary.total_income).toBe(3000);
      expect(summary.total_expense).toBe(1000);
      expect(summary.net_profit).toBe(2000);
      expect(summary.expense_by_category.length).toBe(2);

      const maintCat = summary.expense_by_category.find((c) => c.name === 'Maintenance');
      expect(maintCat?.amount).toBe(600);
      expect(maintCat?.percentage).toBe(60);

      const utilCat = summary.expense_by_category.find((c) => c.name === 'Utilities');
      expect(utilCat?.amount).toBe(400);
      expect(utilCat?.percentage).toBe(40);
    });
  });

  // 4. Lease Relationship Rules
  test.describe('4. Lease & Property Relationship Rules', () => {
    test('Simulating lease-property mismatch validation logic', () => {
      const mockLease = {
        id: sampleLeaseId,
        property_id: otherPropertyId, // belongs to other property
        workspace_id: sampleWorkspaceId,
      };

      const selectedPropertyId = samplePropertyId;

      const isValidLeaseForProperty = mockLease.property_id === selectedPropertyId;
      expect(isValidLeaseForProperty).toBe(false);
    });

    test('Simulating valid lease for selected property', () => {
      const mockLease = {
        id: sampleLeaseId,
        property_id: samplePropertyId, // belongs to selected property
        workspace_id: sampleWorkspaceId,
      };

      const selectedPropertyId = samplePropertyId;

      const isValidLeaseForProperty = mockLease.property_id === selectedPropertyId;
      expect(isValidLeaseForProperty).toBe(true);
    });
  });
});
