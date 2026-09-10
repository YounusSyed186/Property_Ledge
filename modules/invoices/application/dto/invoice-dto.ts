/**
 * Invoice Application DTOs.
 */

import { Invoice, InvoiceItem, InvoiceStatus, InvoiceSnapshotParty } from '../../domain/entities/invoice';
import {
  InvoiceTemplate,
  InvoiceLayoutStyle,
  InvoiceTemplateItem,
  InvoiceTemplateStatus,
  InvoiceTemplateAutomationConfig,
  InvoiceTemplateEmailConfig,
} from '../../domain/entities/invoice-template';

export type InvoiceDTO = Invoice;
export type InvoiceTemplateDTO = InvoiceTemplate;

export interface InvoiceItemDTO {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export interface CreateInvoiceDTO {
  workspaceId?: string;
  currency?: string; // default 'AUD'
  
  // Optional Source Entities (Nullable)
  propertyId?: string | null;
  unitId?: string | null;
  leaseId?: string | null;
  tenantId?: string | null;

  // Standalone Customer Info (Supported directly when independent)
  customerName?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerPhone?: string | null;

  // Ergonomic aliases for UI / action callers
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  recipientAddress?: string | null;

  // Issuer metadata (optional overrides)
  senderCompanyName?: string | null;
  senderCompanyAddress?: string | null;
  senderTaxNumber?: string | null;
  senderEmail?: string | null;
  senderPhone?: string | null;
  issuer?: InvoiceSnapshotParty | null;
  issuerName?: string | null;
  issuerEmail?: string | null;
  issuerPhone?: string | null;
  issuerAddress?: string | null;

  issueDate?: string;
  dueDate: string;
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;

  items: InvoiceItemDTO[];
  notes?: string | null;
  paymentInstructions?: string | null;
  templateId?: string | null;
  automationId?: string | null;
  autoIssue?: boolean; // if true, issues immediately upon creation
}

export interface UpdateInvoiceDraftDTO {
  status?: InvoiceStatus;
  currency?: string;
  propertyId?: string | null;
  unitId?: string | null;
  leaseId?: string | null;
  tenantId?: string | null;

  customerName?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientAddress?: string | null;

  issueDate?: string;
  dueDate?: string;
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;

  items?: InvoiceItemDTO[];
  notes?: string | null;
  paymentInstructions?: string | null;
  templateId?: string | null;
  automationId?: string | null;
}

export type UpdateInvoiceDTO = UpdateInvoiceDraftDTO;

export interface BulkInvoiceBatchItemDTO {
  monthLabel: string;
  issueDate: string;
  dueDate: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  amount: number;
}

export interface BulkInvoiceDTO {
  workspaceId?: string;
  propertyId?: string | null;
  leaseId?: string | null;
  tenantId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  currency?: string;
  description: string;
  monthsCount: number; // 1 to 24 months
  startMonth: string; // YYYY-MM
  amountPerMonth: number;
  dueDays?: number; // default 7
  taxRate?: number;
  templateId?: string | null;
  autoIssue?: boolean;
}

export interface CreateInvoiceTemplateDTO {
  workspaceId?: string;
  name: string;
  description?: string | null;
  status?: InvoiceTemplateStatus;
  currency?: string;
  invoiceType?: string;
  items?: InvoiceTemplateItem[];
  paymentTermsDays?: number;
  lateFeeAmount?: number;
  lateFeeDays?: number;
  linkedPropertyIds?: string[];
  defaultCustomerName?: string | null;
  defaultCustomerEmail?: string | null;
  automationConfig?: Partial<InvoiceTemplateAutomationConfig>;
  emailConfig?: Partial<InvoiceTemplateEmailConfig>;
  layoutStyle?: InvoiceLayoutStyle;
  brandColor?: string;
  accentColor?: string;
  logoUrl?: string | null;
  headerText?: string | null;
  footerText?: string | null;
  paymentInstructions?: string | null;
  taxName?: string;
  notes?: string | null;
  isDefault?: boolean;
}

export interface UpdateInvoiceTemplateDTO {
  name?: string;
  description?: string | null;
  status?: InvoiceTemplateStatus;
  currency?: string;
  invoiceType?: string;
  items?: InvoiceTemplateItem[];
  paymentTermsDays?: number;
  lateFeeAmount?: number;
  lateFeeDays?: number;
  linkedPropertyIds?: string[];
  defaultCustomerName?: string | null;
  defaultCustomerEmail?: string | null;
  automationConfig?: Partial<InvoiceTemplateAutomationConfig>;
  emailConfig?: Partial<InvoiceTemplateEmailConfig>;
  layoutStyle?: InvoiceLayoutStyle;
  brandColor?: string;
  accentColor?: string;
  logoUrl?: string | null;
  headerText?: string | null;
  footerText?: string | null;
  paymentInstructions?: string | null;
  taxName?: string;
  notes?: string | null;
  isDefault?: boolean;
}

export interface RunTemplateResultDTO {
  templateId: string;
  templateName: string;
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  status: string;
  documentGenerated: boolean;
  documentPath?: string;
  emailSent: boolean;
  emailError?: string;
  executionId?: string;
  executedAt: string;
}
