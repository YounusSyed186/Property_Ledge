'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/queries';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import * as expenseService from '@/lib/finance/expenseService';
import {
  ExpenseDTO,
  CreateExpenseInput,
  UpdateExpenseInput,
  LinkExpenseTransactionInput,
  ProcessExpensePaymentInput,
  ExpenseFilterParams,
  TransactionDTO,
} from '@/modules/finance/domain/types';

async function getAuthContext() {
  const [user, context] = await Promise.all([
    getCurrentUser(),
    resolveWorkspaceContext(),
  ]);

  if (!user || !context) {
    throw new Error('Unauthorized or no active workspace');
  }

  return { user, context };
}

function revalidateExpensePaths() {
  revalidatePath('/dashboard/expenses');
  revalidatePath('/dashboard/money');
  revalidatePath('/dashboard');
}

/**
 * Fetch business expenses with workspace filtering and calculated allocations
 */
export async function fetchExpensesAction(
  filters: ExpenseFilterParams = {}
): Promise<{ success: boolean; data?: ExpenseDTO[]; error?: string }> {
  try {
    const { context } = await getAuthContext();
    const data = await expenseService.getExpenses({
      ...filters,
      workspace_id: filters.workspace_id || context.workspaceId,
    });
    return { success: true, data };
  } catch (err: any) {
    console.error('Failed to fetch expenses:', err);
    return { success: false, error: err.message || 'Failed to fetch expenses' };
  }
}

/**
 * Fetch a single expense by ID
 */
export async function fetchExpenseByIdAction(
  id: string
): Promise<{ success: boolean; data?: ExpenseDTO | null; error?: string }> {
  try {
    await getAuthContext();
    const data = await expenseService.getExpenseById(id);
    return { success: true, data };
  } catch (err: any) {
    console.error('Failed to get expense:', err);
    return { success: false, error: err.message || 'Failed to get expense' };
  }
}

/**
 * Create a new expense record (with optional simultaneous ledger transaction)
 */
export async function createExpenseAction(
  input: CreateExpenseInput
): Promise<{ success: boolean; data?: ExpenseDTO; error?: string }> {
  try {
    const { user, context } = await getAuthContext();
    const data = await expenseService.createExpense(
      {
        ...input,
        workspace_id: input.workspace_id || context.workspaceId,
      },
      user.id
    );

    revalidateExpensePaths();
    return { success: true, data };
  } catch (err: any) {
    console.error('Failed to create expense:', err);
    return { success: false, error: err.message || 'Failed to create expense' };
  }
}

/**
 * Update an existing expense record
 */
export async function updateExpenseAction(
  id: string,
  input: UpdateExpenseInput
): Promise<{ success: boolean; data?: ExpenseDTO; error?: string }> {
  try {
    const { user } = await getAuthContext();
    const data = await expenseService.updateExpense(id, input, user.id);

    revalidateExpensePaths();
    return { success: true, data };
  } catch (err: any) {
    console.error('Failed to update expense:', err);
    return { success: false, error: err.message || 'Failed to update expense' };
  }
}

/**
 * Delete an expense record
 */
export async function deleteExpenseAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await getAuthContext();
    await expenseService.deleteExpense(id, user.id);

    revalidateExpensePaths();
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete expense:', err);
    return { success: false, error: err.message || 'Failed to delete expense' };
  }
}

/**
 * Link an existing financial ledger transaction to an expense with an allocated amount
 */
export async function linkExpenseTransactionAction(
  input: LinkExpenseTransactionInput
): Promise<{ success: boolean; data?: ExpenseDTO; error?: string }> {
  try {
    const { user } = await getAuthContext();
    const data = await expenseService.linkTransactionToExpense(input, user.id);

    revalidateExpensePaths();
    return { success: true, data };
  } catch (err: any) {
    console.error('Failed to link transaction to expense:', err);
    return { success: false, error: err.message || 'Failed to link transaction' };
  }
}

/**
 * Unlink / remove an allocation from an expense
 */
export async function unlinkExpenseTransactionAction(
  allocationId: string
): Promise<{ success: boolean; data?: ExpenseDTO; error?: string }> {
  try {
    const { user } = await getAuthContext();
    const data = await expenseService.unlinkTransactionFromExpense(allocationId, user.id);

    revalidateExpensePaths();
    return { success: true, data };
  } catch (err: any) {
    console.error('Failed to unlink transaction:', err);
    return { success: false, error: err.message || 'Failed to unlink transaction' };
  }
}

/**
 * Fetch available expense transactions from ledger that have remaining unallocated amounts
 */
export async function fetchAvailableExpenseTransactionsAction(
  propertyId?: string
): Promise<{ success: boolean; data?: Array<TransactionDTO & { available_to_allocate: number }>; error?: string }> {
  try {
    const { context } = await getAuthContext();
    const data = await expenseService.getAvailableExpenseTransactionsForLinking(
      context.workspaceId,
      propertyId
    );
    return { success: true, data };
  } catch (err: any) {
    console.error('Failed to fetch available transactions:', err);
    return { success: false, error: err.message || 'Failed to fetch available transactions' };
  }
}

/**
 * Process multi-expense transaction allocations in batch
 */
export async function allocateMultiExpenseTransactionsAction(
  transactionId: string,
  allocations: Array<{ expense_id: string; allocated_amount: number; notes?: string }>
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { user } = await getAuthContext();
    const res = await expenseService.allocateExpenseTransactionAcrossMultiple(
      transactionId,
      allocations,
      user.id
    );

    revalidateExpensePaths();
    return { success: true, count: res.count };
  } catch (err: any) {
    console.error('Failed to allocate multi-expense transactions:', err);
    return { success: false, error: err.message || 'Failed to process expense allocations' };
  }
}

/**
 * Process / Settle an unpaid expense bill directly
 */
export async function processExpensePaymentAction(
  input: ProcessExpensePaymentInput
): Promise<{ success: boolean; data?: ExpenseDTO; error?: string }> {
  try {
    const { user } = await getAuthContext();
    const data = await expenseService.processExpensePayment(input, user.id);

    revalidateExpensePaths();
    return { success: true, data };
  } catch (err: any) {
    console.error('Failed to process expense payment:', err);
    return { success: false, error: err.message || 'Failed to process expense payment' };
  }
}


