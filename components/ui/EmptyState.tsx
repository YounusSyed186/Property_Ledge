import React from 'react';
import { EmptyState as AdminEmptyState } from '@/components/admin/ui/States';
import { cn } from '@/lib/utils';

type EmptyStateVariant = 'page' | 'grid' | 'inline';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: EmptyStateVariant;
  className?: string;
}

const variantClasses: Record<EmptyStateVariant, string> = {
  page: 'py-16',
  grid: 'py-12 border border-dashed border-admin-border rounded-xl bg-admin-muted/10',
  inline: 'py-8',
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'page',
  className,
}: EmptyStateProps) {
  return (
    <AdminEmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
      className={cn(variantClasses[variant], className)}
    />
  );
}
