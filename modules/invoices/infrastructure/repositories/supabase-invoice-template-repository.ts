/**
 * Supabase Implementation of InvoiceTemplateRepository.
 */

import { Result, ok, err } from '@/shared/domain/result';
import { DomainError, NotFoundError, toSafeDomainError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';
import { TypedSupabaseClient } from '@/shared/infrastructure/database/supabase';
import {
  InvoiceTemplate,
  InvoiceLayoutStyle,
  InvoiceTemplateStatus,
  InvoiceTemplateItem,
  InvoiceTemplateAutomationConfig,
  InvoiceTemplateEmailConfig,
} from '../../domain/entities/invoice-template';
import {
  InvoiceTemplateRepository,
  CreateInvoiceTemplateData,
  UpdateInvoiceTemplateData,
} from '../../domain/repositories/invoice-template-repository';

export function mapTemplateRowToDomain(row: any): InvoiceTemplate {
  // Parse JSONB items safely
  let items: InvoiceTemplateItem[] = [];
  if (Array.isArray(row.items)) {
    items = row.items;
  } else if (typeof row.items === 'string') {
    try {
      items = JSON.parse(row.items);
    } catch {
      items = [];
    }
  }

  // Parse automation config safely
  let automationConfig: InvoiceTemplateAutomationConfig = {
    frequency: 'monthly',
    dayOfMonth: 1,
    autoApprove: true,
    autoSendEmail: true,
    conditionOnlyActiveLeases: true,
  };
  if (row.automation_config && typeof row.automation_config === 'object') {
    automationConfig = { ...automationConfig, ...row.automation_config };
  } else if (typeof row.automation_config === 'string') {
    try {
      automationConfig = { ...automationConfig, ...JSON.parse(row.automation_config) };
    } catch {
      // fallback
    }
  }

  // Parse email config safely
  let emailConfig: InvoiceTemplateEmailConfig = {
    enabled: true,
    recipientRule: 'tenant_email',
    attachPdf: true,
    subjectTemplate: 'Invoice {{invoice.number}} from Property Ledge',
    bodyTemplate: 'Hi {{customer_name}},\n\nPlease find attached your invoice for {{invoice.period}}.\nAmount Due: {{invoice.total}}\nDue Date: {{invoice.due_date}}\n\nThank you,\nProperty Ledge',
  };
  if (row.email_config && typeof row.email_config === 'object') {
    emailConfig = { ...emailConfig, ...row.email_config };
  } else if (typeof row.email_config === 'string') {
    try {
      emailConfig = { ...emailConfig, ...JSON.parse(row.email_config) };
    } catch {
      // fallback
    }
  }

  let linkedPropertyIds: string[] = [];
  if (Array.isArray(row.linked_property_ids)) {
    linkedPropertyIds = row.linked_property_ids;
  } else if (typeof row.linked_property_ids === 'string') {
    try {
      linkedPropertyIds = JSON.parse(row.linked_property_ids);
    } catch {
      linkedPropertyIds = [];
    }
  }

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description || null,
    status: (row.status as InvoiceTemplateStatus) || 'active',
    currency: row.currency || 'AUD',
    invoiceType: row.invoice_type || 'rent',
    items,
    paymentTermsDays: Number(row.payment_terms_days) || 14,
    lateFeeAmount: Number(row.late_fee_amount) || 0,
    lateFeeDays: Number(row.late_fee_days) || 0,
    linkedPropertyIds,
    defaultCustomerName: row.default_customer_name || null,
    defaultCustomerEmail: row.default_customer_email || null,
    automationConfig,
    emailConfig,
    lastRunAt: row.last_run_at || null,
    nextRunAt: row.next_run_at || null,
    layoutStyle: (row.layout_style as InvoiceLayoutStyle) || 'classic',
    brandColor: row.brand_color || '#22333b',
    accentColor: row.accent_color || '#a9927d',
    logoUrl: row.logo_url || null,
    headerText: row.header_text || null,
    footerText: row.footer_text || null,
    paymentInstructions: row.payment_instructions || null,
    taxName: row.tax_name || 'GST',
    notes: row.notes || null,
    isDefault: !!row.is_default,
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseInvoiceTemplateRepository implements InvoiceTemplateRepository {
  constructor(private readonly client: TypedSupabaseClient) {}

  async getById(id: string, _context?: RequestContext): Promise<Result<InvoiceTemplate, DomainError>> {
    try {
      const { data, error } = await this.client
        .from('invoice_templates')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) return err(toSafeDomainError(error));
      if (!data) return err(new NotFoundError('InvoiceTemplate', id));

      return ok(mapTemplateRowToDomain(data));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async getDefault(workspaceId: string, _context?: RequestContext): Promise<Result<InvoiceTemplate | null, DomainError>> {
    try {
      const { data, error } = await this.client
        .from('invoice_templates')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_default', true)
        .maybeSingle();

      if (error) return err(toSafeDomainError(error));
      if (!data) return ok(null);

      return ok(mapTemplateRowToDomain(data));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async listByWorkspace(workspaceId: string, _context?: RequestContext): Promise<Result<InvoiceTemplate[], DomainError>> {
    try {
      const { data, error } = await this.client
        .from('invoice_templates')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) return err(toSafeDomainError(error));

      return ok((data || []).map(mapTemplateRowToDomain));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async create(data: CreateInvoiceTemplateData, context?: RequestContext): Promise<Result<InvoiceTemplate, DomainError>> {
    try {
      if (data.isDefault) {
        // Clear previous default
        await this.client
          .from('invoice_templates')
          .update({ is_default: false })
          .eq('workspace_id', data.workspaceId);
      }

      const payload: any = {
        workspace_id: data.workspaceId,
        name: data.name,
        description: data.description || null,
        status: data.status || 'active',
        currency: data.currency || 'AUD',
        invoice_type: data.invoiceType || 'rent',
        items: data.items || [],
        payment_terms_days: data.paymentTermsDays ?? 14,
        late_fee_amount: data.lateFeeAmount ?? 0,
        late_fee_days: data.lateFeeDays ?? 0,
        linked_property_ids: data.linkedPropertyIds || [],
        default_customer_name: data.defaultCustomerName || null,
        default_customer_email: data.defaultCustomerEmail || null,
        automation_config: data.automationConfig || {},
        email_config: data.emailConfig || {},
        layout_style: data.layoutStyle || 'classic',
        brand_color: data.brandColor || '#22333b',
        accent_color: data.accentColor || '#a9927d',
        logo_url: data.logoUrl || null,
        header_text: data.headerText || null,
        footer_text: data.footerText || null,
        payment_instructions: data.paymentInstructions || null,
        tax_name: data.taxName || 'GST',
        notes: data.notes || null,
        is_default: !!data.isDefault,
        created_by: context?.userId || null,
      };

      const { data: inserted, error } = await this.client
        .from('invoice_templates')
        .insert(payload)
        .select()
        .single();

      if (error) return err(toSafeDomainError(error));

      return ok(mapTemplateRowToDomain(inserted));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async update(id: string, data: UpdateInvoiceTemplateData, _context?: RequestContext): Promise<Result<InvoiceTemplate, DomainError>> {
    try {
      const updatePayload: any = { updated_at: new Date().toISOString() };
      if (data.name !== undefined) updatePayload.name = data.name;
      if (data.description !== undefined) updatePayload.description = data.description;
      if (data.status !== undefined) updatePayload.status = data.status;
      if (data.currency !== undefined) updatePayload.currency = data.currency;
      if (data.invoiceType !== undefined) updatePayload.invoice_type = data.invoiceType;
      if (data.items !== undefined) updatePayload.items = data.items;
      if (data.paymentTermsDays !== undefined) updatePayload.payment_terms_days = data.paymentTermsDays;
      if (data.lateFeeAmount !== undefined) updatePayload.late_fee_amount = data.lateFeeAmount;
      if (data.lateFeeDays !== undefined) updatePayload.late_fee_days = data.lateFeeDays;
      if (data.linkedPropertyIds !== undefined) updatePayload.linked_property_ids = data.linkedPropertyIds;
      if (data.defaultCustomerName !== undefined) updatePayload.default_customer_name = data.defaultCustomerName;
      if (data.defaultCustomerEmail !== undefined) updatePayload.default_customer_email = data.defaultCustomerEmail;
      if (data.automationConfig !== undefined) updatePayload.automation_config = data.automationConfig;
      if (data.emailConfig !== undefined) updatePayload.email_config = data.emailConfig;
      if (data.layoutStyle !== undefined) updatePayload.layout_style = data.layoutStyle;
      if (data.brandColor !== undefined) updatePayload.brand_color = data.brandColor;
      if (data.accentColor !== undefined) updatePayload.accent_color = data.accentColor;
      if (data.logoUrl !== undefined) updatePayload.logo_url = data.logoUrl;
      if (data.headerText !== undefined) updatePayload.header_text = data.headerText;
      if (data.footerText !== undefined) updatePayload.footer_text = data.footerText;
      if (data.paymentInstructions !== undefined) updatePayload.payment_instructions = data.paymentInstructions;
      if (data.taxName !== undefined) updatePayload.tax_name = data.taxName;
      if (data.notes !== undefined) updatePayload.notes = data.notes;
      if (data.isDefault !== undefined) updatePayload.is_default = data.isDefault;
      if (data.lastRunAt !== undefined) updatePayload.last_run_at = data.lastRunAt;
      if (data.nextRunAt !== undefined) updatePayload.next_run_at = data.nextRunAt;

      const { data: updated, error } = await this.client
        .from('invoice_templates')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) return err(toSafeDomainError(error));

      return ok(mapTemplateRowToDomain(updated));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async delete(id: string, _context?: RequestContext): Promise<Result<void, DomainError>> {
    try {
      const { error } = await this.client.from('invoice_templates').delete().eq('id', id);
      if (error) return err(toSafeDomainError(error));
      return ok(undefined);
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }
}
