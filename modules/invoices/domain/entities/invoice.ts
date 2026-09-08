/**
 * Invoice Domain Entity and Value Objects.
 * Pure Domain representation - Zero Supabase / framework imports.
 */

export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'viewed'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'cancelled'
  | 'void';

export interface InvoiceSnapshotParty {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null; // ABN / GST / VAT / PAN
}

export interface InvoiceSnapshot {
  billTo: InvoiceSnapshotParty;
  issuer: InvoiceSnapshotParty;
  propertyAddress?: string | null;
  paymentInstructions?: string | null;
  termsAndConditions?: string | null;
  capturedAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // e.g. 10 for 10%
  taxAmount: number;
  lineTotal: number;
  sortOrder: number;
  createdAt?: string;
}

export interface InvoiceRecipient {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface Invoice {
  id: string;
  workspaceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  currency: string; // e.g. 'AUD', 'USD', 'INR', 'EUR', 'GBP'
  
  // Optional Source Relationships (Strictly Nullable for Independence)
  propertyId?: string | null;
  unitId?: string | null;
  leaseId?: string | null;
  tenantId?: string | null;
  
  // Standalone Customer Data (Used directly when no Tenant is linked)
  customerName?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;

  // Normalized Recipient (computed or resolved)
  recipient: InvoiceRecipient;

  // Accounting & Monetary Fields (Stored with precise decimal precision)
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  balanceDue: number;
  total: number;   // ergonomics alias for totalAmount
  balance: number; // ergonomics alias for balanceDue

  // Dates
  issueDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
  issuedAt?: string | null;
  paidAt?: string | null;

  // Content & Styling
  notes?: string | null;
  paymentInstructions?: string | null;
  cancellationReason?: string | null;
  templateId?: string | null;
  snapshot?: InvoiceSnapshot | null;

  // Normalized Line Items
  items: InvoiceItem[];

  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceFilters {
  workspaceId?: string;
  propertyId?: string;
  leaseId?: string;
  tenantId?: string;
  status?: InvoiceStatus | 'all';
  searchQuery?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  offset?: number;
}

