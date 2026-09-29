import { put, del } from '@vercel/blob';

export interface UploadBlobOptions {
  workspaceId: string;
  folder?: string;
  file: File | Blob;
  fileName: string;
  mimeType?: string;
}

export interface UploadBlobResult {
  url: string;
  blobPath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

/**
 * Format bytes into human-readable representation.
 */
export function formatDocumentSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Categorize MIME types and file extensions into broad types for UI filters.
 */
export function getFileTypeGroup(
  mimeType?: string | null,
  fileName?: string | null
): 'pdf' | 'image' | 'spreadsheet' | 'other' {
  const mime = (mimeType || '').toLowerCase();
  const name = (fileName || '').toLowerCase();

  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (
    mime.startsWith('image/') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.png') ||
    name.endsWith('.webp') ||
    name.endsWith('.heic') ||
    name.endsWith('.gif')
  ) {
    return 'image';
  }
  if (
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime.includes('csv') ||
    name.endsWith('.csv') ||
    name.endsWith('.xlsx') ||
    name.endsWith('.xls')
  ) {
    return 'spreadsheet';
  }
  return 'other';
}

/**
 * Sanitizes a file name for storage.
 */
export function sanitizeDocumentFileName(fileName: string): string {
  const baseName = fileName.replace(/^.*[\\\/]/, '');
  const sanitized = baseName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
  return sanitized.slice(0, 150) || 'document';
}

/**
 * Uploads a document/file to Vercel Blob with namespacing.
 */
export async function uploadDocumentToBlob({
  workspaceId,
  folder = 'general',
  file,
  fileName,
  mimeType,
}: UploadBlobOptions): Promise<UploadBlobResult> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const sanitizedName = sanitizeDocumentFileName(fileName) || 'document';
  const randomSuffix =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).substring(2, 10);

  const blobPath = `workspaces/${workspaceId}/documents/${folder}/${randomSuffix}-${sanitizedName}`;
  const effectiveMime = mimeType || file.type || 'application/octet-stream';
  const fileSize = file.size;

  if (!token) {
    console.warn(
      '[DOCUMENTS_STORAGE] BLOB_READ_WRITE_TOKEN is not configured. Running in local fallback mode.'
    );
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
    console.error('[DOCUMENT_UPLOAD_ERROR]', {
      workspaceId,
      fileName: sanitizedName,
      error: error.message || error,
    });
    throw new Error(`Failed to upload document to storage: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Deletes a file from Vercel Blob by path or URL.
 */
export async function deleteDocumentFromBlob(blobPathOrUrl: string): Promise<boolean> {
  if (!blobPathOrUrl) return true;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.log('[DOCUMENTS_STORAGE] Simulating blob deletion in dev mode:', blobPathOrUrl);
    return true;
  }

  try {
    await del(blobPathOrUrl, { token });
    return true;
  } catch (error: any) {
    console.warn('[DOCUMENT_DELETE_ERROR]', {
      blobPathOrUrl,
      error: error.message || error,
    });
    return false;
  }
}
