import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { resolveUserDestination } from '@/lib/routing/resolveUserDestination';

type Persona = 'platform_admin' | 'tenant' | 'owner' | 'manager' | 'staff' | 'agent' | 'viewer' | 'admin';

const STAGE_ROUTES: Record<string, string> = {
  welcome: '/onboarding',
  workspace: '/onboarding/workspace',
  subscription: '/onboarding/subscription',
  property: '/onboarding/property',
  ready: '/onboarding/complete',
};

function mapTeamRoleNameToPersona(roleName: string | null | undefined): Persona | null {
  if (!roleName) return null;
  const normalized = roleName.toLowerCase();
  switch (normalized) {
    case 'owner':
      return 'owner';
    case 'admin':
      return 'admin';
    case 'manager':
      return 'manager';
    case 'leasing agent':
      return 'agent';
    case 'staff':
      return 'staff';
    case 'viewer':
    case 'landlord':
      return 'viewer';
    default:
      return 'viewer';
  }
}

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
    supabase
      .from('workspace_members')
      .select('role_id, team_roles(name)')
      .eq('user_id', userId)
      .eq('status', 'active'),
  ]);

  if (adminRow) return 'platform_admin';
  if (tenantRow) return 'tenant';

  if ((ownedWorkspaces || []).length > 0) return 'owner';

  const propertyRoles = (propertyMembers || []).map((m) => m.role as string);
  if (propertyRoles.includes('owner')) return 'owner';

  for (const m of workspaceMembers || []) {
    const row = m as { team_roles?: { name?: string } | null };
    const persona = mapTeamRoleNameToPersona(row.team_roles?.name);
    if (persona) return persona;
  }

  if (propertyRoles.includes('manager')) return 'manager';
  if (propertyRoles.includes('staff')) return 'staff';
  if (propertyRoles.includes('agent')) return 'agent';
  if (propertyRoles.includes('viewer')) return 'viewer';

  return 'owner';
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
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
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
  const redirectTo = request.nextUrl.searchParams.get('redirectTo');
  const planParam = request.nextUrl.searchParams.get('plan');
  const joinMatch = redirectTo?.match(/^\/join\/([^/?]+)/);
  const pendingInvitationToken = joinMatch?.[1] ?? null;

  let onboardingStatus: string | null = null;
  let onboardingRoute: string | null = null;
  let persona: Persona | null = null;

  if (user) {
    const { data: accountContext } = await supabase
      .from('account_context')
      .select('onboarding_status')
      .eq('user_id', user.id)
      .maybeSingle();

    onboardingStatus = (accountContext as { onboarding_status?: string } | null)?.onboarding_status ?? null;
    onboardingRoute = await resolveOnboardingRoute(supabase, user.id);
    persona = await resolvePersona(supabase, user.id);
  }

  const resolution = resolveUserDestination({
    isAuthenticated: !!user,
    pathname,
    onboardingStatus,
    onboardingRoute,
    persona,
    pendingInvitationToken,
    redirectTo,
    planParam,
  });

  if (resolution) {
    return NextResponse.redirect(new URL(resolution.path, request.url));
  }

  return supabaseResponse;
}
