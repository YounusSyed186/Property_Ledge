'use server';

import {
  createAdminPlan as createAdminPlanService,
  updateAdminPlan as updateAdminPlanService,
  setPlanEntitlement as setPlanEntitlementService,
  removePlanEntitlement as removePlanEntitlementService,
  createAdminEntitlement as createAdminEntitlementService,
  adminUpdateSubscription as adminUpdateSubscriptionService,
} from '@/lib/admin/service';
import {
  getAdminSubscriptions as getAdminSubscriptionsQuery,
  getAdminPlans as getAdminPlansQuery,
  getAdminEntitlements as getAdminEntitlementsQuery,
  getAdminBillingEvents as getAdminBillingEventsQuery,
  getAdminPayments as getAdminPaymentsQuery,
  getAdminUsers as getAdminUsersQuery,
} from '@/lib/admin/queries';
import { getPaymentProofByPaymentId } from '@/lib/billing/service';
import { requireAdmin } from '@/lib/admin/authorization';

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
  return createAdminPlanService(planData);
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
