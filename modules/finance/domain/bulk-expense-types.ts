/**
 * Bulk Expense Upload Domain Types & Interfaces
 * Pure client-side staging & final atomic import payloads
 */

export type ExpenseDocumentType = 'EXPENSE' | 'SUPPORTING_DOCUMENT' | 'UNKNOWN';

export type ExpenseValidationStatus = 'READY' | 'NEEDS_ATTENTION' | 'INVALID';

export type ExpenseConflictType =
  | 'MISSING_AMOUNT'
  | 'AMOUNT_CONFLICT'
  | 'MISSING_DATE'
  | 'DUPLICATE_FILE'
  | 'DUPLICATE_TRANSACTION'
  | 'UNKNOWN_CATEGORY'
  | 'EXTRACTION_FAILURE';

export type ExtractionSource = 'FOLDER' | 'FILENAME' | 'DOCUMENT' | 'USER';

export interface ExtractionMetadata {
  amount_source?: ExtractionSource;
  category_source?: ExtractionSource;
  description_source?: ExtractionSource;
  date_source?: ExtractionSource;
  supplier_source?: ExtractionSource;
  gst_source?: ExtractionSource;
  property_source?: ExtractionSource;
  lease_source?: ExtractionSource;
  filename_amount?: number | null;
  document_amount?: number | null;
  confidence_score?: number;
  extracted_invoice_number?: string;
  file_hash?: string;
  possible_reference?: string;
  normalized_folder_name?: string;
  [key: string]: any;
}

export interface ExpenseDraftConflict {
  field: string;
  message: string;
  sourceValue?: unknown;
  documentValue?: unknown;
}

export interface BulkExpenseDraftFile {
  name: string;
  relativePath: string;
  mimeType: string;
  size: number;
  blobUrl?: string | null;
  blobPath?: string | null;
  fileObject?: File;
}

export interface BulkExpenseDraft {
  id: string;
  file: BulkExpenseDraftFile;
  folderName: string;
  folder_name?: string | null;
  fileName: string;
  file_name: string;
  fileType?: string | null;
  file_type?: string | null;
  fileSize?: number | null;
  file_size?: number | null;
  sourcePath: string;
  source_path?: string;

  description: string | null;
  supplier: string | null;
  amount: number | null;
  transactionDate: string | null; // YYYY-MM-DD
  transaction_date?: string | null;
  gstInclusive: boolean;
  gst_inclusive?: boolean;
  gstTreatment: 'inclusive' | 'exclusive' | 'none';
  gst_treatment?: 'inclusive' | 'exclusive' | 'none';
  gstAmount: number;
  gst_amount?: number;

  taxClassificationId: string | null;
  tax_classification_id?: string | null;
  categoryId: string | null;
  category_id?: string | null;

  propertyId: string;
  property_id?: string | null;
  leaseId: string | null;
  lease_id?: string | null;

  documentType: ExpenseDocumentType;
  document_type?: ExpenseDocumentType;

  status: ExpenseValidationStatus;
  validation_status: ExpenseValidationStatus;
  paymentStatus?: 'paid' | 'unpaid';
  payment_status?: 'paid' | 'unpaid';

  conflicts: ExpenseDraftConflict[];
  conflictType: ExpenseConflictType | null;
  conflict_type?: ExpenseConflictType | null;
  conflictMessage: string | null;
  conflict_message?: string | null;

  extractionSources: {
    description?: ExtractionSource;
    amount?: ExtractionSource;
    supplier?: ExtractionSource;
    date?: ExtractionSource;
    gst?: ExtractionSource;
    category?: ExtractionSource;
    property?: ExtractionSource;
    lease?: ExtractionSource;
  };
  extractionMetadata: ExtractionMetadata;
  extraction_metadata: ExtractionMetadata;

  blob_url?: string | null;
  blob_path?: string | null;

  // Joined display labels
  categoryName?: string;
  category_name?: string;
  propertyName?: string;
  property_name?: string;
  leaseName?: string;
  lease_name?: string;
  taxClassificationName?: string;
  tax_classification_name?: string;
}

export type ExpenseImportItemDTO = BulkExpenseDraft;

export interface BulkImportAttachmentPayload {
  blobUrl: string;
  blobPath: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  sourcePath?: string | null;
}

export interface BulkImportExpenseItemPayload {
  id?: string;
  description: string;
  supplier?: string | null;
  amount: number;
  transactionDate: string; // YYYY-MM-DD
  paymentStatus?: 'paid' | 'unpaid';
  gstInclusive?: boolean;
  gstTreatment?: 'inclusive' | 'exclusive' | 'none';
  gstAmount?: number;
  taxClassificationId?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  propertyId: string;
  leaseId?: string | null;
  attachment?: BulkImportAttachmentPayload | null;
}

export interface BulkImportPayload {
  propertyId: string;
  leaseId?: string | null;
  expenses: BulkImportExpenseItemPayload[];
}

export interface BulkImportResult {
  success: boolean;
  importedCount: number;
  totalAmount: number;
  totalGst: number;
  transactionIds: string[];
  error?: string;
}

export interface TransactionAttachmentDTO {
  id: string;
  workspace_id: string;
  transaction_id: string;
  blob_url: string;
  blob_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  source_path: string | null;
  uploaded_by?: string | null;
  created_at: string;
}
