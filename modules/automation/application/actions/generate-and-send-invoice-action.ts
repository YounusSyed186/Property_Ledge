import { IActionHandler, ActionContext, interpolateParams } from './action-registry';
import { ActionType, ActionResult } from '../../domain/types/action.types';
import { InvoiceService } from '../../../invoices/application/services/invoice-service';
import { InvoiceDocumentService } from '../../../invoices/application/services/invoice-document-service';
import { InvoiceEmailAdapter } from '../../../invoices/infrastructure/email/invoice-email-adapter';
import { CreateInvoiceDTO } from '../../../invoices/application/dto/invoice-dto';
import { createAdminClient } from '@/lib/supabase/server';
import {
  getAuTodayString,
  getAuMonthBillingPeriod,
  getAuDateParts,
  createAuDate,
  DEFAULT_AU_TIMEZONE,
} from '@/lib/format/australian-time';

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

      const issueDate = params.issueDate || getAuTodayString();
      const { startOfMonth, endOfMonth, monthName } = getAuMonthBillingPeriod();

      // Calculate default dueDate in Australian timezone
      let dueDate = params.dueDate;
      if (!dueDate) {
        const todayParts = getAuDateParts(new Date(), DEFAULT_AU_TIMEZONE);
        const dueDays = Number(params.dueDays) || 14;
        const dueTarget = new Date();
        dueTarget.setDate(dueTarget.getDate() + dueDays);
        const dueParts = getAuDateParts(dueTarget, DEFAULT_AU_TIMEZONE);
        dueDate = `${dueParts.year}-${String(dueParts.month).padStart(2, '0')}-${String(dueParts.day).padStart(2, '0')}`;
      }

      let createDto: CreateInvoiceDTO;

      const rawIssuer = params.issuer || params.issuedBy || params;
      const customIssuer = (rawIssuer && (rawIssuer.name || rawIssuer.issuerName || rawIssuer.senderCompanyName || rawIssuer.email || rawIssuer.issuerEmail)) ? {
        name: rawIssuer.name || rawIssuer.issuerName || rawIssuer.senderCompanyName || 'Property Ledge Management',
        email: rawIssuer.email || rawIssuer.issuerEmail || rawIssuer.senderEmail || 'billing@propertyledge.com.au',
        phone: rawIssuer.phone || rawIssuer.issuerPhone || rawIssuer.senderPhone || undefined,
        address: rawIssuer.address || rawIssuer.issuerAddress || rawIssuer.senderCompanyAddress || undefined,
        taxId: rawIssuer.taxId || rawIssuer.issuerTaxId || rawIssuer.senderTaxNumber || undefined,
      } : undefined;

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

        let tenantRel = lease.lease_tenants?.[0];
        let tenant = tenantRel?.tenant;

        // Direct fallback lookup if nested join returned empty
        if (!tenant && lease.id) {
          try {
            const { data: directLt } = await (supabase as any)
              .from('lease_tenants')
              .select('*, tenant:tenants(*)')
              .eq('lease_id', lease.id)
              .maybeSingle();
            if (directLt?.tenant) {
              tenant = directLt.tenant;
            }
          } catch (e) {
            console.warn('[GenerateAndSendInvoiceAction] Direct tenant lookup:', e);
          }
        }

        const tenantName = tenant
          ? `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim()
          : params.customerName || context.triggerContext?.customerName || 'Tenant';

        const tenantEmail =
          tenant?.email ||
          params.customerEmail ||
          params.recipientEmail ||
          context.triggerContext?.customerEmail ||
          context.triggerContext?.recipientEmail ||
          context.triggerContext?.tenantEmail;

        if (!tenantEmail) {
          throw new Error(`No recipient email address associated with Lease #${lease.id}`);
        }

        const propertyName = lease.property?.name || 'Property';
        const rentAmount = Number(lease.rent_amount || params.amount || 0);
        const rentFrequency = lease.rent_frequency || 'monthly';

        // Resolve due date based on lease.payment_due_day if not explicitly passed
        let leaseDueDate = params.dueDate;
        if (!leaseDueDate) {
          const dueDay = Math.min(Math.max(Number(lease.payment_due_day) || 1, 1), 28);
          const todayParts = getAuDateParts(new Date(), DEFAULT_AU_TIMEZONE);
          let dueMonth = todayParts.month;
          let dueYear = todayParts.year;

          // If payment due day for this month has already passed today, bill for next month or +14 days
          if (dueDay < todayParts.day) {
            dueMonth += 1;
            if (dueMonth > 12) {
              dueMonth = 1;
              dueYear += 1;
            }
          }
          leaseDueDate = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
        }

        // Hard safety guarantee: due_date must never be before issue_date
        if (leaseDueDate < issueDate) {
          const d = new Date(issueDate);
          d.setDate(d.getDate() + 14);
          const dueParts = getAuDateParts(d, DEFAULT_AU_TIMEZONE);
          leaseDueDate = `${dueParts.year}-${String(dueParts.month).padStart(2, '0')}-${String(dueParts.day).padStart(2, '0')}`;
        }

        createDto = {
          workspaceId: context.workspaceId,
          propertyId: lease.property_id || lease.property?.id,
          leaseId: lease.id,
          tenantId: tenant?.id,
          customerName: tenantName,
          customerEmail: tenantEmail,
          recipientName: tenantName,
          recipientEmail: tenantEmail,
          issuer: customIssuer,
          issueDate,
          dueDate: leaseDueDate,
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
          automationId: context.automationId || undefined,
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
          issuer: customIssuer,
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
          automationId: context.automationId || undefined,
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
      let documentUrl: string | undefined;
      let pdfBuffer: Buffer | undefined;
      try {
        const docResult = await this.invoiceDocumentService.generateDocument({
          invoiceId: invoice.id,
          format: 'pdf',
        });
        documentUrl = docResult.documentUrl;
        pdfBuffer = docResult.buffer;
      } catch (docErr: any) {
        console.warn(`[GenerateAndSendInvoiceAction] PDF Generation warning for invoice ${invoice.id}:`, docErr);
      }

      const recipientEmail = createDto.recipientEmail || invoice.customerEmail;
      if (!recipientEmail) {
        return {
          success: false,
          actionType: this.actionType,
          error: `Invoice ${invoice.invoiceNumber} created, but recipient email is missing.`,
          output: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            total: invoice.total,
            dueDate: invoice.dueDate,
          },
          durationMs: Date.now() - startTime,
        };
      }

      // 4. Render and send invoice email with PDF attached
      try {
        const renderDto = await this.invoiceService.getInvoiceRenderData(invoice.id);
        const emailResult = await this.emailAdapter.sendInvoice({
          to: recipientEmail,
          recipientName: createDto.recipientName || 'Customer',
          invoice: renderDto,
          downloadUrl: documentUrl,
          pdfBuffer,
          subject: params.emailSubject || params.subject || undefined,
          customMessage: params.customMessage || params.emailMessage || params.emailBody || undefined,
          driveFolderUrl: params.driveFolderUrl || undefined,
        });

        if (!emailResult.success) {
          return {
            success: false,
            actionType: this.actionType,
            error: `Invoice ${invoice.invoiceNumber} generated successfully, but email delivery failed: ${emailResult.error?.message || 'Email delivery failed'}`,
            output: {
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              total: invoice.total,
              dueDate: invoice.dueDate,
              sentTo: recipientEmail,
              documentUrl,
            },
            durationMs: Date.now() - startTime,
          };
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
            downloadUrl: documentUrl,
          },
          durationMs: Date.now() - startTime,
        };
      } catch (emailErr: any) {
        return {
          success: false,
          actionType: this.actionType,
          error: `Invoice ${invoice.invoiceNumber} generated, but email sending encountered an error: ${emailErr.message}`,
          output: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            total: invoice.total,
            dueDate: invoice.dueDate,
            sentTo: recipientEmail,
            documentUrl,
          },
          durationMs: Date.now() - startTime,
        };
      }
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
