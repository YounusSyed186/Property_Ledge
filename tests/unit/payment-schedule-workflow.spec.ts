import { test, expect } from '@playwright/test';
import { generateScheduleEntries } from '../../modules/finance/domain/scheduleGenerator';
import {
  calculateExpectedPaymentStatus,
  calculateTransactionUnallocatedAmount,
  validateAllocation,
} from '../../modules/finance/domain/allocationCalculations';
import {
  ExpectedPaymentScheduleDTO,
  TransactionScheduleAllocationDTO,
  TransactionDTO,
  CreateExpectedScheduleInput,
} from '../../modules/finance/domain/types';

test.describe('Rent & Payment Schedule Workflow - Journeys 1 through 9', () => {
  // Journey 1: Create Independent Payment Schedule
  test('Journey 1: Should generate independent recurring schedule entries', () => {
    const input: CreateExpectedScheduleInput = {
      schedule_name: 'Monthly Service Charge',
      schedule_type: 'independent',
      amount: 250,
      frequency: 'monthly',
      start_date: '2026-01-01',
      end_date: '2026-06-01',
      workspace_id: 'ws-123',
    };

    const entries = generateScheduleEntries(input);
    expect(entries.length).toBe(6);
    expect(entries[0].schedule_name).toBe('Monthly Service Charge');
    expect(entries[0].due_date).toBe('2026-01-01');
    expect(entries[5].due_date).toBe('2026-06-01');
    expect(entries[0].schedule_type).toBe('independent');
    expect(entries[0].amount).toBe(250);
  });

  // Journey 2: Create Lease-Based Payment Schedule
  test('Journey 2: Should generate lease-based expected payment entries', () => {
    const input: CreateExpectedScheduleInput = {
      schedule_name: 'Rent Schedule - Apt 4B',
      schedule_type: 'lease',
      amount: 1200,
      frequency: 'weekly',
      start_date: '2026-03-01',
      end_date: '2026-03-22',
      property_id: 'prop-1',
      lease_id: 'lease-101',
      tenant_id: 'tenant-50',
    };

    const entries = generateScheduleEntries(input);
    expect(entries.length).toBe(4);
    expect(entries[0].schedule_type).toBe('lease');
    expect(entries[0].lease_id).toBe('lease-101');
    expect(entries[0].tenant_id).toBe('tenant-50');
    expect(entries[0].due_date).toBe('2026-03-01');
    expect(entries[1].due_date).toBe('2026-03-08');
    expect(entries[2].due_date).toBe('2026-03-15');
    expect(entries[3].due_date).toBe('2026-03-22');
  });

  // Journey 4 & 6: Handle Partial Payment against an Expected Payment Entry
  test('Journey 4 & 6: Should mark expected payment as partially paid when partially allocated', () => {
    const expectedAmount = 1000;
    const initialStatus = 'pending';
    const dueDate = '2026-10-01';

    const allocations: TransactionScheduleAllocationDTO[] = [
      {
        id: 'alloc-1',
        transaction_id: 'tx-1',
        expected_payment_id: 'exp-1',
        allocated_amount: 600,
        notes: 'Partial payment',
        created_by: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const result = calculateExpectedPaymentStatus(expectedAmount, allocations, initialStatus, dueDate);

    expect(result.total_allocated).toBe(600);
    expect(result.remaining_amount).toBe(400);
    expect(result.status).toBe('partially_paid');
  });

  test('Journey 6: Second payment completes the remaining balance', () => {
    const expectedAmount = 1000;
    const initialStatus = 'partially_paid';

    const allocations: TransactionScheduleAllocationDTO[] = [
      {
        id: 'alloc-1',
        transaction_id: 'tx-1',
        expected_payment_id: 'exp-1',
        allocated_amount: 600,
        notes: null,
        created_by: null,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'alloc-2',
        transaction_id: 'tx-2',
        expected_payment_id: 'exp-1',
        allocated_amount: 400,
        notes: null,
        created_by: null,
        created_at: '',
        updated_at: '',
      },
    ];

    const result = calculateExpectedPaymentStatus(expectedAmount, allocations, initialStatus);

    expect(result.total_allocated).toBe(1000);
    expect(result.remaining_amount).toBe(0);
    expect(result.status).toBe('paid');
  });

  // Journey 7: Allocate One Transaction Across Multiple Expected Payments
  test('Journey 7: Should calculate unallocated transaction balance correctly', () => {
    const mockTx: TransactionDTO = {
      id: 'tx-lump-sum',
      amount: 3000,
      transaction_type: 'income',
      transaction_category_id: 'cat-rent',
      transaction_date: '2026-09-01',
      payment_method: 'bank_transfer',
      description: 'Lump sum rent payment',
      reference: 'REF-3000',
      vendor_name: null,
      notes: null,
      status: 'completed',
      tenant_id: 'tenant-1',
      lease_id: 'lease-1',
      invoice_id: null,
      property_id: 'prop-1',
      workspace_id: 'ws-1',
      created_by: null,
      created_at: '',
      updated_at: '',
    };

    const existingAllocations: TransactionScheduleAllocationDTO[] = [
      {
        id: 'alloc-1',
        transaction_id: 'tx-lump-sum',
        expected_payment_id: 'exp-1',
        allocated_amount: 1000,
        notes: null,
        created_by: null,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'alloc-2',
        transaction_id: 'tx-lump-sum',
        expected_payment_id: 'exp-2',
        allocated_amount: 1000,
        notes: null,
        created_by: null,
        created_at: '',
        updated_at: '',
      },
    ];

    const unallocated = calculateTransactionUnallocatedAmount(mockTx, existingAllocations);
    expect(unallocated).toBe(1000);
  });

  // Journey 8: Referential Integrity Rules
  test('Journey 8: Should reject allocation exceeding remaining expected balance', () => {
    const mockExpected: ExpectedPaymentScheduleDTO = {
      id: 'exp-100',
      workspace_id: 'ws-1',
      property_id: 'prop-1',
      lease_id: 'lease-1',
      tenant_id: null,
      transaction_category_id: null,
      schedule_name: 'Rent Oct 2026',
      schedule_type: 'lease',
      amount: 1000,
      due_date: '2026-10-01',
      frequency: 'monthly',
      status: 'partially_paid',
      start_date: '2026-10-01',
      end_date: '2026-10-01',
      notes: null,
      created_by: null,
      created_at: '',
      updated_at: '',
    };

    const existingAllocations: TransactionScheduleAllocationDTO[] = [
      {
        id: 'alloc-1',
        transaction_id: 'tx-1',
        expected_payment_id: 'exp-100',
        allocated_amount: 700,
        notes: null,
        created_by: null,
        created_at: '',
        updated_at: '',
      },
    ];

    // Remaining expected balance is 300. Attempting to allocate 500 should throw.
    expect(() => {
      validateAllocation(mockExpected, 1000, 500, existingAllocations);
    }).toThrow(/Remaining expected balance is \$300.00/);
  });
});
