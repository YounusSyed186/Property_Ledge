import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';
type BadgeSize = 'sm' | 'md';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-admin-success-soft text-admin-success border-admin-success/30',
  warning: 'bg-admin-warning-soft text-admin-warning border-admin-warning/30',
  danger: 'bg-admin-danger-soft text-admin-danger border-admin-danger/30',
  info: 'bg-admin-info-soft text-admin-info border-admin-info/30',
  neutral: 'bg-admin-surface-subtle text-admin-muted-foreground border-admin-border',
  primary: 'bg-admin-primary-soft text-admin-primary border-admin-primary/30',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-px text-[10px] gap-0.5 rounded-md tracking-normal font-medium',
  md: 'px-2 py-0.5 text-[11px] gap-1 rounded-md tracking-normal font-medium',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-admin-success',
  warning: 'bg-admin-warning',
  danger: 'bg-admin-danger',
  info: 'bg-admin-info',
  neutral: 'bg-admin-muted',
  primary: 'bg-admin-primary',
};

export function Badge({ variant = 'neutral', size = 'sm', dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center border',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} aria-hidden="true" />}
      {children}
    </span>
  );
}

/* ── Domain status badges ─────────────────────────────────── */

export type StatusDomain = 'subscription' | 'invoice' | 'maintenance' | 'lease' | 'unit' | 'task' | 'payment';

const STATUS_LABELS: Record<StatusDomain, Record<string, string>> = {
  subscription: { active: 'Active', trialing: 'Free trial', past_due: 'Payment overdue', canceled: 'Canceled', pending: 'Pending', expired: 'Expired' },
  invoice: { draft: 'Draft', issued: 'Issued', sent: 'Sent', paid: 'Paid', overdue: 'Overdue', partially_paid: 'Partially paid', void: 'Void', cancelled: 'Cancelled' },
  maintenance: { open: 'Open', in_progress: 'In progress', scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled' },
  lease: { draft: 'Draft', active: 'Active', expired: 'Expired', terminated: 'Terminated', pending: 'Pending' },
  unit: { vacant: 'Vacant', occupied: 'Occupied', maintenance: 'Maintenance', reserved: 'Reserved' },
  task: { open: 'Open', in_progress: 'In progress', completed: 'Completed', cancelled: 'Cancelled' },
  payment: { pending: 'Pending', completed: 'Completed', failed: 'Failed', refunded: 'Refunded' },
};

function statusToVariant(domain: StatusDomain, status: string): BadgeVariant {
  const s = status.toLowerCase();
  if (domain === 'subscription') {
    if (s === 'active' || s === 'trialing') return 'success';
    if (s === 'past_due' || s === 'pending') return 'warning';
    if (s === 'canceled' || s === 'expired') return 'danger';
  }
  if (domain === 'invoice') {
    if (s === 'paid') return 'success';
    if (s === 'overdue') return 'danger';
    if (s === 'partially_paid' || s === 'issued' || s === 'sent') return 'warning';
  }
  if (domain === 'maintenance') {
    if (s === 'completed') return 'success';
    if (s === 'in_progress' || s === 'scheduled') return 'info';
    if (s === 'open') return 'warning';
  }
  if (domain === 'lease') {
    if (s === 'active') return 'success';
    if (s === 'expired' || s === 'terminated') return 'neutral';
    if (s === 'pending' || s === 'draft') return 'warning';
  }
  if (domain === 'unit') {
    if (s === 'occupied') return 'success';
    if (s === 'vacant') return 'warning';
    if (s === 'maintenance') return 'danger';
  }
  if (domain === 'task') {
    if (s === 'completed') return 'success';
    if (s === 'in_progress') return 'info';
    if (s === 'open') return 'warning';
  }
  if (domain === 'payment') {
    if (s === 'completed') return 'success';
    if (s === 'pending') return 'warning';
    if (s === 'failed') return 'danger';
  }
  return 'neutral';
}

export function humanizeStatus(domain: StatusDomain, status: string): string {
  return STATUS_LABELS[domain][status] || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatusBadgeProps {
  domain: StatusDomain;
  status: string;
  dot?: boolean;
  className?: string;
}

export function StatusBadge({ domain, status, dot = true, className }: StatusBadgeProps) {
  const variant = statusToVariant(domain, status);
  const label = humanizeStatus(domain, status);
  return (
    <Badge variant={variant} dot={dot} className={className}>
      {label}
    </Badge>
  );
}