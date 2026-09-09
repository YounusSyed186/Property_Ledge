'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/queries';

export type SearchResultType =
  | 'property'
  | 'tenant'
  | 'lease'
  | 'invoice'
  | 'maintenance'
  | 'task';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  href: string;
}

const TYPE_ROUTES: Record<SearchResultType, string> = {
  property: '/dashboard/properties',
  tenant: '/dashboard/tenants',
  lease: '/dashboard/leases',
  invoice: '/dashboard/invoices',
  maintenance: '/dashboard/maintenance',
  task: '/dashboard/tasks',
};

export async function searchDashboardEntities(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const pattern = `%${trimmed}%`;
  const orPattern = trimmed.replace(/%/g, '');

  const [
    propertiesResult,
    tenantsResult,
    leasesResult,
    invoicesResult,
    maintenanceResult,
    tasksResult,
  ] = await Promise.all([
    supabase
      .from('properties')
      .select('id, name, city')
      .ilike('name', pattern)
      .eq('status', 'active')
      .limit(5),
    supabase
      .from('tenants')
      .select('id, first_name, last_name, email, property_id')
      .or(`first_name.ilike.%${orPattern}%,last_name.ilike.%${orPattern}%,email.ilike.%${orPattern}%`)
      .limit(5),
    supabase
      .from('leases')
      .select('id, status, property_id, rent_amount, notes')
      .ilike('notes', pattern)
      .limit(5),
    supabase
      .from('invoices')
      .select('id, invoice_number, status, property_id')
      .ilike('invoice_number', pattern)
      .limit(5),
    supabase
      .from('maintenance_requests')
      .select('id, title, status, property_id')
      .ilike('title', pattern)
      .limit(5),
    supabase
      .from('tasks')
      .select('id, title, status, property_id')
      .ilike('title', pattern)
      .limit(5),
  ]);

  const results: SearchResult[] = [];

  for (const prop of (propertiesResult.data || []) as Array<{ id: string; name: string; city: string | null }>) {
    results.push({
      id: prop.id,
      type: 'property',
      title: prop.name,
      subtitle: prop.city || 'Property',
      href: `${TYPE_ROUTES.property}/${prop.id}`,
    });
  }


  for (const tenant of (tenantsResult.data || []) as Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  }>) {
    const name = [tenant.first_name, tenant.last_name].filter(Boolean).join(' ') || tenant.email || 'Tenant';
    results.push({
      id: tenant.id,
      type: 'tenant',
      title: name,
      subtitle: tenant.email || 'Tenant',
      href: TYPE_ROUTES.tenant,
    });
  }

  for (const lease of (leasesResult.data || []) as Array<{
    id: string;
    status: string;
    rent_amount: number;
  }>) {
    results.push({
      id: lease.id,
      type: 'lease',
      title: `Lease ${lease.id.slice(0, 8)}`,
      subtitle: `${lease.status} · $${lease.rent_amount}`,
      href: TYPE_ROUTES.lease,
    });
  }

  for (const invoice of (invoicesResult.data || []) as Array<{
    id: string;
    invoice_number: string;
    status: string;
  }>) {
    results.push({
      id: invoice.id,
      type: 'invoice',
      title: invoice.invoice_number || `Invoice ${invoice.id.slice(0, 8)}`,
      subtitle: invoice.status,
      href: TYPE_ROUTES.invoice,
    });
  }

  for (const request of (maintenanceResult.data || []) as Array<{
    id: string;
    title: string;
    status: string;
  }>) {
    results.push({
      id: request.id,
      type: 'maintenance',
      title: request.title,
      subtitle: request.status,
      href: TYPE_ROUTES.maintenance,
    });
  }

  for (const task of (tasksResult.data || []) as Array<{
    id: string;
    title: string;
    status: string;
  }>) {
    results.push({
      id: task.id,
      type: 'task',
      title: task.title,
      subtitle: task.status,
      href: TYPE_ROUTES.task,
    });
  }

  return results.slice(0, 20);
}
