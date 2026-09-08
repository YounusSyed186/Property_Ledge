import { IAutomationRepository } from '../../domain/repositories/automation-repository';
import {
  IAutomationExecutionRepository,
  ExecutionFilters,
} from '../../domain/repositories/automation-execution-repository';
import { AutomationExecutionDTO } from '../dto/automation-dto';
import { AutomationExecution } from '../../domain/entities/automation-execution';
import { ConditionEvaluator } from '../../domain/services/condition-evaluator';
import { actionRegistry, ActionContext } from '../actions/action-registry';
import { ActionResult } from '../../domain/types/action.types';

export interface TriggerExecutionParams {
  automationId: string;
  triggerSource: string;
  context: Record<string, any>;
  idempotencyKey?: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
}

export class AutomationExecutionService {
  constructor(
    private automationRepo: IAutomationRepository,
    private executionRepo: IAutomationExecutionRepository
  ) {}

  private toDTO(entity: AutomationExecution): AutomationExecutionDTO {
    return {
      id: entity.id,
      automationId: entity.automationId,
      workspaceId: entity.workspaceId,
      triggerSource: entity.triggerSource,
      sourceEntityType: entity.sourceEntityType,
      sourceEntityId: entity.sourceEntityId,
      status: entity.status,
      conditionsEvaluated: entity.conditionsEvaluated,
      actionsExecuted: entity.actionsExecuted,
      errorMessage: entity.errorMessage,
      executionDurationMs: entity.executionDurationMs,
      idempotencyKey: entity.idempotencyKey,
      createdAt: entity.createdAt,
    };
  }

  async getExecutionHistory(filters: ExecutionFilters): Promise<{ items: AutomationExecutionDTO[]; total: number }> {
    const result = await this.executionRepo.findByWorkspaceId(filters);
    return {
      items: result.items.map((i) => this.toDTO(i)),
      total: result.total,
    };
  }

  async getExecutionsForAutomation(automationId: string, limit = 20): Promise<AutomationExecutionDTO[]> {
    const list = await this.executionRepo.findByAutomationId(automationId, limit);
    return list.map((i) => this.toDTO(i));
  }

  async executeAutomation(params: TriggerExecutionParams): Promise<AutomationExecutionDTO> {
    const startTime = Date.now();
    const { automationId, triggerSource, context, idempotencyKey, sourceEntityType, sourceEntityId } = params;

    const automation = await this.automationRepo.findById(automationId);
    if (!automation) {
      throw new Error(`Automation not found: ${automationId}`);
    }

    if (!automation.isActive && triggerSource !== 'manual') {
      throw new Error(`Automation is paused or inactive: ${automationId}`);
    }

    // Check idempotency if key provided
    if (idempotencyKey) {
      const existing = await this.executionRepo.findByIdempotencyKey(idempotencyKey);
      if (existing && existing.status === 'completed') {
        return this.toDTO(existing);
      }
    }

    // Evaluate conditions
    const evalResult = ConditionEvaluator.evaluate(automation.conditions, context);

    if (!evalResult.passed) {
      // Create execution log noting condition skipped
      const skippedExecution = await this.executionRepo.create({
        automationId,
        workspaceId: automation.workspaceId,
        triggerSource,
        sourceEntityType,
        sourceEntityId,
        status: 'skipped',
        conditionsEvaluated: evalResult.details,
        actionsExecuted: [],
        errorMessage: 'Conditions evaluated to false',
        executionDurationMs: Date.now() - startTime,
        idempotencyKey: idempotencyKey || null,
      });
      return this.toDTO(skippedExecution);
    }

    // Create running execution record
    const execution = await this.executionRepo.create({
      automationId,
      workspaceId: automation.workspaceId,
      triggerSource,
      sourceEntityType,
      sourceEntityId,
      status: 'running',
      conditionsEvaluated: evalResult.details,
      actionsExecuted: [],
      idempotencyKey: idempotencyKey || null,
    });

    const executedActions: ActionResult[] = [];
    let overallSuccess = true;
    let failureError: string | null = null;
    const actionOutputs: Record<string, any> = {};

    const actionContext: ActionContext = {
      workspaceId: automation.workspaceId,
      automationId: automation.id,
      triggerContext: context,
      previousActionOutputs: actionOutputs,
    };

    for (let i = 0; i < automation.actions.length; i++) {
      const actionDef = automation.actions[i];
      const handler = actionRegistry.get(actionDef.type);

      if (!handler) {
        const err = `No registered action handler for type '${actionDef.type}'`;
        executedActions.push({
          success: false,
          actionType: actionDef.type,
          error: err,
        });
        overallSuccess = false;
        failureError = err;
        if (!actionDef.continueOnError) break;
        continue;
      }

      try {
        const res = await handler.execute(actionDef.params, actionContext);
        executedActions.push(res);

        if (res.output && typeof res.output === 'object') {
          Object.assign(actionOutputs, res.output);
        }

        if (!res.success) {
          overallSuccess = false;
          failureError = res.error || `Action ${actionDef.type} failed`;
          if (!actionDef.continueOnError) {
            break;
          }
        }
      } catch (actErr: any) {
        const err = actErr.message || `Unhandled exception in action ${actionDef.type}`;
        executedActions.push({
          success: false,
          actionType: actionDef.type,
          error: err,
        });
        overallSuccess = false;
        failureError = err;
        if (!actionDef.continueOnError) {
          break;
        }
      }
    }

    const durationMs = Date.now() - startTime;
    const finalStatus = overallSuccess ? 'completed' : 'failed';

    const updatedExecution = await this.executionRepo.update(execution.id, {
      status: finalStatus,
      actionsExecuted: executedActions,
      errorMessage: failureError,
      executionDurationMs: durationMs,
    });

    // Update automation stats
    await this.automationRepo.incrementRunCount(automation.id, new Date().toISOString());

    return this.toDTO(updatedExecution);
  }

  async retryExecution(executionId: string): Promise<AutomationExecutionDTO> {
    const execution = await this.executionRepo.findById(executionId);
    if (!execution) {
      throw new Error(`Execution record not found: ${executionId}`);
    }

    const automation = await this.automationRepo.findById(execution.automationId);
    if (!automation) {
      throw new Error(`Automation no longer exists: ${execution.automationId}`);
    }

    // Re-execute with timestamped retry idempotency key
    return this.executeAutomation({
      automationId: automation.id,
      triggerSource: `retry:${execution.id}`,
      context: {
        workspaceId: execution.workspaceId,
        sourceEntityType: execution.sourceEntityType,
        sourceEntityId: execution.sourceEntityId,
      },
      idempotencyKey: `retry_${execution.id}_${Date.now()}`,
      sourceEntityType: execution.sourceEntityType || undefined,
      sourceEntityId: execution.sourceEntityId || undefined,
    });
  }
}
