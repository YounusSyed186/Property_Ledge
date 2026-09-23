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
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40 font-semibold',
  warning: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40 font-semibold',
  danger: 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40 font-semibold',
  info: 'bg-sky-50 text-sky-700 border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40 font-semibold',
  neutral: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-semibold',
  primary: 'bg-[#008F83]/10 text-[#008F83] border-[#008F83]/20 dark:bg-[#008F83]/20 dark:text-[#32D5C4] dark:border-[#008F83]/30 font-semibold',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2.5 py-0.5 text-[11px] gap-1.5 rounded-full tracking-normal',
  md: 'px-3 py-1 text-xs gap-1.5 rounded-full tracking-normal',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
  neutral: 'bg-slate-400',
  primary: 'bg-[#008F83]',
};

export function Badge({ variant = 'neutral', size = 'sm', dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center border rounded-full shadow-2xs font-sans',
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
  invoice: { draft: 'Draft', issued: 'Issued', sent: 'Sent', paid: 'Paid', overdue: 'Overdue', partially_paid: 'Partially paid', partial: 'Partially paid', void: 'Void', cancelled: 'Cancelled' },
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
    if (s === 'partially_paid' || s === 'partial' || s === 'issued' || s === 'sent') return 'warning';
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
  return STATUS_LABELS[domain]?.[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface StatusBadgeProps {
  domain?: StatusDomain;
  type?: StatusDomain;
  status: string;
  dot?: boolean;
  className?: string;
}

export function StatusBadge({ domain, type, status, dot = true, className }: StatusBadgeProps) {
  const effectiveDomain = domain || type || 'subscription';
  const variant = statusToVariant(effectiveDomain, status);
  const label = humanizeStatus(effectiveDomain, status);
  return (
    <Badge variant={variant} dot={dot} className={className}>
      {label}
    </Badge>
  );
}