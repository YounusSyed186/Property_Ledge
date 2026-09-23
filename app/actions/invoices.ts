'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import { getCurrentUser } from '@/lib/auth/queries';
import { container } from '@/composition/container';
import { emailService } from '@/lib/email/service';
import {
  CreateInvoiceDTO,
  UpdateInvoiceDTO,
  BulkInvoiceDTO,
  InvoiceFilters,
  InvoiceDTO,
  InvoiceTemplateDTO,
  UpdateInvoiceDraftDTO,
} from '@/modules/invoices';
import { InvoiceStatus } from '@/modules/invoices/domain/entities/invoice';
import { getAuTodayString, getAuDateParts, DEFAULT_AU_TIMEZONE } from '@/lib/format/australian-time';

async function getContextAndService() {
  const [user, context, invoiceService, invoiceDocService] = await Promise.all([
    getCurrentUser(),
    resolveWorkspaceContext(),
    container.resolve('invoiceService'),
    container.resolve('invoiceDocumentService'),
  ]);

  if (!user || !context) {
    throw new Error('Unauthorized or no active workspace');
  }

  return { user, context, invoiceService, invoiceDocService };
}

export async function fetchInvoicesAction(filters?: {
  status?: string;
  search?: string;
  propertyId?: string;
  leaseId?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: InvoiceDTO[]; total: number }> {
  try {
    const { context, invoiceService } = await getContextAndService();
    const queryFilters: InvoiceFilters = {
      workspaceId: context.workspaceId,
      status: filters?.status as InvoiceStatus | undefined,
      propertyId: filters?.propertyId,
      leaseId: filters?.leaseId,
      search: filters?.search,
      page: filters?.page || 1,
      limit: filters?.limit || 50,
    };

    const res = await invoiceService.listInvoices(queryFilters);
    if (!res.success || !res.data) {
      if (!res.success) {
        console.error('[fetchInvoicesAction] Error:', res.error);
      }
      return { items: [], total: 0 };
    }
    return { items: res.data, total: res.data.length };
  } catch (err: any) {
    console.error('[fetchInvoicesAction] Error:', err);
    return { items: [], total: 0 };
  }
}

export async function fetchInvoiceByIdAction(id: string): Promise<InvoiceDTO | null> {
  try {
    const { invoiceService } = await getContextAndService();
    return await invoiceService.getInvoiceById(id);
  } catch (err: any) {
    console.error('[fetchInvoiceByIdAction] Error:', err);
    return null;
  }
}

export async function createInvoiceAction(dto: CreateInvoiceDTO) {
  try {
    const { context, invoiceService } = await getContextAndService();
    const res = await invoiceService.createInvoice({
      ...dto,
      workspaceId: context.workspaceId,
    });
    if (!res.success) {
      return { success: false, error: res.error.message || 'Failed to create invoice' };
    }
    revalidatePath('/dashboard/invoices');
    return { success: true, invoice: res.data };
  } catch (err: any) {
    console.error('[createInvoiceAction] Error:', err);
    return { success: false, error: err.message || 'Failed to create invoice' };
  }
}

export async function createBulkInvoicesAction(dto: BulkInvoiceDTO) {
  try {
    const { user, context, invoiceService } = await getContextAndService();
    const res = await invoiceService.createBulkInvoices(
      {
        ...dto,
        workspaceId: context.workspaceId,
      },
      {
        userId: user.id,
        workspaceId: context.workspaceId,
      }
    );
    if (!res.success) {
      return { success: false, error: res.error.message || 'Failed to create bulk invoices' };
    }
    revalidatePath('/dashboard/invoices');
    return {
      success: true,
      createdCount: res.data.createdCount,
      invoices: res.data.invoices,
    };
  } catch (err: any) {
    console.error('[createBulkInvoicesAction] Error:', err);
    return { success: false, error: err.message || 'Failed to generate bulk invoices' };
  }
}

export async function updateInvoiceAction(id: string, dto: UpdateInvoiceDTO) {
  try {
    const { invoiceService } = await getContextAndService();
    const res = await invoiceService.updateInvoice(id, dto);
    if (!res.success) {
      return { success: false, error: res.error.message || 'Failed to update invoice' };
    }
    revalidatePath('/dashboard/invoices');
    return { success: true, invoice: res.data };
  } catch (err: any) {
    console.error('[updateInvoiceAction] Error:', err);
    return { success: false, error: err.message || 'Failed to update invoice' };
  }
}

export async function issueInvoiceAction(id: string) {
  try {
    const { invoiceService } = await getContextAndService();
    const res = await invoiceService.issueInvoice(id);
    if (!res.success) {
      return { success: false, error: res.error.message || 'Failed to issue invoice' };
    }
    revalidatePath('/dashboard/invoices');
    return { success: true, invoice: res.data };
  } catch (err: any) {
    console.error('[issueInvoiceAction] Error:', err);
    return { success: false, error: err.message || 'Failed to issue invoice' };
  }
}

export async function recordInvoicePaymentAction(
  invoiceId: string,
  amount: number,
  paymentMethod = 'bank_transfer',
  reference?: string
) {
  try {
    const { user, context, invoiceService } = await getContextAndService();
    const res = await invoiceService.recordPayment(invoiceId, amount, paymentMethod, reference);
    if (!res.success) {
      return { success: false, error: res.error.message || 'Failed to record payment' };
    }

    // Automatically create a ledger transaction for this payment so BAS and Money Ledger capture it
    try {
      const invoice = res.data;
      const supabase = await createClient();
      // Find default Rent/Income category
      const { data: catData } = await supabase
        .from('categories')
        .select('id, default_tax_classification_id')
        .eq('transaction_type', 'income')
        .ilike('name', '%Rent%')
        .limit(1)
        .maybeSingle();

      let categoryId = (catData as any)?.id;
      let taxClassificationId = (catData as any)?.default_tax_classification_id;

      if (!categoryId) {
        const { data: anyCat } = await supabase
          .from('categories')
          .select('id, default_tax_classification_id')
          .eq('transaction_type', 'income')
          .limit(1)
          .maybeSingle();
        categoryId = (anyCat as any)?.id;
        taxClassificationId = (anyCat as any)?.default_tax_classification_id;
      }

      // Check property GST status
      let gstInclusive = false;
      let gstAmount = 0;
      if (invoice.propertyId) {
        const { data: propData } = await supabase
          .from('properties')
          .select('gst_enabled')
          .eq('id', invoice.propertyId)
          .maybeSingle();

        if ((propData as any)?.gst_enabled && invoice.taxAmount > 0) {
          gstInclusive = true;
          // Calculate proportional GST for this payment amount
          const gstRatio = invoice.totalAmount > 0 ? invoice.taxAmount / invoice.totalAmount : 0;
          gstAmount = Math.round(amount * gstRatio * 100) / 100;
        }
      }

      if (categoryId && invoice.propertyId) {
        const validPaymentMethods = ['bank_transfer', 'cash', 'card', 'cheque', 'direct_debit', 'other'];
        const sanitizedPaymentMethod = validPaymentMethods.includes(paymentMethod) ? paymentMethod : 'bank_transfer';

        await supabase.from('transactions').insert({
          amount,
          transaction_type: 'income',
          transaction_category_id: categoryId,
          transaction_date: getAuTodayString(),
          property_id: invoice.propertyId,
          workspace_id: context.workspaceId,
          payment_method: sanitizedPaymentMethod,
          description: `Payment for Invoice ${invoice.invoiceNumber || ''}`.trim(),
          reference: reference || invoice.invoiceNumber || null,
          status: 'completed',
          tenant_id: invoice.tenantId || null,
          lease_id: invoice.leaseId || null,
          invoice_id: invoice.id,
          created_by: user.id,
          gst_inclusive: gstInclusive,
          gst_amount: gstAmount,
          tax_classification_id: taxClassificationId || null,
        } as never);
      }
    } catch (txErr) {
      console.error('[recordInvoicePaymentAction] Error creating synchronized transaction ledger entry:', txErr);
    }

    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard/money');
    revalidatePath('/dashboard/reports/bas');
    return { success: true, invoice: res.data };
  } catch (err: any) {
    console.error('[recordInvoicePaymentAction] Error:', err);
    return { success: false, error: err.message || 'Failed to record payment' };
  }
}

export async function cancelInvoiceAction(id: string, reason?: string) {
  try {
    const { invoiceService } = await getContextAndService();
    const res = await invoiceService.cancelInvoice(id, reason);
    if (!res.success) {
      return { success: false, error: res.error.message || 'Failed to cancel invoice' };
    }
    revalidatePath('/dashboard/invoices');
    return { success: true, invoice: res.data };
  } catch (err: any) {
    console.error('[cancelInvoiceAction] Error:', err);
    return { success: false, error: err.message || 'Failed to cancel invoice' };
  }
}

export async function deleteDraftInvoiceAction(id: string) {
  try {
    const { invoiceService } = await getContextAndService();
    const res = await invoiceService.deleteDraftInvoice(id);
    if (!res.success) {
      return { success: false, error: res.error.message || 'Failed to delete draft invoice' };
    }
    revalidatePath('/dashboard/invoices');
    return { success: true };
  } catch (err: any) {
    console.error('[deleteDraftInvoiceAction] Error:', err);
    return { success: false, error: err.message || 'Failed to delete draft invoice' };
  }
}

export async function deleteInvoiceAction(id: string) {
  try {
    const { invoiceService } = await getContextAndService();
    const res = await invoiceService.deleteInvoice(id);
    if (!res.success) {
      return { success: false, error: res.error.message || 'Failed to delete invoice' };
    }
    revalidatePath('/dashboard/invoices');
    return { success: true };
  } catch (err: any) {
    console.error('[deleteInvoiceAction] Error:', err);
    return { success: false, error: err.message || 'Failed to delete invoice' };
  }
}

export async function getInvoiceDownloadUrlAction(invoiceId: string, format: 'pdf' | 'docx' = 'pdf') {
  try {
    const { invoiceDocService } = await getContextAndService();
    const url = await invoiceDocService.getDocumentUrl(invoiceId, format);
    return { success: true, url };
  } catch (err: any) {
    console.error('[getInvoiceDownloadUrlAction] Error:', err);
    return { success: false, error: err.message || 'Failed to get document download URL' };
  }
}

export async function generateInvoiceDocumentAction(invoiceId: string, format: 'pdf' | 'docx' = 'pdf') {
  try {
    const { invoiceDocService } = await getContextAndService();
    const doc = await invoiceDocService.generateDocument({ invoiceId, format, forceRegenerate: true });
    return { success: true, url: doc.documentUrl };
  } catch (err: any) {
    console.error('[generateInvoiceDocumentAction] Error:', err);
    return { success: false, error: err.message || 'Failed to generate document' };
  }
}

export async function sendInvoiceEmailAction(
  invoiceId: string,
  customMessage?: string,
  driveFolderUrl?: string,
  subject?: string
) {
  try {
    const { invoiceService, invoiceDocService } = await getContextAndService();
    const invoice = await invoiceService.getInvoiceById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const recipientEmail = invoice.recipient?.email || invoice.customerEmail;
    if (!recipientEmail) {
      throw new Error('Invoice recipient does not have an email address');
    }

    // If draft, issue it first
    if (invoice.status === 'draft') {
      await invoiceService.issueInvoice(invoiceId);
    }

    const docResult = await invoiceDocService.generateDocument({ invoiceId, format: 'pdf' });
    const renderDto = await invoiceService.getInvoiceRenderData(invoiceId);

    const { invoiceEmailAdapter } = await import('@/modules/invoices/infrastructure/email/invoice-email-adapter');
    const res = await invoiceEmailAdapter.sendInvoice({
      to: recipientEmail,
      recipientName: invoice.recipient?.name || invoice.customerName || 'Customer',
      invoice: renderDto,
      downloadUrl: docResult.documentUrl,
      pdfBuffer: docResult.buffer,
      customMessage,
      driveFolderUrl,
      subject,
    });

    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to deliver email');
    }

    revalidatePath('/dashboard/invoices');
    return { success: true, messageId: res.messageId };
  } catch (err: any) {
    console.error('[sendInvoiceEmailAction] Error:', err);
    return { success: false, error: err.message || 'Failed to send invoice email' };
  }
}

export async function sendInvoiceTestEmailAction(
  invoiceId: string,
  testRecipient: string,
  customMessage?: string,
  driveFolderUrl?: string,
  subject?: string
) {
  try {
    const { user, invoiceService, invoiceDocService } = await getContextAndService();
    const invoice = await invoiceService.getInvoiceById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const targetEmail = testRecipient.trim() || user.email;
    if (!targetEmail) {
      throw new Error('Please provide a valid test recipient email address');
    }

    const docResult = await invoiceDocService.generateDocument({ invoiceId, format: 'pdf' });
    const renderDto = await invoiceService.getInvoiceRenderData(invoiceId);

    const testSubject = subject?.trim()
      ? (subject.startsWith('[TEST EMAIL]') ? subject : `[TEST EMAIL] ${subject}`)
      : `[TEST EMAIL] Invoice ${invoice.invoiceNumber || 'INV-PREVIEW'} (Test Preview)`;

    const testMessage = customMessage
      ? `[TEST EMAIL PREVIEW - SENDER VERIFICATION]\n\n${customMessage}`
      : `[TEST EMAIL PREVIEW - SENDER VERIFICATION]\n\nThis is a sample test delivery of invoice ${invoice.invoiceNumber}. Please verify the layout and attachment before sending to your client.`;

    const { invoiceEmailAdapter } = await import('@/modules/invoices/infrastructure/email/invoice-email-adapter');
    const res = await invoiceEmailAdapter.sendInvoice({
      to: targetEmail,
      recipientName: invoice.recipient?.name || invoice.customerName || 'Test Recipient',
      invoice: renderDto,
      downloadUrl: docResult.documentUrl,
      pdfBuffer: docResult.buffer,
      customMessage: testMessage,
      driveFolderUrl,
      subject: testSubject,
    });

    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to deliver test email');
    }

    return { success: true, messageId: res.messageId, recipient: targetEmail };
  } catch (err: any) {
    console.error('[sendInvoiceTestEmailAction] Error:', err);
    return { success: false, error: err.message || 'Failed to send test email' };
  }
}

// Templates
export async function fetchInvoiceTemplatesAction(): Promise<InvoiceTemplateDTO[]> {
  try {
    const { context, invoiceService } = await getContextAndService();
    return await invoiceService.listTemplates(context.workspaceId);
  } catch (err: any) {
    console.error('[fetchInvoiceTemplatesAction] Error:', err);
    return [];
  }
}

export async function fetchInvoiceTemplateByIdAction(id: string): Promise<InvoiceTemplateDTO | null> {
  try {
    const { invoiceService } = await getContextAndService();
    return await invoiceService.getTemplate(id);
  } catch (err: any) {
    console.error('[fetchInvoiceTemplateByIdAction] Error:', err);
    return null;
  }
}

export async function createInvoiceTemplateAction(dto: any) {
  try {
    const { context, invoiceService } = await getContextAndService();
    const template = await invoiceService.createTemplate(context.workspaceId, dto);
    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard/invoices/templates');
    return { success: true, template };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create template' };
  }
}

export async function updateInvoiceTemplateAction(id: string, dto: any) {
  try {
    const { invoiceService } = await getContextAndService();
    const template = await invoiceService.updateTemplate(id, dto);
    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard/invoices/templates');
    revalidatePath(`/dashboard/invoices/templates/${id}`);
    return { success: true, template };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update template' };
  }
}

export async function duplicateInvoiceTemplateAction(id: string) {
  try {
    const { invoiceService } = await getContextAndService();
    const template = await invoiceService.duplicateTemplate(id);
    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard/invoices/templates');
    return { success: true, template };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to duplicate template' };
  }
}

export async function updateInvoiceTemplateStatusAction(id: string, status: 'draft' | 'active' | 'paused' | 'archived') {
  try {
    const { invoiceService } = await getContextAndService();
    const template = await invoiceService.setTemplateStatus(id, status);
    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard/invoices/templates');
    revalidatePath(`/dashboard/invoices/templates/${id}`);
    return { success: true, template };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update template status' };
  }
}

export async function deleteInvoiceTemplateAction(id: string) {
  try {
    const { invoiceService } = await getContextAndService();
    await invoiceService.deleteTemplate(id);
    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard/invoices/templates');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete template' };
  }
}

export async function checkResendStatusAction() {
  try {
    const hasApiKey = !!process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const fromName = process.env.EMAIL_FROM_NAME || 'Property Ledge';
    return {
      connected: hasApiKey,
      fromEmail,
      fromName,
      statusText: hasApiKey ? 'Connected & Ready' : 'API Key Missing (Simulated Mode)',
    };
  } catch (err: any) {
    return {
      connected: false,
      fromEmail: '',
      fromName: '',
      statusText: err.message || 'Error checking status',
    };
  }
}

export async function sendInvoiceTemplateTestEmailAction(templateId: string, testRecipient: string) {
  try {
    const { invoiceService } = await getContextAndService();
    const template = await invoiceService.getTemplate(templateId);
    if (!template) throw new Error('Template not found');

    const currency = template.currency || 'AUD';

    const items = template.items || [];
    const subtotal = items.reduce((s: number, i: any) => s + (Number(i.unitPrice) || 0) * (Number(i.quantity) || 1), 0);
    const taxRate = items[0]?.taxRate ?? 10;
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;

    const res = await emailService.sendEmail({
      to: testRecipient,
      subject: `[TEST] ${template.emailConfig?.subjectTemplate || `Invoice from Property Ledge`} (Sample Preview)`,
      templateType: 'invoice',
      variables: {
        tenantName: template.defaultCustomerName || 'Sample Customer',
        propertyAddress: '123 Sample St, Sydney NSW 2000',
        senderName: 'Property Ledge Management',
        senderEmail: 'manager@propertyledge.com.au',
        invoiceNumber: 'INV-TEST-PREVIEW',
        dueDate: new Date(Date.now() + (template.paymentTermsDays || 14) * 86400000).toISOString().split('T')[0],
        totalAmount: totalAmount.toFixed(2),
        currency,
        notes: template.notes || 'This is a test invoice delivery.',
      },
    });

    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to send test email');
    }

    return { success: true, messageId: res.messageId };
  } catch (err: any) {
    console.error('[sendInvoiceTemplateTestEmailAction] Error:', err);
    return { success: false, error: err.message || 'Failed to send test email' };
  }
}

export async function runInvoiceTemplateNowAction(templateId: string, overrides?: {
  recipientName?: string;
  recipientEmail?: string;
  dueDate?: string;
  propertyId?: string;
  leaseId?: string;
}) {
  try {
    const { user, context, invoiceService } = await getContextAndService();
    const template = await invoiceService.getTemplate(templateId);
    if (!template) throw new Error('Template not found');

    const documentService = await container.resolve('invoiceDocumentService');
    const reqContext = { workspaceId: context.workspaceId, userId: user.id };

    const todayStr = getAuTodayString();
    let dueDate = overrides?.dueDate;
    if (!dueDate) {
      const dueDays = template.paymentTermsDays || 14;
      const d = new Date();
      d.setDate(d.getDate() + dueDays);
      const parts = getAuDateParts(d, DEFAULT_AU_TIMEZONE);
      dueDate = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
    }

    const customerName = overrides?.recipientName || template.defaultCustomerName || 'Customer';
    const customerEmail = overrides?.recipientEmail || template.defaultCustomerEmail || null;

    // Map template items to Invoice Items
    const invoiceItems = (template.items && template.items.length > 0)
      ? template.items.map((i: any) => ({
          description: i.description,
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unitPrice) || 0,
          taxRate: i.taxRate !== undefined ? Number(i.taxRate) : 10,
        }))
      : [{
          description: template.name || 'Professional Services / Rent',
          quantity: 1,
          unitPrice: 500,
          taxRate: 10,
        }];

    // 1. Create Invoice
    const createRes = await invoiceService.createInvoice({
      workspaceId: context.workspaceId,
      templateId: template.id,
      currency: template.currency || 'AUD',
      propertyId: overrides?.propertyId || (template.linkedPropertyIds?.[0] || null),
      leaseId: overrides?.leaseId || null,
      customerName,
      customerEmail,
      recipientName: customerName,
      recipientEmail: customerEmail,
      issueDate: todayStr,
      dueDate,
      items: invoiceItems,
      notes: template.notes || undefined,
      paymentInstructions: template.paymentInstructions || undefined,
      autoIssue: true,
    });

    if (!createRes.success) {
      throw createRes.error;
    }

    const createdInvoice = createRes.data;

    // 2. Generate PDF Document
    let documentGenerated = false;
    let documentPath: string | undefined;
    try {
      const docRes = await documentService.generateAndStorePdf(
        createdInvoice.id,
        reqContext
      );
      if (docRes.success) {
        documentGenerated = true;
        documentPath = docRes.data.document?.storagePath || docRes.data.signedUrl;
      }
    } catch (docErr) {
      console.warn('[runInvoiceTemplateNowAction] Document generation error:', docErr);
    }

    // 3. Send Email via Resend if configured and customer has email
    let emailSent = false;
    let emailError: string | undefined;

    if (template.emailConfig?.enabled && customerEmail) {
      try {
        const emailRes = await emailService.sendEmail({
          to: customerEmail,
          subject: template.emailConfig.subjectTemplate
            ? template.emailConfig.subjectTemplate
                .replace('{{invoice.number}}', createdInvoice.invoiceNumber)
                .replace('{{customer_name}}', customerName)
            : `Invoice ${createdInvoice.invoiceNumber} from Property Ledge`,
          templateType: 'invoice',
          variables: {
            tenantName: customerName,
            propertyAddress: template.defaultCustomerName || 'Property Address',
            senderName: 'Property Ledge Management',
            senderEmail: 'manager@propertyledge.com.au',
            invoiceNumber: createdInvoice.invoiceNumber,
            dueDate: createdInvoice.dueDate,
            totalAmount: createdInvoice.totalAmount.toFixed(2),
            currency: createdInvoice.currency,
          },
        });
        emailSent = emailRes.success;
        if (!emailRes.success) {
          emailError = emailRes.error?.message;
        }
      } catch (emErr: any) {
        emailError = emErr.message || 'Email delivery failed';
      }
    }

    // 4. Update last_run_at timestamp on template
    await invoiceService.updateTemplate(template.id, {
      lastRunAt: new Date().toISOString(),
    });

    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard/invoices/templates');
    revalidatePath(`/dashboard/invoices/templates/${templateId}`);

    return {
      success: true,
      result: {
        templateId: template.id,
        templateName: template.name,
        invoiceId: createdInvoice.id,
        invoiceNumber: createdInvoice.invoiceNumber,
        totalAmount: createdInvoice.totalAmount,
        currency: createdInvoice.currency,
        status: createdInvoice.status,
        documentGenerated,
        documentPath,
        emailSent,
        emailError,
        executedAt: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    console.error('[runInvoiceTemplateNowAction] Error:', err);
    return { success: false, error: err.message || 'Failed to execute template' };
  }
}

// Bulk Generation for Active Leases
export async function bulkGenerateRentInvoicesAction(options?: {
  dueDate?: string;
  issueDate?: string;
  autoIssue?: boolean;
}) {
  try {
    const { context, invoiceService } = await getContextAndService();
    const leaseService = await container.resolve('leaseService');
    const tenantService = await container.resolve('tenantService');

    // Fetch active leases in workspace
    const leasesResult = await leaseService.listLeasesByWorkspace(context.workspaceId);
    const activeLeases = (leasesResult.success ? leasesResult.data : []).filter(
      (l: any) => l.status === 'active' || l.status === 'Active'
    );

    const generatedInvoices: InvoiceDTO[] = [];
    const errors: string[] = [];

    const todayStr = getAuTodayString();
    const targetIssueDate = options?.issueDate || todayStr;
    const targetDueDate = options?.dueDate || todayStr;

    for (const lease of activeLeases) {
      try {
        let tenantName = 'Tenant';
        let tenantEmail = '';

        const primaryTenantId = lease.tenants?.[0]?.tenantId;
        if (primaryTenantId) {
          const tenantRes = await tenantService.getTenant(primaryTenantId);
          if (tenantRes.success && tenantRes.data) {
            const t = tenantRes.data;
            tenantName = `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.fullName || 'Tenant';
            tenantEmail = t.email || '';
          }
        }

        const rentAmount = Number(lease.rentAmount || 0);
        if (rentAmount <= 0) continue;

        const res = await invoiceService.createInvoice({
          workspaceId: context.workspaceId,
          propertyId: lease.propertyId,
          leaseId: lease.id,
          tenantId: primaryTenantId,
          customerName: tenantName,
          customerEmail: tenantEmail,
          recipientName: tenantName,
          recipientEmail: tenantEmail,
          issueDate: targetIssueDate,
          dueDate: targetDueDate,
          currency: 'AUD',
          items: [
            {
              description: `Rent - ${lease.rentFrequency || 'Monthly'} (${targetDueDate})`,
              quantity: 1,
              unitPrice: rentAmount,
              taxRate: 0,
            },
          ],
          notes: 'Standard lease recurring rent invoice',
          autoIssue: options?.autoIssue ?? false,
        });

        if (!res.success) {
          errors.push(`Lease ${lease.id}: ${res.error.message}`);
          continue;
        }

        generatedInvoices.push(res.data);
      } catch (lErr: any) {
        errors.push(`Lease ${lease.id}: ${lErr.message}`);
      }
    }

    revalidatePath('/dashboard/invoices');
    return {
      success: true,
      count: generatedInvoices.length,
      invoices: generatedInvoices,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err: any) {
    console.error('[bulkGenerateRentInvoicesAction] Error:', err);
    return { success: false, error: err.message || 'Bulk invoice generation failed' };
  }
}
