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
        'inline-flex items-center gap-1 bg-surface-subtle p-0.5 rounded-lg border border-border max-w-full overflow-x-auto admin-scrollbar shrink-0',
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
              'px-3 py-1.5 rounded-md text-[12px] transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap font-medium',
              isActive
                ? 'bg-[#008F83] text-white shadow-xs font-semibold'
                : 'text-muted hover:text-foreground hover:bg-surface'
            )}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold leading-none',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-surface text-muted border border-border'
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
