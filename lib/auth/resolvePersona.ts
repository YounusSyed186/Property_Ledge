import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin/authorization';
import type { Persona } from '@/lib/auth/permissions';

export type { Persona };

export interface PersonaContext {
  persona: Persona;
  workspaceRole?: string | null;
}

export async function getPersonaForUser(userId: string): Promise<PersonaContext> {
  if (await isAdmin(userId)) {
    return { persona: 'platform_admin' };
  }

  const supabase = await createClient();

  const { data: workspaceMembership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const typedMembership = workspaceMembership as { role: string } | null;

  if (typedMembership?.role) {
    const role = typedMembership.role as Persona;
    if (['owner', 'admin', 'manager', 'agent', 'staff', 'viewer'].includes(role)) {
      return { persona: role, workspaceRole: role };
    }
  }

  const { data: ownedWorkspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (ownedWorkspace) {
    return { persona: 'owner', workspaceRole: 'owner' };
  }

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
      return { persona: role, workspaceRole: role };
    }
  }

  return { persona: 'owner', workspaceRole: null };
}

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
