'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/queries';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import * as financeService from '@/lib/finance/service';
import {
  CategoryDTO,
  TransactionDTO,
  LedgerEntryDTO,
  FinancialSummaryDTO,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilterParams,
  TransactionType,
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

function revalidateFinancialPaths() {
  revalidatePath('/dashboard/money');
  revalidatePath('/dashboard/finances');
  revalidatePath('/dashboard');
}

/**
 * Fetch categories
 */
export async function fetchCategoriesAction(type?: TransactionType): Promise<CategoryDTO[]> {
  await getAuthContext();
  return financeService.getCategories(type);
}

/**
 * Fetch transactions with workspace filtering
 */
export async function fetchTransactionsAction(
  filters: TransactionFilterParams = {}
): Promise<TransactionDTO[]> {
  const { context } = await getAuthContext();
  return financeService.getTransactions({
    ...filters,
    workspace_id: filters.workspace_id || context.workspaceId,
  });
}

/**
 * Fetch dynamically calculated ledger with running balance
 */
export async function fetchLedgerAction(
  filters: TransactionFilterParams = {}
): Promise<LedgerEntryDTO[]> {
  const { context } = await getAuthContext();
  return financeService.getLedger({
    ...filters,
    workspace_id: filters.workspace_id || context.workspaceId,
  });
}

/**
 * Fetch financial summary (KPIs, breakdowns, monthly trend)
 */
export async function fetchFinancialOverviewAction(
  filters: TransactionFilterParams = {}
): Promise<FinancialSummaryDTO> {
  const { context } = await getAuthContext();
  return financeService.getFinancialOverview({
    ...filters,
    workspace_id: filters.workspace_id || context.workspaceId,
  });
}

/**
 * Fetch single transaction
 */
export async function fetchTransactionByIdAction(id: string): Promise<TransactionDTO | null> {
  await getAuthContext();
  return financeService.getTransactionById(id);
}

/**
 * Create a new transaction
 */
export async function createTransactionAction(
  input: CreateTransactionInput
): Promise<{ success: boolean; data?: TransactionDTO; error?: string }> {
  try {
    const { user, context } = await getAuthContext();
    const created = await financeService.createTransaction(
      {
        ...input,
        workspace_id: input.workspace_id || context.workspaceId,
      },
      user.id
    );

    revalidateFinancialPaths();
    return { success: true, data: created };
  } catch (err: any) {
    console.error('Failed to create transaction:', err);
    return { success: false, error: err.message || 'Failed to create transaction' };
  }
}

/**
 * Update an existing transaction
 */
export async function updateTransactionAction(
  id: string,
  input: UpdateTransactionInput
): Promise<{ success: boolean; data?: TransactionDTO; error?: string }> {
  try {
    const { user } = await getAuthContext();
    const updated = await financeService.updateTransaction(id, input, user.id);

    revalidateFinancialPaths();
    return { success: true, data: updated };
  } catch (err: any) {
    console.error('Failed to update transaction:', err);
    return { success: false, error: err.message || 'Failed to update transaction' };
  }
}

/**
 * Delete a transaction
 */
export async function deleteTransactionAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await getAuthContext();
    await financeService.deleteTransaction(id, user.id);

    revalidateFinancialPaths();
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete transaction:', err);
    return { success: false, error: err.message || 'Failed to delete transaction' };
  }
}

/**
 * Export ledger as CSV
 */
export async function exportLedgerCsvAction(
  filters: TransactionFilterParams = {}
): Promise<{ filename: string; content: string }> {
  const { context } = await getAuthContext();
  const ledgerEntries = await financeService.getLedger({
    ...filters,
    workspace_id: filters.workspace_id || context.workspaceId,
  });

  const content = financeService.generateLedgerCsv(ledgerEntries);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `financial-ledger-${dateStr}.csv`;

  return { filename, content };
}

/**
 * Server action to process auto-allocated lump sum payments across active leases
 */
export async function createBatchAutoAllocatedTransactionsAction(input: {
  totalAmount: number;
  transaction_category_id: string;
  transaction_date: string;
  workspace_id?: string;
  payment_method?: string;
  description?: string;
  notes?: string;
  allocations: Array<{
    lease_id: string;
    property_id: string;
    tenant_id?: string | null;
    allocated_amount: number;
    property_name?: string;
  }>;
}): Promise<{ success: boolean; data?: TransactionDTO[]; error?: string }> {
  try {
    const { user, context } = await getAuthContext();
    const data = await financeService.createBatchAutoAllocatedTransactions(
      {
        ...input,
        workspace_id: input.workspace_id || context.workspaceId,
      },
      user.id
    );

    revalidateFinancialPaths();
    return { success: true, data };
  } catch (err: any) {
    console.error('Failed auto-allocating transactions:', err);
    return { success: false, error: err.message || 'Failed to auto-allocate transactions' };
  }
}

