import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { AuthorizationError } from '@/lib/auth/errors';
import { ENTITLEMENT_KEYS } from './types';
import { assertWithinLimit } from './guards';

export interface SeatUsage {
  current: number;
  limit: number;
  remaining: number;
  isOverLimit: boolean;
}

export const getWorkspaceSeatUsage = cache(async function getWorkspaceSeatUsage(
  workspaceId: string
): Promise<SeatUsage> {
  const supabase = await createClient();

  const [{ data: seatCount }, { data: seatLimit }] = await Promise.all([
    supabase.rpc('count_workspace_seats' as never, { p_workspace_id: workspaceId } as never),
    supabase.rpc('get_workspace_seat_limit' as never, { p_workspace_id: workspaceId } as never),
  ]);

  const current = Number(seatCount ?? 0);
  const limit = Number(seatLimit ?? 1);
  const remaining = Math.max(0, limit - current);

  return {
    current,
    limit,
    remaining,
    isOverLimit: current > limit,
  };
});

export async function getTeamMemberUsage(workspaceId: string): Promise<SeatUsage> {
  return getWorkspaceSeatUsage(workspaceId);
}

export async function assertWorkspaceSeatAvailable(workspaceId: string): Promise<SeatUsage> {
  const usage = await getWorkspaceSeatUsage(workspaceId);
  if (usage.remaining <= 0) {
    throw new AuthorizationError(
      'LIMIT_REACHED',
      `You've reached your team member limit (${usage.current} of ${usage.limit}).`,
      { key: ENTITLEMENT_KEYS.TEAM_MEMBERS_MAX, current: usage.current, limit: usage.limit }
    );
  }
  return usage;
}

export async function assertWorkspaceSeatAvailableViaOwner(workspaceId: string, delta = 1) {
  const supabase = await createClient();
  const { data: ws } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .single();

  const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
  if (!ownerId) throw new Error('Workspace not found');

  const usage = await getWorkspaceSeatUsage(workspaceId);
  return assertWithinLimit(ownerId, ENTITLEMENT_KEYS.TEAM_MEMBERS_MAX, usage.current, delta);
}
