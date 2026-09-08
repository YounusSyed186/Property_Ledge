import { ActionType, ActionResult } from '../../domain/types/action.types';
import { ConditionEvaluator } from '../../domain/services/condition-evaluator';

export interface ActionContext {
  workspaceId: string;
  automationId: string;
  triggerContext: Record<string, any>;
  previousActionOutputs?: Record<string, any>;
}

export interface IActionHandler {
  actionType: ActionType;
  execute(params: Record<string, any>, context: ActionContext): Promise<ActionResult>;
}

/**
 * Interpolates string template placeholders like {{invoice.invoiceNumber}} or {{source.amount}}
 */
export function interpolateVariables(template: string, context: Record<string, any>): string {
  if (!template || typeof template !== 'string') return template;
  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, path) => {
    const val = ConditionEvaluator.getNestedValue(context, path);
    return val !== undefined && val !== null ? String(val) : '';
  });
}

/**
 * Recursively interpolates object values
 */
export function interpolateParams(params: Record<string, any>, context: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      result[key] = interpolateVariables(value, context);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string'
          ? interpolateVariables(item, context)
          : typeof item === 'object' && item !== null
          ? interpolateParams(item, context)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = interpolateParams(value, context);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export class ActionRegistry {
  private handlers: Map<ActionType, IActionHandler> = new Map();

  register(handler: IActionHandler): void {
    this.handlers.set(handler.actionType, handler);
  }

  get(actionType: ActionType): IActionHandler | undefined {
    return this.handlers.get(actionType);
  }

  has(actionType: ActionType): boolean {
    return this.handlers.has(actionType);
  }
}

export const actionRegistry = new ActionRegistry();
