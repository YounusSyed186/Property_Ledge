import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/queries';
import { Database } from '@/types/database';

type Property = Database['public']['Tables']['properties']['Row'];
type PropertyMember = Database['public']['Tables']['property_members']['Row'];
type Workspace = Database['public']['Tables']['workspaces']['Row'];
type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row'];

export interface PropertyWithMembership extends Property {
  membership?: PropertyMember;
  organization?: Workspace;
}

export interface UserPropertyAccess {
  propertyId: string;
  propertyName: string;
  role: PropertyMember['role'];
  status: PropertyMember['status'];
  organizationId: string;
  organizationName: string;
}

import { cache } from 'react';

import { serverCache } from '@/lib/cache/server-cache';

export const getUserProperties = cache(async function getUserProperties(
  userId: string,
  workspaceId?: string | null
): Promise<UserPropertyAccess[]> {
  const cacheKey = `user:${userId}:properties:${workspaceId || 'all'}`;
  const cached = serverCache.get<UserPropertyAccess[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const supabase = await createAdminClient();

  let ownedQuery = supabase
    .from('properties')
    .select('id, name, workspace_id')
    .eq('owner_id', userId)
    .eq('status', 'active');

  if (workspaceId) {
    ownedQuery = ownedQuery.eq('workspace_id', workspaceId);
  }

  let memberQuery = supabase
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
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('properties.status', 'active');

  if (workspaceId) {
    memberQuery = memberQuery.eq('properties.workspace_id', workspaceId);
  }

  const [{ data: ownedProperties, error: ownedError }, { data: memberProperties, error: memberError }] = await Promise.all([
    ownedQuery,
    memberQuery,
  ]);

  if (ownedError) {
    console.error(
      'Error fetching owned properties:',
      ownedError.message ?? ownedError.code ?? ownedError
    );
  }

  if (memberError) {
    console.error(
      'Error fetching member properties:',
      memberError.message ?? memberError.code ?? memberError
    );
  }

  const typedOwnedProperties = (ownedProperties || []) as Array<{ id: string; name: string; workspace_id: string }>;
  
  interface MemberPropertyWithRelation {
    property_id: string;
    role: PropertyMember['role'];
    status: PropertyMember['status'];
    properties: { id: string; name: string; workspace_id: string; status: string };
  }
  
  const typedMemberProperties = (memberProperties || []) as MemberPropertyWithRelation[];

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

  const orgMap = new Map(((workspaces || []) as Array<{ id: string; name: string }>).map(o => [o.id, o.name]));

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

  const result = Array.from(propertyMap.values());
  serverCache.set(cacheKey, result, 30_000); // 30s TTL
  return result;
});

export const getUserOrganizations = cache(async function getUserOrganizations(
  userId: string
): Promise<(Workspace & { membership?: WorkspaceMember })[]> {
  const supabase = await createClient();

  const { data: ownedOrgs, error: ownedError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', userId)
    .eq('status', 'active');

  if (ownedError) {
    console.error('Error fetching owned workspaces:', ownedError);
  }

  const { data: memberOrgs, error: memberError } = await supabase
    .from('workspace_members')
    .select(`
      *,
      workspaces!inner (*)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('workspaces.status', 'active');

  if (memberError) {
    console.error('Error fetching member workspaces:', memberError);
  }

  const orgMap = new Map<string, Workspace & { membership?: WorkspaceMember }>();

  for (const org of (ownedOrgs || []) as Workspace[]) {
    orgMap.set(org.id, { ...org, membership: { role: 'owner', status: 'active' } as WorkspaceMember });
  }

  interface MemberOrgWithRelation {
    workspaces: Workspace;
    id: string;
    workspace_id: string;
    user_id: string;
    role: WorkspaceMember['role'];
    status: WorkspaceMember['status'];
    invited_by: string | null;
    joined_at: string | null;
    created_at: string;
    updated_at: string;
  }

  for (const mem of (memberOrgs || []) as MemberOrgWithRelation[]) {
    if (!orgMap.has(mem.workspaces.id)) {
      orgMap.set(mem.workspaces.id, { ...mem.workspaces, membership: mem });
    }
  }

  return Array.from(orgMap.values());
});

export const getPropertyById = cache(async function getPropertyById(
  propertyId: string
): Promise<PropertyWithMembership | null> {
  const supabase = await createClient();

  const { data: property, error } = await supabase
    .from('properties')
    .select(`
      *,
      workspace:workspaces(*)
    `)
    .eq('id', propertyId)
    .single();

  if (error || !property) {
    return null;
  }

  const user = await getCurrentUser();
  let membership: PropertyMember | undefined;

  if (user) {
    const { data: mem } = await supabase
      .from('property_members')
      .select('*')
      .eq('property_id', propertyId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    membership = mem as unknown as PropertyMember | undefined;
  }

  const typedProperty = property as Property & { workspace?: Workspace };
  return { ...typedProperty, membership, organization: typedProperty.workspace };
});

export const verifyPropertyAccess = cache(async function verifyPropertyAccess(
  propertyId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data: property } = await supabase
    .from('properties')
    .select('owner_id')
    .eq('id', propertyId)
    .single();

  interface PropertyWithOwner {
    owner_id: string;
  }
  
  const typedProperty = property as PropertyWithOwner | null;

  if (typedProperty?.owner_id === userId) {
    return true;
  }

  const { data: member } = await supabase
    .from('property_members')
    .select('id')
    .eq('property_id', propertyId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  return !!member;
});

export async function getPropertyStats(propertyId: string) {
  const supabase = await createClient();

  const [
    { count: tenantsCount },
    { count: activeLeasesCount },
    { count: openMaintenanceCount },
    { count: outstandingInvoicesCount },
    { count: overdueInvoicesCount }
  ] = await Promise.all([
    supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('property_id', propertyId).eq('status', 'active'),
    supabase.from('leases').select('*', { count: 'exact', head: true }).eq('property_id', propertyId).eq('status', 'active'),
    supabase.from('maintenance_requests').select('*', { count: 'exact', head: true }).eq('property_id', propertyId).in('status', ['open', 'in_progress', 'scheduled']),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('property_id', propertyId).in('status', ['issued', 'partially_paid']),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('property_id', propertyId).eq('status', 'overdue'),
  ]);

  return {
    totalUnits: 1,
    activeTenants: tenantsCount || 0,
    activeLeases: activeLeasesCount || 0,
    openMaintenanceRequests: openMaintenanceCount || 0,
    outstandingInvoices: outstandingInvoicesCount || 0,
    overdueInvoices: overdueInvoicesCount || 0,
  };
}