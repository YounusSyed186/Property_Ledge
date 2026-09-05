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
  success: 'bg-[#F0FDF4] dark:bg-[#16A34A]/15 text-[#15803D] dark:text-[#4ADE80] border-[#BBF7D0] dark:border-[#16A34A]/30 font-medium',
  warning: 'bg-[#FFFBEB] dark:bg-[#D97706]/15 text-[#B45309] dark:text-[#FBBF24] border-[#FDE68A] dark:border-[#D97706]/30 font-medium',
  danger: 'bg-[#FEF2F2] dark:bg-[#DC2626]/15 text-[#B91C1C] dark:text-[#F87171] border-[#FECACA] dark:border-[#DC2626]/30 font-medium',
  info: 'bg-[#F0F9FF] dark:bg-[#0284C7]/15 text-[#0369A1] dark:text-[#60A5FA] border-[#BAE6FD] dark:border-[#0284C7]/30 font-medium',
  neutral: 'bg-[#F8FAFC] dark:bg-[#1E293B] text-[#475569] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#334155] font-medium',
  primary: 'bg-[#F0FBFA] dark:bg-[#008F83]/15 text-[#008F83] dark:text-[#32D5C4] border-[#CCECE8] dark:border-[#008F83]/30 font-medium',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px] gap-1 rounded-md tracking-normal font-medium',
  md: 'px-2.5 py-0.5 text-[11px] gap-1.5 rounded-md tracking-normal font-medium',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-[#16A34A] dark:bg-[#4ADE80]',
  warning: 'bg-[#D97706] dark:bg-[#FBBF24]',
  danger: 'bg-[#DC2626] dark:bg-[#F87171]',
  info: 'bg-[#0284C7] dark:bg-[#60A5FA]',
  neutral: 'bg-[#94A3B8]',
  primary: 'bg-[#008F83]',
};

export function Badge({ variant = 'neutral', size = 'sm', dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center border rounded-md shadow-2xs',
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