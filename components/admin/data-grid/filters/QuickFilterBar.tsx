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
  loading?: boolean;
}

export function QuickFilterBar({
  options,
  activeValue,
  onChange,
  className,
  loading = false,
}: QuickFilterBarProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 max-w-full overflow-x-auto admin-scrollbar shrink-0',
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
              'h-8 px-3 rounded-lg text-xs transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap font-medium',
              isActive
                ? 'bg-white dark:bg-slate-700 text-[#008F83] font-bold shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/40'
            )}
          >
            {loading && isActive && (
              <div className="w-3 h-3 border-2 border-[#008F83] border-t-transparent rounded-full animate-spin shrink-0" />
            )}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-semibold leading-none',
                  isActive
                    ? 'bg-[#008F83]/15 text-[#008F83]'
                    : 'bg-slate-200/70 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
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
