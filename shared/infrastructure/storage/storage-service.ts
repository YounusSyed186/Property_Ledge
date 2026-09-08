/**
 * Storage Service Abstraction.
 * Decouples file uploads/asset storage from specific cloud vendors (Supabase Storage, Cloudinary, S3).
 */

import { Result, ok, err } from '@/shared/domain/result';
import { DomainError, ExternalServiceError } from '@/shared/domain/errors';
import { TypedSupabaseClient } from '@/shared/infrastructure/database/supabase';

export interface UploadOptions {
  bucket: string;
  path: string;
  file: Buffer | Blob | Uint8Array;
  contentType?: string;
  upsert?: boolean;
}

export interface StorageService {
  upload(options: UploadOptions): Promise<Result<{ publicUrl: string; path: string }, DomainError>>;
  getPublicUrl(bucket: string, path: string): string;
  delete(bucket: string, path: string): Promise<Result<void, DomainError>>;
}

export class SupabaseStorageService implements StorageService {
  constructor(private readonly client: TypedSupabaseClient) {}

  async upload(options: UploadOptions): Promise<Result<{ publicUrl: string; path: string }, DomainError>> {
    try {
      const { data, error } = await this.client.storage
        .from(options.bucket)
        .upload(options.path, options.file, {
          contentType: options.contentType,
          upsert: options.upsert ?? true,
        });

      if (error) {
        return err(new ExternalServiceError('SupabaseStorage', error.message));
      }

      const { data: urlData } = this.client.storage
        .from(options.bucket)
        .getPublicUrl(data.path);

      return ok({ publicUrl: urlData.publicUrl, path: data.path });
    } catch (e) {
      return err(new ExternalServiceError('SupabaseStorage', e instanceof Error ? e.message : 'Upload failed'));
    }
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async delete(bucket: string, path: string): Promise<Result<void, DomainError>> {
    try {
      const { error } = await this.client.storage.from(bucket).remove([path]);
      if (error) {
        return err(new ExternalServiceError('SupabaseStorage', error.message));
      }
      return ok(undefined);
    } catch (e) {
      return err(new ExternalServiceError('SupabaseStorage', e instanceof Error ? e.message : 'Delete failed'));
    }
  }
}

export class InMemoryStorageService implements StorageService {
  private readonly files = new Map<string, string>();

  async upload(options: UploadOptions): Promise<Result<{ publicUrl: string; path: string }, DomainError>> {
    const key = `${options.bucket}/${options.path}`;
    const mockUrl = `https://storage.propertyledge.mock/${key}`;
    this.files.set(key, mockUrl);
    return ok({ publicUrl: mockUrl, path: options.path });
  }

  getPublicUrl(bucket: string, path: string): string {
    return this.files.get(`${bucket}/${path}`) || `https://storage.propertyledge.mock/${bucket}/${path}`;
  }

  async delete(bucket: string, path: string): Promise<Result<void, DomainError>> {
    this.files.delete(`${bucket}/${path}`);
    return ok(undefined);
  }
}
