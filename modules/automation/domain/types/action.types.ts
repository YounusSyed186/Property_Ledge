export type ActionType =
  | 'create_invoice'
  | 'send_invoice'
  | 'generate_and_send_invoice'
  | 'send_email'
  | 'send_lease'
  | 'send_notification'
  | 'generate_document'
  | 'create_task';

export interface ActionDefinition {
  type: ActionType;
  params: Record<string, any>;
  continueOnError?: boolean;
}

export interface ActionResult {
  success: boolean;
  actionType: ActionType;
  output?: any;
  error?: string;
  durationMs?: number;
}
