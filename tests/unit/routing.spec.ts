import { test, expect } from '@playwright/test';
import { resolveUserDestination } from '@/lib/routing/resolveUserDestination';
import { safeRedirectPath } from '@/lib/routing/safeRedirect';
import { getAppBaseUrl, validateAndSanitizeUrl } from '@/lib/routing/env';

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

test.describe('safeRedirectPath security perimeter', () => {
  test('allows safe relative paths', () => {
    expect(safeRedirectPath('/dashboard')).toBe('/dashboard');
    expect(safeRedirectPath('/dashboard/properties?tab=leases')).toBe('/dashboard/properties?tab=leases');
    expect(safeRedirectPath('/admin/subscriptions#billing')).toBe('/admin/subscriptions#billing');
  });

  test('rejects external URLs and protocol-relative attempts', () => {
    expect(safeRedirectPath('https://evil.com/phish')).toBe('/dashboard');
    expect(safeRedirectPath('http://malicious.org')).toBe('/dashboard');
    expect(safeRedirectPath('//attacker.com')).toBe('/dashboard');
    expect(safeRedirectPath('/\\attacker.com')).toBe('/dashboard');
    expect(safeRedirectPath('javascript:alert(1)')).toBe('/dashboard');
    expect(safeRedirectPath('data:text/html,<script>alert(1)</script>')).toBe('/dashboard');
  });

  test('rejects CRLF injection and control characters', () => {
    expect(safeRedirectPath('/dashboard\r\nSet-Cookie: session=evil')).toBe('/dashboard');
    expect(safeRedirectPath('/dashboard\nLocation: http://evil.com')).toBe('/dashboard');
  });

  test('falls back to custom fallback if provided', () => {
    expect(safeRedirectPath('https://evil.com', '/tenant')).toBe('/tenant');
    expect(safeRedirectPath(null, '/login')).toBe('/login');
  });
});

test.describe('validateAndSanitizeUrl', () => {
  test('normalizes valid absolute URLs and strips trailing slashes', () => {
    expect(validateAndSanitizeUrl('https://propertyledge.com.au/')).toBe('https://propertyledge.com.au');
    expect(validateAndSanitizeUrl('https://app.propertyledge.com/portal/')).toBe('https://app.propertyledge.com/portal');
    expect(validateAndSanitizeUrl('http://localhost:3000/')).toBe('http://localhost:3000');
  });

  test('prepends https to bare hostnames', () => {
    expect(validateAndSanitizeUrl('propertyledge-preview.vercel.app')).toBe('https://propertyledge-preview.vercel.app');
  });

  test('rejects empty or whitespace inputs', () => {
    expect(validateAndSanitizeUrl('')).toBeNull();
    expect(validateAndSanitizeUrl('   ')).toBeNull();
    expect(validateAndSanitizeUrl(undefined)).toBeNull();
    expect(validateAndSanitizeUrl(null)).toBeNull();
  });

  test('rejects protocol-relative and script schemes', () => {
    expect(validateAndSanitizeUrl('//evil.com')).toBeNull();
    expect(validateAndSanitizeUrl('/\\evil.com')).toBeNull();
    expect(validateAndSanitizeUrl('javascript:alert(1)')).toBeNull();
    expect(validateAndSanitizeUrl('data:text/html,test')).toBeNull();
    expect(validateAndSanitizeUrl('file:///etc/passwd')).toBeNull();
  });

  test('rejects control characters, CRLF, and embedded credentials', () => {
    expect(validateAndSanitizeUrl('https://propertyledge.com\r\nSet-Cookie: evil=1')).toBeNull();
    expect(validateAndSanitizeUrl('https://user:password@propertyledge.com')).toBeNull();
  });

  test('enforces HTTPS in production mode', () => {
    expect(validateAndSanitizeUrl('http://insecure-domain.com', { isProduction: true })).toBeNull();
    expect(validateAndSanitizeUrl('https://secure-domain.com', { isProduction: true })).toBe('https://secure-domain.com');
  });
});

test.describe('getAppBaseUrl production hardening', () => {
  test('development: falls back to localhost:3000 when unconfigured', () => {
    const url = getAppBaseUrl({
      NODE_ENV: 'development',
      NEXT_PUBLIC_APP_URL: undefined,
      NEXT_PUBLIC_SITE_URL: undefined,
      NEXT_PUBLIC_VERCEL_URL: undefined,
      VERCEL_URL: undefined,
    });
    expect(url).toBe('http://localhost:3000');
  });

  test('development: uses configured NEXT_PUBLIC_APP_URL when present', () => {
    const url = getAppBaseUrl({
      NODE_ENV: 'development',
      NEXT_PUBLIC_APP_URL: 'https://dev.propertyledge.com',
    });
    expect(url).toBe('https://dev.propertyledge.com');
  });

  test('production: uses NEXT_PUBLIC_APP_URL as top precedence', () => {
    const url = getAppBaseUrl({
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'https://propertyledge.com',
      NEXT_PUBLIC_SITE_URL: 'https://other.com',
      VERCEL_URL: 'preview.vercel.app',
    });
    expect(url).toBe('https://propertyledge.com');
  });

  test('production: falls back to NEXT_PUBLIC_SITE_URL if APP_URL missing', () => {
    const url = getAppBaseUrl({
      NODE_ENV: 'production',
      NEXT_PUBLIC_SITE_URL: 'https://site.propertyledge.com',
    });
    expect(url).toBe('https://site.propertyledge.com');
  });

  test('production: falls back to Vercel deployment URL if configured', () => {
    const url = getAppBaseUrl({
      NODE_ENV: 'production',
      VERCEL_URL: 'propertyledge-deploy.vercel.app',
    });
    expect(url).toBe('https://propertyledge-deploy.vercel.app');
  });

  test('production: FAILS EXPLICITLY and NEVER returns localhost when unconfigured', () => {
    expect(() => {
      getAppBaseUrl({
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_URL: undefined,
        NEXT_PUBLIC_SITE_URL: undefined,
        NEXT_PUBLIC_VERCEL_URL: undefined,
        VERCEL_URL: undefined,
      });
    }).toThrow('Missing or invalid production application URL');
  });

  test('production: FAILS EXPLICITLY when given invalid or insecure URL', () => {
    expect(() => {
      getAppBaseUrl({
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_URL: 'http://insecure-domain.com', // insecure HTTP in prod
      });
    }).toThrow('Missing or invalid production application URL');

    expect(() => {
      getAppBaseUrl({
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_URL: 'not-a-valid-url',
      });
    }).toThrow('Missing or invalid production application URL');
  });
});


