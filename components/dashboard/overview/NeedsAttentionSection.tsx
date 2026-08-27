'use client';

import React from 'react';
import { AttentionPanel, type AttentionItem } from '@/components/workspace/AttentionPanel';
import { formatCurrency } from '@/lib/format/currency';

export type { AttentionItem };

interface NeedsAttentionSectionProps {
  items: AttentionItem[];
  isLoading?: boolean;
}

export function NeedsAttentionSection({ items, isLoading }: NeedsAttentionSectionProps) {
  return <AttentionPanel items={items} isLoading={isLoading} />;
}

export function buildAttentionItems(
  needsAttention: {
    overdueInvoices: Array<{ id: string; invoice_number: string; balance_due: number; due_date: string }>;
    openMaintenance: Array<{ id: string; title: string; priority: string; status: string }>;
    outstandingInvoices: Array<{ id: string; invoice_number: string; balance_due: number; due_date: string }>;
    vacantUnits: Array<{ id: string; name: string; unit_number: string }>;
  } | null
): AttentionItem[] {
  if (!needsAttention) return [];

  const items: AttentionItem[] = [];

  for (const invoice of needsAttention.overdueInvoices) {
    items.push({
      id: `overdue-${invoice.id}`,
      label: `Overdue invoice ${invoice.invoice_number}`,
      sublabel: `Balance: ${formatCurrency(invoice.balance_due)} · Due ${invoice.due_date}`,
      href: '/dashboard/money?tab=invoices',
      variant: 'danger',
    });
  }

  for (const req of needsAttention.openMaintenance) {
    items.push({
      id: `maintenance-${req.id}`,
      label: req.title,
      sublabel: `${req.priority} priority · ${req.status.replace('_', ' ')}`,
      href: `/dashboard/maintenance/${req.id}`,
      variant: 'warning',
    });
  }

  for (const invoice of needsAttention.outstandingInvoices) {
    if (items.some((i) => i.id === `outstanding-${invoice.id}`)) continue;
    items.push({
      id: `outstanding-${invoice.id}`,
      label: `Outstanding invoice ${invoice.invoice_number}`,
      sublabel: `Balance: ${formatCurrency(invoice.balance_due)}`,
      href: '/dashboard/money?tab=invoices',
      variant: 'warning',
    });
  }

  for (const unit of needsAttention.vacantUnits) {
    items.push({
      id: `vacant-${unit.id}`,
      label: `Vacant unit: ${unit.name}`,
      sublabel: `Unit ${unit.unit_number} is vacant`,
      href: '/dashboard/properties',
      variant: 'info',
    });
  }

  return items.slice(0, 8);
}

type LeaseRow = {
  id: string;
  end_date: string | null;
  status: string;
  unit?: { name?: string; unit_number?: string };
};

export function buildUpcomingItems(
  needsAttention: Parameters<typeof buildAttentionItems>[0],
  leases: LeaseRow[] | null
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const now = Date.now();

  for (const lease of leases || []) {
    if (lease.status !== 'active' || !lease.end_date) continue;
    const days = Math.ceil((new Date(lease.end_date).getTime() - now) / (1000 * 60 * 60 * 24));
    if (days > 0 && days <= 60) {
      const unitLabel = lease.unit?.name || lease.unit?.unit_number;
      items.push({
        id: `lease-exp-${lease.id}`,
        label: `Lease expiring in ${days} days`,
        sublabel: unitLabel ? `Unit ${unitLabel}` : undefined,
        href: `/dashboard/leases/${lease.id}`,
        variant: days <= 14 ? 'warning' : 'info',
      });
    }
  }

  for (const invoice of needsAttention?.outstandingInvoices || []) {
    items.push({
      id: `upcoming-inv-${invoice.id}`,
      label: `Rent due: ${invoice.invoice_number}`,
      sublabel: `Due ${invoice.due_date}`,
      href: '/dashboard/money?tab=invoices',
      variant: 'info',
    });
  }

  for (const req of needsAttention?.openMaintenance.filter((r) => r.status === 'scheduled') || []) {
    items.push({
      id: `upcoming-maint-${req.id}`,
      label: req.title,
      sublabel: 'Scheduled maintenance',
      href: `/dashboard/maintenance/${req.id}`,
      variant: 'info',
    });
  }

  return items.slice(0, 6);
}
