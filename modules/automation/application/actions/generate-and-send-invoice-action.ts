import { IActionHandler, ActionContext, interpolateParams } from './action-registry';
import { ActionType, ActionResult } from '../../domain/types/action.types';
import { InvoiceService } from '../../../invoices/application/services/invoice-service';
import { InvoiceDocumentService } from '../../../invoices/application/services/invoice-document-service';
import { InvoiceEmailAdapter } from '../../../invoices/infrastructure/email/invoice-email-adapter';
import { CreateInvoiceDTO } from '../../../invoices/application/dto/invoice-dto';
import { createAdminClient } from '@/lib/supabase/server';

export class GenerateAndSendInvoiceAction implements IActionHandler {
  actionType: ActionType = 'generate_and_send_invoice';

  constructor(
    private invoiceService: InvoiceService,
    private invoiceDocumentService: InvoiceDocumentService,
    private emailAdapter: InvoiceEmailAdapter
  ) {}

  async execute(rawParams: Record<string, any>, context: ActionContext): Promise<ActionResult> {
    const startTime = Date.now();
    try {
      const mergedContext = {
        ...context.triggerContext,
        ...context.previousActionOutputs,
        workspaceId: context.workspaceId,
      };

      const params = interpolateParams(rawParams, mergedContext);
      const leaseId = params.leaseId || context.triggerContext?.leaseId || context.triggerContext?.lease_id;
      const templateId = params.templateId || params.invoiceTemplateId || context.triggerContext?.invoiceTemplateId || context.triggerContext?.templateId;

      const today = new Date();
      const issueDate = params.issueDate || today.toISOString().split('T')[0];
      const dueDateObj = new Date(today);
      dueDateObj.setDate(dueDateObj.getDate() + (Number(params.dueDays) || 14));
      const dueDate = params.dueDate || dueDateObj.toISOString().split('T')[0];

      // Calculate current month billing period
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

      let createDto: CreateInvoiceDTO;

      if (leaseId) {
        // --- 1. LEASE-CENTRIC INVOICE GENERATION ---
        const supabase = await createAdminClient();
        const { data: rawLease, error: leaseErr } = await (supabase as any)
          .from('leases')
          .select(`
            *,
            property:properties(*),
            lease_tenants!lease_tenants_lease_id_fkey(
              tenant:tenants!lease_tenants_tenant_id_fkey(*)
            )
          `)
          .eq('id', leaseId)
          .maybeSingle();

        let lease = rawLease as any;

        if (!lease) {
          const { data: simpleLease } = await (supabase as any)
            .from('leases')
            .select('*')
            .eq('id', leaseId)
            .maybeSingle();
          lease = simpleLease;
        }

        if (leaseErr || !lease) {
          throw new Error(`Lease '${leaseId}' not found for invoice generation.`);
        }

        if (lease.status === 'terminated' || lease.status === 'archived') {
          throw new Error(`Cannot generate invoice: Lease #${lease.id} is ${lease.status}.`);
        }

        const tenantRel = lease.lease_tenants?.[0];
        const tenant = tenantRel?.tenant;
        const tenantName = tenant
          ? `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim()
          : params.customerName || 'Tenant';
        const tenantEmail = tenant?.email || params.customerEmail || params.recipientEmail;

        if (!tenantEmail) {
          throw new Error(`No recipient email address associated with Lease #${lease.id}`);
        }

        const propertyName = lease.property?.name || 'Property';
        const rentAmount = Number(lease.rent_amount || params.amount || 0);
        const rentFrequency = lease.rent_frequency || 'monthly';
        const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });

        createDto = {
          workspaceId: context.workspaceId,
          propertyId: lease.property_id || lease.property?.id,
          leaseId: lease.id,
          tenantId: tenant?.id,
          customerName: tenantName,
          customerEmail: tenantEmail,
          recipientName: tenantName,
          recipientEmail: tenantEmail,
          issueDate,
          dueDate,
          billingPeriodStart: params.billingPeriodStart || startOfMonth,
          billingPeriodEnd: params.billingPeriodEnd || endOfMonth,
          currency: params.currency || lease.currency || 'AUD',
          items: [
            {
              description: `${propertyName} — Rent for ${monthName} (${rentFrequency})`,
              quantity: 1,
              unitPrice: rentAmount,
              taxRate: 0,
            },
          ],
          templateId: templateId || undefined,
          notes: params.notes || lease.notes || undefined,
          paymentInstructions: params.paymentInstructions || undefined,
        };
      } else {
        // --- 2. STANDALONE INVOICE GENERATION ---
        const customerName = params.customerName || params.recipientName || 'Customer';
        const customerEmail = params.customerEmail || params.recipientEmail || params.to;

        if (!customerEmail) {
          throw new Error('Standalone invoice automation requires a customer/recipient email address.');
        }

        const amount = Number(params.amount) || 0;
        const description = params.description || 'Monthly Service';

        createDto = {
          workspaceId: context.workspaceId,
          customerName,
          customerEmail,
          recipientName: customerName,
          recipientEmail: customerEmail,
          customerAddress: params.customerAddress || undefined,
          issueDate,
          dueDate,
          billingPeriodStart: params.billingPeriodStart || startOfMonth,
          billingPeriodEnd: params.billingPeriodEnd || endOfMonth,
          currency: params.currency || 'AUD',
          items: Array.isArray(params.items) && params.items.length > 0
            ? params.items.map((it: any) => ({
                description: it.description || description,
                quantity: Number(it.quantity) || 1,
                unitPrice: Number(it.unitPrice) || amount,
                taxRate: Number(it.taxRate) || 0,
              }))
            : [
                {
                  description,
                  quantity: 1,
                  unitPrice: amount,
                  taxRate: Number(params.taxRate) || 0,
                },
              ],
          templateId: templateId || undefined,
          notes: params.notes || undefined,
          paymentInstructions: params.paymentInstructions || undefined,
        };
      }

      // 1. Create brand new invoice
      const createRes = await this.invoiceService.createInvoice(createDto);
      if (!createRes.success) {
        throw new Error(createRes.error.message || 'Failed to create invoice');
      }

      let invoice = createRes.data;

      // 2. Issue the invoice
      const issueRes = await this.invoiceService.issueInvoice(invoice.id);
      if (issueRes.success) {
        invoice = issueRes.data;
      }

      // 3. Generate fresh PDF document for the new invoice
      const docResult = await this.invoiceDocumentService.generateDocument({
        invoiceId: invoice.id,
        format: 'pdf',
      });

      const recipientEmail = createDto.recipientEmail || invoice.customerEmail;
      if (!recipientEmail) {
        throw new Error(`Invoice #${invoice.invoiceNumber} has no valid recipient email.`);
      }

      // 4. Render and send invoice email with PDF attached
      const renderDto = await this.invoiceService.getInvoiceRenderData(invoice.id);
      const emailResult = await this.emailAdapter.sendInvoice({
        to: recipientEmail,
        recipientName: createDto.recipientName || 'Customer',
        invoice: renderDto,
        downloadUrl: docResult.documentUrl,
        pdfBuffer: docResult.buffer,
        customMessage: params.customMessage,
      });

      if (!emailResult.success) {
        throw new Error(emailResult.error?.message || 'Failed to deliver invoice email');
      }

      return {
        success: true,
        actionType: this.actionType,
        output: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          total: invoice.total,
          dueDate: invoice.dueDate,
          sentTo: recipientEmail,
          messageId: emailResult.messageId,
          downloadUrl: docResult.documentUrl,
        },
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        actionType: this.actionType,
        error: err.message || 'Failed to execute GenerateAndSendInvoiceAction',
        durationMs: Date.now() - startTime,
      };
    }
  }
}
