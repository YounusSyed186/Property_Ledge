import { createClient } from '@/lib/supabase/server';
import { getEntitlements } from './queries';
import type { EntitlementMap } from '@/types/subscriptions';
import { getNumericEntitlement, isFeatureEnabled } from './utils';

export { isFeatureEnabled, getNumericEntitlement };

export interface WorkspaceBillingContext {
  workspaceId: string;
  billingAccountId: string;
  ownerId: string;
  entitlements: EntitlementMap;
}

/**
 * Subscriptions are account-scoped. Workspace billing resolves through workspace.owner_id.
 */
export async function getWorkspaceBillingAccountId(workspaceId: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !data) {
    throw new Error('Workspace not found');
  }

  return (data as { owner_id: string }).owner_id;
}

export async function resolveWorkspaceBilling(
  workspaceId: string,
  knownOwnerId?: string
): Promise<WorkspaceBillingContext> {
  const ownerId = knownOwnerId ?? (await getWorkspaceBillingAccountId(workspaceId));
  const entitlements = await getEntitlements(ownerId);

  return {
    workspaceId,
    billingAccountId: ownerId,
    ownerId,
    entitlements,
  };
}

export function getEntitlementFromMap(
  entitlements: EntitlementMap,
  key: string
): boolean | number | string | null {
  return entitlements[key] ?? null;
}
