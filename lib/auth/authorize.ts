import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/queries';
import type { User } from '@supabase/supabase-js';
import type { EntitlementMap } from '@/types/subscriptions';
import { AuthorizationError } from '@/lib/auth/errors';
import {
  getActiveWorkspaceId,
  getEffectiveWorkspacePermissions,
  hasWorkspacePermission,
  type TeamPermission,
} from '@/lib/auth/authorization';
import {
  resolveWorkspaceBilling,
  type WorkspaceBillingContext,
} from '@/lib/entitlements/workspace-billing';
import { getNumericEntitlement, isFeatureEnabled } from '@/lib/entitlements/utils';
import { getWorkspaceSeatUsage } from '@/lib/entitlements/workspace-seats';

export interface WorkspaceMembershipContext {
  id: string;
  roleId: string | null;
  roleName: string | null;
  status: string;
}

export interface AuthorizationContext {
  user: User;
  workspaceId: string;
  workspaceName: string;
  isOwner: boolean;
  membership: WorkspaceMembershipContext | null;
  permissions: string[];
  billing: WorkspaceBillingContext;
  entitlements: EntitlementMap;
}

export interface AuthorizeOptions {
  workspaceId?: string | null;
  permission?: TeamPermission;
  entitlement?: string;
  limit?: {
    key: string;
    currentUsage: number;
    delta?: number;
  };
  /** When true, uses team_members.max seat counting instead of generic limit */
  checkTeamMemberLimit?: boolean;
  /** When true, checks custom_roles.max before custom role creation */
  checkCustomRoleLimit?: boolean;
}

export interface AuthorizeResult {
  allowed: boolean;
  context?: AuthorizationContext;
  error?: AuthorizationError;
}

async function loadMembership(
  workspaceId: string,
  userId: string
): Promise<{
  isOwner: boolean;
  membership: WorkspaceMembershipContext | null;
  workspaceName: string;
}> {
  const supabase = await createClient();
  const { data: ws } = await supabase
    .from('workspaces')
    .select('id, name, owner_id')
    .eq('id', workspaceId)
    .eq('status', 'active')
    .maybeSingle();

  if (!ws) {
    throw new AuthorizationError('NOT_WORKSPACE_MEMBER', 'Workspace not found or inactive.');
  }

  const row = ws as { name: string; owner_id: string };
  const isOwner = row.owner_id === userId;

  if (isOwner) {
    const { data: ownerRole } = await supabase
      .from('team_roles')
      .select('id, name')
      .is('workspace_id', null)
      .ilike('name', 'owner')
      .maybeSingle();

    return {
      isOwner: true,
      workspaceName: row.name,
      membership: {
        id: '',
        roleId: (ownerRole as { id?: string } | null)?.id ?? null,
        roleName: (ownerRole as { name?: string } | null)?.name ?? 'Owner',
        status: 'active',
      },
    };
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id, status, role_id, team_roles(name)')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    throw new AuthorizationError('NOT_WORKSPACE_MEMBER', "You don't have access to this workspace.");
  }

  const m = membership as {
    id: string;
    status: string;
    role_id: string | null;
    team_roles?: { name?: string } | null;
  };

  if (m.status === 'suspended') {
    throw new AuthorizationError('MEMBERSHIP_SUSPENDED', 'Your workspace membership is suspended.');
  }

  if (m.status !== 'active') {
    throw new AuthorizationError('NOT_WORKSPACE_MEMBER', "You don't have access to this workspace.");
  }

  return {
    isOwner: false,
    workspaceName: row.name,
    membership: {
      id: m.id,
      roleId: m.role_id,
      roleName: m.team_roles?.name ?? null,
      status: m.status,
    },
  };
}

export async function buildAuthorizationContext(
  workspaceId: string,
  user?: User | null
): Promise<AuthorizationContext> {
  const resolvedUser = user ?? (await getCurrentUser());
  if (!resolvedUser) {
    throw new AuthorizationError('NOT_AUTHENTICATED', 'You must be signed in.');
  }

  const billing = await resolveWorkspaceBilling(workspaceId);
  const { isOwner, membership, workspaceName } = await loadMembership(
    workspaceId,
    resolvedUser.id
  );
  const permissions = await getEffectiveWorkspacePermissions(workspaceId, resolvedUser.id);

  return {
    user: resolvedUser,
    workspaceId,
    workspaceName,
    isOwner,
    membership,
    permissions,
    billing,
    entitlements: billing.entitlements,
  };
}

export async function authorize(options: AuthorizeOptions): Promise<AuthorizeResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        allowed: false,
        error: new AuthorizationError('NOT_AUTHENTICATED', 'You must be signed in.'),
      };
    }

    const workspaceId = options.workspaceId ?? (await getActiveWorkspaceId());
    if (!workspaceId) {
      return {
        allowed: false,
        error: new AuthorizationError('NOT_WORKSPACE_MEMBER', 'No workspace selected.'),
      };
    }

    const context = await buildAuthorizationContext(workspaceId, user);

    if (options.permission) {
      const hasPerm = context.permissions.includes(options.permission)
        || (await hasWorkspacePermission(workspaceId, options.permission, user.id));
      if (!hasPerm) {
        return {
          allowed: false,
          error: new AuthorizationError(
            'PERMISSION_DENIED',
            `Missing permission: ${options.permission}`,
            { permission: options.permission }
          ),
        };
      }
    }

    if (options.entitlement) {
      const enabled = isFeatureEnabled(context.entitlements, options.entitlement);
      if (!enabled) {
        return {
          allowed: false,
          error: new AuthorizationError(
            'FEATURE_NOT_INCLUDED',
            `Feature not included: ${options.entitlement}`,
            { entitlement: options.entitlement }
          ),
        };
      }
    }

    if (options.checkTeamMemberLimit) {
      const usage = await getWorkspaceSeatUsage(workspaceId);
      if (usage.remaining <= 0) {
        return {
          allowed: false,
          error: new AuthorizationError(
            'LIMIT_REACHED',
            `You've reached your team member limit (${usage.current} of ${usage.limit}).`,
            { limit: usage.limit, current: usage.current, key: 'team_members.max' }
          ),
        };
      }
    }

    if (options.checkCustomRoleLimit) {
      const supabase = await createClient();
      const { data: count } = await supabase.rpc(
        'count_workspace_custom_roles' as never,
        { p_workspace_id: workspaceId } as never
      );
      const current = Number(count ?? 0);
      const max = getNumericEntitlement(context.entitlements, 'custom_roles.max');
      if (current >= max) {
        return {
          allowed: false,
          error: new AuthorizationError(
            'LIMIT_REACHED',
            `You've reached your custom role limit (${current} of ${max}).`,
            { limit: max, current, key: 'custom_roles.max' }
          ),
        };
      }
    }

    if (options.limit) {
      const max = getNumericEntitlement(context.entitlements, options.limit.key);
      const delta = options.limit.delta ?? 1;
      const projected = options.limit.currentUsage + delta;
      if (projected > max) {
        return {
          allowed: false,
          error: new AuthorizationError(
            'LIMIT_REACHED',
            `You've reached your plan limit (${options.limit.currentUsage} of ${max}).`,
            {
              key: options.limit.key,
              limit: max,
              current: options.limit.currentUsage,
            }
          ),
        };
      }
    }

    return { allowed: true, context };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { allowed: false, error };
    }
    throw error;
  }
}

export async function authorizeOrThrow(options: AuthorizeOptions): Promise<AuthorizationContext> {
  const result = await authorize(options);
  if (!result.allowed || !result.context) {
    throw result.error ?? new AuthorizationError('PERMISSION_DENIED', 'Access denied.');
  }
  return result.context;
}

export async function canAccess(
  workspaceId: string,
  permission: TeamPermission
): Promise<boolean> {
  const result = await authorize({ workspaceId, permission });
  return result.allowed;
}

export async function hasWorkspaceEntitlement(
  workspaceId: string,
  entitlementKey: string
): Promise<boolean> {
  const billing = await resolveWorkspaceBilling(workspaceId);
  return isFeatureEnabled(billing.entitlements, entitlementKey);
}
