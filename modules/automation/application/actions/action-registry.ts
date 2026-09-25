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

import { getAuDateParts, getAuMonthBillingPeriod, formatAuDisplayDate, DEFAULT_AU_TIMEZONE, DEFAULT_AU_LOCALE } from '@/lib/format/australian-time';
import { getFinancialYear } from '@/lib/format/financial-year';

/**
 * Interpolates string template placeholders like {{month}}, {{recipient}}, {{google_drive_folder_url}}, {{invoice.invoiceNumber}}
 */
export function interpolateVariables(template: string, context: Record<string, any>): string {
  if (!template || typeof template !== 'string') return template;

  const now = new Date();
  const auParts = getAuDateParts(now, DEFAULT_AU_TIMEZONE);
  const { monthName } = getAuMonthBillingPeriod(now, DEFAULT_AU_TIMEZONE);
  const monthOnly = new Intl.DateTimeFormat(DEFAULT_AU_LOCALE, { month: 'long', timeZone: DEFAULT_AU_TIMEZONE }).format(now);

  const enrichedContext: Record<string, any> = {
    month: monthName, // e.g. "September 2026"
    month_name: monthOnly, // e.g. "September"
    year: String(auParts.year),
    financial_year: getFinancialYear(now),
    fy: getFinancialYear(now),
    today: formatAuDisplayDate(now),
    recipient: context.recipient || context.tenant_name || context.tenant?.name || context.to_name || 'Valued Client',
    google_drive_folder_url: context.google_drive_folder_url || context.drive_folder_url || context.google_drive_link || context.drive_url || '',
    ...context,
  };

  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, path) => {
    const val = ConditionEvaluator.getNestedValue(enrichedContext, path);
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
