'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/admin/ui';
import { useCollapsibleWorkspaceSnapshot } from './CollapsibleWorkspaceContext';

interface CollapsiblePageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  className?: string;
  collapseEnabled?: boolean;
}

export function CollapsiblePageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className,
  collapseEnabled = true,
}: CollapsiblePageHeaderProps) {
  const snapshot = useCollapsibleWorkspaceSnapshot();
  const progress = collapseEnabled && snapshot ? snapshot.progress : 0;
  const isCompact = collapseEnabled && snapshot ? snapshot.isCompact : false;

  return (
    <header
      className={cn(
        'shrink-0 border-b border-admin-border transition-[padding] duration-250 ease-out',
        isCompact ? 'pb-2 pt-2' : 'pb-5 pt-4',
        className
      )}
      data-workspace-phase={snapshot?.phase ?? 'expanded'}
    >
      {breadcrumb && breadcrumb.length > 0 && (
        <div
          className="overflow-hidden transition-all duration-250 ease-out"
          style={{
            maxHeight: `${Math.max(0, 28 * (1 - progress))}px`,
            opacity: 1 - progress,
            marginBottom: progress > 0.5 ? 0 : 4,
          }}
          aria-hidden={progress > 0.9}
        >
          <Breadcrumb items={breadcrumb} />
        </div>
      )}

      <div
        className={cn(
          'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
          isCompact && 'sm:items-center'
        )}
      >
        <div className="min-w-0">
          <h1
            className={cn(
              'font-heading font-semibold tracking-tight text-admin-foreground transition-all duration-250 ease-out',
              isCompact ? 'text-section-title' : 'text-page-title'
            )}
          >
            {title}
          </h1>
          {description && (
            <p
              className="mt-1 max-w-2xl overflow-hidden text-caption leading-relaxed text-admin-muted transition-all duration-250 ease-out"
              style={{
                maxHeight: `${Math.max(0, 48 * (1 - progress))}px`,
                opacity: 1 - progress,
                marginTop: progress > 0.7 ? 0 : 4,
              }}
              aria-hidden={progress > 0.9}
            >
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}
