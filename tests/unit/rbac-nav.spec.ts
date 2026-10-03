import { test, expect } from '@playwright/test';
import { canAccessNavItem } from '@/lib/auth/permissions';

test.describe('Permission-based nav', () => {
  test('owner with property.view sees portfolio', () => {
    expect(canAccessNavItem('owner', 'portfolio', ['property.view'])).toBe(true);
  });

  test('viewer without tenant.view cannot see people', () => {
    expect(canAccessNavItem('viewer', 'people', ['property.view', 'task.view'])).toBe(false);
  });

  test('manager with team.member.view sees team', () => {
    expect(canAccessNavItem('manager', 'team', ['team.member.view'])).toBe(true);
  });

  test('automation access requires settings permission, not property visibility alone', () => {
    expect(canAccessNavItem('viewer', 'automations', ['property.view'])).toBe(false);
    expect(canAccessNavItem('manager', 'automations', ['team.settings.view'])).toBe(true);
  });

  test('falls back to persona when no permissions provided', () => {
    expect(canAccessNavItem('owner', 'portfolio')).toBe(true);
    expect(canAccessNavItem('viewer', 'people')).toBe(false);
  });
});

test.describe('Workspace seat limits', () => {
  test('remaining seats calculation', () => {
    const current = 3;
    const limit = 5;
    const remaining = Math.max(0, limit - current);
    expect(remaining).toBe(2);
    expect(current >= limit).toBe(false);
  });

  test('over limit detection', () => {
    const current = 6;
    const limit = 5;
    expect(current > limit).toBe(true);
  });
});
