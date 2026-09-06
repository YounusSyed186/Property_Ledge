import { createClient } from '@/lib/supabase/server';
import { getSubscription } from '@/lib/subscriptions/queries';
import { isSubscriptionActive } from '@/lib/subscriptions/utils';
import {
  getStagePath,
  type OnboardingProgress,
  type OnboardingStage,
  parseOnboardingProgress,
  DEFAULT_ONBOARDING_PROGRESS,
} from './state';

export interface OnboardingResolverContext {
  hasProfile: boolean;
  hasWorkspace: boolean;
  hasSubscriptionDecision: boolean;
  hasProperty: boolean;
  subscriptionStatus?: string | null;
  workspaceId?: string;
  workspaceName?: string;
  propertyId?: string;
  propertyName?: string;
  pendingPayment: boolean;
}

export interface OnboardingResolution {
  stage: OnboardingStage;
  route: string;
  completed: boolean;
  context: OnboardingResolverContext;
  progress: OnboardingProgress;
}

async function readProgressMetadata(userId: string): Promise<OnboardingProgress> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const metadata = data.user?.user_metadata?.onboarding;
  if (metadata) return parseOnboardingProgress(metadata);

  const { data: accountContext } = await supabase
    .from('account_context')
    .select('onboarding_status')
    .eq('user_id', userId)
    .maybeSingle();

  if ((accountContext as { onboarding_status?: string } | null)?.onboarding_status === 'completed') {
    return { currentStage: 'ready', completedStages: ['ready'], data: {} };
  }

  return DEFAULT_ONBOARDING_PROGRESS;
}

export async function resolveOnboardingStage(userId: string): Promise<OnboardingResolution> {
  const supabase = await createClient();
  const progress = await readProgressMetadata(userId);

  const [{ data: profile }, { data: workspaces }, { data: properties }, { data: memberWorkspaces }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
    supabase.from('workspaces').select('id, name').eq('owner_id', userId).eq('status', 'active').limit(1),
    supabase.from('properties').select('id, name').eq('owner_id', userId).eq('status', 'active').limit(1),
    supabase.from('workspace_members').select('workspace_id, team_roles(name), workspaces(name)')
      .eq('user_id', userId).eq('status', 'active').limit(1),
  ]);

  const subscription = await getSubscription(userId);
  const subStatus = subscription?.status ?? null;
  const hasSubscriptionDecision =
    !!progress.data.startMode ||
    !!progress.data.selectedPlanId ||
    !!subscription ||
    progress.completedStages.includes('subscription');

  const hasSubmittedProof =
    Boolean(progress.data.paymentSubmitted) ||
    subStatus === 'under_review' ||
    (subStatus ? isSubscriptionActive(subStatus as any) : false);

  const pendingPayment =
    !hasSubmittedProof &&
    (subStatus === 'pending_payment' ||
      subStatus === 'draft' ||
      progress.data.startMode === 'paid');

  const context: OnboardingResolverContext = {
    hasProfile: !!(profile as { full_name?: string } | null)?.full_name?.trim(),
    hasWorkspace: (workspaces || []).length > 0,
    hasSubscriptionDecision,
    hasProperty: (properties || []).length > 0,
    subscriptionStatus: subStatus,
    workspaceId: (workspaces?.[0] as { id?: string } | undefined)?.id,
    workspaceName: (workspaces?.[0] as { name?: string } | undefined)?.name,
    propertyId: (properties?.[0] as { id?: string } | undefined)?.id,
    propertyName: (properties?.[0] as { name?: string } | undefined)?.name,
    pendingPayment,
  };

  const { data: accountContext } = await supabase
    .from('account_context')
    .select('onboarding_status')
    .eq('user_id', userId)
    .maybeSingle();

  if ((accountContext as { onboarding_status?: string } | null)?.onboarding_status === 'completed') {
    return {
      stage: 'ready',
      route: '/dashboard',
      completed: true,
      context,
      progress,
    };
  }

  const isMemberOnly =
    (workspaces || []).length === 0 &&
    (memberWorkspaces || []).length > 0 &&
    (properties || []).length === 0;

  if (isMemberOnly && !progress.completedStages.includes('ready')) {
    const memberWs = memberWorkspaces?.[0] as {
      workspaces?: { name?: string };
      team_roles?: { name?: string };
    } | undefined;
    return {
      stage: 'welcome',
      route: '/onboarding/member',
      completed: false,
      context: {
        ...context,
        workspaceName: memberWs?.workspaces?.name,
        hasWorkspace: true,
      },
      progress,
    };
  }

  let stage: OnboardingStage = 'welcome';

  if (!context.hasProfile || !context.hasWorkspace) {
    stage = 'workspace';
  } else if (!context.hasSubscriptionDecision) {
    stage = 'subscription';
  } else if (pendingPayment) {
    return {
      stage: 'subscription',
      route: '/onboarding/payment',
      completed: false,
      context,
      progress,
    };
  } else if (!context.hasProperty) {
    stage = 'property';
  } else {
    stage = 'ready';
  }

  const route = stage === 'ready' ? '/onboarding/complete' : getStagePath(stage);

  return {
    stage,
    route,
    completed: false,
    context,
    progress,
  };
}

export function getOnboardingRouteFromResolution(resolution: OnboardingResolution): string {
  return resolution.completed ? '/dashboard' : resolution.route;
}
