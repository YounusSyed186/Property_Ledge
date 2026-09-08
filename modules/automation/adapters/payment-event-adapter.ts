import { AutomationExecutionService } from '../application/services/automation-execution-service';
import { IAutomationRepository } from '../domain/repositories/automation-repository';

export interface PaymentEventPayload {
  paymentId: string;
  workspaceId: string;
  propertyId?: string;
  leaseId?: string;
  invoiceId?: string;
  tenantId?: string;
  amount: number;
  paymentMethod?: string;
  reference?: string;
  paymentDate: string;
  tenantEmail?: string;
  tenantName?: string;
}

export class PaymentEventAdapter {
  constructor(
    private automationRepo: IAutomationRepository,
    private executionService: AutomationExecutionService
  ) {}

  buildContext(payment: PaymentEventPayload, eventName: string): Record<string, any> {
    return {
      event: eventName,
      source: 'payment',
      workspaceId: payment.workspaceId,
      payment: {
        id: payment.paymentId,
        amount: payment.amount,
        method: payment.paymentMethod,
        reference: payment.reference,
        date: payment.paymentDate,
        propertyId: payment.propertyId,
        leaseId: payment.leaseId,
        invoiceId: payment.invoiceId,
        tenantEmail: payment.tenantEmail,
        tenantName: payment.tenantName,
      },
      amount: payment.amount,
      paymentId: payment.paymentId,
      invoiceId: payment.invoiceId,
      recipientEmail: payment.tenantEmail,
      recipientName: payment.tenantName,
    };
  }

  async handlePaymentEvent(eventName: string, payment: PaymentEventPayload): Promise<any[]> {
    const automations = await this.automationRepo.findActiveByEventName(eventName, payment.workspaceId);
    const results = [];
    const context = this.buildContext(payment, eventName);

    for (const auto of automations) {
      const idempotencyKey = `${auto.id}_${eventName}_${payment.paymentId}`;
      const exec = await this.executionService.executeAutomation({
        automationId: auto.id,
        triggerSource: `event:${eventName}`,
        context,
        idempotencyKey,
        sourceEntityType: 'payment',
        sourceEntityId: payment.paymentId,
      });
      results.push(exec);
    }

    return results;
  }
}
