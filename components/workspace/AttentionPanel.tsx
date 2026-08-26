'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Wrench, DollarSign, Home, CheckSquare, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AttentionVariant = 'danger' | 'warning' | 'info' | 'default';

export interface AttentionItem {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  variant?: AttentionVariant;
}

const VARIANT_STYLES: Record<AttentionVariant, { border: string; iconBg: string; iconColor: string }> = {
  danger: { border: 'border-red-200/70', iconBg: 'bg-admin-danger-soft', iconColor: 'text-admin-danger' },
  warning: { border: 'border-amber-200/70', iconBg: 'bg-admin-warning-soft', iconColor: 'text-admin-warning' },
  info: { border: 'border-blue-200/70', iconBg: 'bg-admin-info-soft', iconColor: 'text-admin-info' },
  default: { border: 'border-admin-border', iconBg: 'bg-admin-primary-soft', iconColor: 'text-admin-primary' },
};

function AttentionIcon({ item }: { item: AttentionItem }) {
  const v = item.variant || 'default';
  const cls = cn('h-4 w-4', VARIANT_STYLES[v].iconColor);
  if (v === 'danger') return <AlertTriangle className={cls} />;
  if (item.href.includes('maintenance')) return <Wrench className={cls} />;
  if (item.href.includes('money')) return <DollarSign className={cls} />;
  if (item.href.includes('tasks')) return <CheckSquare className={cls} />;
  return <Home className={cls} />;
}

interface AttentionPanelProps {
  items: AttentionItem[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function AttentionPanel({
  items,
  isLoading,
  emptyMessage = 'All caught up — no items need your attention.',
  className,
}: AttentionPanelProps) {
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-admin-primary border-t-transparent" />
      </div>
    );
  }

  if (items.length === 0) {
    return <p className={cn('text-body-sm text-admin-muted py-2', className)}>{emptyMessage}</p>;
  }

  return (
    <ul className={cn('space-y-2', className)}>
      {items.map((item) => {
        const v = item.variant || 'default';
        const styles = VARIANT_STYLES[v];
        return (
          <li key={item.id}>
            <Link
              href={item.href}
              className={cn(
                'flex items-center justify-between gap-4 rounded-xl border bg-admin-surface p-4 transition-all hover:shadow-sm group',
                styles.border,
                'hover:border-admin-primary/30'
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', styles.iconBg)}>
                  <AttentionIcon item={item} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-admin-foreground group-hover:text-admin-primary transition-colors">
                    {item.label}
                  </p>
                  {item.sublabel && (
                    <p className="truncate text-body-sm text-admin-muted">{item.sublabel}</p>
                  )}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-admin-muted opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
