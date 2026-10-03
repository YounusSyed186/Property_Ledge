'use server';

import { revalidatePath } from 'next/cache';
import { requireAuthenticatedUser, requirePropertyAccess } from '@/lib/dashboard/authorization';
import { getActiveWorkspaceId } from '@/lib/auth/authorization';
import * as queries from '@/lib/dashboard/queries';
import * as service from '@/lib/dashboard/service';
import { createServerServices } from '@/composition/services';
import type { RenewLeaseDTO } from '@/modules/leases/application/dto/lease-dto';
import type { Database } from '@/types/database';

type Tables = Database['public']['Tables'];

function revalidateDashboard(...paths: string[]) {
  paths.forEach((p) => revalidatePath(p));
}

// Reads
export async function fetchDashboardDataAction(propertyId?: string | null) {
  if (propertyId) {
    await requirePropertyAccess(propertyId);
    const [overview, needsAttention, reports, leases] = await Promise.all([
      queries.getDashboardOverview(propertyId),
      queries.getNeedsAttention(propertyId),
      queries.getReportsSummary(propertyId),
      queries.getLeases(propertyId),
    ]);
    return { overview, needsAttention, reports, leases };
  }

  await requireAuthenticatedUser();
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) throw new Error('No active workspace selected.');

  const [overview, needsAttention, reports, leases] = await Promise.all([
    queries.getWorkspaceDashboardOverview(workspaceId),
    queries.getWorkspaceNeedsAttention(workspaceId),
    queries.getWorkspaceReportsSummary(workspaceId),
    queries.getAllWorkspaceLeases(workspaceId),
  ]);


  return { overview, needsAttention, reports, leases };
}

export async function fetchDashboardOverview(propertyId?: string | null) {
  if (propertyId) {
    await requirePropertyAccess(propertyId);
    return queries.getDashboardOverview(propertyId);
  }
  await requireAuthenticatedUser();
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) throw new Error('No active workspace selected.');
  return queries.getWorkspaceDashboardOverview(workspaceId);
}

export async function fetchDashboardProperties() {
  const user = await requireAuthenticatedUser();
  return queries.getPropertiesList();
}

export async function fetchDashboardProperty(propertyId: string) {
  await requirePropertyAccess(propertyId);
  return queries.getPropertyDetail(propertyId);
}

export async function fetchDashboardUnits(propertyId: string) {
  await requirePropertyAccess(propertyId);
  return queries.getUnits(propertyId);
}

export async function fetchDashboardTenants(propertyId?: string | null) {
  if (propertyId) {
    await requirePropertyAccess(propertyId);
    return queries.getTenants(propertyId);
  }
  await requireAuthenticatedUser();
  return queries.getAllWorkspaceTenants();
}

export async function fetchDashboardLeases(propertyId?: string | null) {
  if (propertyId) {
    await requirePropertyAccess(propertyId);
    return queries.getLeases(propertyId);
  }
  await requireAuthenticatedUser();
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) throw new Error('No active workspace selected.');
  return queries.getAllWorkspaceLeases(workspaceId);
}

export async function fetchDashboardLease(propertyId: string, leaseId: string) {
  await requirePropertyAccess(propertyId);
  return queries.getLeaseDetail(propertyId, leaseId);
}

export async function fetchDashboardMaintenanceDetail(propertyId: string, requestId: string) {
  await requirePropertyAccess(propertyId);
  return queries.getMaintenanceDetail(propertyId, requestId);
}

export async function fetchDashboardInspectionDetail(propertyId: string, inspectionId: string) {
  await requirePropertyAccess(propertyId);
  return queries.getInspectionDetail(propertyId, inspectionId);
}

export async function fetchDashboardInvoices(propertyId: string) {
  if (!propertyId) return [];
  await requirePropertyAccess(propertyId);
  return queries.getInvoices(propertyId);
}

export async function fetchDashboardPayments(propertyId: string) {
  if (!propertyId) return [];
  await requirePropertyAccess(propertyId);
  return queries.getPayments(propertyId);
}

export async function fetchDashboardExpenses(propertyId: string) {
  if (!propertyId) return [];
  await requirePropertyAccess(propertyId);
  return queries.getExpenses(propertyId);
}

export async function fetchDashboardMaintenance(propertyId: string) {
  await requirePropertyAccess(propertyId);
  return queries.getMaintenanceRequests(propertyId);
}

export async function fetchDashboardInspections(propertyId: string) {
  await requirePropertyAccess(propertyId);
  return queries.getInspections(propertyId);
}

export async function fetchDashboardDocuments(propertyId: string) {
  await requirePropertyAccess(propertyId);
  return queries.getDocuments(propertyId);
}

export async function fetchDashboardTasks(propertyId: string) {
  await requirePropertyAccess(propertyId);
  return queries.getTasks(propertyId);
}

export async function fetchDashboardActivity(propertyId?: string | null) {
  if (propertyId) {
    await requirePropertyAccess(propertyId);
    return queries.getActivityLogs(propertyId);
  }
  await requireAuthenticatedUser();
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return [];
  return queries.getWorkspaceActivityLogs(workspaceId);
}

export async function fetchDashboardReports(propertyId?: string | null) {
  if (propertyId) {
    await requirePropertyAccess(propertyId);
    return queries.getReportsSummary(propertyId);
  }
  await requireAuthenticatedUser();
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) throw new Error('No active workspace selected.');
  return queries.getWorkspaceReportsSummary(workspaceId);
}

export async function fetchUserWorkspaces() {
  await requireAuthenticatedUser();
  return queries.getUserWorkspaces();
}

export async function fetchDashboardTenant(propertyId: string, tenantId: string) {
  await requirePropertyAccess(propertyId);
  return queries.getTenantDetail(propertyId, tenantId);
}

export async function fetchDashboardTenantTabData(
  propertyId: string,
  tenantId: string,
  tab: 'payments' | 'maintenance' | 'documents' | 'activity'
) {
  await requirePropertyAccess(propertyId);
  switch (tab) {
    case 'payments':
      return Promise.all([
        queries.getTenantPayments(propertyId, tenantId),
        queries.getTenantInvoices(propertyId, tenantId),
      ]).then(([payments, invoices]) => ({ payments, invoices }));
    case 'maintenance':
      return queries.getTenantMaintenance(propertyId, tenantId).then((maintenance) => ({ maintenance }));
    case 'documents':
      return queries.getTenantDocuments(propertyId, tenantId).then((documents) => ({ documents }));
    case 'activity':
      return queries.getTenantActivity(propertyId, tenantId).then((activity) => ({ activity }));
  }
}

export async function fetchDashboardUnit(propertyId: string, unitId: string) {
  await requirePropertyAccess(propertyId);
  return queries.getUnitDetail(propertyId, unitId);
}

export async function fetchDashboardTeam(propertyId: string) {
  await requirePropertyAccess(propertyId);
  return queries.getPropertyTeam(propertyId);
}

export async function fetchNeedsAttention(propertyId?: string | null) {
  if (propertyId) {
    await requirePropertyAccess(propertyId);
    return queries.getNeedsAttention(propertyId);
  }
  await requireAuthenticatedUser();
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) throw new Error('No active workspace selected.');
  return queries.getWorkspaceNeedsAttention(workspaceId);
}

// Property CRUD
export async function handleCreateProperty(input: Tables['properties']['Insert']) {
  const data = await service.createProperty(input);
  revalidateDashboard('/dashboard/properties', '/dashboard');
  return { success: true, data };
}

export async function handleUpdateProperty(propertyId: string, input: Tables['properties']['Update']) {
  const data = await service.updateProperty(propertyId, input);
  revalidateDashboard('/dashboard/properties', `/dashboard/properties/${propertyId}`);
  return { success: true, data };
}

export async function handleDeleteProperty(propertyId: string) {
  await service.archiveProperty(propertyId);
  revalidateDashboard('/dashboard/properties', '/dashboard');
  return { success: true };
}

// Unit CRUD
export async function handleCreateUnit(propertyId: string, input: Omit<Tables['units']['Insert'], 'property_id'>) {
  const data = await service.createUnit(propertyId, input);
  revalidateDashboard('/dashboard/units', `/dashboard/properties/${propertyId}`);
  return { success: true, data };
}

export async function handleUpdateUnit(propertyId: string, unitId: string, input: Tables['units']['Update']) {
  const data = await service.updateUnit(propertyId, unitId, input);
  revalidateDashboard('/dashboard/units', `/dashboard/properties/${propertyId}`, `/dashboard/properties/${propertyId}/units/${unitId}`);
  return { success: true, data };
}

export async function handleDeleteUnit(propertyId: string, unitId: string) {
  await service.deleteUnit(propertyId, unitId);
  revalidateDashboard('/dashboard/units', `/dashboard/properties/${propertyId}`);
  return { success: true };
}

export async function fetchAllWorkspaceTenants(propertyId?: string | null) {
  if (propertyId) {
    await requirePropertyAccess(propertyId);
    return queries.getTenants(propertyId);
  }
  await requireAuthenticatedUser();
  const workspaceId = await getActiveWorkspaceId();
  return queries.getAllWorkspaceTenants(workspaceId);
}

export async function fetchAllWorkspaceLeases(propertyId?: string | null) {
  if (propertyId) {
    await requirePropertyAccess(propertyId);
    return queries.getLeases(propertyId);
  }
  await requireAuthenticatedUser();
  const workspaceId = await getActiveWorkspaceId();
  return queries.getAllWorkspaceLeases(workspaceId);
}

// Tenancy Setup (Atomic Tenant + Lease + Bond creation)
export async function handleSetupTenancy(propertyId: string, input: service.TenancySetupInput) {
  const data = await service.setupTenancyWithLease(propertyId, input);
  revalidateDashboard('/dashboard/tenants', '/dashboard/people', '/dashboard/leases', `/dashboard/properties/${propertyId}`);
  return { success: true, data };
}

// Tenant CRUD
export async function handleCreateTenant(propertyId: string, input: Omit<Tables['tenants']['Insert'], 'property_id'>) {
  const data = await service.createTenant(propertyId, input);
  revalidateDashboard('/dashboard/tenants', '/dashboard/people', `/dashboard/properties/${propertyId}`);
  return { success: true, data };
}

export async function handleUpdateTenant(propertyId: string, tenantId: string, input: Tables['tenants']['Update']) {
  const data = await service.updateTenant(propertyId, tenantId, input);
  revalidateDashboard('/dashboard/tenants', '/dashboard/people', `/dashboard/properties/${propertyId}`);
  return { success: true, data };
}

export async function handleDeleteTenant(propertyId: string, tenantId: string) {
  await service.deleteTenant(propertyId, tenantId);
  revalidateDashboard('/dashboard/tenants', '/dashboard/people', `/dashboard/properties/${propertyId}`);
  return { success: true };
}

// Lease CRUD
export async function handleCreateLease(
  propertyId: string,
  input: Omit<Tables['leases']['Insert'], 'property_id'>,
  tenantIds?: string[]
) {
  const data = await service.createLease(propertyId, input, tenantIds);
  revalidateDashboard('/dashboard/leases', `/dashboard/properties/${propertyId}`);
  return { success: true, data };
}

export async function handleUpdateLease(
  propertyId: string,
  leaseId: string,
  input: Tables['leases']['Update'],
  tenantAssignments?: service.LeaseTenantAssignmentInput[] | string[]
) {
  const data = await service.updateLease(propertyId, leaseId, input, tenantAssignments);
  revalidateDashboard('/dashboard/leases', `/dashboard/properties/${propertyId}`, `/dashboard/leases/${leaseId}`);
  return { success: true, data };
}

export async function handleConvertToPeriodic(propertyId: string, leaseId: string) {
  const data = await service.convertToPeriodic(propertyId, leaseId);
  revalidateDashboard('/dashboard/leases', `/dashboard/properties/${propertyId}`);
  return { success: true, data };
}

export async function handleUpdateLeaseStatus(propertyId: string, leaseId: string, status: string) {
  const data = await service.updateLeaseStatus(propertyId, leaseId, status);
  revalidateDashboard('/dashboard/leases', `/dashboard/properties/${propertyId}`);
  return { success: true, data };
}

export async function handleDeleteLease(propertyId: string, leaseId: string) {
  await service.deleteLease(propertyId, leaseId);
  revalidateDashboard('/dashboard/leases', `/dashboard/properties/${propertyId}`);
  return { success: true };
}

export async function handleRenewLease(previousLeaseId: string, input: RenewLeaseDTO) {
  const user = await requireAuthenticatedUser();
  await requirePropertyAccess(input.propertyId);
  const workspaceId = await getActiveWorkspaceId();

  const services = await createServerServices();
  const context = {
    userId: user.id,
    workspaceId: workspaceId || undefined,
  };

  const result = await services.leaseService.renewLease(
    {
      ...input,
      previousLeaseId,
    },
    context
  );

  if (!result.success) {
    throw new Error(result.error.message);
  }

  revalidateDashboard(
    '/dashboard/leases',
    `/dashboard/properties/${input.propertyId}`,
    `/dashboard/leases/${previousLeaseId}`,
    `/dashboard/leases/${result.data.id}`
  );

  return { success: true, data: result.data };
}

export async function handleDoNotRenew(propertyId: string, leaseId: string, notes?: string) {
  await requirePropertyAccess(propertyId);
  const existingLease = await queries.getLeases(propertyId);
  const target: any = (existingLease as any[] || []).find((l: any) => l.id === leaseId);

  const updatedNotes = notes
    ? (target?.notes ? `${target.notes}\n[Non-Renewal]: ${notes}` : `[Non-Renewal]: ${notes}`)
    : (target?.notes || null);

  // If expired or end date passed, set status to expired; otherwise append non-renewal note
  const isPastEnd = target?.end_date && new Date(target.end_date) <= new Date();
  const newStatus = isPastEnd ? 'expired' : (target?.status || 'active');

  await service.updateLease(propertyId, leaseId, {
    notes: updatedNotes,
    status: newStatus,
  });

  revalidateDashboard(
    '/dashboard/leases',
    `/dashboard/properties/${propertyId}`,
    `/dashboard/leases/${leaseId}`
  );

  return { success: true };
}

export async function fetchLeaseRenewalHistory(leaseId: string) {
  await requireAuthenticatedUser();
  const services = await createServerServices();
  const result = await services.leaseService.getRenewalHistory(leaseId);
  if (!result.success) {
    return [];
  }
  return result.data;
}

// Invoice CRUD
export async function handleCreateInvoice(propertyId: string, input: Omit<Tables['invoices']['Insert'], 'property_id'>) {
  const data = await service.createInvoice(propertyId, input);
  revalidateDashboard('/dashboard/invoices');
  return { success: true, data };
}

export async function handleUpdateInvoice(propertyId: string, invoiceId: string, input: Tables['invoices']['Update']) {
  const data = await service.updateInvoice(propertyId, invoiceId, input);
  revalidateDashboard('/dashboard/invoices');
  return { success: true, data };
}

export async function handleDeleteInvoice(propertyId: string, invoiceId: string) {
  await service.deleteInvoice(propertyId, invoiceId);
  revalidateDashboard('/dashboard/invoices');
  return { success: true };
}

// Payment CRUD
export async function handleCreatePayment(propertyId: string, input: Omit<Tables['payments']['Insert'], 'property_id'>) {
  const data = await service.createPayment(propertyId, input);
  revalidateDashboard('/dashboard/payments');
  return { success: true, data };
}

export async function handleUpdatePayment(propertyId: string, paymentId: string, input: Tables['payments']['Update']) {
  const data = await service.updatePayment(propertyId, paymentId, input);
  revalidateDashboard('/dashboard/payments');
  return { success: true, data };
}

export async function handleDeletePayment(propertyId: string, paymentId: string) {
  await service.deletePayment(propertyId, paymentId);
  revalidateDashboard('/dashboard/payments');
  return { success: true };
}

// Expense CRUD
export async function handleCreateExpense(propertyId: string, input: Omit<Tables['expenses']['Insert'], 'property_id'>) {
  const data = await service.createExpense(propertyId, input);
  revalidateDashboard('/dashboard/expenses');
  return { success: true, data };
}

export async function handleUpdateExpense(propertyId: string, expenseId: string, input: Tables['expenses']['Update']) {
  const data = await service.updateExpense(propertyId, expenseId, input);
  revalidateDashboard('/dashboard/expenses');
  return { success: true, data };
}

export async function handleDeleteExpense(propertyId: string, expenseId: string) {
  await service.deleteExpense(propertyId, expenseId);
  revalidateDashboard('/dashboard/expenses');
  return { success: true };
}

// Maintenance CRUD
export async function handleCreateMaintenance(
  propertyId: string,
  input: Omit<Tables['maintenance_requests']['Insert'], 'property_id'>
) {
  const data = await service.createMaintenanceRequest(propertyId, input);
  revalidateDashboard('/dashboard/maintenance');
  return { success: true, data };
}

export async function handleUpdateMaintenance(
  propertyId: string,
  requestId: string,
  input: Tables['maintenance_requests']['Update']
) {
  const data = await service.updateMaintenanceRequest(propertyId, requestId, input);
  revalidateDashboard('/dashboard/maintenance');
  return { success: true, data };
}

export async function handleDeleteMaintenance(propertyId: string, requestId: string) {
  await service.deleteMaintenanceRequest(propertyId, requestId);
  revalidateDashboard('/dashboard/maintenance');
  return { success: true };
}

// Inspection CRUD
export async function handleCreateInspection(
  propertyId: string,
  input: Omit<Tables['inspections']['Insert'], 'property_id'>
) {
  const data = await service.createInspection(propertyId, input);
  revalidateDashboard('/dashboard/inspections');
  return { success: true, data };
}

export async function handleUpdateInspection(
  propertyId: string,
  inspectionId: string,
  input: Tables['inspections']['Update']
) {
  const data = await service.updateInspection(propertyId, inspectionId, input);
  revalidateDashboard('/dashboard/inspections');
  return { success: true, data };
}

export async function handleDeleteInspection(propertyId: string, inspectionId: string) {
  await service.deleteInspection(propertyId, inspectionId);
  revalidateDashboard('/dashboard/inspections');
  return { success: true };
}

// Document CRUD
export async function handleCreateDocument(
  propertyId: string,
  input: Omit<Tables['documents']['Insert'], 'property_id'>
) {
  const data = await service.createDocument(propertyId, input);
  revalidateDashboard('/dashboard/documents');
  return { success: true, data };
}

export async function handleUpdateDocument(
  propertyId: string,
  documentId: string,
  input: Tables['documents']['Update']
) {
  const data = await service.updateDocument(propertyId, documentId, input);
  revalidateDashboard('/dashboard/documents');
  return { success: true, data };
}

export async function handleDeleteDocument(propertyId: string, documentId: string) {
  await service.deleteDocument(propertyId, documentId);
  revalidateDashboard('/dashboard/documents');
  return { success: true };
}

// Task CRUD
export async function handleCreateTask(propertyId: string, input: Omit<Tables['tasks']['Insert'], 'property_id'>) {
  const data = await service.createTask(propertyId, input);
  revalidateDashboard('/dashboard/tasks');
  return { success: true, data };
}

export async function handleUpdateTask(propertyId: string, taskId: string, input: Tables['tasks']['Update']) {
  const data = await service.updateTask(propertyId, taskId, input);
  revalidateDashboard('/dashboard/tasks');
  return { success: true, data };
}

export async function handleDeleteTask(propertyId: string, taskId: string) {
  await service.deleteTask(propertyId, taskId);
  revalidateDashboard('/dashboard/tasks');
  return { success: true };
}
