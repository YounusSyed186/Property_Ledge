import {
  ExpectedPaymentScheduleDTO,
  TransactionScheduleAllocationDTO,
  ExpectedPaymentStatus,
  TransactionDTO,
} from './types';

export interface CalculatedAllocationStatus {
  total_allocated: number;
  remaining_amount: number;
  status: ExpectedPaymentStatus;
}

/**
 * Calculates total allocated amount, remaining balance, and status for an expected payment schedule entry.
 */
export function calculateExpectedPaymentStatus(
  expectedAmount: number,
  allocations: TransactionScheduleAllocationDTO[] = [],
  currentStatus: ExpectedPaymentStatus = 'pending',
  dueDate?: string
): CalculatedAllocationStatus {
  const total_allocated = allocations.reduce((sum, item) => sum + (Number(item.allocated_amount) || 0), 0);
  const remaining_amount = Math.max(0, expectedAmount - total_allocated);

  let status: ExpectedPaymentStatus = currentStatus;

  if (currentStatus === 'cancelled') {
    return { total_allocated, remaining_amount, status: 'cancelled' };
  }

  if (total_allocated >= expectedAmount) {
    status = 'paid';
  } else if (total_allocated > 0) {
    status = 'partially_paid';
  } else {
    // Check if overdue
    if (dueDate) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (dueDate < todayStr) {
        status = 'overdue';
      } else {
        status = 'pending';
      }
    } else {
      status = 'pending';
    }
  }

  return {
    total_allocated,
    remaining_amount,
    status,
  };
}

/**
 * Computes remaining unallocated amount for an actual transaction.
 */
export function calculateTransactionUnallocatedAmount(
  transaction: TransactionDTO,
  existingAllocations: TransactionScheduleAllocationDTO[] = []
): number {
  const allocated = existingAllocations
    .filter((a) => a.transaction_id === transaction.id)
    .reduce((sum, a) => sum + (Number(a.allocated_amount) || 0), 0);

  return Math.max(0, Number(transaction.amount) - allocated);
}

/**
 * Validates an allocation attempt. Throws an error if invalid.
 */
export function validateAllocation(
  expectedPayment: ExpectedPaymentScheduleDTO,
  transactionAmount: number,
  allocatedAmount: number,
  existingExpectedAllocations: TransactionScheduleAllocationDTO[] = []
): void {
  if (allocatedAmount <= 0) {
    throw new Error('Allocation amount must be greater than 0.');
  }

  const { remaining_amount } = calculateExpectedPaymentStatus(
    expectedPayment.amount,
    existingExpectedAllocations,
    expectedPayment.status
  );

  if (allocatedAmount > remaining_amount + 0.001) {
    throw new Error(
      `Cannot allocate $${allocatedAmount.toFixed(2)}. Remaining expected balance is $${remaining_amount.toFixed(2)}.`
    );
  }

  if (allocatedAmount > transactionAmount + 0.001) {
    throw new Error(
      `Cannot allocate $${allocatedAmount.toFixed(2)}. Maximum available from transaction is $${transactionAmount.toFixed(2)}.`
    );
  }
}
