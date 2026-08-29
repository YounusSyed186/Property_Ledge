'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/queries';
import {
  advanceStage,
  DEFAULT_ONBOARDING_PROGRESS,
  getStagePath,
  parseOnboardingProgress,
  type BusinessType,
  type OnboardingProgress,
  type OnboardingStage,
  type StartMode,
} from '@/lib/onboarding/state';
import {
  getOnboardingRouteFromResolution,
  resolveOnboardingStage,
} from '@/lib/onboarding/resolver';
import { getSubscriptionPlans } from '@/lib/subscriptions/queries';
import { createTrialSubscription } from '@/lib/subscriptions/service';
import { handleCreateManualCheckoutSession } from '@/app/actions/billing';

const ONBOARDING_METADATA_KEY = 'onboarding';

async function getSupabaseForUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  return { user, supabase };
}

async function readProgress(userId: string, supabase: Awaited<ReturnType<typeof createClient>>): Promise<OnboardingProgress> {
  const { data } = await supabase.auth.getUser();
  const metadata = data.user?.user_metadata?.[ONBOARDING_METADATA_KEY];
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

async function markOnboardingCompleted(userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { error: updateError } = await supabase
    .from('account_context')
    .update({
      onboarding_status: 'completed',
      updated_at: new Date().toISOString(),
    } as never)
    .eq('user_id', userId);

  if (!updateError) return;

  const admin = await createAdminClient();
  const { error: upsertError } = await admin.from('account_context').upsert(
    {
      user_id: userId,
      status: 'active',
      onboarding_status: 'completed',
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: 'user_id' }
  );

  if (upsertError) {
    throw new Error(upsertError.message || 'Failed to mark onboarding as complete');
  }
}

async function writeProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  progress: OnboardingProgress
) {
  await supabase.auth.updateUser({
    data: { [ONBOARDING_METADATA_KEY]: progress },
  });

  const isComplete = progress.currentStage === 'ready' || progress.completedStages.includes('ready');

  if (isComplete) {
    await markOnboardingCompleted(userId, supabase);
    return;
  }

  const { error } = await supabase
    .from('account_context')
    .update({
      onboarding_status: 'in_progress',
      updated_at: new Date().toISOString(),
    } as never)
    .eq('user_id', userId);

  if (error) {
    const admin = await createAdminClient();
    await admin.from('account_context').upsert(
      {
        user_id: userId,
        status: 'active',
        onboarding_status: 'in_progress',
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'user_id' }
    );
  }
}

async function completeStage(
  stage: OnboardingStage,
  data?: Record<string, unknown>
): Promise<OnboardingProgress> {
  const { user, supabase } = await getSupabaseForUser();
  const current = await readProgress(user.id, supabase);
  const next = advanceStage(current, stage, data);
  await writeProgress(supabase, user.id, next);
  revalidatePath('/onboarding');
  return next;
}

export async function getOnboardingProgress(): Promise<OnboardingProgress> {
  const { user, supabase } = await getSupabaseForUser();
  return readProgress(user.id, supabase);
}

export async function getOnboardingRoute(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) return '/login';
  const resolution = await resolveOnboardingStage(user.id);
  return getOnboardingRouteFromResolution(resolution);
}

export async function getOnboardingResolution() {
  const user = await getCurrentUser();
  if (!user) return null;
  return resolveOnboardingStage(user.id);
}

export async function completeWelcomeStage(): Promise<void> {
  await completeStage('welcome');
}

export async function saveOnboardingWorkspaceSetup(input: {
  fullName: string;
  phone?: string;
  workspaceName: string;
  workspaceSlug: string;
  businessType: BusinessType;
}): Promise<{ workspaceId: string }> {
  const { user, supabase } = await getSupabaseForUser();

  await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: input.fullName,
      phone: input.phone ?? null,
      updated_at: new Date().toISOString(),
    } as never);

  const { data: existing } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  let workspaceId: string;

  if (existing) {
    workspaceId = (existing as { id: string }).id;
    await supabase
      .from('workspaces')
      .update({ name: input.workspaceName, slug: input.workspaceSlug, updated_at: new Date().toISOString() } as never)
      .eq('id', workspaceId);
  } else {
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .insert({
        name: input.workspaceName,
        slug: input.workspaceSlug,
        owner_id: user.id,
        status: 'active',
      } as never)
      .select('id')
      .single();

    if (error || !workspace) throw new Error(error?.message ?? 'Failed to create workspace');
    workspaceId = (workspace as { id: string }).id;

    const { data: ownerRole } = await supabase
      .from('team_roles')
      .select('id')
      .is('workspace_id', null)
      .ilike('name', 'owner')
      .maybeSingle();

    await supabase.from('workspace_members').upsert(
      {
        workspace_id: workspaceId,
        user_id: user.id,
        role: 'owner',
        role_id: (ownerRole as { id?: string } | null)?.id ?? null,
        status: 'active',
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'workspace_id,user_id' }
    );
  }

  await completeStage('workspace', {
    fullName: input.fullName,
    phone: input.phone,
    workspaceId,
    workspaceName: input.workspaceName,
    businessType: input.businessType,
  });

  return { workspaceId };
}

export async function selectOnboardingStartOption(
  mode: StartMode,
  planId?: string,
  planSlug?: string
): Promise<{ nextRoute: string }> {
  const { user } = await getSupabaseForUser();

  if (mode === 'explore') {
    await completeStage('subscription', { startMode: 'explore' });
    return { nextRoute: '/onboarding/property' };
  }

  if (mode === 'trial' && planId) {
    await createTrialSubscription(user.id, planId);
    await completeStage('subscription', { startMode: 'trial', selectedPlanId: planId, planSlug });
    return { nextRoute: '/onboarding/property' };
  }

  if (mode === 'free' && planId) {
    await completeStage('subscription', { startMode: 'free', selectedPlanId: planId, planSlug });
    return { nextRoute: '/onboarding/property' };
  }

  if (mode === 'paid' && planSlug) {
    await completeStage('subscription', { startMode: 'paid', planSlug, selectedPlanId: planId });
    return { nextRoute: '/onboarding/plans' };
  }

  return { nextRoute: '/onboarding/plans' };
}

export async function selectOnboardingPlan(planId: string, planSlug: string, priceCents: number): Promise<{ nextRoute: string }> {
  const { user } = await getSupabaseForUser();

  if (priceCents === 0) {
    await completeStage('subscription', { startMode: 'free', selectedPlanId: planId, planSlug });
    return { nextRoute: '/onboarding/property' };
  }

  await completeStage('subscription', { startMode: 'paid', selectedPlanId: planId, planSlug });

  const session = await handleCreateManualCheckoutSession(planSlug, 'monthly');
  if (session) {
    await completeStage('subscription', {
      startMode: 'paid',
      selectedPlanId: planId,
      planSlug,
      checkoutSession: session,
    });
  }

  return { nextRoute: '/onboarding/payment' };
}

export async function createOnboardingProperty(input: {
  workspaceId: string;
  name: string;
  propertyType?: string;
  propertyCategory?: 'Residential' | 'Commercial';
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  bedrooms?: number;
  bathrooms?: number;
  carSpaces?: number;
  rentAmount?: number;
  paymentFrequency?: string;
  image?: string | null;
}): Promise<{ propertyId: string }> {
  const { user, supabase } = await getSupabaseForUser();

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (workspaceError || !workspace) {
    throw new Error(workspaceError?.message ?? 'Please create a workspace first.');
  }

  const workspaceId = (workspace as { id: string }).id;
  const customPropId = 'PL-' + Math.floor(1000 + Math.random() * 9000).toString();

  const admin = await createAdminClient();
  const { data: property, error } = await admin
    .from('properties')
    .insert({
      workspace_id: workspaceId,
      owner_id: user.id,
      name: input.name || input.addressLine1,
      property_category: input.propertyCategory ?? 'Residential',
      property_type: input.propertyType ?? null,
      address_line_1: input.addressLine1,
      city: input.city,
      suburb: input.city,
      state: input.state,
      postal_code: input.postalCode,
      postcode: input.postalCode,
      country: 'Australia',
      bedrooms: input.bedrooms ?? 0,
      bathrooms: input.bathrooms ?? 0,
      parking_spaces: input.carSpaces ?? 0,
      car_spaces: input.carSpaces ?? 0,
      rent_amount: input.rentAmount ?? 0,
      payment_frequency: input.paymentFrequency ?? 'Weekly',
      image_url: input.image ?? null,
      property_id: customPropId,
      status: 'active',
    } as never)
    .select('id')
    .single();

  if (error || !property) throw new Error(error?.message ?? 'Failed to create property');

  const propertyId = (property as { id: string }).id;
  await completeStage('property', { propertyId, propertyName: input.name });
  return { propertyId };
}

export async function skipOnboardingProperty(): Promise<void> {
  await completeStage('property', { propertySkipped: true });
}

export async function finishOnboarding(): Promise<void> {
  const { user, supabase } = await getSupabaseForUser();
  const progress = await readProgress(user.id, supabase);
  const finalProgress: OnboardingProgress = {
    currentStage: 'ready',
    completedStages: [...new Set([...progress.completedStages, 'ready' as const])],
    data: progress.data,
  };

  await supabase.auth.updateUser({
    data: { [ONBOARDING_METADATA_KEY]: finalProgress },
  });
  await markOnboardingCompleted(user.id, supabase);

  revalidatePath('/onboarding');
  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function fetchOnboardingPlans() {
  return getSubscriptionPlans();
}

export async function dismissSetupChecklist(): Promise<void> {
  const { user, supabase } = await getSupabaseForUser();
  const progress = await readProgress(user.id, supabase);
  await writeProgress(supabase, user.id, {
    ...progress,
    data: { ...progress.data, setupChecklistDismissed: true },
  });
  revalidatePath('/dashboard');
}

// Legacy aliases
export async function completeOnboardingStep(stepId: OnboardingStage, data?: Record<string, unknown>) {
  return completeStage(stepId, data);
}

export async function saveOnboardingProfile(input: { fullName: string; phone?: string }) {
  const { user, supabase } = await getSupabaseForUser();
  await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: input.fullName,
      phone: input.phone ?? null,
      updated_at: new Date().toISOString(),
    } as never);
  return completeStage('workspace', { fullName: input.fullName, phone: input.phone });
}

export async function createOnboardingWorkspace(input: { name: string; slug: string }) {
  const result = await saveOnboardingWorkspaceSetup({
    fullName: (await readProgress((await getCurrentUser())!.id, await createClient())).data.fullName as string || 'User',
    workspaceName: input.name,
    workspaceSlug: input.slug,
    businessType: 'property_owner',
  });
  const progress = await getOnboardingProgress();
  return { workspaceId: result.workspaceId, progress };
}

export async function skipOnboardingStep(stepId: OnboardingStage) {
  return completeStage(stepId);
}
