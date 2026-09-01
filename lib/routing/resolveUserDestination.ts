import type { RouteResolution, RouteResolutionInput, UserDestination } from './types';
import { safeRedirectPath } from './safeRedirect';

const ONBOARDING_EXEMPT_PREFIXES = [
  '/onboarding',
  '/invite',
  '/join',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
];

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/subscription',
  '/admin',
  '/checkout',
  '/onboarding',
  '/tenant',
];

const AUTH_PREFIXES = ['/login', '/signup', '/forgot-password', '/reset-password'];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function needsOnboarding(status: string | null | undefined) {
  return status === 'not_started' || status === 'in_progress';
}

export function resolveUserDestination(input: RouteResolutionInput): RouteResolution | null {
  const {
    isAuthenticated,
    pathname,
    onboardingStatus,
    onboardingRoute,
    persona,
    pendingInvitationToken,
    redirectTo,
  } = input;

  if (!isAuthenticated) {
    if (matchesPrefix(pathname, PROTECTED_PREFIXES)) {
      return {
        destination: 'AUTH',
        path: `/login?redirectTo=${encodeURIComponent(pathname)}`,
        reason: 'protected_route',
      };
    }
    return null;
  }

  if (pendingInvitationToken && matchesPrefix(pathname, AUTH_PREFIXES)) {
    return {
      destination: 'INVITATION',
      path: `/join/${pendingInvitationToken}`,
      reason: 'pending_invitation',
    };
  }

  if (redirectTo && matchesPrefix(pathname, AUTH_PREFIXES)) {
    const sanitized = safeRedirectPath(redirectTo, '/dashboard');
    return { destination: 'DASHBOARD', path: sanitized, reason: 'auth_redirect' };
  }

  if (matchesPrefix(pathname, AUTH_PREFIXES)) {
    const planParam = input.planParam;
    const defaultTarget = planParam
      ? `/checkout?plan=${planParam}`
      : needsOnboarding(onboardingStatus)
        ? (onboardingRoute || '/onboarding')
        : '/dashboard';
    const target = redirectTo ? safeRedirectPath(redirectTo, defaultTarget) : defaultTarget;
    return {
      destination: needsOnboarding(onboardingStatus) ? 'ONBOARDING' : 'DASHBOARD',
      path: target,
      reason: 'already_authenticated',
    };
  }

  if (persona === 'platform_admin' && pathname.startsWith('/dashboard')) {
    return { destination: 'ADMIN', path: '/admin', reason: 'platform_admin' };
  }

  if (persona === 'tenant' && pathname.startsWith('/dashboard')) {
    return { destination: 'TENANT', path: '/tenant', reason: 'tenant_persona' };
  }

  if (persona === 'staff' && (pathname === '/dashboard' || pathname === '/dashboard/')) {
    return { destination: 'DASHBOARD', path: '/dashboard/tasks', reason: 'staff_default' };
  }

  return null;
}

export function inferDestinationFromPath(pathname: string): UserDestination {
  if (pathname.startsWith('/admin')) return 'ADMIN';
  if (pathname.startsWith('/tenant')) return 'TENANT';
  if (pathname.startsWith('/join')) return 'INVITATION';
  if (pathname.startsWith('/onboarding')) return 'ONBOARDING';
  if (pathname.startsWith('/subscription') || pathname.startsWith('/checkout')) return 'SUBSCRIPTION';
  return 'DASHBOARD';
}
