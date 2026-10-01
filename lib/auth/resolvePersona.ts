import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin/authorization';
import type { Persona } from '@/lib/auth/permissions';

export type { Persona };

export interface PersonaContext {
  persona: Persona;
  workspaceRole?: string | null;
}

function mapTeamRoleNameToPersona(roleName: string | null | undefined): Persona | null {
  if (!roleName) return null;
  const normalized = roleName.toLowerCase();
  switch (normalized) {
    case 'owner':
      return 'owner';
    case 'admin':
      return 'admin';
    case 'manager':
      return 'manager';
    case 'leasing agent':
      return 'agent';
    case 'staff':
      return 'staff';
    case 'viewer':
    case 'landlord':
      return 'viewer';
    default:
      return 'viewer';
  }
}

import { serverCache } from '@/lib/cache/server-cache';

export const getPersonaForUser = cache(async function getPersonaForUser(userId: string): Promise<PersonaContext> {
  const cacheKey = `user:${userId}:persona`;
  const cached = serverCache.get<PersonaContext>(cacheKey);
  if (cached) {
    return cached;
  }

  if (await isAdmin(userId)) {
    const res: PersonaContext = { persona: 'platform_admin' };
    serverCache.set(cacheKey, res, 60_000);
    return res;
  }

  const supabase = await createClient();

  const { data: ownedWorkspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  let result: PersonaContext = { persona: 'owner', workspaceRole: null };

  if (ownedWorkspace) {
    result = { persona: 'owner', workspaceRole: 'owner' };
  } else {
    const { data: workspaceMembership } = await supabase
      .from('workspace_members')
      .select('role_id, team_roles(name)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const membership = workspaceMembership as {
      role_id?: string | null;
      team_roles?: { name?: string } | null;
    } | null;

    const roleName = membership?.team_roles?.name ?? null;
    const persona = mapTeamRoleNameToPersona(roleName);
    if (persona) {
      result = { persona, workspaceRole: roleName?.toLowerCase() ?? null };
    } else {
      const { data: propertyMembership } = await supabase
        .from('property_members')
        .select('role')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const typedPropertyMembership = propertyMembership as { role: string } | null;

      if (typedPropertyMembership?.role) {
        const role = typedPropertyMembership.role as Persona;
        if (['owner', 'manager', 'agent', 'staff', 'viewer'].includes(role)) {
          result = { persona: role, workspaceRole: role };
        }
      }
    }
  }

  serverCache.set(cacheKey, result, 60_000);
  return result;
});

export function getDefaultHomeForPersona(persona: Persona): string {
  switch (persona) {
    case 'platform_admin':
      return '/admin';
    case 'tenant':
      return '/tenant';
    default:
      return '/dashboard';
  }
}
