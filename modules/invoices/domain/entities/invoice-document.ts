/**
 * Invoice Document Entity.
 * Represents generated and stored PDF / DOCX documents.
 */

export type DocumentType = 'pdf' | 'docx';

export interface InvoiceDocument {
  id: string;
  invoiceId: string;
  workspaceId: string;
  documentType: DocumentType;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  checksum?: string | null;
  createdAt: string;
}
