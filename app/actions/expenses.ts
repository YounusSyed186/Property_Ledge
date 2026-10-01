'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/queries';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import * as expenseService from '@/lib/finance/expenseService';
import {
  ExpenseDTO,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseFilterParams,
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
  revalidatePath('/dashboard/finance/ledger');
  revalidatePath('/dashboard/finance/bas');
}

export type { ExpensesPageData } from '@/lib/finance/expenseService';

/**
 * Consolidated single-pass fetch for expenses page model
 */
export async function fetchExpensesPageDataAction(
  filters: ExpenseFilterParams = {}
): Promise<{ success: boolean; data?: expenseService.ExpensesPageData; error?: string }> {
  try {
    const { context } = await getAuthContext();
    const data = await expenseService.getExpensesPageData({
      ...filters,
      workspace_id: filters.workspace_id || context.workspaceId,
    });
    return { success: true, data };
  } catch (err: any) {
    console.error('Failed to fetch expenses page data:', err);
    return { success: false, error: err.message || 'Failed to fetch expenses page data' };
  }
}

/**
 * Fetch business expenses with workspace filtering
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
 * Fetch a single expense transaction by ID
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
 * Create a new expense transaction directly in public.transactions
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
 * Update an existing expense transaction
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
 * Delete an expense transaction
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
