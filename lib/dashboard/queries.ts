import { createClient } from '@/lib/supabase/server';
import { getPropertyStats, getUserProperties } from '@/lib/properties/queries';

export async function getDashboardOverview(propertyId: string) {
  const supabase = await createClient();
  const [stats, activityResult] = await Promise.all([
    getPropertyStats(propertyId),
    supabase
      .from('activity_logs')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  return {
    stats,
    recentActivity: activityResult.data || [],
  };
}

export async function getPropertiesForUser(userId: string) {
  return getUserProperties(userId);
}

export async function getPropertiesList() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('properties')
    .select(`
      *,
      workspace:workspaces(name),
      tenants:tenants(count)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching properties:', error);
    return [];
  }

  return (data || []).map((prop: Record<string, unknown>) => ({
    ...prop,
    workspace: (prop.workspace as { name: string }) || { name: 'Unknown' },
    tenants_count: (prop.tenants as { count: number }[])?.[0]?.count || 0,
  }));
}

export async function getPropertyDetail(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('properties')
    .select(`*, workspace:workspaces(id, name)`)
    .eq('id', propertyId)
    .single();

  if (error) return null;
  return data;
}

export async function getUnits(propertyId: string) {
  return [];
}

export async function getTenants(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('property_id', propertyId)
    .order('last_name', { ascending: true });

  if (error) {
    console.error('Error fetching tenants:', error);
    return [];
  }
  return data || [];
}

export async function getLeases(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('leases')
    .select(`
      *,
      lease_tenants!fk_lease_tenants_lease_prop(
        tenant_id, role, is_primary,
        tenant:tenants!fk_lease_tenants_tenant_prop(first_name, last_name)
      )
    `)
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching leases:', error);
    return [];
  }
  return data || [];
}

export async function getLeaseDetail(propertyId: string, leaseId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('leases')
    .select(`
      *,
      lease_tenants!fk_lease_tenants_lease_prop(
        tenant_id, role, is_primary,
        tenant:tenants!fk_lease_tenants_tenant_prop(id, first_name, last_name, email, phone)
      )
    `)
    .eq('property_id', propertyId)
    .eq('id', leaseId)
    .single();

  if (error) {
    console.error('Error fetching lease detail:', error);
    return null;
  }
  return data;
}

export async function getMaintenanceDetail(propertyId: string, requestId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      tenant:tenants!fk_maintenance_tenant_prop(first_name, last_name)
    `)
    .eq('property_id', propertyId)
    .eq('id', requestId)
    .single();

  if (error) return null;
  return data;
}

export async function getInspectionDetail(propertyId: string, inspectionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('inspections')
    .select(`
      *,
      inspection_items(*)
    `)
    .eq('property_id', propertyId)
    .eq('id', inspectionId)
    .single();

  if (error) return null;
  return data;
}

export async function getInvoices(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      tenant:tenants!fk_invoices_tenant_prop(first_name, last_name)
    `)
    .eq('property_id', propertyId)
    .order('issue_date', { ascending: false });

  if (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }
  return data || [];
}

export async function getPayments(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      tenant:tenants!fk_payments_tenant_prop(first_name, last_name),
      invoice:invoices!fk_payments_invoice_prop(invoice_number)
    `)
    .eq('property_id', propertyId)
    .order('payment_date', { ascending: false });

  if (error) {
    console.error('Error fetching payments:', error);
    return [];
  }
  return data || [];
}

export async function getExpenses(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('property_id', propertyId)
    .order('expense_date', { ascending: false });

  if (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }
  return data || [];
}

export async function getMaintenanceRequests(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      tenant:tenants!fk_maintenance_tenant_prop(first_name, last_name)
    `)
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching maintenance requests:', error);
    return [];
  }
  return data || [];
}

export async function getInspections(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('inspections')
    .select(`
      *,
      inspection_items(*)
    `)
    .eq('property_id', propertyId)
    .order('scheduled_at', { ascending: false });

  if (error) {
    console.error('Error fetching inspections:', error);
    return [];
  }
  return data || [];
}

export async function getDocuments(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
  return data || [];
}

export async function getTasks(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
  return data || [];
}

export async function getActivityLogs(propertyId: string) {
  const supabase = await createClient();
  const { data: logs, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('Error fetching activity logs:', error);
    return [];
  }

  const logItems = (logs || []) as any[];
  if (!logItems.length) return [];

  const userIds = [...new Set(logItems.map((l) => l.user_id).filter(Boolean))] as string[];
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, full_name, public_id').in('id', userIds)
    : { data: [] };

  const profileMap = new Map(((profiles || []) as any[]).map((p) => [p.id, p]));

  return logItems.map((log: any) => {
    const profile = log.user_id ? profileMap.get(log.user_id) : undefined;
    return {
      ...log,
      user: {
        full_name: profile?.full_name || 'System',
        email: profile?.public_id || '',
      },
    };
  });
}

export async function getReportsSummary(propertyId: string) {
  const supabase = await createClient();
  const [invoices, payments, expenses, tenants, leases] = await Promise.all([
    supabase.from('invoices').select('status, total_amount, balance_due').eq('property_id', propertyId),
    supabase.from('payments').select('amount, status').eq('property_id', propertyId),
    supabase.from('expenses').select('amount, status').eq('property_id', propertyId),
    supabase.from('tenants').select('status').eq('property_id', propertyId),
    supabase.from('leases').select('status, rent_amount').eq('property_id', propertyId),
  ]);

  const invoiceData = (invoices.data || []) as { status: string; total_amount: number; balance_due: number }[];
  const paymentData = (payments.data || []) as { amount: number; status: string }[];
  const expenseData = (expenses.data || []) as { amount: number; status: string }[];
  const tenantData = (tenants.data || []) as { status: string }[];
  const leaseData = (leases.data || []) as { status: string; rent_amount: number }[];
  const activeLeaseCount = leaseData.filter((l) => l.status === 'active').length;

  return {
    totalRevenue: paymentData.filter((p) => p.status === 'completed').reduce((sum, p) => sum + Number(p.amount), 0),
    outstandingBalance: invoiceData.reduce((sum, i) => sum + Number(i.balance_due || 0), 0),
    totalExpenses: expenseData.filter((e) => e.status === 'paid').reduce((sum, e) => sum + Number(e.amount), 0),
    occupiedUnits: activeLeaseCount > 0 ? 1 : 0,
    vacantUnits: activeLeaseCount > 0 ? 0 : 1,
    activeTenants: tenantData.filter((t) => t.status === 'active').length,
    activeLeases: activeLeaseCount,
    monthlyRent: leaseData.filter((l) => l.status === 'active').reduce((sum, l) => sum + Number(l.rent_amount), 0),
    overdueInvoices: invoiceData.filter((i) => i.status === 'overdue').length,
  };
}

export async function getUserWorkspaces() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('status', 'active')
    .order('name');

  if (error) return [];
  return data || [];
}

export async function getTenantDetail(propertyId: string, tenantId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tenants')
    .select(`
      *,
      lease_tenants!fk_lease_tenants_tenant_prop(
        lease_id,
        role,
        is_primary,
        lease:leases!fk_lease_tenants_lease_prop(
          id,
          start_date,
          end_date,
          rent_amount,
          status
        )
      )
    `)
    .eq('property_id', propertyId)
    .eq('id', tenantId)
    .single();

  if (error) return null;
  return data;
}

export async function getUnitDetail(propertyId: string, unitId: string) {
  return null;
}

export async function getPropertyTeam(propertyId: string) {
  const supabase = await createClient();

  const { data: property } = await supabase
    .from('properties')
    .select('workspace_id')
    .eq('id', propertyId)
    .single();

  const workspaceId = (property as { workspace_id?: string } | null)?.workspace_id;
  if (!workspaceId) {
    return { workspaceMembers: [], propertyMembers: [] };
  }

  const [workspaceMembersResult, propertyMembersResult] = await Promise.all([
    supabase
      .from('workspace_members')
      .select(`
        id,
        role,
        status,
        joined_at,
        user:profiles!workspace_members_user_id_fkey(id, full_name)
      `)
      .eq('workspace_id', workspaceId)
      .neq('status', 'removed')
      .order('joined_at', { ascending: false }),
    supabase
      .from('property_members')
      .select(`
        id,
        role,
        status,
        joined_at,
        user:profiles!property_members_user_id_fkey(id, full_name)
      `)
      .eq('property_id', propertyId)
      .neq('status', 'removed')
      .order('joined_at', { ascending: false }),
  ]);

  return {
    workspaceMembers: workspaceMembersResult.data || [],
    propertyMembers: propertyMembersResult.data || [],
  };
}

export async function getNeedsAttention(propertyId: string) {
  const supabase = await createClient();

  const [overdueInvoices, openMaintenance, outstandingInvoices] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, balance_due, due_date')
      .eq('property_id', propertyId)
      .eq('status', 'overdue')
      .order('due_date', { ascending: true })
      .limit(5),
    supabase
      .from('maintenance_requests')
      .select('id, title, priority, status, created_at')
      .eq('property_id', propertyId)
      .in('status', ['open', 'in_progress', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('invoices')
      .select('id, invoice_number, balance_due, due_date')
      .eq('property_id', propertyId)
      .in('status', ['issued', 'partially_paid'])
      .order('due_date', { ascending: true })
      .limit(5),
  ]);

  return {
    overdueInvoices: overdueInvoices.data || [],
    openMaintenance: openMaintenance.data || [],
    outstandingInvoices: outstandingInvoices.data || [],
    vacantUnits: [],
  };
}

export async function getTenantPayments(propertyId: string, tenantId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('payments')
    .select(`
      id, amount, payment_date, status, payment_method, reference,
      invoice:invoices!fk_payments_invoice_prop(invoice_number)
    `)
    .eq('property_id', propertyId)
    .eq('tenant_id', tenantId)
    .order('payment_date', { ascending: false })
    .limit(12);

  if (error) {
    console.error('Error fetching tenant payments:', error);
    return [];
  }
  return data || [];
}

export async function getTenantInvoices(propertyId: string, tenantId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, issue_date, due_date, total_amount, balance_due, status')
    .eq('property_id', propertyId)
    .eq('tenant_id', tenantId)
    .order('due_date', { ascending: false })
    .limit(12);

  if (error) {
    console.error('Error fetching tenant invoices:', error);
    return [];
  }
  return data || [];
}

export async function getTenantMaintenance(propertyId: string, tenantId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select('id, title, status, priority, created_at, updated_at')
    .eq('property_id', propertyId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) {
    console.error('Error fetching tenant maintenance:', error);
    return [];
  }
  return data || [];
}

export async function getTenantDocuments(propertyId: string, tenantId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('documents')
    .select('id, name, document_type, file_url, created_at, status')
    .eq('property_id', propertyId)
    .or(`tenant_id.eq.${tenantId},document_type.eq.tenant_document`)
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) {
    console.error('Error fetching tenant documents:', error);
    return [];
  }
  return data || [];
}

export async function getTenantActivity(propertyId: string, tenantId: string) {
  const supabase = await createClient();

  const [payments, invoices, maintenance, logs] = await Promise.all([
    supabase.from('payments').select('id').eq('property_id', propertyId).eq('tenant_id', tenantId),
    supabase.from('invoices').select('id').eq('property_id', propertyId).eq('tenant_id', tenantId),
    supabase.from('maintenance_requests').select('id').eq('property_id', propertyId).eq('tenant_id', tenantId),
    supabase
      .from('activity_logs')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  const paymentIds = new Set((payments.data || []).map((p) => (p as { id: string }).id));
  const invoiceIds = new Set((invoices.data || []).map((i) => (i as { id: string }).id));
  const maintenanceIds = new Set((maintenance.data || []).map((m) => (m as { id: string }).id));

  const filtered = (logs.data || []).filter((log) => {
    const row = log as {
      entity_type: string;
      entity_id: string | null;
      metadata?: { tenant_id?: string } | null;
    };
    if (row.entity_type === 'tenant' && row.entity_id === tenantId) return true;
    if (row.metadata?.tenant_id === tenantId) return true;
    if (row.entity_type === 'payment' && row.entity_id && paymentIds.has(row.entity_id)) return true;
    if (row.entity_type === 'invoice' && row.entity_id && invoiceIds.has(row.entity_id)) return true;
    if (row.entity_type === 'maintenance_request' && row.entity_id && maintenanceIds.has(row.entity_id)) return true;
    return false;
  }).slice(0, 15);

  if (!filtered.length) return [];

  const userIds = [...new Set(filtered.map((l) => (l as { user_id?: string }).user_id).filter(Boolean))] as string[];
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, full_name, public_id').in('id', userIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((p) => [(p as { id: string }).id, p]));

  return filtered.map((log) => {
    const row = log as { user_id?: string };
    const profile = row.user_id ? profileMap.get(row.user_id) : undefined;
    return {
      ...log,
      user: {
        full_name: (profile as { full_name?: string } | undefined)?.full_name || 'System',
        email: (profile as { public_id?: string } | undefined)?.public_id || '',
      },
    };
  });
}
