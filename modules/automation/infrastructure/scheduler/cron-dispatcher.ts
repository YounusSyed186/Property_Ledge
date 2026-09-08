import { AutomationExecutionService } from '../../application/services/automation-execution-service';
import { IAutomationRepository } from '../../domain/repositories/automation-repository';

export class CronDispatcher {
  constructor(
    private automationRepo: IAutomationRepository,
    private executionService: AutomationExecutionService
  ) {}

  /**
   * Dispatches all active scheduled automations for the current period
   * (Runs in edge cron or server background job)
   */
  async dispatchScheduled(periodKey: string): Promise<any[]> {
    const scheduledAutomations = await this.automationRepo.findActiveByTriggerType('schedule');
    const results = [];

    for (const automation of scheduledAutomations) {
      const idempotencyKey = `cron_${automation.id}_${periodKey}`;
      try {
        const result = await this.executionService.executeAutomation({
          automationId: automation.id,
          triggerSource: `cron:${periodKey}`,
          context: {
            periodKey,
            workspaceId: automation.workspaceId,
            timestamp: new Date().toISOString(),
          },
          idempotencyKey,
        });
        results.push(result);
      } catch (err: any) {
        results.push({
          automationId: automation.id,
          success: false,
          error: err.message,
        });
      }
    }

    return results;
  }
}
