import { IActionHandler, ActionContext, interpolateParams } from './action-registry';
import { ActionType, ActionResult } from '../../domain/types/action.types';
import { InvoiceService } from '../../../invoices/application/services/invoice-service';
import { CreateInvoiceDTO } from '../../../invoices/application/dto/invoice-dto';

export class CreateInvoiceAction implements IActionHandler {
  actionType: ActionType = 'create_invoice';

  constructor(private invoiceService: InvoiceService) {}

  async execute(rawParams: Record<string, any>, context: ActionContext): Promise<ActionResult> {
    const startTime = Date.now();
    try {
      const mergedContext = {
        ...context.triggerContext,
        ...context.previousActionOutputs,
        workspaceId: context.workspaceId,
      };

      const params = interpolateParams(rawParams, mergedContext);

      // Build CreateInvoiceDTO
      const createDto: CreateInvoiceDTO = {
        workspaceId: context.workspaceId,
        propertyId: params.propertyId || undefined,
        leaseId: params.leaseId || undefined,
        tenantId: params.tenantId || undefined,
        customerName: params.recipientName || params.customerName || 'Customer',
        customerEmail: params.recipientEmail || params.customerEmail || '',
        customerPhone: params.recipientPhone || params.customerPhone || undefined,
        customerAddress: params.recipientAddress || params.customerAddress || undefined,
        recipientName: params.recipientName || params.customerName || 'Customer',
        recipientEmail: params.recipientEmail || params.customerEmail || '',
        recipientPhone: params.recipientPhone || params.customerPhone || undefined,
        recipientAddress: params.recipientAddress || params.customerAddress || undefined,
        senderCompanyName: params.senderCompanyName || undefined,
        senderCompanyAddress: params.senderCompanyAddress || undefined,
        senderTaxNumber: params.senderTaxNumber || undefined,
        senderEmail: params.senderEmail || undefined,
        senderPhone: params.senderPhone || undefined,
        issueDate: params.issueDate || new Date().toISOString().split('T')[0],
        dueDate: params.dueDate || new Date().toISOString().split('T')[0],
        currency: params.currency || 'AUD',
        items: Array.isArray(params.items)
          ? params.items.map((it: any) => ({
              description: it.description || 'Service',
              quantity: Number(it.quantity) || 1,
              unitPrice: Number(it.unitPrice) || 0,
              taxRate: Number(it.taxRate) || 0,
            }))
          : [
              {
                description: params.description || 'Automated Charge',
                quantity: 1,
                unitPrice: Number(params.amount) || 0,
                taxRate: Number(params.taxRate) || 0,
              },
            ],
        templateId: params.templateId || undefined,
        notes: params.notes || undefined,
        paymentInstructions: params.paymentInstructions || undefined,
      };

      const createRes = await this.invoiceService.createInvoice(createDto);
      if (!createRes.success) {
        throw new Error(createRes.error.message || 'Failed to create invoice');
      }

      let finalInvoice = createRes.data;

      // If requested to issue immediately
      if (params.issueImmediately || params.autoIssue) {
        const issueRes = await this.invoiceService.issueInvoice(finalInvoice.id);
        if (issueRes.success) {
          finalInvoice = issueRes.data;
        }
      }

      return {
        success: true,
        actionType: this.actionType,
        output: {
          invoiceId: finalInvoice.id,
          invoiceNumber: finalInvoice.invoiceNumber,
          total: finalInvoice.total,
          dueDate: finalInvoice.dueDate,
          status: finalInvoice.status,
          recipientEmail: finalInvoice.recipient?.email || finalInvoice.customerEmail,
        },
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        actionType: this.actionType,
        error: err.message || 'Failed to create invoice via automation action',
        durationMs: Date.now() - startTime,
      };
    }
  }
}
