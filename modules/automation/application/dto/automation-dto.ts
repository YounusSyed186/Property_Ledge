import { TriggerType, TriggerConfig } from '../../domain/types/trigger.types';
import { ConditionsConfig } from '../../domain/types/condition.types';
import { ActionDefinition, ActionResult } from '../../domain/types/action.types';
import { ExecutionStatus } from '../../domain/entities/automation-execution';

export interface AutomationDTO {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  conditions: ConditionsConfig;
  actions: ActionDefinition[];
  isActive: boolean;
  createdBy: string | null;
  lastRunAt: string | null;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutomationDTO {
  name: string;
  description?: string | null;
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  conditions?: ConditionsConfig;
  actions: ActionDefinition[];
  isActive?: boolean;
}

export interface UpdateAutomationDTO {
  name?: string;
  description?: string | null;
  triggerType?: TriggerType;
  triggerConfig?: TriggerConfig;
  conditions?: ConditionsConfig;
  actions?: ActionDefinition[];
  isActive?: boolean;
}

export interface AutomationExecutionDTO {
  id: string;
  automationId: string;
  workspaceId: string;
  triggerSource: string;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  status: ExecutionStatus;
  conditionsEvaluated: Record<string, any>;
  actionsExecuted: ActionResult[];
  errorMessage: string | null;
  executionDurationMs: number | null;
  idempotencyKey: string | null;
  createdAt: string;
}
