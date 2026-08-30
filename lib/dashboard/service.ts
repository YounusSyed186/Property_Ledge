// @ts-nocheck
import { createClient } from '@/lib/supabase/server';
import { requireAuthenticatedUser, requirePropertyAccess, requirePropertyPermission } from './authorization';
import type { Database } from '@/types/database';

type Tables = Database['public']['Tables'];

async function recordActivityLog(params: {
  propertyId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  workspaceId?: string;
}) {
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();

  const { data: property } = await supabase
    .from('properties')
    .select('workspace_id')
    .eq('id', params.propertyId)
    .single();

  const workspaceId = params.workspaceId || (property as { workspace_id?: string } | null)?.workspace_id || null;

  await supabase.from('activity_logs').insert({
    workspace_id: workspaceId,
    property_id: params.propertyId,
    user_id: user.id,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId || null,
    metadata: params.metadata || {},
  } as never);
}

async function createNotification(params: {
  userId: string;
  propertyId?: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
}) {
  const supabase = await createClient();
  await supabase.from('notifications').insert({
    user_id: params.userId,
    property_id: params.propertyId || null,
    type: params.type,
    title: params.title,
    body: params.body,
    action_url: params.actionUrl || null,
    status: 'unread',
  } as never);
}

// Properties
export async function createProperty(input: Tables['properties']['Insert']) {
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();

  const workspaceId = (input as { workspace_id?: string }).workspace_id;
  if (!workspaceId) throw new Error('workspace_id is required');

  const { authorizeOrThrow } = await import('@/lib/auth/authorize');
  const { ENTITLEMENT_KEYS } = await import('@/lib/entitlements/types');

  const { count } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .neq('status', 'archived');

  await authorizeOrThrow({
    workspaceId,
    permission: 'property.create',
    limit: {
      key: ENTITLEMENT_KEYS.PROPERTIES_MAX,
      currentUsage: count || 0,
      delta: 1,
    },
  });

  const addressStr = (input as any).address || input.address_line_1 || '';
  const suburbStr = (input as any).suburb || input.city || '';
  const postcodeStr = (input as any).postcode || input.postal_code || '';
  const nameVal = input.name || addressStr || 'Unnamed Property';
  const carSpacesVal = (input as any).car_spaces ?? input.parking_spaces ?? 0;
  const imageUrlVal = (input as any).image || input.image_url || null;
  const customPropId = (input as any).property_id || ('PL-' + Math.floor(1000 + Math.random() * 9000).toString());

  const payload = {
    ...input,
    owner_id: user.id,
    name: nameVal,
    address_line_1: addressStr,
    city: suburbStr,
    suburb: suburbStr,
    postal_code: postcodeStr,
    postcode: postcodeStr,
    parking_spaces: Number(carSpacesVal),
    car_spaces: Number(carSpacesVal),
    image_url: imageUrlVal,
    property_id: customPropId,
  };

  const { data, error } = await supabase
    .from('properties')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId: data.id, action: 'created', entityType: 'property', entityId: data.id });
  return data;
}

export async function updateProperty(propertyId: string, input: Tables['properties']['Update']) {
  await requirePropertyPermission(propertyId, 'property.update');
  const supabase = await createClient();

  const addressStr = (input as any).address || input.address_line_1;
  const suburbStr = (input as any).suburb || input.city;
  const postcodeStr = (input as any).postcode || input.postal_code;
  const carSpacesVal = (input as any).car_spaces ?? input.parking_spaces;

  const payload = {
    ...input,
    ...(addressStr ? { address_line_1: addressStr, name: addressStr } : {}),
    ...(suburbStr ? { city: suburbStr, suburb: suburbStr } : {}),
    ...(postcodeStr ? { postal_code: postcodeStr, postcode: postcodeStr } : {}),
    ...(carSpacesVal !== undefined && carSpacesVal !== null ? { parking_spaces: Number(carSpacesVal), car_spaces: Number(carSpacesVal) } : {}),
  };

  const { data, error } = await supabase.from('properties').update(payload).eq('id', propertyId).select().single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'updated', entityType: 'property', entityId: propertyId });
  return data;
}

export async function deleteProperty(propertyId: string) {
  await requirePropertyPermission(propertyId, 'property.delete');
  const supabase = await createClient();
  const { error } = await supabase.from('properties').update({ status: 'archived' }).eq('id', propertyId);
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'archived', entityType: 'property', entityId: propertyId });
}

// Units (Deprecated in Standalone Property Model)
export async function createUnit(propertyId: string, input: Record<string, unknown>) {
  return { id: propertyId, ...input };
}

export async function updateUnit(propertyId: string, unitId: string, input: Record<string, unknown>) {
  return { id: unitId, ...input };
}

export async function deleteUnit(propertyId: string, unitId: string) {
  return;
}

// Tenants
export async function createTenant(propertyId: string, input: Omit<Tables['tenants']['Insert'], 'property_id'>) {
  await requirePropertyPermission(propertyId, 'tenant.create');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tenants')
    .insert({ ...input, property_id: propertyId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'created', entityType: 'tenant', entityId: data.id });
  return data;
}

export async function updateTenant(propertyId: string, tenantId: string, input: Tables['tenants']['Update']) {
  await requirePropertyPermission(propertyId, 'tenant.update');
  const supabase = await createClient();
  const { data, error } = await supabase.from('tenants').update(input).eq('id', tenantId).eq('property_id', propertyId).select().single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'updated', entityType: 'tenant', entityId: tenantId });
  return data;
}

export async function deleteTenant(propertyId: string, tenantId: string) {
  await requirePropertyPermission(propertyId, 'tenant.manage');
  const supabase = await createClient();
  const { error } = await supabase.from('tenants').update({ status: 'archived' }).eq('id', tenantId).eq('property_id', propertyId);
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'archived', entityType: 'tenant', entityId: tenantId });
}

// Leases
export async function createLease(propertyId: string, input: Omit<Tables['leases']['Insert'], 'property_id'>, tenantIds?: string[]) {
  const user = await requirePropertyPermission(propertyId, 'lease.create');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('leases')
    .insert({ ...input, property_id: propertyId, created_by: user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);

  if (tenantIds?.length) {
    await supabase.from('lease_tenants').insert(
      tenantIds.map((tenantId, idx) => ({
        lease_id: data.id,
        tenant_id: tenantId,
        property_id: propertyId,
        role: idx === 0 ? 'primary' as const : 'co-tenant' as const,
        is_primary: idx === 0,
      }))
    );
  }

  await recordActivityLog({ propertyId, action: 'created', entityType: 'lease', entityId: data.id });
  return data;
}

export interface TenancySetupInput {
  tenants: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  }>;
  lease: {
    startDate: string;
    endDate?: string | null;
    leaseType: string;
    rentAmount: number;
    rentFrequency?: 'weekly' | 'fortnightly' | 'monthly' | 'yearly';
    securityDeposit?: number;
    paymentDueDay?: number;
    status?: 'draft' | 'pending' | 'active';
    notes?: string | null;
  };
  bond?: {
    amount: number;
    isPaid?: boolean;
    dueDate?: string | null;
  };
}

export async function setupTenancyWithLease(propertyId: string, input: TenancySetupInput) {
  const user = await requirePropertyPermission(propertyId, 'lease.create');
  const supabase = await createClient();

  const isPeriodic = input.lease.leaseType === 'Periodic';
  const effectiveEndDate = isPeriodic ? null : (input.lease.endDate || null);

  // 1. Create Lease
  const leasePayload: any = {
    property_id: propertyId,
    created_by: user.id,
    start_date: input.lease.startDate,
    end_date: effectiveEndDate,
    rent_amount: Number(input.lease.rentAmount) || 0,
    rent_frequency: input.lease.rentFrequency || 'monthly',
    security_deposit: Number(input.bond?.amount ?? input.lease.securityDeposit ?? 0),
    payment_due_day: Number(input.lease.paymentDueDay) || 1,
    status: input.lease.status || 'active',
    notes: input.lease.notes || null,
  };

  const { data: newLease, error: leaseErr } = await supabase
    .from('leases')
    .insert(leasePayload)
    .select()
    .single();

  if (leaseErr) throw new Error(leaseErr.message);

  // 2. Insert tenants and link to lease
  const createdTenants = [];
  for (let i = 0; i < input.tenants.length; i++) {
    const t = input.tenants[i];
    const { data: newTenant, error: tenantErr } = await supabase
      .from('tenants')
      .insert({
        property_id: propertyId,
        first_name: t.firstName,
        last_name: t.lastName || '',
        email: t.email,
        phone: t.phone || null,
        status: 'active',
      })
      .select()
      .single();

    if (tenantErr) throw new Error(tenantErr.message);
    createdTenants.push(newTenant);

    // Link to lease_tenants
    const { error: linkErr } = await supabase
      .from('lease_tenants')
      .insert({
        lease_id: newLease.id,
        tenant_id: newTenant.id,
        property_id: propertyId,
        role: i === 0 ? 'primary' : 'co-tenant',
        is_primary: i === 0,
      });

    if (linkErr) throw new Error(linkErr.message);

    await recordActivityLog({ propertyId, action: 'created', entityType: 'tenant', entityId: newTenant.id });
  }

  await recordActivityLog({ propertyId, action: 'created', entityType: 'lease', entityId: newLease.id });

  return { lease: newLease, tenants: createdTenants };
}

export async function updateLease(propertyId: string, leaseId: string, input: Tables['leases']['Update']) {
  await requirePropertyPermission(propertyId, 'lease.update');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('leases')
    .update(input)
    .eq('id', leaseId)
    .eq('property_id', propertyId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'updated', entityType: 'lease', entityId: leaseId });
  return data;
}

export async function deleteLease(propertyId: string, leaseId: string) {
  await requirePropertyPermission(propertyId, 'lease.delete');
  const supabase = await createClient();

  // Delete junction rows
  await supabase.from('lease_tenants').delete().eq('lease_id', leaseId);

  const { error } = await supabase
    .from('leases')
    .delete()
    .eq('id', leaseId)
    .eq('property_id', propertyId);

  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'deleted', entityType: 'lease', entityId: leaseId });
  return { success: true };
}

export async function convertToPeriodic(propertyId: string, leaseId: string) {
  await requirePropertyPermission(propertyId, 'lease.update');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('leases')
    .update({ end_date: null, status: 'active' })
    .eq('id', leaseId)
    .eq('property_id', propertyId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'converted_to_periodic', entityType: 'lease', entityId: leaseId });
  return data;
}

export async function updateLeaseStatus(propertyId: string, leaseId: string, status: string) {
  await requirePropertyPermission(propertyId, 'lease.update');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('leases')
    .update({ status })
    .eq('id', leaseId)
    .eq('property_id', propertyId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: `status_changed_${status}`, entityType: 'lease', entityId: leaseId });
  return data;
}


// Invoices
export async function createInvoice(propertyId: string, input: Omit<Tables['invoices']['Insert'], 'property_id'>) {
  const user = await requirePropertyPermission(propertyId, 'financial.manage');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoices')
    .insert({ ...input, property_id: propertyId, created_by: user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'created', entityType: 'invoice', entityId: data.id });
  return data;
}

export async function updateInvoice(propertyId: string, invoiceId: string, input: Tables['invoices']['Update']) {
  await requirePropertyPermission(propertyId, 'financial.manage');
  const supabase = await createClient();
  const { data, error } = await supabase.from('invoices').update(input).eq('id', invoiceId).eq('property_id', propertyId).select().single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'updated', entityType: 'invoice', entityId: invoiceId });
  return data;
}

export async function deleteInvoice(propertyId: string, invoiceId: string) {
  await requirePropertyPermission(propertyId, 'financial.manage');
  const supabase = await createClient();
  const { error } = await supabase.from('invoices').update({ status: 'void' }).eq('id', invoiceId).eq('property_id', propertyId);
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'voided', entityType: 'invoice', entityId: invoiceId });
}

// Payments
export async function createPayment(propertyId: string, input: Omit<Tables['payments']['Insert'], 'property_id'>) {
  const user = await requirePropertyPermission(propertyId, 'financial.manage');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('payments')
    .insert({ ...input, property_id: propertyId, created_by: user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'created', entityType: 'payment', entityId: data.id, metadata: { amount: input.amount } });
  await createNotification({
    userId: user.id,
    propertyId,
    type: 'payment_recorded',
    title: 'Payment recorded',
    body: `A payment of ${input.amount} was recorded.`,
    actionUrl: `/dashboard/money?tab=payments`,
  });
  return data;
}

export async function updatePayment(propertyId: string, paymentId: string, input: Tables['payments']['Update']) {
  await requirePropertyPermission(propertyId, 'financial.manage');
  const supabase = await createClient();
  const { data, error } = await supabase.from('payments').update(input).eq('id', paymentId).eq('property_id', propertyId).select().single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'updated', entityType: 'payment', entityId: paymentId });
  return data;
}

export async function deletePayment(propertyId: string, paymentId: string) {
  await requirePropertyPermission(propertyId, 'financial.manage');
  const supabase = await createClient();
  const { error } = await supabase.from('payments').delete().eq('id', paymentId).eq('property_id', propertyId);
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'deleted', entityType: 'payment', entityId: paymentId });
}

// Expenses
export async function createExpense(propertyId: string, input: Omit<Tables['expenses']['Insert'], 'property_id'>) {
  const user = await requirePropertyPermission(propertyId, 'financial.manage');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...input, property_id: propertyId, created_by: user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'created', entityType: 'expense', entityId: data.id });
  return data;
}

export async function updateExpense(propertyId: string, expenseId: string, input: Tables['expenses']['Update']) {
  await requirePropertyPermission(propertyId, 'financial.manage');
  const supabase = await createClient();
  const { data, error } = await supabase.from('expenses').update(input).eq('id', expenseId).eq('property_id', propertyId).select().single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'updated', entityType: 'expense', entityId: expenseId });
  return data;
}

export async function deleteExpense(propertyId: string, expenseId: string) {
  await requirePropertyPermission(propertyId, 'financial.manage');
  const supabase = await createClient();
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId).eq('property_id', propertyId);
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'deleted', entityType: 'expense', entityId: expenseId });
}

// Maintenance
export async function createMaintenanceRequest(propertyId: string, input: Omit<Tables['maintenance_requests']['Insert'], 'property_id'>) {
  const user = await requirePropertyPermission(propertyId, 'maintenance.create');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('maintenance_requests')
    .insert({ ...input, property_id: propertyId, created_by: user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await recordActivityLog({
    propertyId,
    action: 'created',
    entityType: 'maintenance_request',
    entityId: data.id,
    metadata: { title: input.title },
  });
  await createNotification({
    userId: user.id,
    propertyId,
    type: 'maintenance_created',
    title: 'Maintenance request submitted',
    body: input.title || 'A new maintenance request was created.',
    actionUrl: `/dashboard/maintenance`,
  });
  return data;
}

export async function updateMaintenanceRequest(propertyId: string, requestId: string, input: Tables['maintenance_requests']['Update']) {
  await requirePropertyPermission(propertyId, 'maintenance.manage');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('maintenance_requests')
    .update(input)
    .eq('id', requestId)
    .eq('property_id', propertyId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'updated', entityType: 'maintenance_request', entityId: requestId });
  return data;
}

export async function deleteMaintenanceRequest(propertyId: string, requestId: string) {
  await requirePropertyPermission(propertyId, 'maintenance.manage');
  const supabase = await createClient();
  const { error } = await supabase.from('maintenance_requests').update({ status: 'cancelled' }).eq('id', requestId).eq('property_id', propertyId);
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'cancelled', entityType: 'maintenance_request', entityId: requestId });
}

// Inspections
export async function createInspection(propertyId: string, input: Omit<Tables['inspections']['Insert'], 'property_id'>) {
  const user = await requirePropertyPermission(propertyId, 'inspection.create');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('inspections')
    .insert({ ...input, property_id: propertyId, created_by: user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'created', entityType: 'inspection', entityId: data.id });
  return data;
}

export async function updateInspection(propertyId: string, inspectionId: string, input: Tables['inspections']['Update']) {
  await requirePropertyPermission(propertyId, 'inspection.manage');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('inspections')
    .update(input)
    .eq('id', inspectionId)
    .eq('property_id', propertyId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'updated', entityType: 'inspection', entityId: inspectionId });
  return data;
}

export async function deleteInspection(propertyId: string, inspectionId: string) {
  await requirePropertyPermission(propertyId, 'inspection.manage');
  const supabase = await createClient();
  const { error } = await supabase.from('inspections').update({ status: 'cancelled' }).eq('id', inspectionId).eq('property_id', propertyId);
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'cancelled', entityType: 'inspection', entityId: inspectionId });
}

// Documents
export async function createDocument(propertyId: string, input: Omit<Tables['documents']['Insert'], 'property_id'>) {
  const user = await requirePropertyPermission(propertyId, 'document.create');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('documents')
    .insert({ ...input, property_id: propertyId, uploaded_by: user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'created', entityType: 'document', entityId: data.id });
  return data;
}

export async function updateDocument(propertyId: string, documentId: string, input: Tables['documents']['Update']) {
  await requirePropertyPermission(propertyId, 'document.manage');
  const supabase = await createClient();
  const { data, error } = await supabase.from('documents').update(input).eq('id', documentId).eq('property_id', propertyId).select().single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'updated', entityType: 'document', entityId: documentId });
  return data;
}

export async function deleteDocument(propertyId: string, documentId: string) {
  await requirePropertyPermission(propertyId, 'document.manage');
  const supabase = await createClient();
  const { error } = await supabase.from('documents').delete().eq('id', documentId).eq('property_id', propertyId);
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'deleted', entityType: 'document', entityId: documentId });
}

// Tasks
export async function createTask(propertyId: string, input: Omit<Tables['tasks']['Insert'], 'property_id'>) {
  const user = await requirePropertyPermission(propertyId, 'task.create');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...input, property_id: propertyId, created_by: user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'created', entityType: 'task', entityId: data.id });
  return data;
}

export async function updateTask(propertyId: string, taskId: string, input: Tables['tasks']['Update']) {
  await requirePropertyPermission(propertyId, 'task.manage');
  const supabase = await createClient();
  const { data, error } = await supabase.from('tasks').update(input).eq('id', taskId).eq('property_id', propertyId).select().single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'updated', entityType: 'task', entityId: taskId });
  return data;
}

export async function deleteTask(propertyId: string, taskId: string) {
  await requirePropertyPermission(propertyId, 'task.manage');
  const supabase = await createClient();
  const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('property_id', propertyId);
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'deleted', entityType: 'task', entityId: taskId });
}
