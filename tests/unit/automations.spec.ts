import { test, expect } from '@playwright/test';
import { ConditionEvaluator } from '../../modules/automation/domain/services/condition-evaluator';
import {
  interpolateVariables,
  interpolateParams,
} from '../../modules/automation/application/actions/action-registry';

test.describe('Generic Automation Engine Unit Tests', () => {
  test.describe('ConditionEvaluator', () => {
    test('evaluates nested dot-notation property lookups', () => {
      const context = {
        invoice: {
          id: 'inv_123',
          balance: 450,
          customer: {
            name: 'Sarah Connor',
            vip: true,
          },
        },
      };

      expect(ConditionEvaluator.getNestedValue(context, 'invoice.balance')).toBe(450);
      expect(ConditionEvaluator.getNestedValue(context, 'invoice.customer.name')).toBe('Sarah Connor');
      expect(ConditionEvaluator.getNestedValue(context, 'invoice.nonexistent.prop')).toBeUndefined();
    });

    test('evaluates comparison operators correctly', () => {
      const context = {
        invoice: { balance: 150, status: 'overdue' },
        items: ['water', 'electricity'],
      };

      // Numeric comparisons
      expect(
        ConditionEvaluator.evaluateRule(
          { field: 'invoice.balance', operator: 'greater_than', value: 100 },
          context
        )
      ).toBe(true);

      expect(
        ConditionEvaluator.evaluateRule(
          { field: 'invoice.balance', operator: 'less_than', value: 50 },
          context
        )
      ).toBe(false);

      // Equality
      expect(
        ConditionEvaluator.evaluateRule(
          { field: 'invoice.status', operator: 'equals', value: 'overdue' },
          context
        )
      ).toBe(true);

      // Array contains
      expect(
        ConditionEvaluator.evaluateRule(
          { field: 'items', operator: 'contains', value: 'water' },
          context
        )
      ).toBe(true);

      expect(
        ConditionEvaluator.evaluateRule(
          { field: 'items', operator: 'contains', value: 'gas' },
          context
        )
      ).toBe(false);
    });

    test('evaluates nested AND / OR condition groups', () => {
      const context = {
        lease: { rent: 600, status: 'active' },
        tenant: { arrears: false },
      };

      // AND group
      const andGroup = {
        operator: 'AND' as const,
        rules: [
          { field: 'lease.rent', operator: 'greater_than' as const, value: 500 },
          { field: 'lease.status', operator: 'equals' as const, value: 'active' },
        ],
      };
      expect(ConditionEvaluator.evaluate(andGroup, context).passed).toBe(true);

      // OR group
      const orGroup = {
        operator: 'OR' as const,
        rules: [
          { field: 'lease.rent', operator: 'less_than' as const, value: 200 },
          { field: 'tenant.arrears', operator: 'equals' as const, value: false },
        ],
      };
      expect(ConditionEvaluator.evaluate(orGroup, context).passed).toBe(true);
    });
  });

  test.describe('Template Placeholder Interpolation', () => {
    test('interpolates string placeholders with nested context', () => {
      const context = {
        invoice: { invoiceNumber: 'INV-2026-00042', total: 750 },
        recipient: { name: 'Acme Corp' },
      };

      const template = 'Dear {{recipient.name}}, invoice {{invoice.invoiceNumber}} for ${{invoice.total}} is ready.';
      const output = interpolateVariables(template, context);

      expect(output).toBe('Dear Acme Corp, invoice INV-2026-00042 for $750 is ready.');
    });

    test('interpolates recursively inside object parameters', () => {
      const context = {
        invoiceId: 'inv_abc_999',
        recipientEmail: 'tenant@test.com',
      };

      const params = {
        to: '{{recipientEmail}}',
        subject: 'Your Invoice',
        data: {
          targetId: '{{invoiceId}}',
        },
      };

      const interpolated = interpolateParams(params, context);
      expect(interpolated.to).toBe('tenant@test.com');
      expect(interpolated.data.targetId).toBe('inv_abc_999');
    });
  });
});
