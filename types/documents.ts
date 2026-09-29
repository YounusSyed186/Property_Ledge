export type DocumentCategory =
  | 'all'
  | 'receipt'
  | 'inspection_photo'
  | 'condition_report'
  | 'lease_agreement'
  | 'compliance_insurance'
  | 'strata_council'
  | 'other';

export type DocumentSource =
  | 'database_document'
  | 'transaction_receipt'
  | 'inspection_photo'
  | 'condition_report_pdf';

export interface UnifiedDocument {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  blobPath?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  category: DocumentCategory;
  propertyId?: string | null;
  propertyName?: string | null;
  propertyAddress?: string | null;
  linkedEntityId?: string | null;
  linkedEntityType?: 'transaction' | 'inspection' | 'lease' | 'custom' | null;
  linkedEntityLabel?: string | null;
  uploadedAt: string;
  uploadedBy?: string | null;
  uploadedByName?: string | null;
  notes?: string | null;
  source: DocumentSource;
  tags?: string[];
  isVercelBlob?: boolean;
}

export interface DocumentStats {
  totalFiles: number;
  totalSizeBytes: number;
  receiptsCount: number;
  photosCount: number;
  reportsCount: number;
  leasesAndAgreementsCount: number;
  complianceCount: number;
  otherCount: number;
}

export interface CreateDocumentInput {
  propertyId?: string | null;
  leaseId?: string | null;
  tenantId?: string | null;
  title: string;
  documentType:
    | 'lease_agreement'
    | 'condition_report'
    | 'receipt'
    | 'insurance_policy'
    | 'strata_notice'
    | 'compliance_certificate'
    | 'council_notice'
    | 'photo'
    | 'other';
  fileName: string;
  fileUrl: string;
  blobPath?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  description?: string | null;
  tags?: string[];
}

export interface DocumentFilterOptions {
  category?: DocumentCategory;
  propertyId?: string;
  fileType?: 'all' | 'pdf' | 'image' | 'spreadsheet' | 'other';
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}
