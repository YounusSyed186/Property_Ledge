import { put, del } from '@vercel/blob';
import {
  ALLOWED_RECEIPT_EXTENSIONS,
  ALLOWED_RECEIPT_MIME_TYPES,
  MAX_RECEIPT_FILE_SIZE,
  sanitizeReceiptFileName,
} from '@/modules/finance/domain/validation';
import { ReceiptAttachment } from '@/modules/finance/domain/types';

export interface UploadReceiptOptions {
  workspaceId: string;
  transactionId: string;
  file: File | Blob;
  fileName: string;
  mimeType?: string;
}

/**
 * Uploads a receipt document or image to Vercel Blob with collision-safe namespacing.
 */
export async function uploadReceiptToBlob({
  workspaceId,
  transactionId,
  file,
  fileName,
  mimeType,
}: UploadReceiptOptions): Promise<ReceiptAttachment> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const sanitizedName = sanitizeReceiptFileName(fileName);
  const randomSuffix = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).substring(2, 10);

  const blobPath = `workspaces/${workspaceId}/transactions/${transactionId}/receipt/${randomSuffix}-${sanitizedName}`;
  const effectiveMime = mimeType || file.type || 'application/octet-stream';
  const fileSize = file.size;

  if (!token) {
    console.warn(
      '[RECEIPT_STORAGE] BLOB_READ_WRITE_TOKEN is not configured. Running in local fallback mode.'
    );
    // Graceful fallback for local development without active Vercel Blob token
    const mockUrl = `https://mock-blob.vercel-storage.com/${blobPath}`;
    return {
      url: mockUrl,
      blobPath,
      fileName: sanitizedName,
      fileSize,
      mimeType: effectiveMime,
      uploadedAt: new Date().toISOString(),
    };
  }

  try {
    const blobResult = await put(blobPath, file, {
      access: 'public',
      contentType: effectiveMime,
      token,
    });

    return {
      url: blobResult.url,
      blobPath: blobResult.pathname || blobPath,
      fileName: sanitizedName,
      fileSize,
      mimeType: effectiveMime,
      uploadedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[RECEIPT_UPLOAD_ERROR]', {
      workspaceId,
      transactionId,
      fileName: sanitizedName,
      error: error.message || error,
    });
    throw new Error(`Failed to upload receipt to storage: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Deletes a receipt from Vercel Blob by path or URL.
 */
export async function deleteReceiptFromBlob(blobPathOrUrl: string): Promise<boolean> {
  if (!blobPathOrUrl) return true;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.log('[RECEIPT_STORAGE] Simulating blob deletion in dev mode:', blobPathOrUrl);
    return true;
  }

  try {
    await del(blobPathOrUrl, { token });
    return true;
  } catch (error: any) {
    console.warn('[RECEIPT_DELETE_ERROR]', {
      blobPathOrUrl,
      error: error.message || error,
    });
    // Return false instead of throwing so DB operations can handle gracefully
    return false;
  }
}
