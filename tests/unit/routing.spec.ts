import { test, expect } from '@playwright/test';
import { resolveUserDestination } from '@/lib/routing/resolveUserDestination';

test.describe('resolveUserDestination', () => {
  test('redirects unauthenticated users from dashboard to login', () => {
    const result = resolveUserDestination({
      isAuthenticated: false,
      pathname: '/dashboard',
    });
    expect(result?.destination).toBe('AUTH');
    expect(result?.path).toContain('/login');
    expect(result?.path).toContain('redirectTo');
  });

  test('preserves invitation token on auth redirect', () => {
    const result = resolveUserDestination({
      isAuthenticated: true,
      pathname: '/login',
      pendingInvitationToken: 'abc123',
      redirectTo: null,
    });
    expect(result?.destination).toBe('INVITATION');
    expect(result?.path).toBe('/join/abc123');
  });

  test('redirects platform admin away from dashboard', () => {
    const result = resolveUserDestination({
      isAuthenticated: true,
      pathname: '/dashboard',
      persona: 'platform_admin',
      onboardingStatus: 'completed',
    });
    expect(result?.destination).toBe('ADMIN');
    expect(result?.path).toBe('/admin');
  });

  test('redirects tenant away from dashboard', () => {
    const result = resolveUserDestination({
      isAuthenticated: true,
      pathname: '/dashboard/properties',
      persona: 'tenant',
      onboardingStatus: 'completed',
    });
    expect(result?.destination).toBe('TENANT');
    expect(result?.path).toBe('/tenant');
  });

  test('allows dashboard when onboarding complete', () => {
    const result = resolveUserDestination({
      isAuthenticated: true,
      pathname: '/dashboard',
      persona: 'owner',
      onboardingStatus: 'completed',
    });
    expect(result).toBeNull();
  });

  test('allows dashboard when onboarding is in progress (non-blocking)', () => {
    const result = resolveUserDestination({
      isAuthenticated: true,
      pathname: '/dashboard',
      persona: 'owner',
      onboardingStatus: 'in_progress',
      onboardingRoute: '/onboarding/workspace',
    });
    expect(result).toBeNull();
  });

  test('routes authenticated user from login to onboarding route if onboarding incomplete', () => {
    const result = resolveUserDestination({
      isAuthenticated: true,
      pathname: '/login',
      persona: 'owner',
      onboardingStatus: 'in_progress',
      onboardingRoute: '/onboarding/workspace',
    });
    expect(result?.destination).toBe('ONBOARDING');
    expect(result?.path).toBe('/onboarding/workspace');
  });
});
