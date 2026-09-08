/**
 * Invoice Storage Service.
 * Handles uploading generated documents to private storage and creating signed URLs.
 */

import { TypedSupabaseClient } from '@/shared/infrastructure/database/supabase';
import { Result, ok, err } from '@/shared/domain/result';
import { DomainError, ExternalServiceError } from '@/shared/domain/errors';

export class InvoiceStorageService {
  private readonly BUCKET_NAME = 'invoice-documents';

  constructor(private readonly client: TypedSupabaseClient) {}

  /**
   * Uploads binary document buffer to private storage.
   */
  async uploadDocument(
    workspaceId: string,
    invoiceId: string,
    fileName: string,
    buffer: Buffer | Uint8Array,
    contentType: string
  ): Promise<Result<{ storagePath: string; fileSizeBytes: number }, DomainError>> {
    try {
      const storagePath = `${workspaceId}/${invoiceId}/${fileName}`;
      const { data, error } = await this.client.storage
        .from(this.BUCKET_NAME)
        .upload(storagePath, buffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        return err(new ExternalServiceError('Storage', `Failed to upload invoice document: ${error.message}`));
      }

      const fileSizeBytes = buffer.byteLength || (buffer as any).length || 0;
      return ok({ storagePath: data?.path || storagePath, fileSizeBytes });
    } catch (e: any) {
      return err(new ExternalServiceError('Storage', `Storage upload exception: ${e.message}`));
    }
  }

  /**
   * Generates a time-limited signed URL for private document download.
   */
  async getSignedUrl(storagePath: string, expiresInSeconds: number = 900): Promise<Result<string, DomainError>> {
    try {
      const { data, error } = await this.client.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(storagePath, expiresInSeconds);

      if (error || !data?.signedUrl) {
        return err(new ExternalServiceError('Storage', `Failed to create signed URL: ${error?.message || 'No URL returned'}`));
      }

      return ok(data.signedUrl);
    } catch (e: any) {
      return err(new ExternalServiceError('Storage', `Signed URL exception: ${e.message}`));
    }
  }
}
