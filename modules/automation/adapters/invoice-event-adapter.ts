import { AutomationExecutionService } from '../application/services/automation-execution-service';
import { IAutomationRepository } from '../domain/repositories/automation-repository';
import { InvoiceDTO } from '../../invoices/application/dto/invoice-dto';

export class InvoiceEventAdapter {
  constructor(
    private automationRepo: IAutomationRepository,
    private executionService: AutomationExecutionService
  ) {}

  buildContext(invoice: InvoiceDTO, eventName: string): Record<string, any> {
    const recipientName = invoice.recipient?.name || invoice.customerName || 'Customer';
    const recipientEmail = invoice.recipient?.email || invoice.customerEmail || '';

    return {
      event: eventName,
      source: 'invoice',
      workspaceId: invoice.workspaceId,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        total: invoice.total,
        balance: invoice.balance,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        propertyId: invoice.propertyId,
        leaseId: invoice.leaseId,
        tenantId: invoice.tenantId,
        recipientName,
        recipientEmail,
        currency: invoice.currency,
      },
      // Convenience shortcuts
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      balance: invoice.balance,
      dueDate: invoice.dueDate,
      propertyId: invoice.propertyId,
      leaseId: invoice.leaseId,
      recipientName,
      recipientEmail,
    };
  }

  async handleInvoiceEvent(eventName: string, invoice: InvoiceDTO): Promise<any[]> {
    const automations = await this.automationRepo.findActiveByEventName(eventName, invoice.workspaceId);
    const results = [];
    const context = this.buildContext(invoice, eventName);

    for (const auto of automations) {
      const idempotencyKey = `${auto.id}_${eventName}_${invoice.id}_${invoice.status}`;
      const exec = await this.executionService.executeAutomation({
        automationId: auto.id,
        triggerSource: `event:${eventName}`,
        context,
        idempotencyKey,
        sourceEntityType: 'invoice',
        sourceEntityId: invoice.id,
      });
      results.push(exec);
    }

    return results;
  }
}
