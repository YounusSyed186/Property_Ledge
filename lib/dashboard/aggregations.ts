/**
 * PROPERTY LEDGE — Dashboard aggregations.
 *
 * Efficient, parallel Supabase queries that roll up the existing database
 * schema into the structured FinancialHealth / OperationalHealth shapes consumed
 * by the health engine. All queries are scoped to a set of property ids (the
 * active portfolio scope) and are gated by the calling server action.
 *
 * Semantics (per the product brief):
 *  - CURRENT MONTH financial period: collected / expenses / expected rent for
 *    the current calendar month, with a previous-month comparison.
 *  - Operational metrics are SNAPSHOTS of current state (not month-scoped).
 */
import { createClient } from '@/lib/supabase/server';
import type { FinancialHealth, OperationalHealth } from './types';

const ONE_DAY = 24 * 60 * 60 * 1000;

function monthBounds(offsetMonths = 0): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - offsetMonths + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

interface InvoiceRow { status: string; total_amount: number; balance_due: number; due_date: string; }
interface PaymentRow { amount: number; status: string; payment_date: string; }
interface ExpenseRow { amount: number; status: string; expense_date: string; }
interface LeaseRow { status: string; rent_amount: number; rent_frequency: string; end_date: string; }
interface MaintenanceRow { status: string; scheduled_at: string | null; created_at: string; priority: string; }
interface InspectionRow { status: string; scheduled_date: string | null; }
interface TaskRow { status: string; due_date: string | null; }

export function emptyFinancialHealth(): FinancialHealth {
  return {
    collected: 0, collectedPrevious: 0, outstanding: 0,
    expenses: 0, expensesPrevious: 0, expectedMonthlyRent: 0,
    collectionRate: null, outstandingRatio: null, overdueInvoiceCount: 0,
  };
}

export function emptyOperationalHealth(): OperationalHealth {
  return {
    openMaintenanceRequests: 0, overdueMaintenance: 0, pendingTasks: 0, overdueTasks: 0,
    inspectionsDue: 0, overdueInspections: 0, expiringLeases: 0,
    totalUnits: 0, occupiedUnits: 0, occupancyRate: null, vacantUnits: 0,
  };
}

/**
 * Aggregate current-month + previous-month financial health for a scope of
 * property ids.
 */
export async function aggregateFinancialHealth(propertyIds: string[]): Promise<FinancialHealth> {
  if (propertyIds.length === 0) return emptyFinancialHealth();

  const supabase = await createClient();
  const { start, end } = monthBounds(0);
  const prev = monthBounds(1);

  const [paymentsRes, invoicesRes, expensesRes, leasesRes] = await Promise.all([
    supabase.from('payments').select('amount, status, payment_date')
      .in('property_id', propertyIds)
      .gte('payment_date', prev.start)
      .lt('payment_date', end),
    supabase.from('invoices').select('status, total_amount, balance_due').in('property_id', propertyIds),
    supabase.from('expenses').select('amount, status, expense_date')
      .in('property_id', propertyIds)
      .gte('expense_date', prev.start)
      .lt('expense_date', end),
    supabase.from('leases').select('status, rent_amount, rent_frequency').in('property_id', propertyIds),
  ]);

  const payments = (paymentsRes.data || []) as PaymentRow[];
  const invoices = (invoicesRes.data || []) as InvoiceRow[];
  const expenses = (expensesRes.data || []) as ExpenseRow[];
  const leases = (leasesRes.data || []) as LeaseRow[];

  const collected = payments
    .filter((p) => p.status === 'completed' && p.payment_date >= start && p.payment_date < end)
    .reduce((s, p) => s + Number(p.amount), 0);
  const collectedPrevious = payments
    .filter((p) => p.status === 'completed' && p.payment_date >= prev.start && p.payment_date < start)
    .reduce((s, p) => s + Number(p.amount), 0);

  const outstanding = invoices
    .filter((i) => !['draft', 'void', 'cancelled', 'paid'].includes(i.status))
    .reduce((s, i) => s + Number(i.balance_due || 0), 0);

  const expensesThis = expenses
    .filter((e) => e.status === 'paid' && e.expense_date >= start && e.expense_date < end)
    .reduce((s, e) => s + Number(e.amount), 0);
  const expensesPrevious = expenses
    .filter((e) => e.status === 'paid' && e.expense_date >= prev.start && e.expense_date < start)
    .reduce((s, e) => s + Number(e.amount), 0);

  const expectedMonthlyRent = leases
    .filter((l) => l.status === 'active' && l.rent_frequency === 'monthly')
    .reduce((s, l) => s + Number(l.rent_amount), 0);

  const collectionRate = expectedMonthlyRent > 0 ? Math.min(1, collected / expectedMonthlyRent) : null;
  const outstandingRatio = expectedMonthlyRent > 0 ? outstanding / expectedMonthlyRent : null;
  const overdueInvoiceCount = invoices.filter((i) => i.status === 'overdue').length;

  return {
    collected,
    collectedPrevious,
    outstanding,
    expenses: expensesThis,
    expensesPrevious,
    expectedMonthlyRent,
    collectionRate,
    outstandingRatio,
    overdueInvoiceCount,
  };
}

/** Aggregate the operational snapshot for a scope of property ids. */
export async function aggregateOperationalHealth(propertyIds: string[]): Promise<OperationalHealth> {
  if (propertyIds.length === 0) return emptyOperationalHealth();

  const supabase = await createClient();
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * ONE_DAY);

  const [maintenanceRes, tasksRes, inspectionsRes, leasesRes] = await Promise.all([
    supabase.from('maintenance_requests').select('status, scheduled_at, created_at, priority').in('property_id', propertyIds),
    supabase.from('tasks').select('status, due_date').in('property_id', propertyIds),
    supabase.from('inspections').select('status, scheduled_date').in('property_id', propertyIds),
    supabase.from('leases').select('status, end_date').in('property_id', propertyIds),
  ]);

  const maintenance = (maintenanceRes.data || []) as MaintenanceRow[];
  const tasks = (tasksRes.data || []) as TaskRow[];
  const inspections = (inspectionsRes.data || []) as InspectionRow[];
  const leases = (leasesRes.data || []) as LeaseRow[];

  const openMaintenanceRequests = maintenance.filter((m) => ['open', 'in_progress', 'scheduled'].includes(m.status)).length;
  const overdueMaintenance = maintenance.filter((m) => {
    if (['completed', 'cancelled'].includes(m.status)) return false;
    if (m.scheduled_at && new Date(m.scheduled_at).getTime() < now.getTime()) return true;
    return m.status === 'open' && new Date(m.created_at).getTime() < now.getTime() - 14 * ONE_DAY;
  }).length;

  const pendingTasks = tasks.filter((t) => ['pending', 'in_progress'].includes(t.status)).length;
  const overdueTasks = tasks.filter((t) => ['pending', 'in_progress'].includes(t.status) && t.due_date && new Date(t.due_date).getTime() < now.getTime()).length;

  const dueStatuses = ['scheduled', 'pending'];
  const inspectionsDue = inspections.filter((i) => {
    if (!dueStatuses.includes(i.status) || !i.scheduled_date) return false;
    const t = new Date(i.scheduled_date).getTime();
    return t <= thirtyDays.getTime();
  }).length;
  const overdueInspections = inspections.filter((i) => dueStatuses.includes(i.status) && i.scheduled_date && new Date(i.scheduled_date).getTime() < now.getTime()).length;

  const expiringLeases = leases.filter((l) => l.status === 'active' && l.end_date && new Date(l.end_date).getTime() <= thirtyDays.getTime()).length;

  const totalUnits = propertyIds.length;
  const occupiedUnits = leases.filter((l) => l.status === 'active').length;
  const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
  const occupancyRate = totalUnits > 0 ? occupiedUnits / totalUnits : null;

  return {
    openMaintenanceRequests,
    overdueMaintenance,
    pendingTasks,
    overdueTasks,
    inspectionsDue,
    overdueInspections,
    expiringLeases,
    totalUnits,
    occupiedUnits,
    occupancyRate,
    vacantUnits,
  };
}