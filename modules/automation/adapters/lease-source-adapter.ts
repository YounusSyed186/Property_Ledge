import { AutomationExecutionService } from '../application/services/automation-execution-service';
import { IAutomationRepository } from '../domain/repositories/automation-repository';

export interface LeaseRentTriggerInput {
  leaseId: string;
  propertyId: string;
  workspaceId: string;
  tenantName: string;
  tenantEmail: string;
  rentAmount: number;
  rentFrequency: 'weekly' | 'fortnightly' | 'monthly';
  dueDate: string;
  currency?: string;
}

export class LeaseSourceAdapter {
  constructor(
    private automationRepo: IAutomationRepository,
    private executionService: AutomationExecutionService
  ) {}

  /**
   * Generates a normalized automation context from a lease rent event or schedule
   */
  buildContext(input: LeaseRentTriggerInput): Record<string, any> {
    return {
      source: 'lease',
      workspaceId: input.workspaceId,
      lease: {
        id: input.leaseId,
        propertyId: input.propertyId,
        tenantName: input.tenantName,
        tenantEmail: input.tenantEmail,
        rentAmount: input.rentAmount,
        frequency: input.rentFrequency,
        dueDate: input.dueDate,
        currency: input.currency || 'AUD',
      },
      // Flattened aliases for easy template interpolation
      recipientName: input.tenantName,
      recipientEmail: input.tenantEmail,
      amount: input.rentAmount,
      dueDate: input.dueDate,
      propertyId: input.propertyId,
      leaseId: input.leaseId,
      currency: input.currency || 'AUD',
    };
  }

  /**
   * Dispatches rent automation for a lease
   */
  async triggerRentInvoiceAutomation(input: LeaseRentTriggerInput): Promise<any[]> {
    const automations = await this.automationRepo.findActiveByEventName('lease.rent_due', input.workspaceId);
    const results = [];

    const context = this.buildContext(input);
    const idempotencyKey = `lease_rent_${input.leaseId}_${input.dueDate}`;

    for (const auto of automations) {
      const exec = await this.executionService.executeAutomation({
        automationId: auto.id,
        triggerSource: 'event:lease.rent_due',
        context,
        idempotencyKey: `${auto.id}_${idempotencyKey}`,
        sourceEntityType: 'lease',
        sourceEntityId: input.leaseId,
      });
      results.push(exec);
    }

    return results;
  }
}
