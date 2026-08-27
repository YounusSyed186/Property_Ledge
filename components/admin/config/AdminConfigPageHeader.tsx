'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AdminConfigPageHeaderProps {
  title: string;
  description: string;
  secondaryDescription?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function AdminConfigPageHeader({
  title,
  description,
  secondaryDescription,
  actions,
  className,
}: AdminConfigPageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-3 shrink-0', className)}>
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-admin-foreground">{title}</h1>
        <p className="text-sm text-admin-muted mt-0.5">{description}</p>
        {secondaryDescription && (
          <p className="text-xs text-admin-muted/80 mt-1">{secondaryDescription}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
