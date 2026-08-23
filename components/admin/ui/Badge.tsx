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
  sm: 'px-2 py-0.5 text-[11px] gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
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
        'inline-flex items-center font-semibold uppercase tracking-wide border rounded-full',
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