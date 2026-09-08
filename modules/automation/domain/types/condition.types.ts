export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in'
  | 'is_null'
  | 'is_not_null'
  | 'is_empty'
  | 'is_not_empty';

export interface ConditionRule {
  field: string;          // dot-notation path, e.g. "invoice.balance", "lease.status", "source.amount"
  operator: ConditionOperator;
  value?: any;
}

export interface ConditionGroup {
  operator: 'AND' | 'OR';
  rules: (ConditionRule | ConditionGroup)[];
}

export type ConditionsConfig = ConditionGroup | ConditionRule[];
