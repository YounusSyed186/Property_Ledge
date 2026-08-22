import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from './authorization';

export async function getAdminOverviewMetrics() {
  await requireAdmin();
  const supabase = await createClient();

  const [accountsRes, subsRes, plansRes] = await Promise.all([
    (supabase as any).from('account_context').select('*', { count: 'exact', head: true }),
    (supabase as any).from('subscriptions').select('status'),
    (supabase as any).from('subscription_plans').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  const totalAccounts = accountsRes.count || 0;
  const totalPlans = plansRes.count || 0;

  const subs = subsRes.data || [];
  const activeCount = subs.filter((s: any) => s.status === 'active').length;
  const trialingCount = subs.filter((s: any) => s.status === 'trialing').length;
  const pastDueCount = subs.filter((s: any) => s.status === 'past_due').length;
  const canceledCount = subs.filter((s: any) => s.status === 'canceled').length;

  return {
    totalAccounts,
    activeSubscriptions: activeCount,
    trialingSubscriptions: trialingCount,
    pastDueSubscriptions: pastDueCount,
    canceledSubscriptions: canceledCount,
    availablePlans: totalPlans,
  };
}

export async function getAdminSubscriptions({
  page = 1,
  limit = 10,
  search = '',
  status = 'all',
}: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  await requireAdmin();
  const supabase = await createClient();

  let query = (supabase as any)
    .from('subscriptions')
    .select('*, subscription_plans(*), account_context!inner(*, profiles:user_id(*))', { count: 'exact' });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  return {
    data: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function getAdminSubscriptionById(subscriptionId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('subscriptions')
    .select('*, subscription_plans(*), account_context!inner(*, profiles:user_id(*))')
    .eq('id', subscriptionId)
    .single();

  if (error) return null;
  return data;
}

export async function getAdminPlans() {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('subscription_plans')
    .select('*, plan_entitlements(*, entitlements(*))')
    .order('display_order', { ascending: true });

  if (error) return [];
  return data || [];
}

export async function getAdminPlanById(planId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('subscription_plans')
    .select('*, plan_entitlements(*, entitlements(*))')
    .eq('id', planId)
    .single();

  if (error) return null;
  return data;
}

export async function getAdminEntitlements() {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('entitlements')
    .select('*')
    .order('key', { ascending: true });

  if (error) return [];
  return data || [];
}

export async function getAdminBillingEvents({ page = 1, limit = 10 }: { page?: number; limit?: number }) {
  await requireAdmin();
  const supabase = await createClient();

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await (supabase as any)
    .from('subscription_events')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    data: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function getAdminAuditLogs({ page = 1, limit = 10 }: { page?: number; limit?: number }) {
  await requireAdmin();
  const supabase = await createClient();

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await (supabase as any)
    .from('admin_audit_logs')
    .select('*, profiles:admin_user_id(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    data: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}
