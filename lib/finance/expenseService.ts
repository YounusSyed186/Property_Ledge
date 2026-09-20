import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  ExpenseDTO,
  ExpenseTransactionDTO,
  CreateExpenseInput,
  UpdateExpenseInput,
  LinkExpenseTransactionInput,
  ProcessExpensePaymentInput,
  ExpenseFilterParams,
  TransactionDTO,
} from '@/modules/finance/domain/types';
import {
  calculateExpenseStatus,
  calculateExpenseTransactionAvailableAmount,
  validateExpenseAllocation,
} from '@/modules/finance/domain/expenseCalculations';
import {
  createExpenseSchema,
  updateExpenseSchema,
  linkExpenseTransactionSchema,
} from '@/modules/finance/domain/validation';

/**
 * Fetch business expenses with joins, calculated allocations, and filters
 */
export async function getExpenses(
  filters: ExpenseFilterParams = {}
): Promise<ExpenseDTO[]> {
  const supabase = await createClient();

  let query = supabase
    .from('expenses')
    .select(`
      id,
      workspace_id,
      property_id,
      lease_id,
      transaction_category_id,
      amount,
      expense_date,
      vendor_name,
      description,
      reference,
      notes,
      status,
      receipt_url,
      created_by,
      created_at,
      updated_at,
      category:categories(id, transaction_type, name, description, is_active),
      property:properties(id, name, address_line_1, city, state),
      lease:leases(id, start_date, end_date, rent_amount, status),
      allocations:expense_transactions(
        id,
        expense_id,
        transaction_id,
        allocated_amount,
        notes,
        created_by,
        created_at,
        updated_at,
        transaction:transactions(
          id,
          amount,
          transaction_type,
          transaction_date,
          payment_method,
          description,
          reference,
          status
        )
      )
    `)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters.workspace_id) {
    query = query.eq('workspace_id', filters.workspace_id);
  }
  if (filters.property_id) {
    query = query.eq('property_id', filters.property_id);
  }
  if (filters.lease_id) {
    query = query.eq('lease_id', filters.lease_id);
  }
  if (filters.transaction_category_id) {
    query = query.eq('transaction_category_id', filters.transaction_category_id);
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.start_date) {
    query = query.gte('expense_date', filters.start_date);
  }
  if (filters.end_date) {
    query = query.lte('expense_date', filters.end_date);
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching expenses:', error);
    throw new Error(`Failed to fetch expenses: ${error.message}`);
  }

  let results = (data || []).map((row: any) => {
    const rawAllocations = row.allocations || [];
    const calc = calculateExpenseStatus(Number(row.amount), rawAllocations, row.status);

    return {
      ...row,
      amount: Number(row.amount),
      total_allocated: calc.total_allocated,
      remaining_amount: calc.remaining_amount,
      status: row.status === 'cancelled' ? 'cancelled' : calc.status,
    } as ExpenseDTO;
  });

  // Client-side text search if provided
  if (filters.search_query && filters.search_query.trim()) {
    const q = filters.search_query.toLowerCase().trim();
    results = results.filter((exp) => {
      return (
        exp.description?.toLowerCase().includes(q) ||
        exp.reference?.toLowerCase().includes(q) ||
        exp.vendor_name?.toLowerCase().includes(q) ||
        exp.category?.name.toLowerCase().includes(q) ||
        exp.property?.name.toLowerCase().includes(q) ||
        String(exp.amount).includes(q)
      );
    });
  }

  return results;
}

/**
 * Get a single expense with all details and allocations
 */
export async function getExpenseById(id: string): Promise<ExpenseDTO | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('expenses')
    .select(`
      id,
      workspace_id,
      property_id,
      lease_id,
      transaction_category_id,
      amount,
      expense_date,
      vendor_name,
      description,
      reference,
      notes,
      status,
      receipt_url,
      created_by,
      created_at,
      updated_at,
      category:categories(id, transaction_type, name, description, is_active),
      property:properties(id, name, address_line_1, city, state),
      lease:leases(id, start_date, end_date, rent_amount, status),
      allocations:expense_transactions(
        id,
        expense_id,
        transaction_id,
        allocated_amount,
        notes,
        created_by,
        created_at,
        updated_at,
        transaction:transactions(
          id,
          amount,
          transaction_type,
          transaction_date,
          payment_method,
          description,
          reference,
          status
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get expense: ${error.message}`);
  }

  const row = data as any;
  const rawAllocations = row.allocations || [];
  const calc = calculateExpenseStatus(Number(row.amount), rawAllocations, row.status);

  return {
    ...row,
    amount: Number(row.amount),
    total_allocated: calc.total_allocated,
    remaining_amount: calc.remaining_amount,
    status: row.status === 'cancelled' ? 'cancelled' : calc.status,
  } as ExpenseDTO;
}

/**
 * Create a new expense (with atomic simultaneous ledger transaction & allocation if requested)
 */
export async function createExpense(
  input: CreateExpenseInput,
  userId?: string
): Promise<ExpenseDTO> {
  const validated = createExpenseSchema.parse(input);
  const supabase = await createClient();

  // 1. Resolve Workspace ID from Property
  const { data: propData, error: propError } = await supabase
    .from('properties')
    .select('id, workspace_id')
    .eq('id', validated.property_id)
    .single();

  const property = propData as { id: string; workspace_id: string } | null;
  if (propError || !property) {
    throw new Error('Associated property was not found.');
  }
  const workspaceId = property.workspace_id;

  // 2. Validate Category if provided
  if (validated.transaction_category_id) {
    const { data: catData, error: catError } = await supabase
      .from('categories')
      .select('id, transaction_type, name, is_active')
      .eq('id', validated.transaction_category_id)
      .single();

    const category = catData as { id: string; transaction_type: string; name: string; is_active: boolean } | null;
    if (catError || !category) {
      throw new Error('Selected category was not found.');
    }
    if (category.transaction_type !== 'expense') {
      throw new Error(`Category "${category.name}" is not an expense category.`);
    }
    if (!category.is_active) {
      throw new Error(`Category "${category.name}" is inactive.`);
    }
  }

  // 3. Validate Lease if provided
  if (validated.lease_id) {
    const { data: leaseData, error: leaseError } = await supabase
      .from('leases')
      .select('id, property_id')
      .eq('id', validated.lease_id)
      .maybeSingle();

    const lease = leaseData as { id: string; property_id: string } | null;
    if (leaseError || !lease) {
      throw new Error('Selected lease was not found.');
    }
    if (lease.property_id !== validated.property_id) {
      throw new Error('Selected lease does not belong to the selected property.');
    }
  }

  // Determine if simultaneous transaction creation is requested
  const shouldCreateTransaction = validated.create_transaction !== false; // default true for immediate payments
  const initialStatus = shouldCreateTransaction ? 'paid' : (validated.status || 'pending');

  // 4. Insert Expense Business Record
  const expensePayload = {
    workspace_id: workspaceId,
    property_id: validated.property_id,
    lease_id: validated.lease_id || null,
    transaction_category_id: validated.transaction_category_id || null,
    amount: validated.amount,
    expense_date: validated.expense_date,
    vendor_name: validated.vendor_name || null,
    description: validated.description || null,
    reference: validated.reference || null,
    notes: validated.notes || null,
    status: initialStatus,
    receipt_url: validated.receipt_url || null,
    created_by: userId || null,
  };

  const { data: expData, error: expError } = await supabase
    .from('expenses')
    .insert(expensePayload as never)
    .select('id')
    .single();

  if (expError || !expData) {
    console.error('Error inserting expense:', expError);
    throw new Error(`Failed to create expense: ${expError?.message || 'Unknown error'}`);
  }

  const expenseId = (expData as { id: string }).id;

  // 5. If creating simultaneous ledger transaction & allocation
  if (shouldCreateTransaction) {
    try {
      // Create unified ledger transaction
      const txPayload = {
        amount: validated.amount,
        transaction_type: 'expense',
        transaction_category_id: validated.transaction_category_id,
        transaction_date: validated.expense_date,
        property_id: validated.property_id,
        workspace_id: workspaceId,
        lease_id: validated.lease_id || null,
        vendor_name: validated.vendor_name || null,
        description: validated.description || null,
        reference: validated.reference || null,
        payment_method: validated.payment_method || 'bank_transfer',
        status: 'completed',
        notes: validated.notes ? `[Expense Link: ${expenseId}] ${validated.notes}` : `Linked to Expense #${expenseId.slice(0, 8)}`,
        created_by: userId || null,
      };

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert(txPayload as never)
        .select('id')
        .single();

      if (txError || !txData) {
        throw new Error(`Ledger transaction creation failed: ${txError?.message}`);
      }

      const transactionId = (txData as { id: string }).id;

      // Create mapping in expense_transactions
      const mappingPayload = {
        expense_id: expenseId,
        transaction_id: transactionId,
        allocated_amount: validated.amount,
        notes: 'Initial expense payment allocation',
        created_by: userId || null,
      };

      const { error: mapError } = await supabase
        .from('expense_transactions')
        .insert(mappingPayload as never);

      if (mapError) {
        throw new Error(`Allocation mapping failed: ${mapError.message}`);
      }
    } catch (allocErr: any) {
      console.error('Simultaneous transaction error, rolling back expense:', allocErr);
      // Clean up created expense if simultaneous transaction fails
      await supabase.from('expenses').delete().eq('id', expenseId);
      throw allocErr;
    }
  }

  // Log activity
  try {
    const adminClient = await createAdminClient();
    await adminClient.from('activity_logs').insert({
      workspace_id: workspaceId,
      property_id: validated.property_id,
      actor_id: userId || null,
      action: 'expense_created',
      entity_type: 'expense',
      entity_id: expenseId,
      metadata: {
        amount: validated.amount,
        vendor: validated.vendor_name,
        with_transaction: shouldCreateTransaction,
      },
    } as never);
  } catch (logErr) {
    console.warn('Could not write to activity log:', logErr);
  }

  const created = await getExpenseById(expenseId);
  if (!created) throw new Error('Expense was created but could not be loaded.');
  return created;
}

/**
 * Update an existing expense record
 */
export async function updateExpense(
  id: string,
  input: UpdateExpenseInput,
  userId?: string
): Promise<ExpenseDTO> {
  const validated = updateExpenseSchema.parse(input);
  const supabase = await createClient();

  const current = await getExpenseById(id);
  if (!current) throw new Error('Expense not found.');

  const effectivePropertyId = validated.property_id || current.property_id;
  const effectiveLeaseId = validated.lease_id !== undefined ? validated.lease_id : current.lease_id;

  // Validate Lease if updated
  if (effectiveLeaseId) {
    const { data: leaseData, error: leaseError } = await supabase
      .from('leases')
      .select('id, property_id')
      .eq('id', effectiveLeaseId)
      .maybeSingle();

    const lease = leaseData as { id: string; property_id: string } | null;
    if (leaseError || !lease) {
      throw new Error('Selected lease was not found.');
    }
    if (lease.property_id !== effectivePropertyId) {
      throw new Error('Selected lease does not belong to the selected property.');
    }
  }

  const updatePayload: Record<string, unknown> = {};
  if (validated.amount !== undefined) updatePayload.amount = validated.amount;
  if (validated.property_id !== undefined) updatePayload.property_id = validated.property_id;
  if (validated.lease_id !== undefined) updatePayload.lease_id = validated.lease_id;
  if (validated.transaction_category_id !== undefined) updatePayload.transaction_category_id = validated.transaction_category_id;
  if (validated.expense_date !== undefined) updatePayload.expense_date = validated.expense_date;
  if (validated.vendor_name !== undefined) updatePayload.vendor_name = validated.vendor_name;
  if (validated.description !== undefined) updatePayload.description = validated.description;
  if (validated.reference !== undefined) updatePayload.reference = validated.reference;
  if (validated.notes !== undefined) updatePayload.notes = validated.notes;
  if (validated.status !== undefined) updatePayload.status = validated.status;
  if (validated.receipt_url !== undefined) updatePayload.receipt_url = validated.receipt_url;

  const { error } = await supabase
    .from('expenses')
    .update(updatePayload as never)
    .eq('id', id);

  if (error) {
    console.error('Error updating expense:', error);
    throw new Error(`Failed to update expense: ${error.message}`);
  }

  const updated = await getExpenseById(id);
  if (!updated) throw new Error('Failed to retrieve updated expense.');
  return updated;
}

/**
 * Delete an expense record
 */
export async function deleteExpense(id: string, userId?: string): Promise<boolean> {
  const current = await getExpenseById(id);
  if (!current) throw new Error('Expense not found.');

  const supabase = await createClient();
  const { error } = await supabase.from('expenses').delete().eq('id', id);

  if (error) {
    console.error('Error deleting expense:', error);
    throw new Error(`Failed to delete expense: ${error.message}`);
  }

  return true;
}

/**
 * Link an existing financial ledger transaction to an expense with an allocated amount
 */
export async function linkTransactionToExpense(
  input: LinkExpenseTransactionInput,
  userId?: string
): Promise<ExpenseDTO> {
  const validated = linkExpenseTransactionSchema.parse(input);
  const supabase = await createClient();

  // 1. Fetch Expense and existing allocations
  const expense = await getExpenseById(validated.expense_id);
  if (!expense) throw new Error('Target expense was not found.');

  // 2. Fetch Transaction and existing allocations
  const { data: txData, error: txError } = await supabase
    .from('transactions')
    .select(`
      id,
      amount,
      transaction_type,
      workspace_id,
      property_id,
      allocations:expense_transactions(allocated_amount)
    `)
    .eq('id', validated.transaction_id)
    .single();

  const transaction = txData as {
    id: string;
    amount: number;
    transaction_type: string;
    workspace_id: string;
    property_id: string;
    allocations: Array<{ allocated_amount: number }>;
  } | null;

  if (txError || !transaction) {
    throw new Error('Target transaction was not found.');
  }

  if (transaction.transaction_type !== 'expense') {
    throw new Error('Only expense transactions can be allocated to expenses.');
  }

  if (transaction.workspace_id !== expense.workspace_id) {
    throw new Error('Expense and transaction must belong to the same workspace.');
  }

  // 3. Validate allocation limits
  const validationResult = validateExpenseAllocation(
    {
      amount: expense.amount,
      allocations: expense.allocations || [],
    },
    {
      amount: Number(transaction.amount),
      allocations: transaction.allocations || [],
    },
    validated.allocated_amount
  );

  if (!validationResult.valid) {
    throw new Error(validationResult.error || 'Invalid allocation amount.');
  }

  // 4. Upsert mapping record
  const { error: mapError } = await supabase
    .from('expense_transactions')
    .insert({
      expense_id: validated.expense_id,
      transaction_id: validated.transaction_id,
      allocated_amount: validated.allocated_amount,
      notes: validated.notes || null,
      created_by: userId || null,
    } as never);

  if (mapError) {
    console.error('Error linking transaction to expense:', mapError);
    throw new Error(`Failed to link transaction: ${mapError.message}`);
  }

  // 5. Update expense status
  const currentTotalAllocated = (expense.total_allocated || 0) + validated.allocated_amount;
  const newStatus = currentTotalAllocated >= expense.amount ? 'paid' : 'partially_paid';

  await supabase
    .from('expenses')
    .update({ status: newStatus } as never)
    .eq('id', validated.expense_id);

  const updatedExpense = await getExpenseById(validated.expense_id);
  if (!updatedExpense) throw new Error('Failed to load updated expense.');
  return updatedExpense;
}

/**
 * Unlink / Remove a transaction allocation from an expense
 */
export async function unlinkTransactionFromExpense(
  allocationId: string,
  userId?: string
): Promise<ExpenseDTO> {
  const supabase = await createClient();

  // 1. Fetch allocation to find expense_id
  const { data: allocData, error: allocError } = await supabase
    .from('expense_transactions')
    .select('id, expense_id, allocated_amount')
    .eq('id', allocationId)
    .single();

  if (allocError || !allocData) {
    throw new Error('Allocation record not found.');
  }

  const expenseId = (allocData as { id: string; expense_id: string }).expense_id;

  // 2. Delete allocation
  const { error: delError } = await supabase
    .from('expense_transactions')
    .delete()
    .eq('id', allocationId);

  if (delError) {
    throw new Error(`Failed to remove allocation: ${delError.message}`);
  }

  // 3. Recalculate expense status
  const updatedExpense = await getExpenseById(expenseId);
  if (!updatedExpense) throw new Error('Failed to reload expense.');

  const calc = calculateExpenseStatus(
    updatedExpense.amount,
    updatedExpense.allocations || []
  );

  await supabase
    .from('expenses')
    .update({ status: calc.status } as never)
    .eq('id', expenseId);

  return (await getExpenseById(expenseId))!;
}

/**
 * Fetch expense transactions from ledger that have remaining unallocated amount
 */
export async function getAvailableExpenseTransactionsForLinking(
  workspaceId: string,
  propertyId?: string
): Promise<Array<TransactionDTO & { available_to_allocate: number }>> {
  const supabase = await createClient();

  let query = supabase
    .from('transactions')
    .select(`
      id,
      amount,
      transaction_type,
      transaction_date,
      payment_method,
      description,
      reference,
      vendor_name,
      status,
      property_id,
      workspace_id,
      category:categories(name),
      property:properties(name),
      allocations:expense_transactions(allocated_amount)
    `)
    .eq('workspace_id', workspaceId)
    .eq('transaction_type', 'expense')
    .order('transaction_date', { ascending: false });

  if (propertyId) {
    query = query.eq('property_id', propertyId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching available transactions:', error);
    return [];
  }

  const results: Array<TransactionDTO & { available_to_allocate: number }> = [];

  for (const row of (data || []) as any[]) {
    const rawAllocations = row.allocations || [];
    const available = calculateExpenseTransactionAvailableAmount(
      Number(row.amount),
      rawAllocations
    );

    if (available > 0) {
      results.push({
        ...row,
        amount: Number(row.amount),
        available_to_allocate: available,
      });
    }
  }

  return results;
}

/**
 * Process multi-expense allocation: links a single ledger expense transaction across multiple business expenses in batch
 */
export async function allocateExpenseTransactionAcrossMultiple(
  transactionId: string,
  allocations: Array<{ expense_id: string; allocated_amount: number; notes?: string }>,
  userId?: string
): Promise<{ success: boolean; count: number }> {
  if (!allocations || allocations.length === 0) {
    throw new Error('No expense allocations provided');
  }

  const supabase = await createClient();

  // 1. Fetch transaction and verify remaining capacity
  const { data: tx, error: txErr } = await supabase
    .from('transactions')
    .select('id, workspace_id, amount, allocations:expense_transactions(allocated_amount)')
    .eq('id', transactionId)
    .single();

  if (txErr || !tx) {
    throw new Error(`Transaction not found: ${txErr?.message || transactionId}`);
  }

  const txObj = tx as any;

  const availableCapacity = calculateExpenseTransactionAvailableAmount(
    Number(txObj.amount),
    txObj.allocations || []
  );

  const totalRequested = allocations.reduce((sum, a) => sum + Number(a.allocated_amount || 0), 0);
  if (totalRequested > availableCapacity + 0.001) {
    throw new Error(
      `Total requested allocation ($${totalRequested.toFixed(2)}) exceeds available transaction capacity ($${availableCapacity.toFixed(2)})`
    );
  }

  let count = 0;
  // 2. Perform each allocation
  for (const alloc of allocations) {
    if (alloc.allocated_amount <= 0) continue;

    // Check expense
    const expense = await getExpenseById(alloc.expense_id);
    if (!expense) continue;

    const remainingBal = expense.remaining_amount ?? (expense.amount - (expense.total_allocated || 0));
    if (alloc.allocated_amount > remainingBal + 0.001) {
      throw new Error(
        `Allocation ($${alloc.allocated_amount.toFixed(2)}) exceeds remaining balance ($${remainingBal.toFixed(2)}) for expense ${expense.description || expense.id}`
      );
    }

    const { error: insErr } = await (supabase.from('expense_transactions') as any).upsert(
      {
        workspace_id: txObj.workspace_id,
        expense_id: alloc.expense_id,
        transaction_id: transactionId,
        allocated_amount: alloc.allocated_amount,
        notes: alloc.notes || null,
        created_by: userId || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'expense_id,transaction_id' }
    );

    if (insErr) {
      throw new Error(`Failed to map allocation: ${insErr.message}`);
    }

    // Recalculate status
    const updated = await getExpenseById(alloc.expense_id);
    if (updated) {
      await (supabase.from('expenses') as any)
        .update({ status: updated.status, updated_at: new Date().toISOString() })
        .eq('id', alloc.expense_id);
    }
    count++;
  }

  return { success: true, count };
}

/**
 * Settle / Pay an unpaid expense bill by creating a linked transaction and allocation
 */
export async function processExpensePayment(
  input: ProcessExpensePaymentInput,
  userId?: string
): Promise<ExpenseDTO> {
  const supabase = await createClient();

  // 1. Fetch current expense
  const expense = await getExpenseById(input.expense_id);
  if (!expense) {
    throw new Error('Expense bill was not found.');
  }

  const remaining = expense.remaining_amount ?? Math.max(0, expense.amount - (expense.total_allocated || 0));
  if (input.amount <= 0) {
    throw new Error('Payment amount must be greater than $0.');
  }
  if (input.amount > remaining + 0.01) {
    throw new Error(`Payment amount ($${input.amount.toFixed(2)}) exceeds remaining balance ($${remaining.toFixed(2)}).`);
  }

  // 2. Create financial ledger transaction
  const txPayload = {
    amount: input.amount,
    transaction_type: 'expense',
    transaction_category_id: expense.transaction_category_id,
    transaction_date: input.payment_date,
    property_id: expense.property_id,
    workspace_id: expense.workspace_id,
    lease_id: expense.lease_id || null,
    vendor_name: expense.vendor_name || null,
    description: expense.description ? `Payment: ${expense.description}` : `Settlement payment for ${expense.vendor_name || 'bill'}`,
    reference: input.reference || expense.reference || null,
    payment_method: input.payment_method || 'bank_transfer',
    status: 'completed',
    notes: input.notes ? `[Expense #${expense.id.slice(0, 8)}] ${input.notes}` : `Settled payment for Expense #${expense.id.slice(0, 8)}`,
    created_by: userId || null,
  };

  const { data: txData, error: txError } = await supabase
    .from('transactions')
    .insert(txPayload as never)
    .select('id')
    .single();

  if (txError || !txData) {
    throw new Error(`Failed to create ledger settlement transaction: ${txError?.message}`);
  }

  const transactionId = (txData as { id: string }).id;

  // 3. Create mapping in expense_transactions
  const mappingPayload = {
    expense_id: expense.id,
    transaction_id: transactionId,
    allocated_amount: input.amount,
    notes: input.notes || 'Settlement payment allocation',
    created_by: userId || null,
  };

  const { error: mapError } = await supabase
    .from('expense_transactions')
    .insert(mappingPayload as never);

  if (mapError) {
    console.error('Error creating expense transaction mapping:', mapError);
    throw new Error(`Failed to link payment to expense: ${mapError.message}`);
  }

  // 4. Update expense status
  const totalAllocated = (expense.total_allocated || 0) + input.amount;
  const newStatus = totalAllocated >= (expense.amount - 0.01) ? 'paid' : 'partially_paid';

  await supabase
    .from('expenses')
    .update({ status: newStatus, updated_at: new Date().toISOString() } as never)
    .eq('id', expense.id);

  // 5. Activity log
  try {
    const adminClient = await createAdminClient();
    await adminClient.from('activity_logs').insert({
      workspace_id: expense.workspace_id,
      property_id: expense.property_id,
      actor_id: userId || null,
      action: 'expense_paid',
      entity_type: 'expense',
      entity_id: expense.id,
      metadata: {
        amount_paid: input.amount,
        payment_method: input.payment_method,
        transaction_id: transactionId,
        new_status: newStatus,
      },
    } as never);
  } catch (logErr) {
    console.warn('Could not write activity log for expense settlement:', logErr);
  }

  const updated = await getExpenseById(expense.id);
  if (!updated) throw new Error('Payment was recorded but failed to retrieve updated expense.');
  return updated;
}


