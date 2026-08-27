import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from './authorization';
import { mapAdminError } from './errors';

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

  const { data: existing } = await (supabase as any)
    .from('entitlements')
    .select('id')
    .eq('key', entitlementData.key)
    .maybeSingle();

  if (existing) {
    throw new Error('An entitlement with this capability already exists.');
  }

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

  if (error) throw new Error(mapAdminError(error.message));

  await recordAdminAudit(adminId, 'ADMIN_ENTITLEMENT_CREATED', 'entitlement', data.id, { key: data.key });
  return data;
}

export async function updateAdminEntitlement(
  entitlementId: string,
  updates: {
    name?: string;
    description?: string;
    key?: string;
    value_type?: 'boolean' | 'number' | 'string';
  }
) {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const { data: existing } = await (supabase as any)
    .from('plan_entitlements')
    .select('id')
    .eq('entitlement_id', entitlementId)
    .limit(1);

  if (existing?.length > 0) {
    if (updates.key !== undefined || updates.value_type !== undefined) {
      throw new Error('PLAN_LINKED: Machine key and value type cannot be changed while assigned to plans.');
    }
  }

  const { data, error } = await (supabase as any)
    .from('entitlements')
    .update({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.key !== undefined && { key: updates.key }),
      ...(updates.value_type !== undefined && { value_type: updates.value_type }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', entitlementId)
    .select()
    .single();

  if (error) throw new Error(mapAdminError(error.message));

  await recordAdminAudit(adminId, 'ADMIN_ENTITLEMENT_UPDATED', 'entitlement', entitlementId, updates);
  return data;
}

export async function deleteAdminEntitlement(entitlementId: string) {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const { data: linked } = await (supabase as any)
    .from('plan_entitlements')
    .select('id')
    .eq('entitlement_id', entitlementId)
    .limit(1);

  if (linked?.length > 0) {
    throw new Error('This entitlement cannot be deleted while it is assigned to plans. Remove it from all plans first.');
  }

  const { error } = await (supabase as any)
    .from('entitlements')
    .delete()
    .eq('id', entitlementId);

  if (error) throw new Error(mapAdminError(error.message));

  await recordAdminAudit(adminId, 'ADMIN_ENTITLEMENT_DELETED', 'entitlement', entitlementId, {});
  return true;
}

export async function createPlatformRole(
  name: string,
  description: string,
  permissionKeys: string[]
) {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    'admin_upsert_platform_role' as never,
    {
      p_role_id: null,
      p_name: name,
      p_description: description,
      p_permission_keys: permissionKeys,
    } as never
  );

  if (error) throw new Error(mapAdminError(error.message));

  await recordAdminAudit(adminId, 'ADMIN_PLATFORM_ROLE_CREATED', 'platform_role', data as string, { name });
  return data as string;
}

export async function updatePlatformRole(
  roleId: string,
  name: string,
  description: string,
  permissionKeys: string[]
) {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    'admin_upsert_platform_role' as never,
    {
      p_role_id: roleId,
      p_name: name,
      p_description: description,
      p_permission_keys: permissionKeys,
    } as never
  );

  if (error) throw new Error(mapAdminError(error.message));

  await recordAdminAudit(adminId, 'ADMIN_PLATFORM_ROLE_UPDATED', 'platform_role', roleId, { name });
  return data as string;
}

export async function deletePlatformRole(roleId: string) {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc(
    'admin_delete_platform_role' as never,
    { p_role_id: roleId } as never
  );

  if (error) throw new Error(mapAdminError(error.message));

  await recordAdminAudit(adminId, 'ADMIN_PLATFORM_ROLE_DELETED', 'platform_role', roleId, {});
  return true;
}

export async function updateSystemTeamRole(
  roleId: string,
  description: string,
  permissionKeys: string[]
) {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc(
    'admin_update_system_team_role' as never,
    {
      p_role_id: roleId,
      p_description: description,
      p_permission_keys: permissionKeys,
    } as never
  );

  if (error) throw new Error(mapAdminError(error.message));

  await recordAdminAudit(adminId, 'ADMIN_SYSTEM_TEAM_ROLE_UPDATED', 'team_role', roleId, {});
  return true;
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

export async function adminApproveSubscription(subscriptionId: string) {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await recordAdminAudit(adminId, 'ADMIN_SUBSCRIPTION_APPROVED', 'subscription', subscriptionId, { status: 'active' });
  return { success: true, data };
}

export async function adminRejectSubscription(subscriptionId: string) {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('subscriptions')
    .update({
      status: 'rejected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await recordAdminAudit(adminId, 'ADMIN_SUBSCRIPTION_REJECTED', 'subscription', subscriptionId, { status: 'rejected' });
  return { success: true, data };
}
