'use server';

import { revalidatePath } from 'next/cache';
import { requireAuthenticatedUser, requirePropertyAccess } from '@/lib/dashboard/authorization';
import * as queries from '@/lib/dashboard/queries';
import * as service from '@/lib/dashboard/service';
import type { Database } from '@/types/database';

type Tables = Database['public']['Tables'];

function revalidateDashboard(...paths: string[]) {
  paths.forEach((p) => revalidatePath(p));
}

// Reads
export async function fetchDashboardOverview(propertyId: string) {
  await requirePropertyAccess(propertyId);
  return queries.getDashboardOverview(propertyId);
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

export async function fetchDashboardTenants(propertyId: string) {
  await requirePropertyAccess(propertyId);
  return queries.getTenants(propertyId);
}

export async function fetchDashboardLeases(propertyId: string) {
  await requirePropertyAccess(propertyId);
  return queries.getLeases(propertyId);
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
  await requirePropertyAccess(propertyId);
  return queries.getInvoices(propertyId);
}

export async function fetchDashboardPayments(propertyId: string) {
  await requirePropertyAccess(propertyId);
  return queries.getPayments(propertyId);
}

export async function fetchDashboardExpenses(propertyId: string) {
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

export async function fetchDashboardActivity(propertyId: string) {
  await requirePropertyAccess(propertyId);
  return queries.getActivityLogs(propertyId);
}

export async function fetchDashboardReports(propertyId: string) {
  await requirePropertyAccess(propertyId);
  return queries.getReportsSummary(propertyId);
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

export async function fetchNeedsAttention(propertyId: string) {
  await requirePropertyAccess(propertyId);
  return queries.getNeedsAttention(propertyId);
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
  await service.deleteProperty(propertyId);
  revalidateDashboard('/dashboard/properties', '/dashboard');
  return { success: true };
}

// Unit CRUD
export async function handleCreateUnit(propertyId: string, input: Omit<Tables['units']['Insert'], 'property_id'>) {
  const data = await service.createUnit(propertyId, input);
  revalidateDashboard('/dashboard/units', '/dashboard', `/dashboard/properties/${propertyId}`);
  return { success: true, data };
}

export async function handleUpdateUnit(propertyId: string, unitId: string, input: Tables['units']['Update']) {
  const data = await service.updateUnit(propertyId, unitId, input);
  revalidateDashboard('/dashboard/units', `/dashboard/properties/${propertyId}`, `/dashboard/properties/${propertyId}/units/${unitId}`);
  return { success: true, data };
}

export async function handleDeleteUnit(propertyId: string, unitId: string) {
  await service.deleteUnit(propertyId, unitId);
  revalidateDashboard('/dashboard/units', '/dashboard', `/dashboard/properties/${propertyId}`);
  return { success: true };
}

// Tenant CRUD
export async function handleCreateTenant(propertyId: string, input: Omit<Tables['tenants']['Insert'], 'property_id'>) {
  const data = await service.createTenant(propertyId, input);
  revalidateDashboard('/dashboard/tenants', '/dashboard');
  return { success: true, data };
}

export async function handleUpdateTenant(propertyId: string, tenantId: string, input: Tables['tenants']['Update']) {
  const data = await service.updateTenant(propertyId, tenantId, input);
  revalidateDashboard('/dashboard/tenants');
  return { success: true, data };
}

export async function handleDeleteTenant(propertyId: string, tenantId: string) {
  await service.deleteTenant(propertyId, tenantId);
  revalidateDashboard('/dashboard/tenants', '/dashboard');
  return { success: true };
}

// Lease CRUD
export async function handleCreateLease(
  propertyId: string,
  input: Omit<Tables['leases']['Insert'], 'property_id'>,
  tenantIds?: string[]
) {
  const data = await service.createLease(propertyId, input, tenantIds);
  revalidateDashboard('/dashboard/leases', '/dashboard');
  return { success: true, data };
}

export async function handleUpdateLease(propertyId: string, leaseId: string, input: Tables['leases']['Update']) {
  const data = await service.updateLease(propertyId, leaseId, input);
  revalidateDashboard('/dashboard/leases');
  return { success: true, data };
}

export async function handleDeleteLease(propertyId: string, leaseId: string) {
  await service.deleteLease(propertyId, leaseId);
  revalidateDashboard('/dashboard/leases', '/dashboard');
  return { success: true };
}

// Invoice CRUD
export async function handleCreateInvoice(propertyId: string, input: Omit<Tables['invoices']['Insert'], 'property_id'>) {
  const data = await service.createInvoice(propertyId, input);
  revalidateDashboard('/dashboard/invoices', '/dashboard');
  return { success: true, data };
}

export async function handleUpdateInvoice(propertyId: string, invoiceId: string, input: Tables['invoices']['Update']) {
  const data = await service.updateInvoice(propertyId, invoiceId, input);
  revalidateDashboard('/dashboard/invoices');
  return { success: true, data };
}

export async function handleDeleteInvoice(propertyId: string, invoiceId: string) {
  await service.deleteInvoice(propertyId, invoiceId);
  revalidateDashboard('/dashboard/invoices', '/dashboard');
  return { success: true };
}

// Payment CRUD
export async function handleCreatePayment(propertyId: string, input: Omit<Tables['payments']['Insert'], 'property_id'>) {
  const data = await service.createPayment(propertyId, input);
  revalidateDashboard('/dashboard/payments', '/dashboard');
  return { success: true, data };
}

export async function handleUpdatePayment(propertyId: string, paymentId: string, input: Tables['payments']['Update']) {
  const data = await service.updatePayment(propertyId, paymentId, input);
  revalidateDashboard('/dashboard/payments');
  return { success: true, data };
}

export async function handleDeletePayment(propertyId: string, paymentId: string) {
  await service.deletePayment(propertyId, paymentId);
  revalidateDashboard('/dashboard/payments', '/dashboard');
  return { success: true };
}

// Expense CRUD
export async function handleCreateExpense(propertyId: string, input: Omit<Tables['expenses']['Insert'], 'property_id'>) {
  const data = await service.createExpense(propertyId, input);
  revalidateDashboard('/dashboard/expenses', '/dashboard');
  return { success: true, data };
}

export async function handleUpdateExpense(propertyId: string, expenseId: string, input: Tables['expenses']['Update']) {
  const data = await service.updateExpense(propertyId, expenseId, input);
  revalidateDashboard('/dashboard/expenses');
  return { success: true, data };
}

export async function handleDeleteExpense(propertyId: string, expenseId: string) {
  await service.deleteExpense(propertyId, expenseId);
  revalidateDashboard('/dashboard/expenses', '/dashboard');
  return { success: true };
}

// Maintenance CRUD
export async function handleCreateMaintenance(
  propertyId: string,
  input: Omit<Tables['maintenance_requests']['Insert'], 'property_id'>
) {
  const data = await service.createMaintenanceRequest(propertyId, input);
  revalidateDashboard('/dashboard/maintenance', '/dashboard');
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
  revalidateDashboard('/dashboard/maintenance', '/dashboard');
  return { success: true };
}

// Inspection CRUD
export async function handleCreateInspection(
  propertyId: string,
  input: Omit<Tables['inspections']['Insert'], 'property_id'>
) {
  const data = await service.createInspection(propertyId, input);
  revalidateDashboard('/dashboard/inspections', '/dashboard');
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
  revalidateDashboard('/dashboard/inspections', '/dashboard');
  return { success: true };
}

// Document CRUD
export async function handleCreateDocument(
  propertyId: string,
  input: Omit<Tables['documents']['Insert'], 'property_id'>
) {
  const data = await service.createDocument(propertyId, input);
  revalidateDashboard('/dashboard/documents', '/dashboard');
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
  revalidateDashboard('/dashboard/documents', '/dashboard');
  return { success: true };
}

// Task CRUD
export async function handleCreateTask(propertyId: string, input: Omit<Tables['tasks']['Insert'], 'property_id'>) {
  const data = await service.createTask(propertyId, input);
  revalidateDashboard('/dashboard/tasks', '/dashboard');
  return { success: true, data };
}

export async function handleUpdateTask(propertyId: string, taskId: string, input: Tables['tasks']['Update']) {
  const data = await service.updateTask(propertyId, taskId, input);
  revalidateDashboard('/dashboard/tasks');
  return { success: true, data };
}

export async function handleDeleteTask(propertyId: string, taskId: string) {
  await service.deleteTask(propertyId, taskId);
  revalidateDashboard('/dashboard/tasks', '/dashboard');
  return { success: true };
}
