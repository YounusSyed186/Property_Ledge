import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type Persona = 'platform_admin' | 'tenant' | 'owner' | 'manager' | 'staff' | 'agent' | 'viewer';

const STAGE_ROUTES: Record<string, string> = {
  welcome: '/onboarding',
  workspace: '/onboarding/workspace',
  subscription: '/onboarding/subscription',
  property: '/onboarding/property',
  ready: '/onboarding/complete',
};

async function resolvePersona(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<Persona> {
  const [
    { data: adminRow },
    { data: tenantRow },
    { data: ownedWorkspaces },
    { data: propertyMembers },
    { data: workspaceMembers },
  ] = await Promise.all([
    supabase.from('platform_admins').select('user_id').eq('user_id', userId).eq('status', 'active').maybeSingle(),
    supabase.from('tenants').select('id').eq('user_id', userId).eq('status', 'active').maybeSingle(),
    supabase.from('workspaces').select('id').eq('owner_id', userId).eq('status', 'active'),
    supabase.from('property_members').select('role').eq('user_id', userId).eq('status', 'active'),
    supabase.from('workspace_members').select('role').eq('user_id', userId).eq('status', 'active'),
  ]);

  if (adminRow) return 'platform_admin';
  if (tenantRow) return 'tenant';

  const propertyRoles = (propertyMembers || []).map((m) => m.role as string);
  const workspaceRoles = (workspaceMembers || []).map((m) => m.role as string);
  const isWorkspaceOwner = (ownedWorkspaces || []).length > 0;

  if (isWorkspaceOwner || propertyRoles.includes('owner')) return 'owner';
  if (propertyRoles.includes('manager') || workspaceRoles.includes('manager') || workspaceRoles.includes('admin')) {
    return 'manager';
  }
  if (propertyRoles.includes('staff')) return 'staff';
  if (propertyRoles.includes('agent')) return 'agent';
  if (propertyRoles.includes('viewer')) return 'viewer';

  return 'owner';
}

function needsOnboarding(status: string | null | undefined) {
  return status === 'not_started' || status === 'in_progress';
}

async function resolveOnboardingRoute(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<string> {
  const [{ data: profile }, { data: workspaces }, { data: properties }, { data: accountContext }] =
    await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
      supabase.from('workspaces').select('id').eq('owner_id', userId).eq('status', 'active').limit(1),
      supabase.from('properties').select('id').eq('owner_id', userId).eq('status', 'active').limit(1),
      supabase.from('account_context').select('onboarding_status').eq('user_id', userId).maybeSingle(),
    ]);

  if ((accountContext as { onboarding_status?: string } | null)?.onboarding_status === 'completed') {
    return '/dashboard';
  }

  const hasProfile = !!(profile as { full_name?: string } | null)?.full_name?.trim();
  const hasWorkspace = (workspaces || []).length > 0;
  const hasProperty = (properties || []).length > 0;

  const { data: authUser } = await supabase.auth.getUser();
  const onboardingMeta = authUser.user?.user_metadata?.onboarding as
    | { data?: { startMode?: string; selectedPlanId?: string }; completedStages?: string[] }
    | undefined;
  const hasSubscriptionDecision =
    !!onboardingMeta?.data?.startMode ||
    !!onboardingMeta?.data?.selectedPlanId ||
    (onboardingMeta?.completedStages || []).includes('subscription');

  if (!hasProfile || !hasWorkspace) return STAGE_ROUTES.workspace;
  if (!hasSubscriptionDecision) return STAGE_ROUTES.subscription;
  if (onboardingMeta?.data?.startMode === 'paid' && !hasProperty) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('account_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const status = (sub as { status?: string } | null)?.status;
    if (status === 'pending_payment' || status === 'under_review' || status === 'draft') {
      return '/onboarding/payment';
    }
  }
  if (!hasProperty) return STAGE_ROUTES.property;
  return STAGE_ROUTES.ready;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/subscription') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/tenant');

  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password');

  const isOnboardingExempt =
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/invite') ||
    pathname.startsWith('/join') ||
    pathname.startsWith('/join') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup');

  if (isProtectedRoute && !user) {
    const redirectTarget = pathname + url.search;
    url.pathname = '/login';
    url.search = `?redirectTo=${encodeURIComponent(redirectTarget)}`;
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: accountContext } = await supabase
      .from('account_context')
      .select('onboarding_status')
      .eq('user_id', user.id)
      .maybeSingle();

    const onboardingStatus = (accountContext as { onboarding_status?: string } | null)?.onboarding_status;

    if (
      needsOnboarding(onboardingStatus) &&
      !isOnboardingExempt &&
      !pathname.startsWith('/admin')
    ) {
      const targetRoute = await resolveOnboardingRoute(supabase, user.id);

      // All setup steps done — allow dashboard even if status wasn't persisted yet
      if (pathname.startsWith('/dashboard') && targetRoute === '/onboarding/complete') {
        return supabaseResponse;
      }

      if (!pathname.startsWith(targetRoute) && targetRoute !== '/dashboard') {
        url.pathname = targetRoute;
        url.search = '';
        return NextResponse.redirect(url);
      }
    }

    if (
      onboardingStatus === 'completed' &&
      pathname.startsWith('/onboarding')
    ) {
      url.pathname = '/dashboard';
      url.search = '';
      return NextResponse.redirect(url);
    }

    const persona = await resolvePersona(supabase, user.id);

    if (persona === 'tenant' && pathname.startsWith('/dashboard')) {
      url.pathname = '/tenant';
      url.search = '';
      return NextResponse.redirect(url);
    }

    if (persona === 'staff' && (pathname === '/dashboard' || pathname === '/dashboard/')) {
      url.pathname = '/dashboard/tasks';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  if (isAuthPage && user) {
    const planParam = request.nextUrl.searchParams.get('plan');
    const defaultTarget = planParam ? `/checkout?plan=${planParam}` : '/dashboard';
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || defaultTarget;
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return supabaseResponse;
}
