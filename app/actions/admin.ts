'use server';

import {
  createAdminPlan as createAdminPlanService,
  updateAdminPlan as updateAdminPlanService,
  setPlanEntitlement as setPlanEntitlementService,
  removePlanEntitlement as removePlanEntitlementService,
  createAdminEntitlement as createAdminEntitlementService,
  adminUpdateSubscription as adminUpdateSubscriptionService,
  adminApproveSubscription as adminApproveSubscriptionService,
  adminRejectSubscription as adminRejectSubscriptionService,
} from '@/lib/admin/service';
import {
  getAdminSubscriptions as getAdminSubscriptionsQuery,
  getAdminPlans as getAdminPlansQuery,
  getAdminEntitlements as getAdminEntitlementsQuery,
  getAdminBillingEvents as getAdminBillingEventsQuery,
  getAdminPayments as getAdminPaymentsQuery,
  getAdminUsers as getAdminUsersQuery,
  getAdminWorkspaces as getAdminWorkspacesQuery,
} from '@/lib/admin/queries';
import { getPaymentProofByPaymentId } from '@/lib/billing/service';
import { requireAdmin } from '@/lib/admin/authorization';
import { emailService } from '@/lib/email/service';
import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface SubscriptionWithRelations {
  id: string;
  account_id: string;
  plan_id: string;
  status: string;
  account?: { user_id: string } | null;
  plan?: { name: string; price_cents: number } | null;
}

export async function fetchAdminSubscriptions(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
} = {}) {
  await requireAdmin();
  return getAdminSubscriptionsQuery(params);
}

export async function fetchAdminPayments(params: {
  page?: number;
  limit?: number;
  status?: string;
} = {}) {
  await requireAdmin();
  return getAdminPaymentsQuery(params);
}

export async function fetchAdminUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
} = {}) {
  await requireAdmin();
  return getAdminUsersQuery(params);
}

export async function fetchAdminWorkspaces() {
  await requireAdmin();
  return getAdminWorkspacesQuery();
}

export async function fetchPaymentProof(paymentId: string) {
  await requireAdmin();
  return getPaymentProofByPaymentId(paymentId);
}

export async function fetchAdminPlans() {
  await requireAdmin();
  return getAdminPlansQuery();
}

export async function fetchAdminEntitlements() {
  await requireAdmin();
  return getAdminEntitlementsQuery();
}

export async function fetchAdminBillingEvents(params: { page?: number; limit?: number } = {}) {
  await requireAdmin();
  return getAdminBillingEventsQuery(params);
}

export async function handleCreatePlan(planData: {
  name: string;
  slug: string;
  description?: string;
  status?: 'active' | 'inactive' | 'archived';
  display_order?: number;
  price_cents?: number;
  billing_interval?: 'monthly' | 'yearly';
}) {
  await requireAdmin();
  const result = await createAdminPlanService(planData);
  revalidatePath('/admin/plans');
  return result;
}

export async function handleUpdatePlan(
  planId: string,
  updates: Partial<{
    name: string;
    description: string;
    status: 'active' | 'inactive' | 'archived';
    display_order: number;
    price_cents: number;
    billing_interval: 'monthly' | 'yearly';
  }>
) {
  await requireAdmin();
  return updateAdminPlanService(planId, updates);
}

export async function handleSetPlanEntitlement(planId: string, entitlementId: string, value: unknown) {
  await requireAdmin();
  return setPlanEntitlementService(planId, entitlementId, value);
}

export async function handleRemovePlanEntitlement(planId: string, entitlementId: string) {
  await requireAdmin();
  return removePlanEntitlementService(planId, entitlementId);
}

export async function handleCreateEntitlement(entitlementData: {
  key: string;
  name: string;
  description?: string;
  value_type: 'boolean' | 'number' | 'string';
}) {
  await requireAdmin();
  return createAdminEntitlementService(entitlementData);
}

export async function handleUpdateSubscriptionAdmin(
  subscriptionId: string,
  updates: Partial<{
    plan_id: string;
    status: 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled' | 'expired';
    cancel_at_period_end: boolean;
  }>
) {
  await requireAdmin();
  return adminUpdateSubscriptionService(subscriptionId, updates);
}

export async function handleApproveSubscription(subscriptionId: string) {
  await requireAdmin();
  
  // Get subscription details before updating
  const supabase = await createAdminClient();
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(`
      *,
      account:account_context!subscriptions_account_id_fkey(user_id),
      plan:subscription_plans!subscriptions_plan_id_fkey(name, price_cents)
    `)
    .eq('id', subscriptionId)
    .single();

  const typedSubscription = subscription as SubscriptionWithRelations | null;

  if (!typedSubscription) {
    return { success: false, error: 'Subscription not found' };
  }

  // Update subscription status to active
  const result = await adminApproveSubscriptionService(subscriptionId);
  
  if (result.success && typedSubscription.account?.user_id) {
    // Send approval email to user
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', typedSubscription.account.user_id)
      .single() as { data: { full_name: string; email: string } | null; error: any };

    if (userProfile?.email) {
      await emailService.sendEmail({
        to: userProfile.email,
        subject: 'Your PropertyLedge Subscription Has Been Activated',
        templateType: 'subscription_accepted',
        variables: {
          userName: userProfile.full_name || 'Customer',
          planName: typedSubscription.plan?.name || 'Landlord',
          effectiveDate: new Date().toISOString(),
          appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        },
      });
    }
  }

  return result;
}

export async function handleRejectSubscription(subscriptionId: string, reason?: string) {
  await requireAdmin();
  
  // Get subscription details before updating
  const supabase = await createAdminClient();
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(`
      *,
      account:account_context!subscriptions_account_id_fkey(user_id),
      plan:subscription_plans!subscriptions_plan_id_fkey(name, price_cents)
    `)
    .eq('id', subscriptionId)
    .single();

  const typedSubscription = subscription as SubscriptionWithRelations | null;

  if (!typedSubscription) {
    return { success: false, error: 'Subscription not found' };
  }

  // Update subscription status to rejected
  const result = await adminRejectSubscriptionService(subscriptionId);
  
  if (result.success && typedSubscription.account?.user_id) {
    // Send rejection email to user
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', typedSubscription.account.user_id)
      .single() as { data: { full_name: string; email: string } | null; error: any };

    if (userProfile?.email) {
      await emailService.sendEmail({
        to: userProfile.email,
        subject: 'Your PropertyLedge Subscription Request Was Not Approved',
        templateType: 'subscription_rejected',
        variables: {
          userName: userProfile.full_name || 'Customer',
          planName: typedSubscription.plan?.name || 'Landlord',
          reason: reason || 'The administration team was unable to verify your payment.',
          supportUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/support`,
        },
      });
    }
  }

  return result;
}
