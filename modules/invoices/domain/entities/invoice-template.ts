/**
 * Invoice Template Entity.
 * Controls recurring billing blueprint, default line items, automation rules,
 * email delivery settings, branding, and layouts.
 */

export type InvoiceLayoutStyle =
  | 'classic'
  | 'modern'
  | 'minimalist'
  | 'corporate'
  | 'creative'
  | 'elegant'
  | 'monochrome';

export type InvoiceTemplateStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface InvoiceTemplateItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number; // e.g. 10 for 10% GST
  discount?: number; // percentage or fixed amount
  amount?: number;
}

export interface InvoiceTemplateAutomationConfig {
  frequency: 'monthly' | 'weekly' | 'fortnightly' | 'quarterly' | 'yearly' | 'on_demand';
  dayOfMonth?: number; // 1-31
  dayOfWeek?: number; // 0-6 (0 = Sunday)
  specificDate?: string;
  autoApprove?: boolean;
  autoSendEmail?: boolean;
  leaseEvent?: 'start' | 'end' | 'active' | 'none';
  conditionOnlyActiveLeases?: boolean;
}

export interface InvoiceTemplateEmailConfig {
  enabled: boolean;
  recipientRule?: 'tenant_email' | 'custom_email' | 'prompt_on_run';
  customEmail?: string;
  cc?: string[];
  bcc?: string[];
  subjectTemplate?: string;
  bodyTemplate?: string;
  attachPdf?: boolean;
  replyTo?: string;
}

export interface InvoiceTemplate {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  status: InvoiceTemplateStatus;
  currency: string; // e.g. 'AUD', 'USD', 'INR', 'EUR', 'GBP'
  invoiceType: string; // e.g. 'rent', 'maintenance', 'utilities', 'management_fee', 'custom'
  
  // Blueprint Content
  items: InvoiceTemplateItem[];
  paymentTermsDays: number; // e.g. 14 days
  lateFeeAmount?: number;
  lateFeeDays?: number;
  
  // Optional Source Defaults
  linkedPropertyIds?: string[];
  defaultCustomerName?: string | null;
  defaultCustomerEmail?: string | null;
  
  // Automation & Delivery
  automationConfig: InvoiceTemplateAutomationConfig;
  emailConfig: InvoiceTemplateEmailConfig;
  lastRunAt?: string | null;
  nextRunAt?: string | null;

  // Visual Styling & Branding
  layoutStyle: InvoiceLayoutStyle;
  brandColor: string;
  accentColor: string;
  logoUrl?: string | null;
  headerText?: string | null;
  footerText?: string | null;
  paymentInstructions?: string | null;
  taxName: string; // e.g. 'GST', 'VAT', 'Sales Tax'
  notes?: string | null;
  isDefault: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}
