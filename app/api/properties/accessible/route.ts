import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

interface UserPropertyAccess {
  propertyId: string;
  propertyName: string;
  role: 'owner' | 'manager' | 'agent' | 'staff' | 'viewer';
  status: 'invited' | 'active' | 'suspended' | 'removed';
  organizationId: string;
  organizationName: string;
}

interface OwnedProperty {
  id: string;
  name: string;
  workspace_id: string;
}

interface MemberProperty {
  property_id: string;
  role: UserPropertyAccess['role'];
  status: UserPropertyAccess['status'];
  properties: {
    id: string;
    name: string;
    workspace_id: string;
    status: string;
  };
}

interface OrganizationRow {
  id: string;
  name: string;
}

export async function GET() {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createAdminClient();

    const { data: ownedProperties, error: ownedError } = await supabase
      .from('properties')
      .select('id, name, workspace_id')
      .eq('owner_id', user.id)
      .eq('status', 'active');

    if (ownedError) {
      console.error('Error fetching owned properties:', ownedError);
      return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
    }

    const { data: memberProperties, error: memberError } = await supabase
      .from('property_members')
      .select(`
        property_id,
        role,
        status,
        properties!inner (
          id,
          name,
          workspace_id,
          status
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('properties.status', 'active');

    if (memberError) {
      console.error('Error fetching member properties:', memberError);
      return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
    }

    const typedOwnedProperties = (ownedProperties || []) as OwnedProperty[];
    const typedMemberProperties = (memberProperties || []) as MemberProperty[];

    const orgIds = new Set<string>();
    for (const prop of typedOwnedProperties) {
      if (prop.workspace_id) orgIds.add(prop.workspace_id);
    }
    for (const mem of typedMemberProperties) {
      if (mem.properties.workspace_id) orgIds.add(mem.properties.workspace_id);
    }

    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id, name')
      .in('id', Array.from(orgIds));

    const orgMap = new Map(((workspaces || []) as OrganizationRow[]).map(o => [o.id, o.name]));

    const propertyMap = new Map<string, UserPropertyAccess>();

    for (const prop of typedOwnedProperties) {
      propertyMap.set(prop.id, {
        propertyId: prop.id,
        propertyName: prop.name,
        role: 'owner',
        status: 'active',
        organizationId: prop.workspace_id,
        organizationName: orgMap.get(prop.workspace_id) || 'Unknown',
      });
    }

    for (const mem of typedMemberProperties) {
      const prop = mem.properties;
      if (prop && !propertyMap.has(prop.id)) {
        propertyMap.set(prop.id, {
          propertyId: prop.id,
          propertyName: prop.name,
          role: mem.role,
          status: mem.status,
          organizationId: prop.workspace_id,
          organizationName: orgMap.get(prop.workspace_id) || 'Unknown',
        });
      }
    }

    return NextResponse.json({ properties: Array.from(propertyMap.values()) });
  } catch (error) {
    console.error('Error in accessible properties API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}