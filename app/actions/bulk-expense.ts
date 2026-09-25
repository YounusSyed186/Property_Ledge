'use server';

import { getCurrentUser } from '@/lib/auth/queries';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import { revalidatePath } from 'next/cache';
import {
  importBulkExpenses,
  deleteTemporaryBlobs,
} from '@/lib/finance/bulk-expense-service';
import { uploadReceiptToBlob } from '@/lib/finance/receipt-storage';
import {
  BulkImportPayload,
  BulkImportResult,
} from '@/modules/finance/domain/bulk-expense-types';
import { validateReceiptFile } from '@/modules/finance/domain/validation';

async function getAuthContext() {
  const [user, context] = await Promise.all([
    getCurrentUser(),
    resolveWorkspaceContext(),
  ]);

  if (!user || !context || !context.workspaceId) {
    throw new Error('Unauthorized or no active workspace');
  }

  return { user, context: context as { workspaceId: string; [key: string]: any } };
}

/**
 * Server action to upload an expense receipt document directly to Vercel Blob
 */
export async function uploadExpenseBlobAction(
  formData: FormData
): Promise<{ success: boolean; blobUrl?: string; blobPath?: string; error?: string }> {
  try {
    const { context } = await getAuthContext();
    const file = formData.get('file') as File | null;
    const tempId = (formData.get('tempId') as string | null) || `bulk-${Date.now()}`;

    if (!file || !(file instanceof File)) {
      return { success: false, error: 'No valid file provided for upload.' };
    }

    const validation = validateReceiptFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const uploadResult = await uploadReceiptToBlob({
      file,
      fileName: file.name,
      workspaceId: context.workspaceId,
      transactionId: tempId,
    });

    return {
      success: true,
      blobUrl: uploadResult.url,
      blobPath: uploadResult.blobPath,
    };
  } catch (err: any) {
    console.error('[BULK_EXPENSE] uploadExpenseBlobAction error:', err);
    return { success: false, error: err.message || 'Failed to upload document' };
  }
}

/**
 * Server action to atomically validate and import reviewed bulk expenses into public.transactions
 */
export async function importBulkExpensesAction(
  payload: BulkImportPayload
): Promise<BulkImportResult> {
  try {
    const { user, context } = await getAuthContext();

    const result = await importBulkExpenses({
      ...payload,
      workspaceId: context.workspaceId,
      userId: user.id || null,
    });

    if (result.success) {
      revalidatePath('/dashboard/expenses');
      revalidatePath('/dashboard/finance');
      revalidatePath('/dashboard/cashflow');
      revalidatePath('/dashboard/reports');
    }

    return result;
  } catch (err: any) {
    console.error('[BULK_EXPENSE] importBulkExpensesAction error:', err);
    return {
      success: false,
      importedCount: 0,
      totalAmount: 0,
      totalGst: 0,
      transactionIds: [],
      error: err.message || 'Failed to import bulk expenses',
    };
  }
}

/**
 * Server action to clean up temporary blobs if import is cancelled
 */
export async function deleteExpenseBlobsAction(
  blobUrls: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!blobUrls || blobUrls.length === 0) return { success: true };
    await deleteTemporaryBlobs(blobUrls);
    return { success: true };
  } catch (err: any) {
    console.error('[BULK_EXPENSE] deleteExpenseBlobsAction error:', err);
    return { success: false, error: err.message || 'Failed to delete blobs' };
  }
}
