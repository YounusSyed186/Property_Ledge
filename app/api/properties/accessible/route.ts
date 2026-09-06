import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

interface UserPropertyAccess {
  propertyId: string;
  propertyName: string;
  role: 'owner' | 'manager' | 'agent' | 'staff' | 'viewer';
  status: 'invited' | 'active' | 'suspended' | 'removed';
  organizationId: string;
  organizationName: string;
}

interface WorkspaceRow {
  id: string;
  name: string;
}

interface WorkspaceMemberRow {
  workspace_id: string;
  role: string;
  status: string;
  workspaces?: {
    id: string;
    name: string;
  } | null;
}

interface PropertyRow {
  id: string;
  name: string | null;
  workspace_id: string;
  status: string | null;
  owner_id: string | null;
}

interface MemberPropertyRow {
  property_id: string;
  role: UserPropertyAccess['role'];
  status: UserPropertyAccess['status'];
  properties: {
    id: string;
    name: string | null;
    workspace_id: string;
    status: string | null;
    owner_id: string | null;
  };
}

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createAdminClient();

    // 1. Get user's active workspaces (both as member and as owner)
    const [{ data: memberWorkspacesData }, { data: ownedWorkspacesData }] = await Promise.all([
      supabase
        .from('workspace_members')
        .select('workspace_id, role, status, workspaces(id, name)')
        .eq('user_id', user.id)
        .eq('status', 'active'),
      supabase
        .from('workspaces')
        .select('id, name')
        .eq('owner_id', user.id),
    ]);

    const ownedWorkspaces = (ownedWorkspacesData || []) as unknown as WorkspaceRow[];
    const memberWorkspaces = (memberWorkspacesData || []) as unknown as WorkspaceMemberRow[];

    const accessibleWorkspaceMap = new Map<string, { name: string; role: UserPropertyAccess['role'] }>();

    for (const w of ownedWorkspaces) {
      accessibleWorkspaceMap.set(w.id, { name: w.name || 'Workspace', role: 'owner' });
    }

    for (const mw of memberWorkspaces) {
      const ws = mw.workspaces;
      if (mw.workspace_id) {
        const existing = accessibleWorkspaceMap.get(mw.workspace_id);
        if (!existing) {
          accessibleWorkspaceMap.set(mw.workspace_id, {
            name: ws?.name || 'Workspace',
            role: (mw.role as UserPropertyAccess['role']) || 'manager',
          });
        }
      }
    }

    const targetWorkspaceIds = Array.from(accessibleWorkspaceMap.keys());

    // 2. Query properties
    const [
      { data: workspacePropertiesData, error: wsPropError },
      { data: ownedPropertiesData, error: ownedError },
      { data: memberPropertiesData, error: memberError },
    ] = await Promise.all([
      targetWorkspaceIds.length > 0
        ? supabase
            .from('properties')
            .select('id, name, workspace_id, status, owner_id')
            .in('workspace_id', targetWorkspaceIds)
            .neq('status', 'archived')
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('properties')
        .select('id, name, workspace_id, status, owner_id')
        .eq('owner_id', user.id)
        .neq('status', 'archived'),
      supabase
        .from('property_members')
        .select(`
          property_id,
          role,
          status,
          properties!inner (
            id,
            name,
            workspace_id,
            status,
            owner_id
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active'),
    ]);

    if (wsPropError) console.error('Error fetching workspace properties:', wsPropError);
    if (ownedError) console.error('Error fetching owned properties:', ownedError);
    if (memberError) console.error('Error fetching member properties:', memberError);

    const workspaceProperties = (workspacePropertiesData || []) as unknown as PropertyRow[];
    const ownedProperties = (ownedPropertiesData || []) as unknown as PropertyRow[];
    const memberProperties = (memberPropertiesData || []) as unknown as MemberPropertyRow[];

    const propertyMap = new Map<string, UserPropertyAccess>();

    // Add workspace properties
    for (const prop of workspaceProperties) {
      const wsInfo = accessibleWorkspaceMap.get(prop.workspace_id) || { name: 'Unknown', role: 'manager' };
      propertyMap.set(prop.id, {
        propertyId: prop.id,
        propertyName: prop.name || 'Unnamed Property',
        role: prop.owner_id === user.id ? 'owner' : wsInfo.role,
        status: 'active',
        organizationId: prop.workspace_id,
        organizationName: wsInfo.name,
      });
    }

    // Add direct owned properties
    for (const prop of ownedProperties) {
      if (!propertyMap.has(prop.id)) {
        const wsInfo = accessibleWorkspaceMap.get(prop.workspace_id) || { name: 'Personal Portfolio', role: 'owner' };
        propertyMap.set(prop.id, {
          propertyId: prop.id,
          propertyName: prop.name || 'Unnamed Property',
          role: 'owner',
          status: 'active',
          organizationId: prop.workspace_id || '',
          organizationName: wsInfo.name,
        });
      }
    }

    // Add member properties
    for (const mem of memberProperties) {
      const prop = mem.properties;
      if (prop && prop.status !== 'archived') {
        const wsInfo = accessibleWorkspaceMap.get(prop.workspace_id) || { name: 'Unknown', role: mem.role };
        if (!propertyMap.has(prop.id)) {
          propertyMap.set(prop.id, {
            propertyId: prop.id,
            propertyName: prop.name || 'Unnamed Property',
            role: mem.role || 'viewer',
            status: mem.status || 'active',
            organizationId: prop.workspace_id || '',
            organizationName: wsInfo.name,
          });
        }
      }
    }

    const properties = Array.from(propertyMap.values());
    const filtered = workspaceId
      ? properties.filter((p) => !p.organizationId || p.organizationId === workspaceId)
      : properties;

    return NextResponse.json({ properties: filtered }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error) {
    console.error('Error in accessible properties API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}