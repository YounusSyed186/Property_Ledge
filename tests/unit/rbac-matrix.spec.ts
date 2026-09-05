import { test, expect } from '@playwright/test';
import {
  formatResourceName,
  formatActionName,
  getCategoryForResource,
  CANONICAL_ACTION_ORDER,
} from '@/components/rbac/constants';

test.describe('RBAC Permission Matrix Helper Logic', () => {
  test('formats resource names cleanly', () => {
    expect(formatResourceName('property')).toBe('Properties');
    expect(formatResourceName('tenant')).toBe('Tenants');
    expect(formatResourceName('team.member')).toBe('Team Members');
    expect(formatResourceName('platform_role')).toBe('Platform Roles');
    expect(formatResourceName('custom_module')).toBe('Custom Module');
  });

  test('formats action names to readable labels', () => {
    expect(formatActionName('view')).toBe('View');
    expect(formatActionName('read')).toBe('View');
    expect(formatActionName('create')).toBe('Create');
    expect(formatActionName('update')).toBe('Edit');
    expect(formatActionName('edit')).toBe('Edit');
    expect(formatActionName('delete')).toBe('Delete');
    expect(formatActionName('manage')).toBe('Manage');
    expect(formatActionName('export')).toBe('Export');
  });

  test('categorizes resources into enterprise security groups', () => {
    expect(getCategoryForResource('property')).toBe('Property Management');
    expect(getCategoryForResource('unit')).toBe('Property Management');
    expect(getCategoryForResource('invoice')).toBe('Financial Operations');
    expect(getCategoryForResource('maintenance')).toBe('Operations & Maintenance');
    expect(getCategoryForResource('team.role')).toBe('Team & Access');
    expect(getCategoryForResource('audit')).toBe('Platform Administration');
    expect(getCategoryForResource('unknown_plugin')).toBe('General & Other');
  });

  test('canonical action order prioritizes primary CRUD actions first', () => {
    expect(CANONICAL_ACTION_ORDER.indexOf('view')).toBeLessThan(CANONICAL_ACTION_ORDER.indexOf('delete'));
    expect(CANONICAL_ACTION_ORDER.indexOf('create')).toBeLessThan(CANONICAL_ACTION_ORDER.indexOf('manage'));
  });
});
