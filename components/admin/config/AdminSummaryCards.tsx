'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SummaryCardItem {
  id: string;
  label: string;
  value: number | string;
  sublabel?: string;
  active?: boolean;
}

interface AdminSummaryCardsProps {
  items: SummaryCardItem[];
  onCardClick?: (id: string) => void;
  className?: string;
}

export function AdminSummaryCards({ items, onCardClick, className }: AdminSummaryCardsProps) {
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 shrink-0', className)}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onCardClick?.(item.id)}
          disabled={!onCardClick}
          className={cn(
            'rounded-lg border px-3 py-2 text-left transition-colors',
            item.active
              ? 'border-admin-primary/50 bg-admin-primary/10'
              : 'border-admin-border bg-admin-surface hover:border-admin-border/80',
            onCardClick && 'cursor-pointer',
            !onCardClick && 'cursor-default'
          )}
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-admin-muted">{item.label}</p>
          <p className="text-lg font-semibold text-admin-foreground tabular-nums">{item.value}</p>
          {item.sublabel && <p className="text-[10px] text-admin-muted truncate">{item.sublabel}</p>}
        </button>
      ))}
    </div>
  );
}
