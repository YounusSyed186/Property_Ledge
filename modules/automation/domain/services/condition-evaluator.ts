import {
  ConditionGroup,
  ConditionRule,
  ConditionsConfig,
  ConditionOperator,
} from '../types/condition.types';

export interface EvaluationResult {
  passed: boolean;
  details: Record<string, { field: string; expected: any; actual: any; passed: boolean }>;
}

export class ConditionEvaluator {
  /**
   * Safely gets a nested property using dot-notation (e.g., "invoice.balance", "lease.tenant.name")
   */
  static getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }
    return current;
  }

  /**
   * Evaluates a single rule against a data context
   */
  static evaluateRule(rule: ConditionRule, context: Record<string, any>): boolean {
    const actual = this.getNestedValue(context, rule.field);
    const expected = rule.value;

    switch (rule.operator) {
      case 'equals':
        return actual == expected; // loose equality for string numbers vs numbers if desired, or strict
      case 'not_equals':
        return actual != expected;
      case 'greater_than':
        return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
      case 'less_than':
        return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
      case 'greater_than_or_equal':
        return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
      case 'less_than_or_equal':
        return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
      case 'contains':
        if (typeof actual === 'string' && typeof expected === 'string') {
          return actual.toLowerCase().includes(expected.toLowerCase());
        }
        if (Array.isArray(actual)) {
          return actual.includes(expected);
        }
        return false;
      case 'not_contains':
        if (typeof actual === 'string' && typeof expected === 'string') {
          return !actual.toLowerCase().includes(expected.toLowerCase());
        }
        if (Array.isArray(actual)) {
          return !actual.includes(expected);
        }
        return true;
      case 'in':
        if (Array.isArray(expected)) {
          return expected.includes(actual);
        }
        return false;
      case 'not_in':
        if (Array.isArray(expected)) {
          return !expected.includes(actual);
        }
        return true;
      case 'is_null':
        return actual === null || actual === undefined;
      case 'is_not_null':
        return actual !== null && actual !== undefined;
      case 'is_empty':
        if (actual === null || actual === undefined) return true;
        if (typeof actual === 'string' || Array.isArray(actual)) return actual.length === 0;
        if (typeof actual === 'object') return Object.keys(actual).length === 0;
        return false;
      case 'is_not_empty':
        if (actual === null || actual === undefined) return false;
        if (typeof actual === 'string' || Array.isArray(actual)) return actual.length > 0;
        if (typeof actual === 'object') return Object.keys(actual).length > 0;
        return true;
      default:
        return false;
    }
  }

  /**
   * Evaluates a full condition configuration (Group or Rule list)
   */
  static evaluate(conditions: ConditionsConfig | undefined | null, context: Record<string, any>): EvaluationResult {
    // If no conditions are specified, automation passes automatically
    if (!conditions) {
      return { passed: true, details: {} };
    }

    const details: Record<string, { field: string; expected: any; actual: any; passed: boolean }> = {};

    // Check if it's an array of rules (implicit AND)
    if (Array.isArray(conditions)) {
      if (conditions.length === 0) {
        return { passed: true, details: {} };
      }

      let allPassed = true;
      for (let i = 0; i < conditions.length; i++) {
        const rule = conditions[i];
        const passed = this.evaluateRule(rule, context);
        const actual = this.getNestedValue(context, rule.field);
        details[`rule_${i}_${rule.field}`] = {
          field: rule.field,
          expected: rule.value,
          actual,
          passed,
        };
        if (!passed) {
          allPassed = false;
        }
      }

      return { passed: allPassed, details };
    }

    // It's a ConditionGroup
    const group = conditions as ConditionGroup;
    if (!group.rules || group.rules.length === 0) {
      return { passed: true, details: {} };
    }

    const operator = group.operator || 'AND';
    let overallPassed = operator === 'AND';

    for (let i = 0; i < group.rules.length; i++) {
      const item = group.rules[i];
      let itemPassed = false;

      if ('rules' in item) {
        // Nested group
        const subResult = this.evaluate(item, context);
        itemPassed = subResult.passed;
        Object.assign(details, subResult.details);
      } else {
        // Single rule
        itemPassed = this.evaluateRule(item, context);
        const actual = this.getNestedValue(context, item.field);
        details[`group_rule_${i}_${item.field}`] = {
          field: item.field,
          expected: item.value,
          actual,
          passed: itemPassed,
        };
      }

      if (operator === 'AND') {
        if (!itemPassed) {
          overallPassed = false;
        }
      } else if (operator === 'OR') {
        if (itemPassed) {
          overallPassed = true;
        }
      }
    }

    return { passed: overallPassed, details };
  }
}
