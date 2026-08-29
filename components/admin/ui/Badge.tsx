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
  success: 'bg-[#EFFAF5] dark:bg-[#16845A]/15 text-[#16845A] dark:text-[#34D399] border-[#CDEEDF] dark:border-[#16845A]/30',
  warning: 'bg-[#FFF8E9] dark:bg-[#B77908]/15 text-[#B77908] dark:text-[#FBBF24] border-[#F6E1AF] dark:border-[#B77908]/30',
  danger: 'bg-[#FFF1F1] dark:bg-[#C63D46]/15 text-[#C63D46] dark:text-[#F87171] border-[#F2CCCC] dark:border-[#C63D46]/30',
  info: 'bg-[#EEF6FC] dark:bg-[#28709E]/15 text-[#28709E] dark:text-[#60A5FA] border-[#D3E6F5] dark:border-[#28709E]/30',
  neutral: 'bg-[#F1F4F6] dark:bg-[#152538] text-[#485665] dark:text-[#AEB8C3] border-[#E1E6EA] dark:border-[#1B2B3D]',
  primary: 'bg-[#E6F7F5] dark:bg-[#008F83]/15 text-[#008F83] dark:text-[#32D5C4] border-[#CDEEDF] dark:border-[#008F83]/30',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px] gap-1 rounded-md tracking-normal font-medium',
  md: 'px-2.5 py-0.5 text-[11px] gap-1.5 rounded-md tracking-normal font-medium',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-[#16845A] dark:bg-[#34D399]',
  warning: 'bg-[#B77908] dark:bg-[#FBBF24]',
  danger: 'bg-[#C63D46] dark:bg-[#F87171]',
  info: 'bg-[#28709E] dark:bg-[#60A5FA]',
  neutral: 'bg-[#7A8794]',
  primary: 'bg-[#008F83]',
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