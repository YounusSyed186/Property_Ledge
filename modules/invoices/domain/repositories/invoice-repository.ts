/**
 * Invoice Repository Interface.
 * Pure Domain Port - decoupled from database implementations.
 */

import { Result } from '@/shared/domain/result';
import { DomainError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';
import { Invoice, InvoiceFilters, InvoiceStatus, InvoiceSnapshot } from '../entities/invoice';

export interface InvoiceLineItemCreateInput {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  sortOrder: number;
}

export interface CreateInvoiceData {
  workspaceId: string;
  invoiceNumber: string;
  currency: string;
  propertyId?: string | null;
  unitId?: string | null;
  leaseId?: string | null;
  tenantId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  balanceDue: number;
  issueDate: string;
  dueDate: string;
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
  notes?: string | null;
  paymentInstructions?: string | null;
  templateId?: string | null;
  automationId?: string | null;
  status?: InvoiceStatus;
  snapshot?: InvoiceSnapshot | null;
  items: InvoiceLineItemCreateInput[];
}

export interface UpdateInvoiceData {
  currency?: string;
  propertyId?: string | null;
  unitId?: string | null;
  leaseId?: string | null;
  tenantId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  balanceDue?: number;
  dueDate?: string;
  issueDate?: string;
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
  notes?: string | null;
  paymentInstructions?: string | null;
  templateId?: string | null;
  automationId?: string | null;
  snapshot?: InvoiceSnapshot | null;
  items?: InvoiceLineItemCreateInput[];
}

export interface InvoiceRepository {
  getById(id: string, context?: RequestContext): Promise<Result<Invoice, DomainError>>;
  getByNumber(invoiceNumber: string, context?: RequestContext): Promise<Result<Invoice, DomainError>>;
  list(filters?: InvoiceFilters, context?: RequestContext): Promise<Result<Invoice[], DomainError>>;
  getNextInvoiceNumber(workspaceId: string, prefix?: string, year?: number): Promise<Result<string, DomainError>>;
  create(data: CreateInvoiceData, context?: RequestContext): Promise<Result<Invoice, DomainError>>;
  update(id: string, data: UpdateInvoiceData, context?: RequestContext): Promise<Result<Invoice, DomainError>>;
  updateStatus(
    id: string,
    status: InvoiceStatus,
    extra?: {
      balanceDue?: number;
      paidAt?: string;
      issuedAt?: string;
      cancellationReason?: string;
      snapshot?: InvoiceSnapshot;
    },
    context?: RequestContext
  ): Promise<Result<Invoice, DomainError>>;
  deleteDraft(id: string, context?: RequestContext): Promise<Result<void, DomainError>>;
  delete(id: string, context?: RequestContext): Promise<Result<void, DomainError>>;
}
