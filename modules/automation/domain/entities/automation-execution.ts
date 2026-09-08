import { ActionResult } from '../types/action.types';

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface AutomationExecution {
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

export interface CreateExecutionProps {
  automationId: string;
  workspaceId: string;
  triggerSource: string;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  status: ExecutionStatus;
  conditionsEvaluated?: Record<string, any>;
  actionsExecuted?: ActionResult[];
  errorMessage?: string | null;
  executionDurationMs?: number | null;
  idempotencyKey?: string | null;
}
