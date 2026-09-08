import { Automation, CreateAutomationProps, UpdateAutomationProps } from '../entities/automation';
import { TriggerType } from '../types/trigger.types';

export interface AutomationFilters {
  workspaceId: string;
  triggerType?: TriggerType;
  isActive?: boolean;
}

export interface IAutomationRepository {
  findById(id: string): Promise<Automation | null>;
  findByWorkspaceId(workspaceId: string): Promise<Automation[]>;
  findActiveByTriggerType(triggerType: TriggerType, workspaceId?: string): Promise<Automation[]>;
  findActiveByEventName(eventName: string, workspaceId?: string): Promise<Automation[]>;
  create(props: CreateAutomationProps): Promise<Automation>;
  update(id: string, props: UpdateAutomationProps): Promise<Automation>;
  delete(id: string): Promise<void>;
  incrementRunCount(id: string, lastRunAt?: string): Promise<void>;
}
