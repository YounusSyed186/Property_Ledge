import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

/* ============================================================
   EMPTY STATE
   ============================================================ */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-10 px-4', className)}>
      {icon && (
        <div className="w-11 h-11 rounded-lg bg-admin-primary-soft border border-admin-primary/20 flex items-center justify-center text-admin-primary mb-3 shadow-2xs">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-admin-foreground">{title}</h3>
      {description && <p className="text-xs text-admin-muted mt-1 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ============================================================
   LOADING STATE (Skeleton)
   ============================================================ */

interface LoadingStateProps {
  rows?: number;
  className?: string;
}

export function LoadingState({ rows = 3, className }: LoadingStateProps) {
  return (
    <div className={cn('space-y-3', className)} aria-label="Loading" role="status">
      <div className="space-y-1.5">
        <div className="h-5 w-40 bg-admin-surface-subtle rounded animate-pulse" />
        <div className="h-3.5 w-60 bg-admin-surface-subtle rounded animate-pulse" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-admin-surface border border-admin-border rounded-lg p-4 space-y-2.5">
          <div className="h-3.5 w-28 bg-admin-surface-subtle rounded animate-pulse" />
          <div className="h-7 w-40 bg-admin-surface-subtle rounded animate-pulse" />
          <div className="h-3.5 w-full bg-admin-surface-subtle rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   ERROR STATE
   ============================================================ */

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Couldn't load this",
  description = "We couldn't retrieve this information right now. Please check your connection and try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-10 px-4', className)}>
      <div className="w-11 h-11 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 mb-3 shadow-2xs">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-admin-foreground">{title}</h3>
      <p className="text-xs text-admin-muted mt-1 max-w-sm leading-relaxed">{description}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PERMISSION DENIED STATE
   ============================================================ */

interface PermissionDeniedStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export function PermissionDeniedState({
  title = 'Access denied',
  description = "You don't have permission to view this page.",
  className,
}: PermissionDeniedStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-12 px-6', className)}>
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-4">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 className="text-card-title font-heading text-admin-foreground">{title}</h3>
      <p className="text-body-sm text-admin-muted mt-1.5 max-w-sm">{description}</p>
    </div>
  );
}

/* ============================================================
   NOT FOUND STATE
   ============================================================ */

interface NotFoundStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function NotFoundState({
  title = 'Not found',
  description = "The item you're looking for doesn't exist or was removed.",
  action,
  className,
}: NotFoundStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-12 px-6', className)}>
      <div className="w-14 h-14 rounded-2xl bg-admin-surface-subtle border border-admin-border flex items-center justify-center text-admin-muted mb-4">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-card-title font-heading text-admin-foreground">{title}</h3>
      <p className="text-body-sm text-admin-muted mt-1.5 max-w-sm">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}