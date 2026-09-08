export type TriggerType =
  | 'schedule'         // Cron / recurring date-based schedule
  | 'event'            // Domain events emitted across the system
  | 'date_relative'    // Relative to an entity's date (e.g. 5 days before lease.end_date, 3 days after invoice.due_date)
  | 'manual';          // Explicit manual execution by user

export interface ScheduleTriggerConfig {
  cron: string;        // e.g. "0 9 1 * *" (1st of month at 9am)
  timezone?: string;   // e.g. "Australia/Sydney", defaults to UTC
}

export interface EventTriggerConfig {
  eventName: string;   // e.g. "invoice.issued", "payment.recorded", "lease.expiring", "tenant.created"
  entityType?: string; // e.g. "invoice", "payment", "lease", "tenant"
}

export interface DateRelativeTriggerConfig {
  entityType: 'lease' | 'invoice' | 'payment';
  dateField: string;        // e.g. "due_date", "end_date", "start_date"
  offsetDays: number;       // negative for before (-5), positive for after (+3), 0 for on the day
  timeOfDay?: string;       // e.g. "09:00"
}

export type TriggerConfig =
  | ScheduleTriggerConfig
  | EventTriggerConfig
  | DateRelativeTriggerConfig
  | Record<string, any>;
