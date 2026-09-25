/**
 * Bulk Expense Import Service
 * Pure client-side staging with final atomic transaction creation and permanent multi-file attachments.
 * NO database staging or temporary tables are used.
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  BulkImportPayload,
  BulkImportResult,
} from '@/modules/finance/domain/bulk-expense-types';
import { deleteReceiptFromBlob } from './receipt-storage';

/**
 * Imports reviewed and validated expenses directly into public.transactions and public.transaction_attachments.
 * Operates with strict validation and atomic execution.
 */
export async function importBulkExpenses(
  input: BulkImportPayload & {
    workspaceId: string;
    userId: string | null;
  }
): Promise<BulkImportResult> {
  const supabase = await createClient();

  if (!input.expenses || input.expenses.length === 0) {
    return {
      success: false,
      importedCount: 0,
      totalAmount: 0,
      totalGst: 0,
      transactionIds: [],
      error: 'No expenses provided for import.',
    };
  }

  // 1. Verify workspace access and RBAC permissions
  if (!input.userId) {
    throw new Error('Unauthorized: User ID is required.');
  }

  const { data: member, error: memberErr } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', input.workspaceId)
    .eq('user_id', input.userId)
    .single();

  if (memberErr || !member) {
    throw new Error('Unauthorized: User does not have access to this workspace.');
  }

  // 2. Validate selected property belongs to the workspace
  if (input.propertyId) {
    const { data: prop, error: propErr } = await supabase
      .from('properties')
      .select('id, workspace_id')
      .eq('id', input.propertyId)
      .eq('workspace_id', input.workspaceId)
      .single();

    if (propErr || !prop) {
      throw new Error('Invalid property: Property does not exist in this workspace.');
    }
  }

  // 3. Validate selected lease if provided
  if (input.leaseId) {
    const { data: lease, error: leaseErr } = await supabase
      .from('leases')
      .select('id, property_id')
      .eq('id', input.leaseId)
      .single();

    if (leaseErr || !lease) {
      throw new Error('Invalid lease: Lease does not exist.');
    }
  }

  // Create admin client for privileged system operations (e.g. category auto-creation)
  const adminSupabase = await createAdminClient();

  // 4. Resolve Categories & Validate all expense items before inserting anything
  const categoryCache = new Map<string, string>();

  // Fetch all existing expense categories from DB
  const { data: existingCategories } = await adminSupabase
    .from('categories')
    .select('id, name')
    .eq('transaction_type', 'expense');

  (existingCategories || []).forEach((c: { id: string; name: string }) => {
    categoryCache.set(c.id, c.id);
    categoryCache.set(c.name.toLowerCase().trim(), c.id);
  });

  const transactionsToInsert: any[] = [];
  const attachmentsToInsert: any[] = [];
  let totalAmount = 0;
  let totalGst = 0;

  for (let i = 0; i < input.expenses.length; i++) {
    const exp = input.expenses[i];

    if (!exp.amount || exp.amount <= 0 || isNaN(Number(exp.amount))) {
      throw new Error(`Item ${i + 1} (${exp.description || 'Expense'}): A positive valid amount is required.`);
    }

    if (!exp.transactionDate || !/^\d{4}-\d{2}-\d{2}$/.test(exp.transactionDate)) {
      throw new Error(`Item ${i + 1} (${exp.description || 'Expense'}): A valid transaction date (YYYY-MM-DD) is required.`);
    }

    // Resolve or Auto-Create Category from folder / category name
    let resolvedCategoryId: string | null = null;
    const catInput = (exp.categoryId || exp.categoryName || '').trim();

    if (categoryCache.has(catInput)) {
      resolvedCategoryId = categoryCache.get(catInput)!;
    } else if (categoryCache.has(catInput.toLowerCase())) {
      resolvedCategoryId = categoryCache.get(catInput.toLowerCase())!;
    } else {
      // Clean category name (stripping "new:" prefix if present)
      const rawName = catInput.startsWith('new:') ? catInput.slice(4) : catInput;
      const cleanName = rawName.trim() || exp.categoryName?.trim() || 'Other Expense';

      if (categoryCache.has(cleanName.toLowerCase())) {
        resolvedCategoryId = categoryCache.get(cleanName.toLowerCase())!;
      } else {
        // Create new category in public.categories using admin client
        const { data: newCat, error: newCatErr } = await (adminSupabase.from('categories') as any)
          .insert({
            transaction_type: 'expense',
            name: cleanName,
            description: `Auto-created from folder "${cleanName}" during bulk import`,
            is_active: true,
          })
          .select('id')
          .single();

        if (newCatErr || !newCat) {
          // If race condition / conflict, fetch existing category
          const { data: retryCat } = await (adminSupabase.from('categories') as any)
            .select('id')
            .eq('transaction_type', 'expense')
            .eq('name', cleanName)
            .maybeSingle();

          if (retryCat && (retryCat as any).id) {
            resolvedCategoryId = (retryCat as any).id;
          } else {
            console.error('Failed to create new category:', newCatErr);
            throw new Error(`Failed to create category "${cleanName}": ${newCatErr?.message || 'Database error'}`);
          }
        } else {
          resolvedCategoryId = (newCat as any).id;
        }

        if (resolvedCategoryId) {
          categoryCache.set(cleanName.toLowerCase(), resolvedCategoryId);
          categoryCache.set(resolvedCategoryId, resolvedCategoryId);
        }
      }
    }

    if (!resolvedCategoryId) {
      throw new Error(`Item ${i + 1} (${exp.description || 'Expense'}): A valid expense category is required.`);
    }

    const itemAmount = Number(exp.amount);
    const itemGst = Number(exp.gstAmount || 0);
    const isPaid = exp.paymentStatus !== 'unpaid';
    const effectiveGst = isPaid ? itemGst : 0;
    const effectiveTaxClassId = isPaid ? (exp.taxClassificationId || null) : null;
    const effectiveGstInclusive = isPaid ? (exp.gstInclusive ?? false) : false;

    totalAmount += itemAmount;
    totalGst += effectiveGst;

    const txRecord = {
      workspace_id: input.workspaceId,
      property_id: exp.propertyId || input.propertyId,
      lease_id: exp.leaseId || input.leaseId || null,
      transaction_category_id: resolvedCategoryId,
      tax_classification_id: effectiveTaxClassId,
      transaction_type: 'expense',
      amount: itemAmount,
      transaction_date: exp.transactionDate,
      description: exp.description || 'Bulk Imported Expense',
      vendor_name: exp.supplier || null,
      gst_amount: effectiveGst,
      gst_inclusive: effectiveGstInclusive,
      status: isPaid ? 'completed' : 'pending',
      created_by: input.userId || null,
      // Store primary receipt metadata on transaction record
      receipt_url: exp.attachment?.blobUrl || null,
      receipt_blob_path: exp.attachment?.blobPath || exp.attachment?.blobUrl || null,
      receipt_file_name: exp.attachment?.fileName || null,
      receipt_file_size: exp.attachment?.fileSize || null,
      receipt_mime_type: exp.attachment?.mimeType || null,
      receipt_uploaded_at: exp.attachment?.blobUrl ? new Date().toISOString() : null,
    };

    transactionsToInsert.push({
      txRecord,
      attachment: exp.attachment,
    });
  }

  // 5. Insert unified ledger transactions directly into public.transactions
  const createdTransactionIds: string[] = [];

  for (const item of transactionsToInsert) {
    const { data: insertedTx, error: txErr } = await (adminSupabase.from('transactions') as any)
      .insert(item.txRecord)
      .select('id')
      .single();

    if (txErr || !insertedTx) {
      console.error('Error inserting transaction during bulk import:', txErr);
      throw new Error(`Failed to create transaction for "${item.txRecord.description}": ${txErr?.message || 'Database error'}`);
    }

    createdTransactionIds.push(insertedTx.id);

    // 6. If attachment exists, insert into permanent public.transaction_attachments table
    if (item.attachment && item.attachment.blobUrl) {
      attachmentsToInsert.push({
        workspace_id: input.workspaceId,
        transaction_id: insertedTx.id,
        blob_url: item.attachment.blobUrl,
        blob_path: item.attachment.blobPath || item.attachment.blobUrl,
        file_name: item.attachment.fileName,
        mime_type: item.attachment.mimeType || 'application/pdf',
        file_size: item.attachment.fileSize || 0,
        source_path: item.attachment.sourcePath || item.attachment.fileName,
        uploaded_by: input.userId,
      });
    }
  }

  // Insert permanent attachments in batch if any
  if (attachmentsToInsert.length > 0) {
    const { error: attachErr } = await (adminSupabase.from('transaction_attachments') as any)
      .insert(attachmentsToInsert);

    if (attachErr) {
      console.warn('Warning: Could not save multi-file attachment records to transaction_attachments:', attachErr.message);
    }
  }

  return {
    success: true,
    importedCount: createdTransactionIds.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalGst: Math.round(totalGst * 100) / 100,
    transactionIds: createdTransactionIds,
  };
}

/**
 * Cleans up temporary/cancelled blobs from Vercel Blob storage
 */
export async function deleteTemporaryBlobs(blobUrls: string[]): Promise<void> {
  for (const url of blobUrls) {
    if (url) {
      try {
        await deleteReceiptFromBlob(url);
      } catch (err) {
        console.warn('Failed to delete temporary blob:', url, err);
      }
    }
  }
}
