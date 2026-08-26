import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from './authorization';

export async function getAdminOverviewMetrics() {
  await requireAdmin();
  const supabase = await createAdminClient();

  const [accountsRes, subsRes, plansRes] = await Promise.all([
    (supabase as any).from('profiles').select('*', { count: 'exact', head: true }),
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
  limit = 50,
  search = '',
  status = 'all',
}: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  await requireAdmin();
  const supabase = await createAdminClient();

  let query = (supabase as any)
    .from('subscriptions')
    .select('*, subscription_plans(*)', { count: 'exact' });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data: subs, count, error } = await query;
  if (error || !subs) {
    console.error('getAdminSubscriptions error:', error);
    return { data: [], total: 0, page, limit, totalPages: 0 };
  }

  // Fetch auth users to get exact emails
  const { data: authUsersRes } = await supabase.auth.admin.listUsers();
  const authUsersMap = new Map();
  if (authUsersRes?.users) {
    authUsersRes.users.forEach((u) => authUsersMap.set(u.id, u));
  }

  const accountIds = Array.from(new Set(subs.map((s: any) => s.account_id).filter(Boolean)));
  let profileMap = new Map();
  if (accountIds.length > 0) {
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select('*')
      .in('id', accountIds);

    if (profiles) {
      profiles.forEach((p: any) => profileMap.set(p.id, p));
    }
  }

  const formattedData = subs.map((s: any) => {
    const profile = profileMap.get(s.account_id);
    const authUser = authUsersMap.get(s.account_id);

    return {
      ...s,
      account_context: {
        id: s.account_id,
        user_id: s.account_id,
        profiles: {
          full_name: profile?.full_name || authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'Customer Account',
          email: authUser?.email || profile?.email || 'customer@propertyledge.com.au',
        },
      },
    };
  });

  return {
    data: formattedData,
    total: count || formattedData.length,
    page,
    limit,
    totalPages: Math.ceil((count || formattedData.length) / limit),
  };
}

export async function getAdminSubscriptionById(subscriptionId: string) {
  await requireAdmin();
  const supabase = await createAdminClient();

  const { data: sub, error } = await (supabase as any)
    .from('subscriptions')
    .select('*, subscription_plans(*)')
    .eq('id', subscriptionId)
    .single();

  if (error || !sub) return null;

  const { data: authUser } = await supabase.auth.admin.getUserById(sub.account_id);
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('*')
    .eq('id', sub.account_id)
    .maybeSingle();

  return {
    ...sub,
    account_context: {
      id: sub.account_id,
      user_id: sub.account_id,
      profiles: {
        full_name: profile?.full_name || authUser?.user?.user_metadata?.full_name || 'Customer Account',
        email: authUser?.user?.email || 'customer@propertyledge.com.au',
      },
    },
  };
}

export async function getAdminPlans() {
  await requireAdmin();
  const supabase = await createAdminClient();

  const { data, error } = await (supabase as any)
    .from('subscription_plans')
    .select('*, plan_entitlements(*, entitlements(*))')
    .order('display_order', { ascending: true });

  if (error) return [];
  return data || [];
}

export async function getAdminPlanById(planId: string) {
  await requireAdmin();
  const supabase = await createAdminClient();

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
  const supabase = await createAdminClient();

  const { data, error } = await (supabase as any)
    .from('entitlements')
    .select('*')
    .order('key', { ascending: true });

  if (error) return [];
  return data || [];
}

export async function getAdminBillingEvents({ page = 1, limit = 50 }: { page?: number; limit?: number }) {
  await requireAdmin();
  const supabase = await createAdminClient();

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

export async function getAdminUsers({
  page = 1,
  limit = 50,
  search = '',
  status = 'all',
}: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
} = {}) {
  await requireAdmin();
  const supabase = await createAdminClient();

  // Fetch real auth users from Supabase Auth admin API
  const { data: authUsersRes, error: authErr } = await supabase.auth.admin.listUsers();
  const authUsers = authUsersRes?.users || [];

  const { data: profiles } = await (supabase as any)
    .from('profiles')
    .select('*');

  let profileMap = new Map();
  if (profiles) {
    profiles.forEach((p: any) => profileMap.set(p.id, p));
  }

  let contextMap = new Map();
  try {
    const { data: contexts } = await (supabase as any)
      .from('account_context')
      .select('*, subscriptions(id, status, plan_id, subscription_plans(name, slug))');

    if (contexts) {
      contexts.forEach((c: any) => contextMap.set(c.user_id, c));
    }
  } catch (ctxErr) {
    console.warn('getAdminUsers context error:', ctxErr);
  }

  const adminIds = new Set<string>();
  try {
    const { data: admins } = await (supabase as any)
      .from('platform_admins')
      .select('user_id')
      .eq('status', 'active');
    (admins || []).forEach((row: { user_id: string }) => adminIds.add(row.user_id));
  } catch (adminErr) {
    console.warn('getAdminUsers platform_admins error:', adminErr);
  }

  const combined = authUsers.map((u: any) => {
    const profile = profileMap.get(u.id);
    const ctx = contextMap.get(u.id);

    return {
      id: u.id,
      email: u.email || '—',
      full_name: profile?.full_name || u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
      phone: profile?.phone || u.phone || u.user_metadata?.phone || '—',
      role: adminIds.has(u.id) ? 'admin' : undefined,
      user_metadata: u.user_metadata,
      app_metadata: u.app_metadata,
      created_at: profile?.created_at || u.created_at,
      updated_at: profile?.updated_at || u.updated_at || u.last_sign_in_at,
      account_context: ctx ? [ctx] : [],
    };
  });

  return {
    data: combined,
    total: combined.length,
    page: 1,
    limit: 50,
    totalPages: 1,
  };
}

export async function getAdminPayments({
  page = 1,
  limit = 50,
  status = 'all',
}: {
  page?: number;
  limit?: number;
  status?: string;
} = {}) {
  await requireAdmin();
  const supabase = await createAdminClient();

  let query = (supabase as any)
    .from('subscription_payments')
    .select('*, subscriptions!fk_subscription_payments_sub_account(*, subscription_plans(*))', { count: 'exact' });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data: payments, count, error } = await query;
  if (error || !payments) {
    console.error('getAdminPayments error:', error);
    return { data: [], total: 0, page, limit, totalPages: 0 };
  }

  const { data: authUsersRes } = await supabase.auth.admin.listUsers();
  const authUsersMap = new Map();
  if (authUsersRes?.users) {
    authUsersRes.users.forEach((u) => authUsersMap.set(u.id, u));
  }

  const accountIds = Array.from(new Set(payments.map((p: any) => p.account_id).filter(Boolean)));
  let profileMap = new Map();
  if (accountIds.length > 0) {
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select('*')
      .in('id', accountIds);

    if (profiles) {
      profiles.forEach((pr: any) => profileMap.set(pr.id, pr));
    }
  }

  const formattedData = payments.map((p: any) => {
    const profile = profileMap.get(p.account_id);
    const authUser = authUsersMap.get(p.account_id);

    return {
      ...p,
      account_context: {
        id: p.account_id,
        user_id: p.account_id,
        profiles: {
          full_name: profile?.full_name || authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'Customer Account',
          email: authUser?.email || profile?.email || 'customer@propertyledge.com.au',
        },
      },
    };
  });

  return {
    data: formattedData,
    total: count || formattedData.length,
    page,
    limit,
    totalPages: Math.ceil((count || formattedData.length) / limit),
  };
}

export async function getAdminWorkspaces() {
  await requireAdmin();
  const supabase = await createAdminClient();

  const { data: workspaces, error } = await (supabase as any)
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !workspaces) {
    console.error('getAdminWorkspaces error:', error?.message ?? error);
    return [];
  }

  const ownerIds = Array.from(new Set(workspaces.map((w: { owner_id: string }) => w.owner_id).filter(Boolean)));
  const profileMap = new Map<string, { full_name: string | null }>();
  if (ownerIds.length > 0) {
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select('id, full_name')
      .in('id', ownerIds);
    (profiles || []).forEach((profile: { id: string; full_name: string | null }) => {
      profileMap.set(profile.id, profile);
    });
  }

  const memberCountMap = new Map<string, number>();
  const { data: members } = await (supabase as any)
    .from('workspace_members')
    .select('workspace_id');
  (members || []).forEach((member: { workspace_id: string }) => {
    memberCountMap.set(member.workspace_id, (memberCountMap.get(member.workspace_id) || 0) + 1);
  });

  const authUsersMap = new Map<string, { email?: string; user_metadata?: { full_name?: string } }>();
  const { data: authUsersRes } = await supabase.auth.admin.listUsers();
  (authUsersRes?.users || []).forEach((user) => authUsersMap.set(user.id, user));

  return workspaces.map((workspace: {
    id: string;
    name: string;
    slug: string;
    owner_id: string;
    status: string;
    created_at: string;
    updated_at: string;
  }) => {
    const profile = profileMap.get(workspace.owner_id);
    const authUser = authUsersMap.get(workspace.owner_id);

    return {
      ...workspace,
      owner: {
        full_name:
          profile?.full_name ||
          authUser?.user_metadata?.full_name ||
          authUser?.email?.split('@')[0] ||
          'Unknown',
        email: authUser?.email || '',
      },
      member_count: memberCountMap.get(workspace.id) || 0,
    };
  });
}

export async function getAdminAuditLogs({ page = 1, limit = 50 }: { page?: number; limit?: number } = {}) {
  await requireAdmin();
  const supabase = await createAdminClient();

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
