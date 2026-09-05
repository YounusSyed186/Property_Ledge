import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAdmin } from './authorization';
import type {
  AdminActivityLogRow,
  AdminEntitlementRow,
  AdminPlatformRoleRow,
  AdminSystemTeamRoleRow,
} from './types';

export type {
  AdminActivityLogRow,
  AdminEntitlementRow,
  AdminPlatformRoleRow,
  AdminSystemTeamRoleRow,
} from './types';

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
  const profileMap = new Map();
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

  const profileMap = new Map();
  if (profiles) {
    profiles.forEach((p: any) => profileMap.set(p.id, p));
  }

  const contextMap = new Map();
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
  const profileMap = new Map();
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

export async function getAdminActivityLogs(limit = 500): Promise<AdminActivityLogRow[]> {
  await requireAdmin();
  const supabase = await createAdminClient();

  const { data: logs, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  const logItems = (logs || []) as any[];
  if (!logItems.length) return [];

  const userIds = [...new Set(logItems.map((l) => l.user_id).filter(Boolean))] as string[];
  const workspaceIds = [...new Set(logItems.map((l) => l.workspace_id).filter(Boolean))] as string[];
  const propertyIds = [...new Set(logItems.map((l) => l.property_id).filter(Boolean))] as string[];

  const [{ data: profiles }, { data: workspaces }, { data: properties }, { data: authUsersRes }] =
    await Promise.all([
      userIds.length
        ? supabase.from('profiles').select('id, full_name, public_id').in('id', userIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null; public_id: string | null }[] }),
      workspaceIds.length
        ? supabase.from('workspaces').select('id, name').in('id', workspaceIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      propertyIds.length
        ? supabase.from('properties').select('id, name').in('id', propertyIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      supabase.auth.admin.listUsers({ perPage: 1000 }),
    ]);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
  const workspaceMap = new Map((workspaces || []).map((w) => [w.id, w]));
  const propertyMap = new Map((properties || []).map((p) => [p.id, p]));
  const authUserMap = new Map((authUsersRes?.users || []).map((u) => [u.id, u]));

  return logItems.map((log: any) => {
    const profile = log.user_id ? profileMap.get(log.user_id) : undefined;
    const authUser = log.user_id ? authUserMap.get(log.user_id) : undefined;
    return {
      ...log,
      metadata: (log.metadata as Record<string, unknown>) || {},
      user: {
        full_name:
          profile?.full_name ||
          (authUser?.user_metadata?.full_name as string | undefined) ||
          'System',
        email: authUser?.email || profile?.public_id || '',
      },
      property: { name: (log.property_id && propertyMap.get(log.property_id)?.name) || 'N/A' },
      workspace: { name: (log.workspace_id && workspaceMap.get(log.workspace_id)?.name) || 'N/A' },
    };
  });
}

// ---------------------------------------------------------------------------
// Admin configuration queries (entitlements, platform roles, team roles)
// ---------------------------------------------------------------------------

export async function getAdminEntitlementsWithUsage(): Promise<AdminEntitlementRow[]> {
  await requireAdmin();
  const supabase = await createAdminClient();

  const { data: entitlements, error } = await (supabase as any)
    .from('entitlements')
    .select('*')
    .order('name', { ascending: true });

  if (error || !entitlements) return [];

  const { data: planLinks } = await (supabase as any)
    .from('plan_entitlements')
    .select('entitlement_id, subscription_plans(name)');

  const usageMap = new Map<string, string[]>();
  (planLinks || []).forEach((link: { entitlement_id: string; subscription_plans?: { name: string } }) => {
    const names = usageMap.get(link.entitlement_id) || [];
    if (link.subscription_plans?.name) names.push(link.subscription_plans.name);
    usageMap.set(link.entitlement_id, names);
  });

  return entitlements.map((e: AdminEntitlementRow) => {
    const planNames = usageMap.get(e.id) || [];
    return {
      ...e,
      planCount: planNames.length,
      planNames,
    };
  });
}

export async function getAdminEntitlementDetail(entitlementId: string) {
  await requireAdmin();
  const supabase = await createAdminClient();

  const { data: entitlement, error } = await (supabase as any)
    .from('entitlements')
    .select('*')
    .eq('id', entitlementId)
    .single();

  if (error || !entitlement) return null;

  const { data: planLinks } = await (supabase as any)
    .from('plan_entitlements')
    .select('value, subscription_plans(id, name, slug)')
    .eq('entitlement_id', entitlementId);

  return {
    ...entitlement,
    plans: (planLinks || []).map((pl: { value: unknown; subscription_plans: { id: string; name: string; slug: string } }) => ({
      id: pl.subscription_plans.id,
      name: pl.subscription_plans.name,
      slug: pl.subscription_plans.slug,
      value: pl.value,
      displayValue: formatEntitlementValueForQuery(entitlement.value_type, pl.value),
    })),
    planCount: (planLinks || []).length,
  };
}

function formatEntitlementValueForQuery(valueType: string, rawValue: unknown): string {
  if (rawValue === null || rawValue === undefined) return '—';
  let parsed = rawValue;
  if (typeof rawValue === 'string') {
    try { parsed = JSON.parse(rawValue); } catch { parsed = rawValue; }
  }
  if (valueType === 'boolean') {
    return parsed === true || parsed === 'true' || parsed === 1 ? 'Enabled' : 'Disabled';
  }
  return String(parsed);
}

export async function getAdminPlatformRolesWithStats(): Promise<AdminPlatformRoleRow[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_get_platform_roles_with_stats' as never);
  if (error) {
    const admin = await createAdminClient();
    const { data: roles } = await (admin as any).from('platform_roles').select('*').order('name');
    return (roles || []).map((r: AdminPlatformRoleRow) => ({
      ...r,
      permission_count: 0,
      user_count: 0,
    }));
  }
  return (data as AdminPlatformRoleRow[]).map((r) => ({
    ...r,
    permission_count: Number(r.permission_count),
    user_count: Number(r.user_count),
  }));
}

export async function getAdminPlatformRoleDetail(roleId: string) {
  await requireAdmin();
  const supabase = await createAdminClient();

  const { data: role } = await (supabase as any)
    .from('platform_roles')
    .select('*')
    .eq('id', roleId)
    .single();

  if (!role) return null;

  const { data: perms } = await (supabase as any)
    .from('platform_role_permissions')
    .select('permissions(key, name, resource, action, description)')
    .eq('role_id', roleId);

  const { count: userCount } = await (supabase as any)
    .from('platform_user_roles')
    .select('*', { count: 'exact', head: true })
    .eq('role_id', roleId);

  return {
    ...role,
    permissions: (perms || []).map((p: { permissions: { key: string; name: string; resource: string; action: string; description: string | null } }) => p.permissions),
    userCount: userCount || 0,
  };
}

export async function getAdminSystemTeamRolesWithStats(): Promise<AdminSystemTeamRoleRow[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_get_system_team_roles_with_stats' as never);
  if (error) {
    const admin = await createAdminClient();
    const { data: roles } = await (admin as any)
      .from('team_roles')
      .select('*')
      .is('workspace_id', null)
      .eq('is_system_role', true)
      .order('name');
    return (roles || []).map((r: AdminSystemTeamRoleRow) => ({
      ...r,
      permission_count: 0,
      member_count: 0,
      workspace_count: 0,
    }));
  }
  return (data as AdminSystemTeamRoleRow[]).map((r) => ({
    ...r,
    permission_count: Number(r.permission_count),
    member_count: Number(r.member_count),
    workspace_count: Number(r.workspace_count),
  }));
}

export async function getAdminSystemTeamRoleDetail(roleId: string) {
  await requireAdmin();
  const supabase = await createAdminClient();

  const { data: role } = await (supabase as any)
    .from('team_roles')
    .select('*')
    .eq('id', roleId)
    .is('workspace_id', null)
    .single();

  if (!role) return null;

  const { data: perms } = await (supabase as any)
    .from('team_role_permissions')
    .select('permissions(key, name, resource, action, description)')
    .eq('role_id', roleId);

  const { count: memberCount } = await (supabase as any)
    .from('workspace_members')
    .select('*', { count: 'exact', head: true })
    .eq('role_id', roleId)
    .eq('status', 'active');

  return {
    ...role,
    permissions: (perms || []).map((p: { permissions: { key: string; name: string; resource: string; action: string } }) => p.permissions),
    memberCount: memberCount || 0,
  };
}

export async function getPlatformPermissionsCatalog() {
  await requireAdmin();
  const supabase = await createAdminClient();
  const { data, error } = await (supabase as any)
    .from('permissions')
    .select('key, name, resource, action, description')
    .eq('scope', 'PLATFORM')
    .order('resource')
    .order('action');
  if (error) return [];
  return data as Array<{ key: string; name: string; resource: string; action: string; description: string | null }>;
}

export async function getTeamPermissionsCatalog() {
  await requireAdmin();
  const supabase = await createAdminClient();
  const { data, error } = await (supabase as any)
    .from('permissions')
    .select('key, name, resource, action, description')
    .eq('scope', 'TEAM')
    .order('resource')
    .order('action');
  if (error) return [];
  return data as Array<{ key: string; name: string; resource: string; action: string; description: string | null }>;
}

export async function getAdminPlatformRolesMatrixData() {
  await requireAdmin();
  const supabase = await createAdminClient();
  const [permissions, roles, permsRes] = await Promise.all([
    getPlatformPermissionsCatalog(),
    getAdminPlatformRolesWithStats(),
    (supabase as any)
      .from('platform_role_permissions')
      .select('role_id, permissions(key)'),
  ]);

  const rolePermissions: Record<string, string[]> = {};
  roles.forEach((r) => {
    rolePermissions[r.id] = [];
  });

  if (permsRes?.data) {
    permsRes.data.forEach((row: any) => {
      const roleId = row.role_id;
      const permKey = row.permissions?.key;
      if (roleId && permKey) {
        if (!rolePermissions[roleId]) rolePermissions[roleId] = [];
        rolePermissions[roleId].push(permKey);
      }
    });
  }

  return { permissions, roles, rolePermissions };
}

export async function getAdminSystemTeamRolesMatrixData() {
  await requireAdmin();
  const supabase = await createAdminClient();
  const [permissions, roles, permsRes] = await Promise.all([
    getTeamPermissionsCatalog(),
    getAdminSystemTeamRolesWithStats(),
    (supabase as any)
      .from('team_role_permissions')
      .select('role_id, permissions(key)'),
  ]);

  const rolePermissions: Record<string, string[]> = {};
  roles.forEach((r) => {
    rolePermissions[r.id] = [];
  });

  if (permsRes?.data) {
    const roleIdSet = new Set(roles.map((r) => r.id));
    permsRes.data.forEach((row: any) => {
      const roleId = row.role_id;
      const permKey = row.permissions?.key;
      if (roleId && permKey && roleIdSet.has(roleId)) {
        if (!rolePermissions[roleId]) rolePermissions[roleId] = [];
        rolePermissions[roleId].push(permKey);
      }
    });
  }

  return { permissions, roles, rolePermissions };
}

