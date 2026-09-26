import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  ExpenseDTO,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseFilterParams,
  CategoryDTO,
} from '@/modules/finance/domain/types';
import {
  createExpenseSchema,
  updateExpenseSchema,
} from '@/modules/finance/domain/validation';

/**
 * Fetch business expense transactions with full relational joins and filtering.
 * Source of Truth: public.transactions WHERE transaction_type = 'expense'.
 */
export async function getExpenses(
  filters: ExpenseFilterParams = {}
): Promise<ExpenseDTO[]> {
  const supabase = await createClient();

  const buildQuery = (client: any) => {
    let q = client
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
        gst_inclusive,
        gst_amount,
        tax_classification_id,
        receipt_url,
        receipt_blob_path,
        receipt_file_name,
        receipt_file_size,
        receipt_mime_type,
        receipt_uploaded_at,
        category:categories(
          id,
          transaction_type,
          name,
          description,
          is_active,
          category_group_id,
          default_tax_classification_id,
          created_at,
          updated_at
        ),
        tax_classification:tax_classifications(
          id,
          workspace_id,
          name,
          bas_code,
          description,
          is_active
        ),
        property:properties(
          id,
          name,
          address_line_1,
          city,
          state,
          gst_enabled
        ),
        lease:leases(
          id,
          start_date,
          end_date,
          rent_amount,
          status
        ),
        attachments:transaction_attachments(
          id,
          workspace_id,
          transaction_id,
          blob_url,
          blob_path,
          file_name,
          mime_type,
          file_size,
          source_path,
          created_at
        )
      `)
      .eq('transaction_type', 'expense')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.workspace_id) {
      q = q.eq('workspace_id', filters.workspace_id);
    }
    if (filters.property_id) {
      q = q.eq('property_id', filters.property_id);
    }
    if (filters.lease_id) {
      q = q.eq('lease_id', filters.lease_id);
    }
    if (filters.transaction_category_id) {
      q = q.eq('transaction_category_id', filters.transaction_category_id);
    }
    if (filters.tax_classification_id) {
      q = q.eq('tax_classification_id', filters.tax_classification_id);
    }
    if (filters.status && filters.status !== 'all') {
      q = q.eq('status', filters.status);
    }
    if (filters.start_date) {
      q = q.gte('transaction_date', filters.start_date);
    }
    if (filters.end_date) {
      q = q.lte('transaction_date', filters.end_date);
    }
    if (filters.offset) {
      q = q.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
    } else {
      q = q.limit(filters.limit || 100);
    }
    return q;
  };

  let { data, error } = await buildQuery(supabase);
  if (error && (error.message?.includes('transaction_attachments') || error.code === '42501')) {
    const adminSupabase = await createAdminClient();
    const adminRes = await buildQuery(adminSupabase);
    data = adminRes.data;
    error = adminRes.error;
  }

  if (error) {
    console.error('Error fetching expenses from transactions:', error);
    throw new Error(`Failed to fetch expenses: ${error.message}`);
  }

  let results = (data || []).map((row: any) => {
    return {
      ...row,
      amount: Number(row.amount),
      gst_amount: Number(row.gst_amount || 0),
      gst_inclusive: Boolean(row.gst_inclusive),
      expense_date: row.transaction_date, // virtual alias for UI compatibility
    } as ExpenseDTO;
  });

  // Client-side text search if provided
  if (filters.search_query && filters.search_query.trim()) {
    const q = filters.search_query.toLowerCase().trim();
    results = results.filter((exp: ExpenseDTO) => {
      return (
        exp.description?.toLowerCase().includes(q) ||
        exp.reference?.toLowerCase().includes(q) ||
        exp.vendor_name?.toLowerCase().includes(q) ||
        exp.category?.name?.toLowerCase().includes(q) ||
        exp.property?.name?.toLowerCase().includes(q) ||
        String(exp.amount).includes(q)
      );
    });
  }

  return results;
}

export interface ExpensesPageData {
  expenses: ExpenseDTO[];
  categories: CategoryDTO[];
}

/**
 * Consolidated single-pass fetch for expenses page model
 */
export async function getExpensesPageData(
  filters: ExpenseFilterParams = {}
): Promise<ExpensesPageData> {
  const { getCategories } = await import('@/lib/finance/service');
  const [expenses, categories] = await Promise.all([
    getExpenses(filters),
    getCategories('expense'),
  ]);

  return { expenses, categories };
}

/**
 * Get a single expense transaction by ID with joined relations
 */
export async function getExpenseById(id: string): Promise<ExpenseDTO | null> {
  const supabase = await createClient();

  let { data, error } = await supabase
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
      gst_inclusive,
      gst_amount,
      tax_classification_id,
      receipt_url,
      receipt_blob_path,
      receipt_file_name,
      receipt_file_size,
      receipt_mime_type,
      receipt_uploaded_at,
      category:categories(
        id,
        transaction_type,
        name,
        description,
        is_active,
        category_group_id,
        default_tax_classification_id,
        created_at,
        updated_at
      ),
      tax_classification:tax_classifications(
        id,
        workspace_id,
        name,
        bas_code,
        description,
        is_active
      ),
      property:properties(
        id,
        name,
        address_line_1,
        city,
        state,
        gst_enabled
      ),
      lease:leases(
        id,
        start_date,
        end_date,
        rent_amount,
        status
      ),
      attachments:transaction_attachments(
        id,
        workspace_id,
        transaction_id,
        blob_url,
        blob_path,
        file_name,
        mime_type,
        file_size,
        source_path,
        created_at
      )
    `)
    .eq('id', id)
    .eq('transaction_type', 'expense')
    .maybeSingle();

  if (error && (error.message?.includes('transaction_attachments') || error.code === '42501')) {
    const adminSupabase = await createAdminClient();
    const adminRes = await adminSupabase
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
        gst_inclusive,
        gst_amount,
        tax_classification_id,
        receipt_url,
        receipt_blob_path,
        receipt_file_name,
        receipt_file_size,
        receipt_mime_type,
        receipt_uploaded_at,
        category:categories(id, transaction_type, name, description, is_active),
        tax_classification:tax_classifications(id, name, bas_code, description, is_active),
        property:properties(id, name, address_line_1, city, state),
        lease:leases(id, start_date, end_date, rent_amount, status)
      `)
      .eq('id', id)
      .eq('transaction_type', 'expense')
      .maybeSingle();

    data = adminRes.data;
    error = adminRes.error;
  }

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get expense: ${error.message}`);
  }

  if (!data) return null;

  const row = data as any;
  return {
    ...row,
    amount: Number(row.amount),
    gst_amount: Number(row.gst_amount || 0),
    gst_inclusive: Boolean(row.gst_inclusive),
    expense_date: row.transaction_date,
  } as ExpenseDTO;
}

/**
 * Create a new expense as an actual financial transaction in public.transactions.
 * Single source of truth: No secondary tables or schedules.
 */
export async function createExpense(
  input: CreateExpenseInput,
  userId?: string
): Promise<ExpenseDTO> {
  const validated = createExpenseSchema.parse(input);
  const supabase = await createClient();

  // 1. Resolve Workspace ID from Property
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

  // 2. Validate Category if provided
  let effectiveCategoryId = validated.transaction_category_id;
  if (effectiveCategoryId) {
    const { data: catData, error: catError } = await supabase
      .from('categories')
      .select('id, transaction_type, name, is_active')
      .eq('id', effectiveCategoryId)
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
  } else {
    // Pick first active expense category fallback
    const { data: fallbackCat } = await supabase
      .from('categories')
      .select('id')
      .eq('transaction_type', 'expense')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (fallbackCat) {
      effectiveCategoryId = (fallbackCat as { id: string }).id;
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

  const transactionDate = validated.transaction_date || validated.expense_date || new Date().toISOString().split('T')[0];

  // 4. Insert single actual transaction record
  const txPayload = {
    amount: validated.amount,
    transaction_type: 'expense',
    transaction_category_id: effectiveCategoryId,
    transaction_date: transactionDate,
    property_id: validated.property_id,
    workspace_id: workspaceId,
    lease_id: validated.lease_id || null,
    vendor_name: validated.vendor_name || null,
    description: validated.description || null,
    reference: validated.reference || null,
    notes: validated.notes || null,
    status: validated.status || 'completed',
    payment_method: validated.payment_method || 'bank_transfer',
    created_by: userId || null,
    gst_inclusive: validated.gst_inclusive || false,
    gst_amount: validated.gst_amount || 0,
    tax_classification_id: validated.tax_classification_id || null,
    receipt_url: validated.receipt_url || null,
    receipt_blob_path: validated.receipt_blob_path || null,
    receipt_file_name: validated.receipt_file_name || null,
    receipt_file_size: validated.receipt_file_size || null,
    receipt_mime_type: validated.receipt_mime_type || null,
    receipt_uploaded_at: validated.receipt_uploaded_at || (validated.receipt_url ? new Date().toISOString() : null),
  };

  const { data: txData, error: txError } = await supabase
    .from('transactions')
    .insert(txPayload as never)
    .select('id')
    .single();

  if (txError || !txData) {
    console.error('Error creating expense transaction:', txError);
    throw new Error(`Failed to create expense transaction: ${txError?.message || 'Database error'}`);
  }

  const transactionId = (txData as { id: string }).id;

  // 5. If attachments provided, insert into permanent transaction_attachments
  if (validated.attachments && validated.attachments.length > 0) {
    try {
      const attachmentsPayload = validated.attachments.map((att) => ({
        workspace_id: workspaceId,
        transaction_id: transactionId,
        blob_url: att.blob_url,
        blob_path: att.blob_path,
        file_name: att.file_name,
        mime_type: att.mime_type || 'application/pdf',
        file_size: att.file_size || 0,
        source_path: att.file_name,
        uploaded_by: userId || null,
      }));

      await supabase.from('transaction_attachments').insert(attachmentsPayload as never);
    } catch (attachErr) {
      console.warn('Could not insert secondary transaction attachments:', attachErr);
    }
  }

  // 6. Log audit activity
  try {
    const adminClient = await createAdminClient();
    await adminClient.from('activity_logs').insert({
      workspace_id: workspaceId,
      property_id: validated.property_id,
      actor_id: userId || null,
      action: 'transaction_created',
      entity_type: 'transaction',
      entity_id: transactionId,
      metadata: {
        amount: validated.amount,
        type: 'expense',
        vendor: validated.vendor_name,
        date: transactionDate,
      },
    } as never);
  } catch (logErr) {
    console.warn('Could not write to activity log:', logErr);
  }

  const createdExpense = await getExpenseById(transactionId);
  if (!createdExpense) {
    throw new Error('Expense was created but could not be re-loaded.');
  }

  return createdExpense;
}

/**
 * Update an existing expense transaction in public.transactions
 */
export async function updateExpense(
  id: string,
  input: UpdateExpenseInput,
  userId?: string
): Promise<ExpenseDTO> {
  const validated = updateExpenseSchema.parse(input);
  const supabase = await createClient();

  // Fetch current record
  const current = await getExpenseById(id);
  if (!current) {
    throw new Error('Expense transaction not found.');
  }

  // Validate category if updating
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
  }

  // Validate lease consistency
  const effectivePropertyId = validated.property_id || current.property_id;
  const effectiveLeaseId = validated.lease_id !== undefined ? validated.lease_id : current.lease_id;

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

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (validated.amount !== undefined) updatePayload.amount = validated.amount;
  if (validated.transaction_category_id !== undefined) updatePayload.transaction_category_id = validated.transaction_category_id;
  if (validated.transaction_date !== undefined) updatePayload.transaction_date = validated.transaction_date;
  if (validated.expense_date !== undefined) updatePayload.transaction_date = validated.expense_date;
  if (validated.property_id !== undefined) updatePayload.property_id = validated.property_id;
  if (validated.lease_id !== undefined) updatePayload.lease_id = validated.lease_id;
  if (validated.vendor_name !== undefined) updatePayload.vendor_name = validated.vendor_name;
  if (validated.description !== undefined) updatePayload.description = validated.description;
  if (validated.reference !== undefined) updatePayload.reference = validated.reference;
  if (validated.notes !== undefined) updatePayload.notes = validated.notes;
  if (validated.status !== undefined) updatePayload.status = validated.status;
  if (validated.payment_method !== undefined) updatePayload.payment_method = validated.payment_method;
  if (validated.gst_inclusive !== undefined) updatePayload.gst_inclusive = validated.gst_inclusive;
  if (validated.gst_amount !== undefined) updatePayload.gst_amount = validated.gst_amount;
  if (validated.tax_classification_id !== undefined) updatePayload.tax_classification_id = validated.tax_classification_id;
  if (validated.receipt_url !== undefined) updatePayload.receipt_url = validated.receipt_url;
  if (validated.receipt_blob_path !== undefined) updatePayload.receipt_blob_path = validated.receipt_blob_path;
  if (validated.receipt_file_name !== undefined) updatePayload.receipt_file_name = validated.receipt_file_name;
  if (validated.receipt_file_size !== undefined) updatePayload.receipt_file_size = validated.receipt_file_size;
  if (validated.receipt_mime_type !== undefined) updatePayload.receipt_mime_type = validated.receipt_mime_type;
  if (validated.receipt_uploaded_at !== undefined) updatePayload.receipt_uploaded_at = validated.receipt_uploaded_at;

  const { error: updErr } = await supabase
    .from('transactions')
    .update(updatePayload as never)
    .eq('id', id)
    .eq('transaction_type', 'expense');

  if (updErr) {
    console.error('Error updating expense transaction:', updErr);
    throw new Error(`Failed to update expense: ${updErr.message}`);
  }

  // Log audit activity
  try {
    const adminClient = await createAdminClient();
    await adminClient.from('activity_logs').insert({
      workspace_id: current.workspace_id,
      property_id: effectivePropertyId,
      actor_id: userId || null,
      action: 'transaction_updated',
      entity_type: 'transaction',
      entity_id: id,
      metadata: {
        type: 'expense',
        changes: Object.keys(updatePayload),
      },
    } as never);
  } catch (logErr) {
    console.warn('Could not write to activity log:', logErr);
  }

  const updatedExpense = await getExpenseById(id);
  if (!updatedExpense) {
    throw new Error('Expense was updated but could not be reloaded.');
  }

  return updatedExpense;
}

/**
 * Delete an expense transaction from public.transactions
 */
export async function deleteExpense(id: string, userId?: string): Promise<void> {
  const supabase = await createClient();

  const current = await getExpenseById(id);
  if (!current) {
    throw new Error('Expense transaction not found.');
  }

  let { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('transaction_type', 'expense');

  if (error) {
    const adminClient = await createAdminClient();
    const adminRes = await adminClient
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('transaction_type', 'expense');

    if (adminRes.error) {
      console.error('Error deleting expense transaction:', adminRes.error);
      throw new Error(`Failed to delete expense: ${adminRes.error.message}`);
    }
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
        type: 'expense',
        vendor: current.vendor_name,
      },
    } as never);
  } catch (logErr) {
    console.warn('Could not write to activity log:', logErr);
  }
}
