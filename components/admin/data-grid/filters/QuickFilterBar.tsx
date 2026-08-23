'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface QuickFilterOption {
  value: string;
  label: string;
  count?: number;
}

interface QuickFilterBarProps {
  options: QuickFilterOption[];
  activeValue: string;
  onChange: (value: string) => void;
  className?: string;
}

export function QuickFilterBar({
  options,
  activeValue,
  onChange,
  className,
}: QuickFilterBarProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 bg-admin-surface-subtle p-0.5 rounded-lg border border-admin-border-subtle max-w-full overflow-x-auto admin-scrollbar',
        className
      )}
      role="radiogroup"
      aria-label="Filter records by status"
    >
      {options.map((opt) => {
        const isActive = activeValue === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              'px-2.5 py-1 rounded-md text-[12px] transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap font-medium',
              isActive
                ? 'bg-admin-surface text-admin-foreground shadow-xs border border-admin-border font-bold'
                : 'text-admin-muted hover:text-admin-foreground hover:bg-admin-surface/50'
            )}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0 rounded-full font-mono font-semibold leading-tight',
                  isActive
                    ? 'bg-admin-foreground text-admin-surface'
                    : 'bg-admin-surface-elevated text-admin-muted border border-admin-border-subtle'
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
