import { IActionHandler, ActionContext, interpolateParams } from './action-registry';
import { ActionType, ActionResult } from '../../domain/types/action.types';
import { InvoiceService } from '../../../invoices/application/services/invoice-service';
import { InvoiceDocumentService } from '../../../invoices/application/services/invoice-document-service';
import { InvoiceEmailAdapter } from '../../../invoices/infrastructure/email/invoice-email-adapter';

export class SendInvoiceAction implements IActionHandler {
  actionType: ActionType = 'send_invoice';

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
      const invoiceId = params.invoiceId || context.previousActionOutputs?.invoiceId || context.triggerContext?.invoiceId;

      if (!invoiceId) {
        throw new Error('SendInvoiceAction requires an invoiceId');
      }

      const invRes = await this.invoiceService.getInvoice(invoiceId);
      if (!invRes.success) {
        throw new Error(`Invoice not found for ID ${invoiceId}`);
      }
      let invoice = invRes.data;

      // If invoice is in draft, issue it first
      if (invoice.status === 'draft') {
        const issueRes = await this.invoiceService.issueInvoice(invoiceId);
        if (issueRes.success) {
          invoice = issueRes.data;
        }
      }

      // Get or generate PDF document
      const docResult = await this.invoiceDocumentService.generateDocument({
        invoiceId,
        format: 'pdf',
      });

      const recipientEmail = params.to || invoice.recipient?.email || invoice.customerEmail;
      if (!recipientEmail) {
        throw new Error(`Invoice ${invoice.invoiceNumber} has no recipient email address specified`);
      }

      const renderDto = await this.invoiceService.getInvoiceRenderData(invoiceId);

      const emailResult = await this.emailAdapter.sendInvoice({
        to: recipientEmail,
        recipientName: invoice.recipient?.name || invoice.customerName || 'Customer',
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
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
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
        error: err.message || 'Failed to send invoice via automation action',
        durationMs: Date.now() - startTime,
      };
    }
  }
}
