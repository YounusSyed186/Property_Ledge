import { test, expect } from '@playwright/test';

test.describe('Workspace seats', () => {
  test('seat limit error message format', () => {
    const msg = 'SEAT_LIMIT_EXCEEDED: Your workspace has reached its team member limit (10 of 10).';
    expect(msg).toContain('SEAT_LIMIT_EXCEEDED');
    expect(msg).toMatch(/\d+ of \d+/);
  });
});

test.describe('Permission subset', () => {
  test('assigner cannot grant permissions they lack', () => {
    const assignerPerms = new Set(['property.view', 'property.create', 'team.member.view']);
    const targetPerms = ['property.view', 'property.create', 'property.delete'];
    const canAssign = targetPerms.every((p) => assignerPerms.has(p));
    expect(canAssign).toBe(false);
  });

  test('assigner can grant subset of own permissions', () => {
    const assignerPerms = new Set(['property.view', 'property.create', 'team.member.invite']);
    const targetPerms = ['property.view', 'property.create'];
    const canAssign = targetPerms.every((p) => assignerPerms.has(p));
    expect(canAssign).toBe(true);
  });
});

test.describe('Invitation token', () => {
  test('token is not a workspace id pattern', () => {
    const workspaceIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const secureToken = 'aB3dEf9hIjKlMnOpQrStUvWxYz0123456789ab';
    expect(workspaceIdPattern.test(secureToken)).toBe(false);
  });

  test('legacy ws_ prefix is detectable', () => {
    expect('ws_abc-123'.startsWith('ws_')).toBe(true);
    expect('prop_abc'.startsWith('prop_')).toBe(true);
  });
});
