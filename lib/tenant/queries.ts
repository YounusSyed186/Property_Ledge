import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/queries';

export async function getTenantRecordForUser(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tenants')
    .select(`
      *,
      property:properties(id, name, address_line_1, city, state, postal_code)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('Error fetching tenant record:', error);
    return null;
  }
  return data;
}

export async function getTenantActiveLease(tenantId: string, propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lease_tenants')
    .select(`
      role,
      is_primary,
      lease:leases!lease_tenants_lease_id_fkey(
        id, status, start_date, end_date, rent_amount, rent_frequency,
        payment_due_day, security_deposit
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tenant lease:', error);
    return null;
  }

  const active = (data || []).find((row) => {
    const lease = (row as { lease?: { status?: string } }).lease;
    return lease?.status === 'active' || lease?.status === 'pending';
  });

  return active || (data?.[0] ?? null);
}

export async function getTenantInvoices(tenantId: string, propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('property_id', propertyId)
    .eq('tenant_id', tenantId)
    .order('due_date', { ascending: false })
    .limit(24);

  if (error) {
    console.error('Error fetching tenant invoices:', error);
    return [];
  }
  return data || [];
}

export async function getTenantPayments(tenantId: string, propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('property_id', propertyId)
    .eq('tenant_id', tenantId)
    .eq('transaction_type', 'income')
    .order('transaction_date', { ascending: false })
    .limit(24);

  if (error) {
    console.error('Error fetching tenant payments:', error);
    return [];
  }
  return data || [];
}

export async function getTenantMaintenanceRequests(tenantId: string, propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select('*')
    .eq('property_id', propertyId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tenant maintenance requests:', error);
    return [];
  }
  return data || [];
}

export async function getTenantDocuments(tenantId: string, propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('property_id', propertyId)
    .or(`tenant_id.eq.${tenantId},document_type.eq.tenant_document`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tenant documents:', error);
    return [];
  }
  return data || [];
}

export async function getTenantNotifications(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching tenant notifications:', error);
    return [];
  }
  return data || [];
}

export async function getTenantPortalSummary(userId: string) {
  const tenant = await getTenantRecordForUser(userId);
  if (!tenant) return null;

  const propertyId = (tenant as { property_id: string }).property_id;
  const tenantId = (tenant as { id: string }).id;

  const [lease, invoices, maintenance, notifications] = await Promise.all([
    getTenantActiveLease(tenantId, propertyId),
    getTenantInvoices(tenantId, propertyId),
    getTenantMaintenanceRequests(tenantId, propertyId),
    getTenantNotifications(userId),
  ]);

  const outstanding = (invoices || []).filter((inv) =>
    ['issued', 'partially_paid', 'overdue'].includes((inv as { status: string }).status)
  );

  const openMaintenance = (maintenance || []).filter((req) =>
    ['open', 'in_progress', 'scheduled'].includes((req as { status: string }).status)
  );

  const unreadNotifications = (notifications || []).filter((n) => !(n as { read_at?: string | null }).read_at);

  return {
    tenant,
    lease,
    outstandingInvoices: outstanding,
    openMaintenance,
    unreadNotifications: unreadNotifications.length,
    recentNotifications: (notifications || []).slice(0, 5),
  };
}

export async function requireTenantContext() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const tenant = await getTenantRecordForUser(user.id);
  if (!tenant) {
    throw new Error('Forbidden: tenant account required');
  }

  return { user, tenant };
}
