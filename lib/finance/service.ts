import { createClient, createAdminClient } from '@/lib/supabase/server';
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
import {
  calculateLedger,
  calculateFinancialSummary,
  isIncome,
  isExpense,
} from '@/modules/finance/domain/calculations';
import { createTransactionSchema, updateTransactionSchema } from '@/modules/finance/domain/validation';

/**
 * Fetch all active financial categories (or filtered by income/expense)
 */
export async function getCategories(type?: TransactionType): Promise<CategoryDTO[]> {
  const supabase = await createClient();
  let query = supabase
    .from('categories')
    .select('id, transaction_type, name, description, is_active, created_at, updated_at')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (type) {
    query = query.eq('transaction_type', type);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching categories:', error);
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return (data || []) as CategoryDTO[];
}

/**
 * Fetch transactions with joined relations and filtering
 */
export async function getTransactions(
  filters: TransactionFilterParams = {}
): Promise<TransactionDTO[]> {
  const supabase = await createClient();

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
      tenant:tenants(id, first_name, last_name, email),
      lease:leases(id, start_date, end_date, rent_amount, status),
      invoice:invoices(id, invoice_number, total_amount)
    `)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters.workspace_id) {
    query = query.eq('workspace_id', filters.workspace_id);
  }
  if (filters.property_id) {
    query = query.eq('property_id', filters.property_id);
  }
  if (filters.transaction_type && filters.transaction_type !== 'all') {
    query = query.eq('transaction_type', filters.transaction_type);
  }
  if (filters.transaction_category_id) {
    query = query.eq('transaction_category_id', filters.transaction_category_id);
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.payment_method) {
    query = query.eq('payment_method', filters.payment_method);
  }
  if (filters.tenant_id) {
    query = query.eq('tenant_id', filters.tenant_id);
  }
  if (filters.lease_id) {
    query = query.eq('lease_id', filters.lease_id);
  }
  if (filters.invoice_id) {
    query = query.eq('invoice_id', filters.invoice_id);
  }
  if (filters.start_date) {
    query = query.gte('transaction_date', filters.start_date);
  }
  if (filters.end_date) {
    query = query.lte('transaction_date', filters.end_date);
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching transactions:', error);
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  let results = (data || []) as unknown as TransactionDTO[];

  // In-memory text search if query provided
  if (filters.search_query && filters.search_query.trim()) {
    const q = filters.search_query.toLowerCase().trim();
    results = results.filter((tx) => {
      return (
        tx.description?.toLowerCase().includes(q) ||
        tx.reference?.toLowerCase().includes(q) ||
        tx.vendor_name?.toLowerCase().includes(q) ||
        tx.category?.name.toLowerCase().includes(q) ||
        tx.property?.name.toLowerCase().includes(q) ||
        (tx.tenant && `${tx.tenant.first_name} ${tx.tenant.last_name}`.toLowerCase().includes(q)) ||
        tx.invoice?.invoice_number.toLowerCase().includes(q) ||
        String(tx.amount).includes(q)
      );
    });
  }

  return results;
}

/**
 * Get a single transaction by ID
 */
export async function getTransactionById(id: string): Promise<TransactionDTO | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
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
      tenant:tenants(id, first_name, last_name, email),
      lease:leases(id, start_date, end_date, rent_amount, status),
      invoice:invoices(id, invoice_number, total_amount)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get transaction: ${error.message}`);
  }

  return data as unknown as TransactionDTO;
}

/**
 * Create a new transaction with strict consistency and validation
 */
export async function createTransaction(
  input: CreateTransactionInput,
  userId?: string
): Promise<TransactionDTO> {
  const validated = createTransactionSchema.parse(input);
  const supabase = await createClient();

  // 1. Verify Category exists and matches transaction_type
  const { data: catData, error: catError } = await supabase
    .from('categories')
    .select('id, transaction_type, name, is_active')
    .eq('id', validated.transaction_category_id)
    .single();

  const category = catData as { id: string; transaction_type: string; name: string; is_active: boolean } | null;

  if (catError || !category) {
    throw new Error('Selected transaction category was not found.');
  }

  if (category.transaction_type !== validated.transaction_type) {
    throw new Error(
      `Category "${category.name}" is an ${category.transaction_type} category and cannot be used with a ${validated.transaction_type} transaction.`
    );
  }

  if (!category.is_active) {
    throw new Error(`Category "${category.name}" is inactive.`);
  }

  // 2. Resolve Workspace ID from Property if not explicitly passed
  let workspaceId = validated.workspace_id;
  if (!workspaceId) {
    const { data: propData, error: propError } = await supabase
      .from('properties')
      .select('id, workspace_id')
      .eq('id', validated.property_id)
      .single();

    const property = propData as { id: string; workspace_id: string } | null;

    if (propError || !property) {
      throw new Error('Associated property was not found.');
    }
    workspaceId = property.workspace_id;
  }

  // 3. If lease_id is provided, verify it exists and belongs to the selected property
  if (validated.lease_id) {
    const { data: leaseData, error: leaseError } = await supabase
      .from('leases')
      .select('id, property_id, workspace_id')
      .eq('id', validated.lease_id)
      .single();

    const lease = leaseData as { id: string; property_id: string; workspace_id?: string } | null;

    if (leaseError || !lease) {
      throw new Error('Selected lease was not found.');
    }

    if (lease.property_id !== validated.property_id) {
      throw new Error('Selected lease does not belong to the selected property.');
    }

    if (lease.workspace_id && lease.workspace_id !== workspaceId) {
      throw new Error('Selected lease does not belong to the active workspace.');
    }
  }

  // 4. Insert transaction
  const insertPayload = {
    amount: validated.amount,
    transaction_type: validated.transaction_type,
    transaction_category_id: validated.transaction_category_id,
    transaction_date: validated.transaction_date,
    property_id: validated.property_id,
    workspace_id: workspaceId,
    payment_method: validated.payment_method || null,
    description: validated.description || null,
    reference: validated.reference || null,
    vendor_name: validated.vendor_name || null,
    notes: validated.notes || null,
    status: validated.status || 'completed',
    tenant_id: validated.tenant_id || null,
    lease_id: validated.lease_id || null,
    invoice_id: validated.invoice_id || null,
    created_by: userId || null,
  };

  const { data: insertData, error } = await supabase
    .from('transactions')
    .insert(insertPayload as never)
    .select('id')
    .single();

  if (error || !insertData) {
    console.error('Error inserting transaction:', error);
    throw new Error(`Failed to create transaction: ${error?.message || 'Unknown error'}`);
  }

  const insertedId = (insertData as { id: string }).id;

  // Log activity
  try {
    const adminClient = await createAdminClient();
    await adminClient.from('activity_logs').insert({
      workspace_id: workspaceId,
      property_id: validated.property_id,
      actor_id: userId || null,
      action: 'transaction_created',
      entity_type: 'transaction',
      entity_id: insertedId,
      metadata: {
        amount: validated.amount,
        type: validated.transaction_type,
        category: category.name,
      },
    } as never);
  } catch (logErr) {
    console.warn('Could not write to activity log:', logErr);
  }

  const createdTx = await getTransactionById(insertedId);
  if (!createdTx) throw new Error('Transaction was created but could not be loaded.');
  return createdTx;
}

/**
 * Update an existing transaction
 */
export async function updateTransaction(
  id: string,
  input: UpdateTransactionInput,
  userId?: string
): Promise<TransactionDTO> {
  const validated = updateTransactionSchema.parse(input);
  const supabase = await createClient();

  // Fetch current record
  const current = await getTransactionById(id);
  if (!current) throw new Error('Transaction not found.');

  const effectiveType = validated.transaction_type || current.transaction_type;
  const effectiveCatId = validated.transaction_category_id || current.transaction_category_id;

  // Validate category type consistency
  if (validated.transaction_type || validated.transaction_category_id) {
    const { data: catData, error: catError } = await supabase
      .from('categories')
      .select('id, transaction_type, name')
      .eq('id', effectiveCatId)
      .single();

    const category = catData as { id: string; transaction_type: string; name: string } | null;

    if (catError || !category) {
      throw new Error('Selected transaction category was not found.');
    }

    if (category.transaction_type !== effectiveType) {
      throw new Error(
        `Category "${category.name}" is an ${category.transaction_type} category and cannot be used with a ${effectiveType} transaction.`
      );
    }
  }

  // Validate lease consistency if lease_id is being set or property_id is updated
  const effectivePropertyId = validated.property_id || current.property_id;
  const effectiveLeaseId = validated.lease_id !== undefined ? validated.lease_id : current.lease_id;

  if (effectiveLeaseId) {
    const { data: leaseData, error: leaseError } = await supabase
      .from('leases')
      .select('id, property_id, workspace_id')
      .eq('id', effectiveLeaseId)
      .single();

    const lease = leaseData as { id: string; property_id: string; workspace_id?: string } | null;

    if (leaseError || !lease) {
      throw new Error('Selected lease was not found.');
    }

    if (lease.property_id !== effectivePropertyId) {
      throw new Error('Selected lease does not belong to the selected property.');
    }

    if (lease.workspace_id && lease.workspace_id !== current.workspace_id) {
      throw new Error('Selected lease does not belong to the active workspace.');
    }
  }

  const updatePayload: Record<string, unknown> = {};
  if (validated.amount !== undefined) updatePayload.amount = validated.amount;
  if (validated.transaction_type !== undefined) updatePayload.transaction_type = validated.transaction_type;
  if (validated.transaction_category_id !== undefined) updatePayload.transaction_category_id = validated.transaction_category_id;
  if (validated.transaction_date !== undefined) updatePayload.transaction_date = validated.transaction_date;
  if (validated.property_id !== undefined) updatePayload.property_id = validated.property_id;
  if (validated.payment_method !== undefined) updatePayload.payment_method = validated.payment_method;
  if (validated.description !== undefined) updatePayload.description = validated.description;
  if (validated.reference !== undefined) updatePayload.reference = validated.reference;
  if (validated.vendor_name !== undefined) updatePayload.vendor_name = validated.vendor_name;
  if (validated.notes !== undefined) updatePayload.notes = validated.notes;
  if (validated.status !== undefined) updatePayload.status = validated.status;
  if (validated.tenant_id !== undefined) updatePayload.tenant_id = validated.tenant_id;
  if (validated.lease_id !== undefined) updatePayload.lease_id = validated.lease_id;
  if (validated.invoice_id !== undefined) updatePayload.invoice_id = validated.invoice_id;

  const { error } = await supabase
    .from('transactions')
    .update(updatePayload as never)
    .eq('id', id);

  if (error) {
    console.error('Error updating transaction:', error);
    throw new Error(`Failed to update transaction: ${error.message}`);
  }

  // Log activity
  try {
    const adminClient = await createAdminClient();
    await adminClient.from('activity_logs').insert({
      workspace_id: current.workspace_id,
      property_id: current.property_id,
      actor_id: userId || null,
      action: 'transaction_updated',
      entity_type: 'transaction',
      entity_id: id,
      metadata: { changes: updatePayload },
    } as never);
  } catch (logErr) {
    console.warn('Could not write to activity log:', logErr);
  }

  const updatedTx = await getTransactionById(id);
  if (!updatedTx) throw new Error('Failed to retrieve updated transaction.');
  return updatedTx;
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(id: string, userId?: string): Promise<boolean> {
  const current = await getTransactionById(id);
  if (!current) throw new Error('Transaction not found.');

  const supabase = await createClient();
  const { error } = await supabase.from('transactions').delete().eq('id', id);

  if (error) {
    console.error('Error deleting transaction:', error);
    throw new Error(`Failed to delete transaction: ${error.message}`);
  }

  // Log activity
  try {
    const adminClient = await createAdminClient();
    await adminClient.from('activity_logs').insert({
      workspace_id: current.workspace_id,
      property_id: current.property_id,
      actor_id: userId || null,
      action: 'transaction_deleted',
      entity_type: 'transaction',
      entity_id: id,
      metadata: {
        amount: current.amount,
        type: current.transaction_type,
        category: current.category?.name,
      },
    } as never);
  } catch (logErr) {
    console.warn('Could not write to activity log:', logErr);
  }

  return true;
}

/**
 * Fetch dynamically generated Ledger entries with running balance
 */
export async function getLedger(filters: TransactionFilterParams = {}): Promise<LedgerEntryDTO[]> {
  const transactions = await getTransactions(filters);
  return calculateLedger(transactions);
}

/**
 * Fetch financial summary (KPIs, category breakdowns, monthly trends)
 */
export async function getFinancialOverview(
  filters: TransactionFilterParams = {}
): Promise<FinancialSummaryDTO> {
  const transactions = await getTransactions(filters);
  return calculateFinancialSummary(transactions);
}

/**
 * Generate CSV string from ledger entries
 */
export function generateLedgerCsv(entries: LedgerEntryDTO[]): string {
  const headers = [
    'DATE',
    'REF.',
    'A/C',
    'TYPE',
    'PROPERTY',
    'DETAILS',
    'PAYEE / PAYER',
    'DEBIT ($)',
    'CREDIT ($)',
    'BALANCE ($)',
  ];

  const escapeCsv = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = entries.map((e) => {
    const tx = e.transaction;
    const payeePayer =
      tx?.vendor_name ||
      (tx?.tenant ? `${tx.tenant.first_name || ''} ${tx.tenant.last_name || ''}`.trim() : '') ||
      '';
    const isExp = isExpense(e.transaction_type);
    const isInc = isIncome(e.transaction_type);

    return [
      escapeCsv(e.date),
      escapeCsv(e.reference || tx?.invoice?.invoice_number || ''),
      escapeCsv(e.category_name),
      escapeCsv(isInc ? 'INCOME' : 'EXPENSE'),
      escapeCsv(e.property_name),
      escapeCsv(e.description),
      escapeCsv(payeePayer),
      escapeCsv(isExp && e.money_out > 0 ? e.money_out.toFixed(2) : ''),
      escapeCsv(isInc && e.money_in > 0 ? e.money_in.toFixed(2) : ''),
      escapeCsv(e.running_balance.toFixed(2)),
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * Creates a batch of auto-allocated transactions across multiple active leases.
 */
export async function createBatchAutoAllocatedTransactions(
  input: {
    totalAmount: number;
    transaction_category_id: string;
    transaction_date: string;
    payment_method?: string;
    workspace_id: string;
    description?: string;
    notes?: string;
    allocations: Array<{
      lease_id: string;
      property_id: string;
      tenant_id?: string | null;
      allocated_amount: number;
      property_name?: string;
    }>;
  },
  userId: string
): Promise<TransactionDTO[]> {
  const supabase = await createClient();

  const validAllocations = input.allocations.filter((a) => a.allocated_amount > 0);

  if (validAllocations.length === 0) {
    throw new Error('No non-zero allocations provided for batch processing.');
  }

  const batchRef = `ALLOC-${Date.now().toString().slice(-6)}`;
  const baseDescription = input.description || 'Auto-Allocated Rent Payment';

  const rowsToInsert = validAllocations.map((item) => ({
    amount: item.allocated_amount,
    transaction_type: 'income',
    transaction_category_id: input.transaction_category_id,
    transaction_date: input.transaction_date,
    property_id: item.property_id,
    lease_id: item.lease_id,
    tenant_id: item.tenant_id || null,
    workspace_id: input.workspace_id,
    payment_method: input.payment_method || 'bank_transfer',
    description: `${baseDescription} (${item.property_name || 'Lease'})`,
    reference: batchRef,
    notes: input.notes
      ? `${input.notes} [Auto-allocated batch ${batchRef}]`
      : `Auto-allocated from total lump-sum payment of $${input.totalAmount.toFixed(2)} [Ref: ${batchRef}]`,
    status: 'completed',
    created_by: userId,
  }));

  const { data, error } = await supabase.from('transactions').insert(rowsToInsert as never).select(`
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
    tenant:tenants(id, first_name, last_name, email),
    lease:leases(id, start_date, end_date, rent_amount, status)
  `);

  if (error) {
    console.error('Error creating batch transactions:', error);
    throw new Error(`Failed to create auto-allocated transactions: ${error.message}`);
  }

  return (data || []) as TransactionDTO[];
}

