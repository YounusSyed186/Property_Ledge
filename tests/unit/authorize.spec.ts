import { test, expect } from '@playwright/test';
import { AuthorizationError, getAuthorizationUserMessage } from '@/lib/auth/errors';
import { isFeatureEnabled, getNumericEntitlement } from '@/lib/entitlements/utils';

test.describe('AuthorizationError', () => {
  test('FEATURE_NOT_INCLUDED returns plan upgrade message', () => {
    const err = new AuthorizationError('FEATURE_NOT_INCLUDED', 'insights.enabled missing');
    expect(getAuthorizationUserMessage(err)).toContain("isn't included");
  });

  test('PERMISSION_DENIED returns role message', () => {
    const err = new AuthorizationError('PERMISSION_DENIED', 'missing insights.view');
    expect(getAuthorizationUserMessage(err)).toContain("role doesn't have permission");
  });

  test('LIMIT_REACHED preserves limit message', () => {
    const err = new AuthorizationError('LIMIT_REACHED', "You've reached your team member limit (2 of 2).");
    expect(getAuthorizationUserMessage(err)).toContain('2 of 2');
  });
});

test.describe('Entitlement evaluation', () => {
  test('boolean feature enabled', () => {
    expect(isFeatureEnabled({ 'insights.enabled': true }, 'insights.enabled')).toBe(true);
    expect(isFeatureEnabled({ 'insights.enabled': false }, 'insights.enabled')).toBe(false);
  });

  test('missing feature is disabled', () => {
    expect(isFeatureEnabled({}, 'insights.enabled')).toBe(false);
  });

  test('numeric limit parsing', () => {
    expect(getNumericEntitlement({ 'team_members.max': 25 }, 'team_members.max')).toBe(25);
    expect(getNumericEntitlement({ 'team_members.max': '10' }, 'team_members.max')).toBe(10);
  });
});

test.describe('Combined authorization logic', () => {
  test('Professional + Manager + insights.view conceptually allowed when both gates pass', () => {
    const entitlements = { 'insights.enabled': true };
    const permissions = new Set(['insights.view', 'property.view']);
    const featureOk = isFeatureEnabled(entitlements, 'insights.enabled');
    const permOk = permissions.has('insights.view');
    expect(featureOk && permOk).toBe(true);
  });

  test('Trial + Owner + insights.view denied when feature off', () => {
    const entitlements = { 'insights.enabled': false };
    const permissions = new Set(['insights.view', 'team.member.invite']);
    const featureOk = isFeatureEnabled(entitlements, 'insights.enabled');
    const permOk = permissions.has('insights.view');
    expect(featureOk && permOk).toBe(false);
  });
});
