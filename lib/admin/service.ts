import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from './authorization';

export async function recordAdminAudit(
  adminUserId: string,
  action: string,
  targetType: string,
  targetId: string | null = null,
  metadata: Record<string, unknown> = {}
) {
  try {
    const supabase = await createClient();
    await (supabase as any).from('admin_audit_logs').insert({
      admin_user_id: adminUserId,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Failed to record admin audit log:', e);
  }
}

export async function createAdminPlan(planData: {
  name: string;
  slug: string;
  description?: string;
  status?: 'active' | 'inactive' | 'archived';
  display_order?: number;
  price_cents?: number;
  billing_interval?: 'monthly' | 'yearly';
}) {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('subscription_plans')
    .insert({
      name: planData.name,
      slug: planData.slug,
      description: planData.description || null,
      status: planData.status || 'active',
      display_order: planData.display_order || 0,
      price_cents: planData.price_cents || 0,
      billing_interval: planData.billing_interval || 'monthly',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await recordAdminAudit(adminId, 'ADMIN_PLAN_CREATED', 'subscription_plan', data.id, { slug: data.slug });
  return data;
}

export async function updateAdminPlan(
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
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('subscription_plans')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await recordAdminAudit(adminId, 'ADMIN_PLAN_UPDATED', 'subscription_plan', planId, updates);
  return data;
}

export async function setPlanEntitlement(planId: string, entitlementId: string, value: unknown) {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('plan_entitlements')
    .upsert({
      plan_id: planId,
      entitlement_id: entitlementId,
      value: JSON.stringify(value),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'plan_id,entitlement_id' })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await recordAdminAudit(adminId, 'ADMIN_PLAN_ENTITLEMENT_UPDATED', 'plan_entitlement', data.id, { planId, entitlementId, value });
  return data;
}

export async function removePlanEntitlement(planId: string, entitlementId: string) {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from('plan_entitlements')
    .delete()
    .eq('plan_id', planId)
    .eq('entitlement_id', entitlementId);

  if (error) throw new Error(error.message);

  await recordAdminAudit(adminId, 'ADMIN_PLAN_ENTITLEMENT_REMOVED', 'plan_entitlement', null, { planId, entitlementId });
  return true;
}

export async function createAdminEntitlement(entitlementData: {
  key: string;
  name: string;
  description?: string;
  value_type: 'boolean' | 'number' | 'string';
}) {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('entitlements')
    .insert({
      key: entitlementData.key,
      name: entitlementData.name,
      description: entitlementData.description || null,
      value_type: entitlementData.value_type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await recordAdminAudit(adminId, 'ADMIN_ENTITLEMENT_CREATED', 'entitlement', data.id, { key: data.key });
  return data;
}

export async function adminUpdateSubscription(
  subscriptionId: string,
  updates: Partial<{
    plan_id: string;
    status: 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled' | 'expired';
    cancel_at_period_end: boolean;
  }>
) {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('subscriptions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await recordAdminAudit(adminId, 'ADMIN_SUBSCRIPTION_UPDATED', 'subscription', subscriptionId, updates);
  return data;
}
