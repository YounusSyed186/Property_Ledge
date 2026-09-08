// Domain exports
export * from './domain/entities/automation';
export * from './domain/entities/automation-execution';
export * from './domain/types/trigger.types';
export * from './domain/types/condition.types';
export * from './domain/types/action.types';
export * from './domain/services/condition-evaluator';
export * from './domain/services/schedule-calculator';
export * from './domain/repositories/automation-repository';
export * from './domain/repositories/automation-execution-repository';

// Application exports
export * from './application/dto/automation-dto';
export * from './application/actions/action-registry';
export * from './application/actions/create-invoice-action';
export * from './application/actions/send-invoice-action';
export * from './application/actions/send-email-action';
export * from './application/actions/send-lease-action';
export * from './application/actions/send-notification-action';
export * from './application/actions/generate-document-action';
export * from './application/actions/create-task-action';
export * from './application/services/automation-service';
export * from './application/services/automation-execution-service';

// Source Adapters
export * from './adapters/lease-source-adapter';
export * from './adapters/invoice-event-adapter';
export * from './adapters/payment-event-adapter';

// Infrastructure exports
export * from './infrastructure/repositories/supabase-automation-repository';
export * from './infrastructure/repositories/supabase-automation-execution-repository';
export * from './infrastructure/scheduler/cron-dispatcher';
