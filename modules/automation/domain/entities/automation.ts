import { TriggerType, TriggerConfig } from '../types/trigger.types';
import { ConditionsConfig } from '../types/condition.types';
import { ActionDefinition } from '../types/action.types';

export type AutomationType = 'lease' | 'invoice';
export type AutomationScheduleType = 'monthly' | 'yearly' | 'after_start' | 'lease_date';
export type AutomationStatus = 'active' | 'paused' | 'completed' | 'failed';

export interface MonthlyScheduleConfig {
  dayOfMonth: number; // 1 - 31
  timeOfDay: string; // HH:mm format, e.g. '09:00'
  timezone?: string;
}

export interface YearlyScheduleConfig {
  monthOfYear?: number; // 1 - 12
  dayOfMonth: number; // 1 - 31
  timeOfDay: string; // HH:mm format, e.g. '09:00'
  timezone?: string;
}

export interface AfterStartScheduleConfig {
  offsetMonths: number;
  timeOfDay: string;
  timezone?: string;
}

export interface LeaseDateScheduleConfig {
  anchor: 'start_date' | 'end_date';
  offsetDays?: number;
  offsetMonths?: number;
  position: 'before' | 'after';
  timeOfDay: string;
  timezone?: string;
}

export type ScheduleConfig =
  | MonthlyScheduleConfig
  | YearlyScheduleConfig
  | AfterStartScheduleConfig
  | LeaseDateScheduleConfig
  | Record<string, any>;

export interface Automation {
  id: string;
  workspaceId: string;
  automationType: AutomationType;
  leaseId: string | null;
  invoiceTemplateId?: string | null;
  name: string;
  description: string | null;
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  scheduleType: AutomationScheduleType;
  scheduleConfig: ScheduleConfig;
  status: AutomationStatus;
  conditions: ConditionsConfig;
  actions: ActionDefinition[];
  metadata?: Record<string, any>;
  isActive: boolean;
  createdBy: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutomationProps {
  workspaceId: string;
  automationType?: AutomationType;
  leaseId?: string | null;
  invoiceTemplateId?: string | null;
  name: string;
  description?: string | null;
  triggerType?: TriggerType;
  triggerConfig?: TriggerConfig;
  scheduleType?: AutomationScheduleType;
  scheduleConfig?: ScheduleConfig;
  status?: AutomationStatus;
  conditions?: ConditionsConfig;
  actions: ActionDefinition[];
  metadata?: Record<string, any>;
  isActive?: boolean;
  createdBy?: string | null;
  nextRunAt?: string | null;
}

export interface UpdateAutomationProps {
  name?: string;
  description?: string | null;
  automationType?: AutomationType;
  leaseId?: string | null;
  invoiceTemplateId?: string | null;
  triggerType?: TriggerType;
  triggerConfig?: TriggerConfig;
  scheduleType?: AutomationScheduleType;
  scheduleConfig?: ScheduleConfig;
  status?: AutomationStatus;
  conditions?: ConditionsConfig;
  actions?: ActionDefinition[];
  metadata?: Record<string, any>;
  isActive?: boolean;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
}
