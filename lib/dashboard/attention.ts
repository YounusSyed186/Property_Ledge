/**
 * PROPERTY LEDGE — Attention builder.
 *
 * Attention (notifications ≠ attention) surfaces prioritized exceptions across
 * financial, occupancy, operations and lease domains. Items are ranked by
 * impact + urgency + severity — never by creation date alone. Everything here
 * is derived from real schema data; the calling server action gates access.
 */
import { createClient } from '@/lib/supabase/server';
import type { AttentionItem } from './types';

const ONE_DAY = 24 * 60 * 60 * 1000;

interface InvoiceRow { id: string; invoice_number: string; balance_due: number; due_date: string; status: string; property_id: string; }
interface MaintenanceRow { id: string; title: string; priority: string; status: string; scheduled_at: string | null; created_at: string; property_id: string; }
interface UnitRow { id: string; name: string; unit_number: string; status: string; property_id: string; }
interface LeaseRow { id: string; end_date: string; status: string; property_id: string; }
interface InspectionRow { id: string; scheduled_date: string | null; status: string; property_id: string; }
interface TaskRow { id: string; title: string; due_date: string | null; status: string; property_id: string; }

function rankOverdue(amount: number, days: number): number {
  let r = 0;
  if (amount >= 10000) r += 30;
  else if (amount >= 5000) r += 20;
  else r += 10;
  if (days >= 30) r += 20;
  else if (days >= 14) r += 12;
  else r += 5;
  return r;
}

function rankMaintenance(priority: string, isOverdue: boolean): number {
  let r = 0;
  if (priority === 'urgent') r += 30;
  else if (priority === 'high') r += 22;
  else r += 12;
  if (isOverdue) r += 14;
  return r;
}

/**
 * Build attention items for a set of property ids. Returns a capped, ranked list.
 */
export async function buildAttentionItems(propertyIds: string[], limit = 8): Promise<AttentionItem[]> {
  if (propertyIds.length === 0) return [];

  const supabase = await createClient();
  const nowDate = new Date();

  const propNamesRes = await supabase.from('properties').select('id, name').in('id', propertyIds);
  const propNames = new Map<string, string>(
    ((propNamesRes.data || []) as Array<{ id: string; name: string }>).map((p) => [p.id, p.name])
  );

  const [overdueRes, maintenanceRes, vacantRes, leasesRes] = await Promise.all([
    supabase.from('invoices').select('id, invoice_number, balance_due, due_date, status, property_id')
      .in('property_id', propertyIds).eq('status', 'overdue').order('due_date', { ascending: true }),
    supabase.from('maintenance_requests').select('id, title, priority, status, scheduled_at, created_at, property_id')
      .in('property_id', propertyIds).in('status', ['open', 'in_progress', 'scheduled']),
    supabase.from('units').select('id, name, unit_number, status, property_id')
      .in('property_id', propertyIds).eq('status', 'vacant'),
    supabase.from('leases').select('id, end_date, status, property_id')
      .in('property_id', propertyIds).eq('status', 'active'),
  ]);

  const overdueInvoices = (overdueRes.data || []) as InvoiceRow[];
  const openMaintenance = (maintenanceRes.data || []) as MaintenanceRow[];
  const vacantUnits = (vacantRes.data || []) as UnitRow[];
  const activeLeases = (leasesRes.data || []) as LeaseRow[];
  const inspections = (inspectionsRes.data || []) as InspectionRow[];
  const tasks = (tasksRes.data || []) as TaskRow[];

  const items: AttentionItem[] = [];

  // FINANCIAL — overdue rent (highest impact).
  for (const inv of overdueInvoices) {
    const pName = propNames.get(inv.property_id) ?? 'Property';
    const amount = inv.balance_due || 0;
    const daysLate = Math.max(0, Math.round((nowDate.getTime() - new Date(inv.due_date).getTime()) / ONE_DAY));
    items.push({
      id: `overdue-${inv.id}`,
      category: 'financial',
      title: pName,
      description: `${inv.invoice_number} · ${formatAmount(amount)} outstanding`,
      severity: amount >= 10000 || daysLate >= 30 ? 'high' : amount >= 5000 ? 'medium' : 'low',
      rank: rankOverdue(amount, daysLate),
      href: '/dashboard/money?tab=invoices',
      propertyId: inv.property_id,
      propertyName: pName,
    });
  }

  // OPERATIONS — overdue/serious maintenance.
  for (const m of openMaintenance) {
    const pName = propNames.get(m.property_id) ?? 'Property';
    const isOverdue = m.scheduled_at && new Date(m.scheduled_at).getTime() < nowDate.getTime();
    const urgent = m.priority === 'urgent' || m.priority === 'high';
    if (!isOverdue && !urgent) continue;
    items.push({
      id: `maint-${m.id}`,
      category: 'operations',
      title: m.title,
      description: `${pName} · ${urgent ? 'high priority' : 'overdue'}`,
      severity: urgent && isOverdue ? 'high' : urgent ? 'medium' : 'low',
      rank: rankMaintenance(m.priority, !!isOverdue),
      href: `/dashboard/maintenance/${m.id}`,
      propertyId: m.property_id,
      propertyName: pName,
    });
  }

  // OCCUPANCY — vacancies.
  for (const u of vacantUnits) {
    const pName = propNames.get(u.property_id) ?? 'Property';
    items.push({
      id: `vacant-${u.id}`,
      category: 'occupancy',
      title: `Vacancy: ${u.name || `Unit ${u.unit_number}`}`,
      description: `${pName} · unit is vacant`,
      severity: 'medium',
      rank: 22,
      href: '/dashboard/properties',
      propertyId: u.property_id,
      propertyName: pName,
    });
  }

  // LEASE — expiring leases.
  for (const l of activeLeases) {
    if (!l.end_date) continue;
    const days = Math.ceil((new Date(l.end_date).getTime() - nowDate.getTime()) / ONE_DAY);
    if (days < 0 || days > 30) continue;
    const pName = propNames.get(l.property_id) ?? 'Property';
    items.push({
      id: `lease-${l.id}`,
      category: 'lease',
      title: 'Lease expiring soon',
      description: `${pName} · expires in ${days} day${days === 1 ? '' : 's'}`,
      severity: days <= 14 ? 'high' : 'medium',
      rank: days <= 14 ? 30 : 12,
      href: `/dashboard/leases/${l.id}`,
      propertyId: l.property_id,
      propertyName: pName,
    });
  }

  // Sort by rank descending, cap.
  return items.sort((a, b) => b.rank - a.rank).slice(0, limit);
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(amount);
}
  const nowDate = new Date();
  const nowIso = nowDate.toISOString();
  const thirtyDaysIso = new Date(nowDate.getTime() + 30 * ONE_DAY).toISOString();