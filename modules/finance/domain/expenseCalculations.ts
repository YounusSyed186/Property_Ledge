import {
  ExpenseDTO,
  ExpenseStatus,
  ExpenseTransactionDTO,
  TransactionScheduleAllocationDTO,
} from './types';

export interface ExpenseAllocationCalculationResult {
  total_allocated: number;
  remaining_amount: number;
  status: ExpenseStatus;
}

/**
 * Calculates the current total allocated amount, remaining unpaid balance,
 * and resulting status for a business expense.
 */
export function calculateExpenseStatus(
  expenseAmount: number,
  allocations: Array<{ allocated_amount: number }> = [],
  currentStatus: ExpenseStatus = 'pending'
): ExpenseAllocationCalculationResult {
  if (currentStatus === 'cancelled') {
    return {
      total_allocated: 0,
      remaining_amount: expenseAmount,
      status: 'cancelled',
    };
  }

  const total_allocated = allocations.reduce(
    (sum, a) => sum + Number(a.allocated_amount || 0),
    0
  );
  const remaining_amount = Math.max(0, expenseAmount - total_allocated);

  let status: ExpenseStatus = 'pending';
  if (total_allocated >= expenseAmount) {
    status = 'paid';
  } else if (total_allocated > 0) {
    status = 'partially_paid';
  } else {
    status = 'pending';
  }

  return {
    total_allocated: Math.round(total_allocated * 100) / 100,
    remaining_amount: Math.round(remaining_amount * 100) / 100,
    status,
  };
}

/**
 * Calculates remaining available amount on a transaction that can still be allocated to expenses
 */
export function calculateExpenseTransactionAvailableAmount(
  transactionAmount: number,
  existingExpenseAllocations: Array<{ allocated_amount: number }> = []
): number {
  const totalAllocated = existingExpenseAllocations.reduce(
    (sum, a) => sum + Number(a.allocated_amount || 0),
    0
  );
  return Math.max(0, Math.round((transactionAmount - totalAllocated) * 100) / 100);
}

/**
 * Validates whether a proposed allocation amount from a transaction to an expense is valid
 */
export function validateExpenseAllocation(
  expense: { amount: number; allocations?: Array<{ allocated_amount: number }> },
  transaction: { amount: number; allocations?: Array<{ allocated_amount: number }> },
  proposedAllocation: number
): { valid: boolean; error?: string } {
  if (proposedAllocation <= 0) {
    return { valid: false, error: 'Allocation amount must be greater than $0' };
  }

  const expenseStatus = calculateExpenseStatus(expense.amount, expense.allocations || []);
  if (proposedAllocation > expenseStatus.remaining_amount + 0.001) {
    return {
      valid: false,
      error: `Allocation ($${proposedAllocation.toFixed(2)}) exceeds remaining expense balance ($${expenseStatus.remaining_amount.toFixed(2)})`,
    };
  }

  const availableOnTx = calculateExpenseTransactionAvailableAmount(
    transaction.amount,
    transaction.allocations || []
  );
  if (proposedAllocation > availableOnTx + 0.001) {
    return {
      valid: false,
      error: `Allocation ($${proposedAllocation.toFixed(2)}) exceeds unallocated transaction amount ($${availableOnTx.toFixed(2)})`,
    };
  }

  return { valid: true };
}
