import React from 'react';
import { cn } from '@/lib/utils';

type StatusVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const VARIANT_STYLES: Record<StatusVariant, string> = {
  default: 'bg-admin-surface-subtle text-admin-foreground border-admin-border',
  success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-600 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  muted: 'bg-admin-surface-subtle text-admin-muted border-admin-border',
};

const SUBSCRIPTION_LABELS: Record<string, string> = {
  active: 'Active',
  trialing: 'Free trial',
  past_due: 'Payment overdue',
  canceled: 'Canceled',
  pending: 'Pending approval',
  expired: 'Expired',
};

const INVOICE_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  partial: 'Partially paid',
  void: 'Void',
};

const MAINTENANCE_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const LEASE_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  expired: 'Expired',
  terminated: 'Terminated',
  pending: 'Pending',
};

export function humanizeStatus(
  type: 'subscription' | 'invoice' | 'maintenance' | 'lease',
  status: string
): string {
  const maps = {
    subscription: SUBSCRIPTION_LABELS,
    invoice: INVOICE_LABELS,
    maintenance: MAINTENANCE_LABELS,
    lease: LEASE_LABELS,
  };
  return maps[type][status] || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getStatusVariant(
  type: 'subscription' | 'invoice' | 'maintenance' | 'lease',
  status: string
): StatusVariant {
  if (type === 'subscription') {
    if (status === 'active' || status === 'trialing') return 'success';
    if (status === 'past_due' || status === 'pending') return 'warning';
    if (status === 'canceled' || status === 'expired') return 'danger';
  }
  if (type === 'invoice') {
    if (status === 'paid') return 'success';
    if (status === 'overdue') return 'danger';
    if (status === 'partial' || status === 'sent') return 'warning';
  }
  if (type === 'maintenance') {
    if (status === 'completed') return 'success';
    if (status === 'in_progress' || status === 'scheduled') return 'info';
    if (status === 'open') return 'warning';
  }
  if (type === 'lease') {
    if (status === 'active') return 'success';
    if (status === 'expired' || status === 'terminated') return 'muted';
    if (status === 'pending') return 'warning';
  }
  return 'default';
}

interface StatusBadgeProps {
  type: 'subscription' | 'invoice' | 'maintenance' | 'lease';
  status: string;
  className?: string;
}

export function StatusBadge({ type, status, className }: StatusBadgeProps) {
  const variant = getStatusVariant(type, status);
  const label = humanizeStatus(type, status);

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
        VARIANT_STYLES[variant],
        className
      )}
    >
      {label}
    </span>
  );
}
