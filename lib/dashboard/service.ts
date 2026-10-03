import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAuthenticatedUser, requirePropertyPermission } from './authorization';
import { createServerServices } from '@/composition/services';
import type { Database } from '@/types/database';
import { serverCache } from '@/lib/cache/server-cache';

type Tables = Database['public']['Tables'];

export function sanitizePropertyUpdateInput(input: Tables['properties']['Update']) {
  const sanitized = { ...input } as Record<string, unknown>;
  for (const field of ['id', 'workspace_id', 'owner_id', 'created_at', 'updated_at']) {
    delete sanitized[field];
  }
  return sanitized;
}

async function recordActivityLog(params: {
  propertyId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  workspaceId?: string;
}) {
  const user = await requireAuthenticatedUser();
  const supabase = await createAdminClient();

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
  const supabase = await createAdminClient();
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
  const adminClient = await createAdminClient();

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

  const addressStr = (input as Record<string, unknown>).address as string || input.address_line_1 || '';
  const suburbStr = (input as Record<string, unknown>).suburb as string || input.city || '';
  const postcodeStr = (input as Record<string, unknown>).postcode as string || input.postal_code || '';
  const nameVal = input.name || addressStr || 'Unnamed Property';
  const carSpacesVal = (input as Record<string, unknown>).car_spaces ?? input.parking_spaces ?? 0;
  const imageUrlVal = (input as Record<string, unknown>).image as string || input.image_url || null;
  const customPropId = (input as Record<string, unknown>).property_id as string || ('PL-' + Math.floor(1000 + Math.random() * 9000).toString());

  const rawInput = { ...input } as Record<string, unknown>;
  delete rawInput.address;
  delete rawInput.image;
  delete rawInput.suburb;
  delete rawInput.postcode;
  delete rawInput.car_spaces;

  const payload = {
    ...rawInput,
    owner_id: user.id,
    name: nameVal,
    address_line_1: addressStr,
    city: suburbStr,
    postal_code: postcodeStr,
    parking_spaces: Number(carSpacesVal),
    image_url: imageUrlVal,
    property_id: customPropId,
  };

  const { data, error } = await adminClient
    .from('properties')
    .insert(payload as never)
    .select()
    .single();

  if (error) throw new Error(error.message);
  const row = data as { id: string };
  await recordActivityLog({ propertyId: row.id, action: 'created', entityType: 'property', entityId: row.id });
  serverCache.invalidateUser(user.id);
  serverCache.invalidateWorkspace(workspaceId);
  return data;
}

export async function updateProperty(propertyId: string, input: Tables['properties']['Update']) {
  await requirePropertyPermission(propertyId, 'property.update');
  const user = await requireAuthenticatedUser();
  const adminClient = await createAdminClient();

  const addressStr = (input as Record<string, unknown>).address as string || input.address_line_1;
  const suburbStr = (input as Record<string, unknown>).suburb as string || input.city;
  const postcodeStr = (input as Record<string, unknown>).postcode as string || input.postal_code;
  const carSpacesVal = (input as Record<string, unknown>).car_spaces ?? input.parking_spaces;

  const rawInput = sanitizePropertyUpdateInput(input);
  delete rawInput.address;
  delete rawInput.image;
  delete rawInput.suburb;
  delete rawInput.postcode;
  delete rawInput.car_spaces;

  const payload = {
    ...rawInput,
    ...(addressStr ? { address_line_1: addressStr } : {}),
    ...(suburbStr ? { city: suburbStr } : {}),
    ...(postcodeStr ? { postal_code: postcodeStr } : {}),
    ...(carSpacesVal !== undefined && carSpacesVal !== null ? { parking_spaces: Number(carSpacesVal) } : {}),
  };

  const { data, error } = await adminClient
    .from('properties')
    .update(payload as never)
    .eq('id', propertyId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'updated', entityType: 'property', entityId: propertyId });
  serverCache.invalidateUser(user.id);
  return data;
}

export async function deleteProperty(propertyId: string) {
  await requirePropertyPermission(propertyId, 'property.delete');
  const user = await requireAuthenticatedUser();
  const adminClient = await createAdminClient();

  try {
    await recordActivityLog({ propertyId, action: 'deleted', entityType: 'property', entityId: propertyId });
  } catch (logErr) {
    console.warn('Failed to record deletion activity log:', logErr);
  }

  // Nullify activity_logs.property_id before deleting so that append-only logs don't conflict
  try {
    await adminClient.from('activity_logs').update({ property_id: null } as never).eq('property_id', propertyId);
  } catch {}

  // Clean up related rows to ensure smooth deletion even before cascade migrations are run
  await adminClient.from('lease_tenants').delete().eq('property_id', propertyId);
  await adminClient.from('leases').delete().eq('property_id', propertyId);
  await adminClient.from('tenants').delete().eq('property_id', propertyId);
  await adminClient.from('invoices').delete().eq('property_id', propertyId);
  await adminClient.from('transactions').delete().eq('property_id', propertyId);
  await adminClient.from('maintenance_requests').delete().eq('property_id', propertyId);
  await adminClient.from('inspections').delete().eq('property_id', propertyId);
  await adminClient.from('documents').delete().eq('property_id', propertyId);
  await adminClient.from('tasks').delete().eq('property_id', propertyId);
  await adminClient.from('property_members').delete().eq('property_id', propertyId);

  const { error } = await adminClient.from('properties').delete().eq('id', propertyId);
  if (error) throw new Error(error.message);
  serverCache.invalidateUser(user.id);
}

export async function archiveProperty(propertyId: string) {
  await requirePropertyPermission(propertyId, 'property.delete');
  const user = await requireAuthenticatedUser();
  const adminClient = await createAdminClient();

  await recordActivityLog({ propertyId, action: 'archived', entityType: 'property', entityId: propertyId });

  const { data, error } = await adminClient
    .from('properties')
    .update({ status: 'archived', updated_at: new Date().toISOString() } as never)
    .eq('id', propertyId)
    .select('workspace_id')
    .single();

  if (error) throw new Error(error.message);
  serverCache.invalidateUser(user.id);
  const workspaceId = (data as unknown as { workspace_id?: string } | null)?.workspace_id;
  if (workspaceId) serverCache.invalidateWorkspace(workspaceId);
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
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('tenants')
    .insert({ ...input, property_id: propertyId } as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const row = data as { id: string };
  await recordActivityLog({ propertyId, action: 'created', entityType: 'tenant', entityId: row.id });
  return data;
}

export async function updateTenant(propertyId: string, tenantId: string, input: Tables['tenants']['Update']) {
  await requirePropertyPermission(propertyId, 'tenant.update');
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.from('tenants').update(input as never).eq('id', tenantId).eq('property_id', propertyId).select().single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'updated', entityType: 'tenant', entityId: tenantId });
  return data;
}

export async function deleteTenant(propertyId: string, tenantId: string) {
  await requirePropertyPermission(propertyId, 'tenant.update');
  const adminClient = await createAdminClient();

  // Delete junction rows
  await adminClient.from('lease_tenants').delete().eq('tenant_id', tenantId);

  const { error } = await adminClient.from('tenants').delete().eq('id', tenantId);
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'deleted', entityType: 'tenant', entityId: tenantId });
}

// Leases
export async function createLease(propertyId: string, input: Omit<Tables['leases']['Insert'], 'property_id'>, tenantIds?: string[]) {
  const user = await requirePropertyPermission(propertyId, 'lease.create');
  const adminClient = await createAdminClient();

  const { data: propData } = await adminClient
    .from('properties')
    .select('workspace_id')
    .eq('id', propertyId)
    .single();
  const workspaceId = (propData as any)?.workspace_id || '';

  const { leaseService } = await createServerServices();
  const createResult = await leaseService.createLease(
    {
      propertyId,
      unitId: input.unit_id || undefined,
      startDate: input.start_date,
      endDate: input.end_date || undefined,
      rentAmount: Number(input.rent_amount) || 0,
      securityDeposit: Number(input.security_deposit) || 0,
      paymentDueDay: Number(input.payment_due_day) || 1,
      rentFrequency: (input.rent_frequency as any) || 'monthly',
      notes: input.notes || undefined,
      tenantIds: tenantIds || [],
    },
    { workspaceId, userId: user.id }
  );

  if (!createResult.success) {
    throw new Error(createResult.error.message);
  }

  // Ensure lease_tenants is populated with adminClient and tenant's property_id is synced
  if (tenantIds && tenantIds.length > 0) {
    for (let i = 0; i < tenantIds.length; i++) {
      const tid = tenantIds[i];
      if (!tid) continue;
      await adminClient.from('tenants').update({ property_id: propertyId } as never).eq('id', tid);
      await adminClient.from('lease_tenants').upsert(
        {
          lease_id: createResult.data.id,
          tenant_id: tid,
          property_id: propertyId,
          role: i === 0 ? 'primary' : 'co-tenant',
          is_primary: i === 0,
        } as never,
        { onConflict: 'lease_id,tenant_id' }
      );
    }
  }

  // Fetch created row for exact legacy return shape
  const { data: rawLease } = await adminClient
    .from('leases')
    .select('*')
    .eq('id', createResult.data.id)
    .single();

  await recordActivityLog({ propertyId, action: 'created', entityType: 'lease', entityId: createResult.data.id });
  return rawLease;
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
  const adminClient = await createAdminClient();

  const isPeriodic = input.lease.leaseType === 'Periodic';
  const effectiveEndDate = isPeriodic ? null : (input.lease.endDate || null);

  // 1. Create Lease
  const leasePayload: Record<string, unknown> = {
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

  const { data: newLease, error: leaseErr } = await adminClient
    .from('leases')
    .insert(leasePayload as never)
    .select()
    .single();

  if (leaseErr) throw new Error(leaseErr.message);
  const leaseObj = newLease as { id: string };

  // 2. Insert tenants and link to lease
  const createdTenants: Array<Record<string, unknown>> = [];
  for (let i = 0; i < input.tenants.length; i++) {
    const t = input.tenants[i];
    const { data: newTenant, error: tenantErr } = await adminClient
      .from('tenants')
      .insert({
        property_id: propertyId,
        first_name: t.firstName,
        last_name: t.lastName || '',
        email: t.email,
        phone: t.phone || null,
        status: 'active',
      } as never)
      .select()
      .single();

    if (tenantErr) throw new Error(tenantErr.message);
    const tenantObj = newTenant as { id: string };
    createdTenants.push(newTenant as Record<string, unknown>);

    // Link to lease_tenants
    const { error: linkErr } = await adminClient
      .from('lease_tenants')
      .insert({
        lease_id: leaseObj.id,
        tenant_id: tenantObj.id,
        property_id: propertyId,
        role: i === 0 ? 'primary' : 'co-tenant',
        is_primary: i === 0,
      } as never);

    if (linkErr) throw new Error(linkErr.message);

    await recordActivityLog({ propertyId, action: 'created', entityType: 'tenant', entityId: tenantObj.id });
  }

  await recordActivityLog({ propertyId, action: 'created', entityType: 'lease', entityId: leaseObj.id });

  return { lease: newLease, tenants: createdTenants };
}

export interface LeaseTenantAssignmentInput {
  tenantId: string;
  role?: 'primary' | 'co-tenant' | 'guarantor';
  isPrimary?: boolean;
}

export async function updateLease(
  propertyId: string,
  leaseId: string,
  input: Tables['leases']['Update'],
  tenantAssignments?: LeaseTenantAssignmentInput[] | string[]
) {
  await requirePropertyPermission(propertyId, 'lease.update');
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('leases')
    .update(input as never)
    .eq('id', leaseId)
    .eq('property_id', propertyId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (tenantAssignments !== undefined) {
    // Delete existing junction rows for this lease
    await adminClient.from('lease_tenants').delete().eq('lease_id', leaseId);

    // Format assignments
    const assignments: LeaseTenantAssignmentInput[] = tenantAssignments.map((item, idx) => {
      if (typeof item === 'string') {
        return {
          tenantId: item,
          role: idx === 0 ? 'primary' : 'co-tenant',
          isPrimary: idx === 0,
        };
      }
      return {
        tenantId: item.tenantId,
        role: item.role || (idx === 0 ? 'primary' : 'co-tenant'),
        isPrimary: item.isPrimary ?? (idx === 0),
      };
    });

    if (assignments.length > 0 && !assignments.some((a) => a.isPrimary)) {
      assignments[0].isPrimary = true;
      assignments[0].role = 'primary';
    }

    for (const assign of assignments) {
      if (!assign.tenantId) continue;
      // Sync tenant property_id to satisfy composite foreign key (tenant_id, property_id)
      await adminClient.from('tenants').update({ property_id: propertyId } as never).eq('id', assign.tenantId);
      await adminClient.from('lease_tenants').insert({
        lease_id: leaseId,
        tenant_id: assign.tenantId,
        property_id: propertyId,
        role: assign.role || 'primary',
        is_primary: assign.isPrimary ?? false,
      } as never);
    }
  }

  await recordActivityLog({ propertyId, action: 'updated', entityType: 'lease', entityId: leaseId });
  return data;
}

export async function deleteLease(propertyId: string, leaseId: string) {
  await requirePropertyPermission(propertyId, 'lease.delete');
  const adminClient = await createAdminClient();

  // Delete junction rows
  await adminClient.from('lease_tenants').delete().eq('lease_id', leaseId);

  const { error } = await adminClient
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
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('leases')
    .update({ end_date: null, status: 'active' } as never)
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
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('leases')
    .update({ status } as never)
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
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('invoices')
    .insert({ ...input, property_id: propertyId, created_by: user.id } as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const row = data as { id: string };
  await recordActivityLog({ propertyId, action: 'created', entityType: 'invoice', entityId: row.id });
  return data;
}

export async function updateInvoice(propertyId: string, invoiceId: string, input: Tables['invoices']['Update']) {
  await requirePropertyPermission(propertyId, 'financial.manage');
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.from('invoices').update(input as never).eq('id', invoiceId).eq('property_id', propertyId).select().single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'updated', entityType: 'invoice', entityId: invoiceId });
  return data;
}

export async function deleteInvoice(propertyId: string, invoiceId: string) {
  await requirePropertyPermission(propertyId, 'financial.manage');
  const adminClient = await createAdminClient();
  const { error } = await adminClient.from('invoices').update({ status: 'void' } as never).eq('id', invoiceId).eq('property_id', propertyId);
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'voided', entityType: 'invoice', entityId: invoiceId });
}

// Financial Transactions
export async function createPayment(propertyId: string, input: any) {
  const user = await requirePropertyPermission(propertyId, 'financial.manage');
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('transactions')
    .insert({
      ...input,
      property_id: propertyId,
      transaction_type: 'income',
      created_by: user.id,
    } as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const row = data as { id: string };
  await recordActivityLog({ propertyId, action: 'created', entityType: 'transaction', entityId: row.id, metadata: { amount: input.amount } });
  await createNotification({
    userId: user.id,
    propertyId,
    type: 'payment_recorded',
    title: 'Payment recorded',
    body: `A payment of ${input.amount} was recorded.`,
    actionUrl: `/dashboard/money?tab=income`,
  });
  return data;
}

export async function updatePayment(propertyId: string, paymentId: string, input: any) {
  await requirePropertyPermission(propertyId, 'financial.manage');
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.from('transactions').update(input as never).eq('id', paymentId).eq('property_id', propertyId).select().single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'updated', entityType: 'transaction', entityId: paymentId });
  return data;
}

export async function deletePayment(propertyId: string, paymentId: string) {
  await requirePropertyPermission(propertyId, 'financial.manage');
  const adminClient = await createAdminClient();
  const { error } = await adminClient.from('transactions').delete().eq('id', paymentId).eq('property_id', propertyId);
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'deleted', entityType: 'transaction', entityId: paymentId });
}

export async function createExpense(propertyId: string, input: any) {
  const user = await requirePropertyPermission(propertyId, 'financial.manage');
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('transactions')
    .insert({
      ...input,
      property_id: propertyId,
      transaction_type: 'expense',
      created_by: user.id,
    } as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const row = data as { id: string };
  await recordActivityLog({ propertyId, action: 'created', entityType: 'transaction', entityId: row.id });
  return data;
}

export async function updateExpense(propertyId: string, expenseId: string, input: any) {
  await requirePropertyPermission(propertyId, 'financial.manage');
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.from('transactions').update(input as never).eq('id', expenseId).eq('property_id', propertyId).select().single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'updated', entityType: 'transaction', entityId: expenseId });
  return data;
}

export async function deleteExpense(propertyId: string, expenseId: string) {
  await requirePropertyPermission(propertyId, 'financial.manage');
  const adminClient = await createAdminClient();
  const { error } = await adminClient.from('transactions').delete().eq('id', expenseId).eq('property_id', propertyId);
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'deleted', entityType: 'transaction', entityId: expenseId });
}

// Maintenance
export async function createMaintenanceRequest(propertyId: string, input: Omit<Tables['maintenance_requests']['Insert'], 'property_id'>) {
  const user = await requirePropertyPermission(propertyId, 'maintenance.create');
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('maintenance_requests')
    .insert({ ...input, property_id: propertyId, created_by: user.id } as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const row = data as { id: string };
  await recordActivityLog({
    propertyId,
    action: 'created',
    entityType: 'maintenance_request',
    entityId: row.id,
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
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('maintenance_requests')
    .update(input as never)
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
  const adminClient = await createAdminClient();
  const { error } = await adminClient.from('maintenance_requests').update({ status: 'cancelled' } as never).eq('id', requestId).eq('property_id', propertyId);
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'cancelled', entityType: 'maintenance_request', entityId: requestId });
}

// Inspections
export async function createInspection(propertyId: string, input: Omit<Tables['inspections']['Insert'], 'property_id'>) {
  const user = await requirePropertyPermission(propertyId, 'inspection.create');
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('inspections')
    .insert({ ...input, property_id: propertyId, created_by: user.id } as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const row = data as { id: string };
  await recordActivityLog({ propertyId, action: 'created', entityType: 'inspection', entityId: row.id });
  return data;
}

export async function updateInspection(propertyId: string, inspectionId: string, input: Tables['inspections']['Update']) {
  await requirePropertyPermission(propertyId, 'inspection.create');
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('inspections')
    .update(input as never)
    .eq('id', inspectionId)
    .eq('property_id', propertyId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'updated', entityType: 'inspection', entityId: inspectionId });
  return data;
}

export async function deleteInspection(propertyId: string, inspectionId: string) {
  await requirePropertyPermission(propertyId, 'inspection.create');
  const adminClient = await createAdminClient();
  const { error } = await adminClient.from('inspections').update({ status: 'cancelled' } as never).eq('id', inspectionId).eq('property_id', propertyId);
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'cancelled', entityType: 'inspection', entityId: inspectionId });
}

// Documents
export async function createDocument(propertyId: string, input: Omit<Tables['documents']['Insert'], 'property_id'>) {
  const user = await requirePropertyPermission(propertyId, 'document.create');
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('documents')
    .insert({ ...input, property_id: propertyId, uploaded_by: user.id } as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const row = data as { id: string };
  await recordActivityLog({ propertyId, action: 'created', entityType: 'document', entityId: row.id });
  return data;
}

export async function updateDocument(propertyId: string, documentId: string, input: Tables['documents']['Update']) {
  await requirePropertyPermission(propertyId, 'document.create');
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.from('documents').update(input as never).eq('id', documentId).eq('property_id', propertyId).select().single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'updated', entityType: 'document', entityId: documentId });
  return data;
}

export async function deleteDocument(propertyId: string, documentId: string) {
  await requirePropertyPermission(propertyId, 'document.create');
  const adminClient = await createAdminClient();
  const { error } = await adminClient.from('documents').delete().eq('id', documentId).eq('property_id', propertyId);
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'deleted', entityType: 'document', entityId: documentId });
}

// Tasks
export async function createTask(propertyId: string, input: Omit<Tables['tasks']['Insert'], 'property_id'>) {
  const user = await requirePropertyPermission(propertyId, 'task.create');
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('tasks')
    .insert({ ...input, property_id: propertyId, created_by: user.id } as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const row = data as { id: string };
  await recordActivityLog({ propertyId, action: 'created', entityType: 'task', entityId: row.id });
  return data;
}

export async function updateTask(propertyId: string, taskId: string, input: Tables['tasks']['Update']) {
  await requirePropertyPermission(propertyId, 'task.create');
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.from('tasks').update(input as never).eq('id', taskId).eq('property_id', propertyId).select().single();
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'updated', entityType: 'task', entityId: taskId });
  return data;
}

export async function deleteTask(propertyId: string, taskId: string) {
  await requirePropertyPermission(propertyId, 'task.create');
  const adminClient = await createAdminClient();
  const { error } = await adminClient.from('tasks').delete().eq('id', taskId).eq('property_id', propertyId);
  if (error) throw new Error(error.message);
  await recordActivityLog({ propertyId, action: 'deleted', entityType: 'task', entityId: taskId });
}
