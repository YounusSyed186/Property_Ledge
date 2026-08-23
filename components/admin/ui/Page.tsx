import React from 'react';
import { cn } from '@/lib/utils';

/* ============================================================
   PAGE CONTAINER
   ============================================================ */

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  fullWidth?: boolean;
}

export function PageContainer({ fullWidth = true, className, ...props }: PageContainerProps) {
  return (
    <div
      className={cn(
        'w-full flex-1 flex flex-col min-h-0 h-full p-1',
        className
      )}
      {...props}
    />
  );
}

/* ============================================================
   PAGE HEADER
   ============================================================ */

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, breadcrumb, actions, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6', className)} {...props}>
      <div className="min-w-0">
        {breadcrumb && <div className="mb-2">{breadcrumb}</div>}
        <h1 className="text-page-title font-heading text-admin-foreground tracking-tight">{title}</h1>
        {description && <p className="text-body-sm text-admin-muted mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}

/* ============================================================
   BREADCRUMB
   ============================================================ */

interface BreadcrumbProps {
  items: { label: string; href?: string }[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-caption text-admin-muted">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span aria-hidden="true" className="text-admin-muted/50">/</span>}
          {item.href ? (
            <a href={item.href} className="hover:text-admin-primary transition-colors">
              {item.label}
            </a>
          ) : (
            <span className="text-admin-foreground font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

/* ============================================================
   STAT CARD
   ============================================================ */

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  hint?: string;
}

export function StatCard({ label, value, icon, trend, hint, className, ...props }: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-admin-surface border border-admin-border rounded-xl p-5 transition-all duration-200 hover:border-admin-border-subtle',
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption font-medium text-admin-muted uppercase tracking-wide">{label}</p>
          <p className="text-display font-heading text-admin-foreground mt-1.5 tracking-tight">{value}</p>
          {trend && (
            <p className={cn('text-caption font-medium mt-1.5', trend.positive ? 'text-admin-success' : 'text-admin-danger')}>
              {trend.value}
            </p>
          )}
          {hint && <p className="text-metadata text-admin-muted mt-1">{hint}</p>}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-admin-primary-soft border border-admin-primary/20 flex items-center justify-center text-admin-primary shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}