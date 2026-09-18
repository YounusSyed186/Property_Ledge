import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  ExpectedPaymentScheduleDTO,
  TransactionScheduleAllocationDTO,
  CreateExpectedScheduleInput,
  UpdateExpectedScheduleInput,
  ExpectedScheduleFilterParams,
  AllocateTransactionInput,
  RecordTransactionFromExpectedInput,
  TransactionDTO,
} from '@/modules/finance/domain/types';
import { generateScheduleEntries } from '@/modules/finance/domain/scheduleGenerator';
import {
  calculateExpectedPaymentStatus,
  calculateTransactionUnallocatedAmount,
  validateAllocation,
} from '@/modules/finance/domain/allocationCalculations';
import { createTransaction } from '@/lib/finance/service';

/**
 * Fetch expected payment schedules with relations and calculated status/remaining balance
 */
export async function getExpectedPaymentSchedules(
  filters: ExpectedScheduleFilterParams = {}
): Promise<ExpectedPaymentScheduleDTO[]> {
  const supabase = await createClient();

  let query = supabase
    .from('expected_payment_schedule')
    .select(`
      id,
      workspace_id,
      property_id,
      lease_id,
      tenant_id,
      transaction_category_id,
      schedule_name,
      schedule_type,
      amount,
      due_date,
      frequency,
      status,
      start_date,
      end_date,
      notes,
      created_by,
      created_at,
      updated_at,
      category:categories(id, transaction_type, name, description, is_active, created_at, updated_at),
      property:properties(id, name, address_line_1, city, state),
      lease:leases(id, start_date, end_date, rent_amount, status),
      tenant:tenants(id, first_name, last_name, email),
      allocations:transaction_schedule_allocations(
        id,
        transaction_id,
        expected_payment_id,
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
    .order('due_date', { ascending: true })
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
  if (filters.schedule_type && filters.schedule_type !== 'all') {
    query = query.eq('schedule_type', filters.schedule_type);
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.start_date) {
    query = query.gte('due_date', filters.start_date);
  }
  if (filters.end_date) {
    query = query.lte('due_date', filters.end_date);
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching expected payment schedules:', error);
    throw new Error(`Failed to fetch expected payment schedules: ${error.message}`);
  }

  const rawEntries = (data || []) as unknown as ExpectedPaymentScheduleDTO[];

  // Calculate dynamic allocation breakdown, status, and remaining amount for each entry
  let results = rawEntries.map((entry) => {
    const allocations = entry.allocations || [];
    const calculated = calculateExpectedPaymentStatus(
      Number(entry.amount),
      allocations,
      entry.status,
      entry.due_date
    );

    return {
      ...entry,
      amount: Number(entry.amount),
      total_allocated: calculated.total_allocated,
      remaining_amount: calculated.remaining_amount,
      status: calculated.status,
    };
  });

  // Client-side text search if search_query is provided
  if (filters.search_query && filters.search_query.trim()) {
    const q = filters.search_query.toLowerCase().trim();
    results = results.filter((item) => {
      return (
        item.schedule_name.toLowerCase().includes(q) ||
        item.property?.name.toLowerCase().includes(q) ||
        (item.tenant && `${item.tenant.first_name} ${item.tenant.last_name}`.toLowerCase().includes(q)) ||
        item.category?.name.toLowerCase().includes(q) ||
        String(item.amount).includes(q) ||
        item.notes?.toLowerCase().includes(q)
      );
    });
  }

  return results;
}

/**
 * Get a single expected payment entry by ID
 */
export async function getExpectedPaymentScheduleById(id: string): Promise<ExpectedPaymentScheduleDTO | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('expected_payment_schedule')
    .select(`
      id,
      workspace_id,
      property_id,
      lease_id,
      tenant_id,
      transaction_category_id,
      schedule_name,
      schedule_type,
      amount,
      due_date,
      frequency,
      status,
      start_date,
      end_date,
      notes,
      created_by,
      created_at,
      updated_at,
      category:categories(id, transaction_type, name, description, is_active, created_at, updated_at),
      property:properties(id, name, address_line_1, city, state),
      lease:leases(id, start_date, end_date, rent_amount, status),
      tenant:tenants(id, first_name, last_name, email),
      allocations:transaction_schedule_allocations(
        id,
        transaction_id,
        expected_payment_id,
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
    throw new Error(`Failed to get expected payment schedule: ${error.message}`);
  }

  const entry = data as unknown as ExpectedPaymentScheduleDTO;
  const allocations = entry.allocations || [];
  const calculated = calculateExpectedPaymentStatus(
    Number(entry.amount),
    allocations,
    entry.status,
    entry.due_date
  );

  return {
    ...entry,
    amount: Number(entry.amount),
    total_allocated: calculated.total_allocated,
    remaining_amount: calculated.remaining_amount,
    status: calculated.status,
  };
}

/**
 * Create a new payment schedule (Lease-Based or Independent) and batch insert expected entries
 */
export async function createPaymentSchedule(
  input: CreateExpectedScheduleInput,
  userId?: string
): Promise<ExpectedPaymentScheduleDTO[]> {
  const supabase = await createClient();

  // Resolve workspace_id from property or lease if not passed
  let workspaceId = input.workspace_id;

  if (!workspaceId && input.property_id) {
    const { data: prop } = await supabase
      .from('properties')
      .select('workspace_id')
      .eq('id', input.property_id)
      .single();
    if (prop) workspaceId = (prop as any).workspace_id;
  }

  if (!workspaceId && input.lease_id) {
    const { data: lease } = await supabase
      .from('leases')
      .select('properties!inner(workspace_id), property_id')
      .eq('id', input.lease_id)
      .single();
    if (lease) {
      const leaseObj = lease as any;
      if (leaseObj.properties?.workspace_id) {
        workspaceId = leaseObj.properties.workspace_id;
      }
      if (!input.property_id && leaseObj.property_id) {
        input.property_id = leaseObj.property_id;
      }
    }
  }

  if (!workspaceId) {
    throw new Error('Workspace ID could not be determined for payment schedule.');
  }

  // Generate schedule entries
  const generatedEntries = generateScheduleEntries({
    ...input,
    workspace_id: workspaceId,
  });

  if (generatedEntries.length === 0) {
    throw new Error('No expected payment schedule entries generated.');
  }

  const insertPayload = generatedEntries.map((item) => ({
    workspace_id: workspaceId,
    property_id: item.property_id || null,
    lease_id: item.lease_id || null,
    tenant_id: item.tenant_id || null,
    transaction_category_id: item.transaction_category_id || null,
    schedule_name: item.schedule_name,
    schedule_type: item.schedule_type,
    amount: item.amount,
    due_date: item.due_date,
    frequency: item.frequency,
    status: 'pending',
    start_date: item.start_date,
    end_date: item.end_date,
    notes: item.notes || null,
    created_by: userId || null,
  }));

  const { data, error } = await supabase
    .from('expected_payment_schedule')
    .insert(insertPayload as never)
    .select('id');

  if (error) {
    console.error('Error creating payment schedule entries:', error);
    throw new Error(`Failed to create payment schedule: ${error.message}`);
  }

  const insertedIds = (data || []).map((d: { id: string }) => d.id);
  const result: ExpectedPaymentScheduleDTO[] = [];

  for (const id of insertedIds) {
    const fetched = await getExpectedPaymentScheduleById(id);
    if (fetched) result.push(fetched);
  }

  return result;
}

/**
 * Modify an existing expected payment entry (Enforcing referential integrity for linked transactions - Journey 8)
 */
export async function updateExpectedPaymentEntry(
  id: string,
  input: UpdateExpectedScheduleInput,
  userId?: string
): Promise<ExpectedPaymentScheduleDTO> {
  const current = await getExpectedPaymentScheduleById(id);
  if (!current) throw new Error('Expected payment entry not found.');

  // Check if entry has actual transaction allocations (Journey 8)
  if (current.allocations && current.allocations.length > 0) {
    if (input.amount !== undefined && input.amount !== current.amount) {
      throw new Error(
        'This expected payment entry has linked actual transactions and its amount cannot be modified to preserve financial history integrity.'
      );
    }
  }

  const supabase = await createClient();
  const updatePayload: Record<string, unknown> = {};

  if (input.schedule_name !== undefined) updatePayload.schedule_name = input.schedule_name;
  if (input.amount !== undefined) updatePayload.amount = input.amount;
  if (input.due_date !== undefined) updatePayload.due_date = input.due_date;
  if (input.notes !== undefined) updatePayload.notes = input.notes;
  if (input.status !== undefined) updatePayload.status = input.status;

  const { error } = await supabase
    .from('expected_payment_schedule')
    .update(updatePayload as never)
    .eq('id', id);

  if (error) {
    console.error('Error updating expected payment entry:', error);
    throw new Error(`Failed to update expected payment entry: ${error.message}`);
  }

  const updated = await getExpectedPaymentScheduleById(id);
  if (!updated) throw new Error('Failed to load updated expected payment entry.');
  return updated;
}

/**
 * Delete an expected payment entry (Enforcing protection against breaking financial history - Journey 8)
 */
export async function deleteExpectedPaymentEntry(id: string, userId?: string): Promise<boolean> {
  const current = await getExpectedPaymentScheduleById(id);
  if (!current) throw new Error('Expected payment entry not found.');

  // Check referential integrity (Journey 8)
  if (current.allocations && current.allocations.length > 0) {
    throw new Error(
      'Cannot delete expected payment entry because it has actual financial transactions linked to it. Delete or unlink the transactions first.'
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from('expected_payment_schedule').delete().eq('id', id);

  if (error) {
    console.error('Error deleting expected payment entry:', error);
    throw new Error(`Failed to delete expected payment entry: ${error.message}`);
  }

  return true;
}

/**
 * Fetch transactions eligible for linking to an expected payment entry (unallocated or partially allocated)
 */
export async function getEligibleTransactionsForExpectedPayment(
  expectedPaymentId: string
): Promise<Array<TransactionDTO & { unallocated_amount: number }>> {
  const expected = await getExpectedPaymentScheduleById(expectedPaymentId);
  if (!expected) throw new Error('Expected payment schedule entry not found.');

  const supabase = await createClient();

  // Fetch transactions in the same workspace (and property if set)
  let query = supabase
    .from('transactions')
    .select(`
      id,
      amount,
      transaction_type,
      transaction_category_id,
      transaction_date,
      payment_method,
      description,
      reference,
      vendor_name,
      notes,
      status,
      tenant_id,
      lease_id,
      invoice_id,
      property_id,
      workspace_id,
      created_by,
      created_at,
      updated_at,
      category:categories(id, transaction_type, name, description, is_active, created_at, updated_at),
      property:properties(id, name, address_line_1, city, state),
      tenant:tenants(id, first_name, last_name, email)
    `)
    .eq('workspace_id', expected.workspace_id)
    .eq('transaction_type', 'income')
    .eq('status', 'completed')
    .order('transaction_date', { ascending: false });

  if (expected.property_id) {
    query = query.eq('property_id', expected.property_id);
  }

  const { data: txData, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  const transactions = (txData || []) as unknown as TransactionDTO[];

  // Fetch existing allocations for these transactions
  const txIds = transactions.map((t) => t.id);
  if (txIds.length === 0) return [];

  const { data: allocData } = await supabase
    .from('transaction_schedule_allocations')
    .select('*')
    .in('transaction_id', txIds);

  const existingAllocations = (allocData || []) as TransactionScheduleAllocationDTO[];

  // Filter transactions that have unallocated amounts remaining
  const result: Array<TransactionDTO & { unallocated_amount: number }> = [];

  for (const tx of transactions) {
    const unallocated = calculateTransactionUnallocatedAmount(tx, existingAllocations);
    if (unallocated > 0) {
      result.push({
        ...tx,
        amount: Number(tx.amount),
        unallocated_amount: unallocated,
      });
    }
  }

  return result;
}

/**
 * Link an existing transaction to an expected payment entry (Journey 4 & 6)
 */
export async function allocateTransactionToExpectedPayment(
  input: AllocateTransactionInput,
  userId?: string
): Promise<TransactionScheduleAllocationDTO> {
  const { transaction_id, expected_payment_id, allocated_amount, notes } = input;

  const expected = await getExpectedPaymentScheduleById(expected_payment_id);
  if (!expected) throw new Error('Expected payment entry not found.');

  const supabase = await createClient();

  // Fetch transaction details
  const { data: txData, error: txError } = await supabase
    .from('transactions')
    .select('id, amount, status')
    .eq('id', transaction_id)
    .single();

  if (txError || !txData) {
    throw new Error('Transaction not found.');
  }

  const transaction = txData as { id: string; amount: number; status: string };

  // Validate allocation amount against expected remaining & transaction unallocated amount
  validateAllocation(expected, Number(transaction.amount), allocated_amount, expected.allocations || []);

  const insertPayload = {
    transaction_id,
    expected_payment_id,
    allocated_amount,
    notes: notes || null,
    created_by: userId || null,
  };

  const { data: allocData, error: allocError } = await supabase
    .from('transaction_schedule_allocations')
    .insert(insertPayload as never)
    .select('id')
    .single();

  if (allocError || !allocData) {
    console.error('Error inserting transaction allocation:', allocError);
    throw new Error(`Failed to link transaction: ${allocError?.message || 'Unknown error'}`);
  }

  // Update expected payment schedule status based on total allocated
  const updatedExpected = await getExpectedPaymentScheduleById(expected_payment_id);
  if (updatedExpected) {
    await supabase
      .from('expected_payment_schedule')
      .update({ status: updatedExpected.status } as never)
      .eq('id', expected_payment_id);
  }

  return {
    id: (allocData as { id: string }).id,
    transaction_id,
    expected_payment_id,
    allocated_amount,
    notes: notes || null,
    created_by: userId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Record a new actual transaction from an expected payment entry (Journey 5)
 */
export async function recordTransactionForExpectedPayment(
  input: RecordTransactionFromExpectedInput,
  userId?: string
): Promise<{ transaction: TransactionDTO; allocation: TransactionScheduleAllocationDTO }> {
  const expected = await getExpectedPaymentScheduleById(input.expected_payment_id);
  if (!expected) throw new Error('Expected payment entry not found.');

  const allocAmount = input.allocation_amount || input.amount;

  // 1. Create the actual transaction in transactions table
  const createdTransaction = await createTransaction(
    {
      amount: input.amount,
      transaction_type: 'income',
      transaction_category_id: input.transaction_category_id,
      transaction_date: input.transaction_date,
      property_id: input.property_id || expected.property_id || '',
      lease_id: input.lease_id || expected.lease_id || undefined,
      tenant_id: input.tenant_id || expected.tenant_id || undefined,
      payment_method: input.payment_method,
      description: input.description || `Payment for ${expected.schedule_name}`,
      notes: input.notes,
      status: 'completed',
    },
    userId
  );

  // 2. Link transaction to expected payment entry
  const allocation = await allocateTransactionToExpectedPayment(
    {
      transaction_id: createdTransaction.id,
      expected_payment_id: input.expected_payment_id,
      allocated_amount: allocAmount,
      notes: `Recorded & linked from expected payment schedule ${expected.schedule_name}`,
    },
    userId
  );

  return {
    transaction: createdTransaction,
    allocation,
  };
}

/**
 * Allocate one transaction across multiple expected payment entries (Journey 7)
 */
export async function allocateTransactionAcrossMultiple(
  transactionId: string,
  allocations: Array<{ expected_payment_id: string; allocated_amount: number }>,
  userId?: string
): Promise<TransactionScheduleAllocationDTO[]> {
  if (allocations.length === 0) {
    throw new Error('No allocation entries provided.');
  }

  const results: TransactionScheduleAllocationDTO[] = [];

  for (const alloc of allocations) {
    if (alloc.allocated_amount > 0) {
      const created = await allocateTransactionToExpectedPayment(
        {
          transaction_id: transactionId,
          expected_payment_id: alloc.expected_payment_id,
          allocated_amount: alloc.allocated_amount,
        },
        userId
      );
      results.push(created);
    }
  }

  return results;
}

/**
 * Remove an existing allocation link
 */
export async function unlinkAllocation(allocationId: string, userId?: string): Promise<boolean> {
  const supabase = await createClient();

  // Find allocation
  const { data: alloc, error: findError } = await supabase
    .from('transaction_schedule_allocations')
    .select('expected_payment_id')
    .eq('id', allocationId)
    .single();

  if (findError || !alloc) {
    throw new Error('Allocation record not found.');
  }

  const expectedId = (alloc as { expected_payment_id: string }).expected_payment_id;

  const { error } = await supabase
    .from('transaction_schedule_allocations')
    .delete()
    .eq('id', allocationId);

  if (error) {
    console.error('Error deleting allocation:', error);
    throw new Error(`Failed to unlink allocation: ${error.message}`);
  }

  // Recalculate status of expected payment
  const updatedExpected = await getExpectedPaymentScheduleById(expectedId);
  if (updatedExpected) {
    await supabase
      .from('expected_payment_schedule')
      .update({ status: updatedExpected.status } as never)
      .eq('id', expectedId);
  }

  return true;
}
