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
      units:units(count),
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
    units_count: (prop.units as { count: number }[])?.[0]?.count || 0,
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .eq('property_id', propertyId)
    .order('unit_number', { ascending: true });

  if (error) {
    console.error('Error fetching units:', error);
    return [];
  }
  return data || [];
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
      unit:units!fk_leases_unit_prop(name, unit_number),
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
      unit:units!fk_leases_unit_prop(id, name, unit_number),
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
      unit:units!fk_maintenance_lease_prop(name, unit_number),
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
      unit:units!fk_inspections_unit_prop(name, unit_number),
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
      tenant:tenants!fk_invoices_tenant_prop(first_name, last_name),
      unit:units!fk_invoices_unit_prop(name, unit_number)
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
      unit:units!fk_maintenance_lease_prop(name, unit_number),
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
      unit:units!fk_inspections_unit_prop(name, unit_number),
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

  if (!logs?.length) return [];

  const userIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean))] as string[];
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, full_name, public_id').in('id', userIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  return logs.map((log) => {
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
  const [invoices, payments, expenses, units, tenants, leases] = await Promise.all([
    supabase.from('invoices').select('status, total_amount, balance_due').eq('property_id', propertyId),
    supabase.from('payments').select('amount, status').eq('property_id', propertyId),
    supabase.from('expenses').select('amount, status').eq('property_id', propertyId),
    supabase.from('units').select('status').eq('property_id', propertyId),
    supabase.from('tenants').select('status').eq('property_id', propertyId),
    supabase.from('leases').select('status, rent_amount').eq('property_id', propertyId),
  ]);

  const invoiceData = (invoices.data || []) as { status: string; total_amount: number; balance_due: number }[];
  const paymentData = (payments.data || []) as { amount: number; status: string }[];
  const expenseData = (expenses.data || []) as { amount: number; status: string }[];
  const unitData = (units.data || []) as { status: string }[];
  const tenantData = (tenants.data || []) as { status: string }[];
  const leaseData = (leases.data || []) as { status: string; rent_amount: number }[];

  return {
    totalRevenue: paymentData.filter((p) => p.status === 'completed').reduce((sum, p) => sum + Number(p.amount), 0),
    outstandingBalance: invoiceData.reduce((sum, i) => sum + Number(i.balance_due || 0), 0),
    totalExpenses: expenseData.filter((e) => e.status === 'paid').reduce((sum, e) => sum + Number(e.amount), 0),
    occupiedUnits: unitData.filter((u) => u.status === 'occupied').length,
    vacantUnits: unitData.filter((u) => u.status === 'vacant').length,
    activeTenants: tenantData.filter((t) => t.status === 'active').length,
    activeLeases: leaseData.filter((l) => l.status === 'active').length,
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
          status,
          unit:units!fk_leases_unit_prop(id, name, unit_number)
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('units')
    .select(`
      *,
      leases!fk_leases_unit_prop(
        id,
        start_date,
        end_date,
        rent_amount,
        status,
        lease_tenants!fk_lease_tenants_lease_prop(
          tenant:tenants!fk_lease_tenants_tenant_prop(first_name, last_name)
        )
      ),
      maintenance_requests(id, title, status, priority, created_at)
    `)
    .eq('property_id', propertyId)
    .eq('id', unitId)
    .single();

  if (error) return null;
  return data;
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

  const [overdueInvoices, openMaintenance, outstandingInvoices, vacantUnits] = await Promise.all([
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
    supabase
      .from('units')
      .select('id, name, unit_number')
      .eq('property_id', propertyId)
      .eq('status', 'vacant')
      .order('unit_number', { ascending: true })
      .limit(5),
  ]);

  return {
    overdueInvoices: overdueInvoices.data || [],
    openMaintenance: openMaintenance.data || [],
    outstandingInvoices: outstandingInvoices.data || [],
    vacantUnits: vacantUnits.data || [],
  };
}
