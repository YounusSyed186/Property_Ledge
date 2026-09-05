import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  interactive?: boolean;
}

export function Card({ className, elevated = false, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-admin-surface border border-admin-border rounded-lg transition-all duration-150',
        elevated ? 'shadow-elevation-2' : 'shadow-xs',
        interactive && 'hover:border-[#CBD5E1] dark:hover:border-[#334155] hover:bg-admin-surface-elevated hover:shadow-elevation-1 cursor-pointer',
        className
      )}
      {...props}
    />
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function CardHeader({ title, description, icon, action, className, ...props }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 p-4 sm:p-5 pb-0', className)} {...props}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="w-8 h-8 rounded-md bg-admin-primary-soft border border-admin-primary/20 flex items-center justify-center text-admin-primary shrink-0 shadow-2xs">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          {title && <h3 className="text-sm font-semibold text-admin-foreground tracking-tight">{title}</h3>}
          {description && <p className="text-xs text-admin-muted mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 sm:p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-4 sm:px-5 py-3 border-t border-admin-divider flex items-center justify-between gap-3 text-xs text-admin-muted', className)}
      {...props}
    />
  );
}