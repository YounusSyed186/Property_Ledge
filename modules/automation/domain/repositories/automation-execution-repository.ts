import { AutomationExecution, CreateExecutionProps } from '../entities/automation-execution';

export interface ExecutionFilters {
  automationId?: string;
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export interface IAutomationExecutionRepository {
  findById(id: string): Promise<AutomationExecution | null>;
  findByWorkspaceId(filters: ExecutionFilters): Promise<{ items: AutomationExecution[]; total: number }>;
  findByAutomationId(automationId: string, limit?: number): Promise<AutomationExecution[]>;
  findByIdempotencyKey(key: string): Promise<AutomationExecution | null>;
  create(props: CreateExecutionProps): Promise<AutomationExecution>;
  update(
    id: string,
    updates: Partial<Pick<AutomationExecution, 'status' | 'actionsExecuted' | 'errorMessage' | 'executionDurationMs'>>
  ): Promise<AutomationExecution>;
}
