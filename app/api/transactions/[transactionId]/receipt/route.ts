import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/queries';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import * as financeService from '@/lib/finance/service';
import { uploadReceiptToBlob, deleteReceiptFromBlob } from '@/lib/finance/receipt-storage';
import { validateReceiptFile } from '@/modules/finance/domain/validation';

/**
 * POST /api/transactions/[transactionId]/receipt
 * Secure server-side upload & attachment of a receipt to an expense transaction
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await context.params;
    const [user, wsContext] = await Promise.all([
      getCurrentUser(),
      resolveWorkspaceContext(),
    ]);

    if (!user || !wsContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const transaction = await financeService.getTransactionById(transactionId);
    if (!transaction) {
      return NextResponse.json({ error: 'This expense could not be found' }, { status: 404 });
    }

    if (transaction.workspace_id !== wsContext.workspaceId) {
      return NextResponse.json(
        { error: "You don't have permission to modify this expense" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('receipt') as File | null;

    if (!file || !(file instanceof Blob) || file.size === 0) {
      return NextResponse.json({ error: 'Please select a receipt file to upload' }, { status: 400 });
    }

    // Validate file
    const validation = validateReceiptFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 1. Upload new file to Vercel Blob
    const attachment = await uploadReceiptToBlob({
      workspaceId: wsContext.workspaceId,
      transactionId,
      file,
      fileName: file.name,
      mimeType: file.type,
    });

    // 2. Update transaction metadata
    try {
      await financeService.updateTransaction(
        transactionId,
        {
          receipt_url: attachment.url,
          receipt_blob_path: attachment.blobPath,
          receipt_file_name: attachment.fileName,
          receipt_file_size: attachment.fileSize,
          receipt_mime_type: attachment.mimeType,
          receipt_uploaded_at: attachment.uploadedAt,
        },
        user.id
      );
    } catch (dbError: any) {
      // Rollback blob on DB failure
      await deleteReceiptFromBlob(attachment.blobPath);
      return NextResponse.json(
        { error: `Failed to save receipt metadata: ${dbError.message}` },
        { status: 500 }
      );
    }

    // 3. Clean up old blob if replacing
    if (transaction.receipt_blob_path && transaction.receipt_blob_path !== attachment.blobPath) {
      await deleteReceiptFromBlob(transaction.receipt_blob_path);
    }

    return NextResponse.json({ success: true, data: attachment });
  } catch (error: any) {
    console.error('[API_RECEIPT_POST_ERROR]', error);
    return NextResponse.json(
      { error: error.message || "We couldn't upload the receipt. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/transactions/[transactionId]/receipt
 * Remove receipt attachment from an expense transaction
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await context.params;
    const [user, wsContext] = await Promise.all([
      getCurrentUser(),
      resolveWorkspaceContext(),
    ]);

    if (!user || !wsContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transaction = await financeService.getTransactionById(transactionId);
    if (!transaction) {
      return NextResponse.json({ error: 'This expense could not be found' }, { status: 404 });
    }

    if (transaction.workspace_id !== wsContext.workspaceId) {
      return NextResponse.json(
        { error: "You don't have permission to modify this expense" },
        { status: 403 }
      );
    }

    // 1. Delete blob if exists
    if (transaction.receipt_blob_path) {
      await deleteReceiptFromBlob(transaction.receipt_blob_path);
    }

    // 2. Clear metadata in DB
    await financeService.updateTransaction(
      transactionId,
      {
        receipt_url: null,
        receipt_blob_path: null,
        receipt_file_name: null,
        receipt_file_size: null,
        receipt_mime_type: null,
        receipt_uploaded_at: null,
      },
      user.id
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API_RECEIPT_DELETE_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove receipt' },
      { status: 500 }
    );
  }
}
