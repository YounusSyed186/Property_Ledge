'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  label?: string;
  className?: string;
}

export function ProgressIndicator({ current, total, label, className }: ProgressIndicatorProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={cn('space-y-2', className)} aria-label={`Step ${current} of ${total}${label ? `: ${label}` : ''}`}>
      <div className="flex items-center justify-between text-xs font-medium text-admin-muted">
        <span>
          {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
          {label && <span className="hidden sm:inline text-admin-muted-foreground"> · {label}</span>}
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-admin-surface-subtle">
        <div
          className="h-full rounded-full bg-admin-success transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
