/**
 * Invoice Template Repository Interface.
 * Pure Domain Port.
 */

import { Result } from '@/shared/domain/result';
import { DomainError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';
import {
  InvoiceTemplate,
  InvoiceLayoutStyle,
  InvoiceTemplateStatus,
  InvoiceTemplateItem,
  InvoiceTemplateAutomationConfig,
  InvoiceTemplateEmailConfig,
} from '../entities/invoice-template';

export interface CreateInvoiceTemplateData {
  workspaceId: string;
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

export interface UpdateInvoiceTemplateData {
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
  lastRunAt?: string | null;
  nextRunAt?: string | null;
}

export interface InvoiceTemplateRepository {
  getById(id: string, context?: RequestContext): Promise<Result<InvoiceTemplate, DomainError>>;
  getDefault(workspaceId: string, context?: RequestContext): Promise<Result<InvoiceTemplate | null, DomainError>>;
  listByWorkspace(workspaceId: string, context?: RequestContext): Promise<Result<InvoiceTemplate[], DomainError>>;
  create(data: CreateInvoiceTemplateData, context?: RequestContext): Promise<Result<InvoiceTemplate, DomainError>>;
  update(id: string, data: UpdateInvoiceTemplateData, context?: RequestContext): Promise<Result<InvoiceTemplate, DomainError>>;
  delete(id: string, context?: RequestContext): Promise<Result<void, DomainError>>;
}
