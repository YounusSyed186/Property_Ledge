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

const VARIANT_STYLES: Record<AttentionVariant, { border: string; bg: string; iconBg: string; iconColor: string; badge: string; badgeText: string }> = {
  danger: {
    border: 'border-rose-500/20 hover:border-rose-500/40',
    bg: 'bg-rose-500/[0.02] dark:bg-rose-500/[0.04]',
    iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    iconColor: 'text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    badgeText: 'Urgent',
  },
  warning: {
    border: 'border-amber-500/20 hover:border-amber-500/40',
    bg: 'bg-amber-500/[0.02] dark:bg-amber-500/[0.04]',
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    badgeText: 'Review',
  },
  info: {
    border: 'border-sky-500/20 hover:border-sky-500/40',
    bg: 'bg-sky-500/[0.02] dark:bg-sky-500/[0.04]',
    iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
    iconColor: 'text-sky-600 dark:text-sky-400',
    badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    badgeText: 'Upcoming',
  },
  default: {
    border: 'border-admin-border hover:border-admin-primary/40',
    bg: 'bg-admin-surface',
    iconBg: 'bg-admin-primary-soft text-admin-primary border border-admin-primary/20',
    iconColor: 'text-admin-primary',
    badge: 'bg-admin-surface-subtle text-admin-muted border-admin-border',
    badgeText: 'Notice',
  },
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
    return (
      <div className={cn('flex items-center gap-2 py-4 px-3 rounded-lg border border-dashed border-admin-border/70 text-admin-muted text-xs', className)}>
        <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
        <span>{emptyMessage}</span>
      </div>
    );
  }

  return (
    <ul className={cn('space-y-2.5', className)}>
      {items.map((item) => {
        const v = item.variant || 'default';
        const styles = VARIANT_STYLES[v];
        return (
          <li key={item.id}>
            <Link
              href={item.href}
              className={cn(
                'flex items-center justify-between gap-3 sm:gap-4 rounded-xl border p-3.5 sm:p-4 transition-all hover:shadow-xs group',
                styles.border,
                styles.bg
              )}
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', styles.iconBg)}>
                  <AttentionIcon item={item} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-semibold text-admin-foreground group-hover:text-admin-primary transition-colors">
                    {item.label}
                  </p>
                  {item.sublabel && (
                    <p className="truncate text-caption text-slate-500 dark:text-slate-400 mt-0.5">{item.sublabel}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className={cn('hidden sm:inline-flex text-xs font-semibold px-2 py-0.5 rounded-md border', styles.badge)}>
                  {styles.badgeText}
                </span>
                <ArrowRight className="h-4 w-4 text-admin-muted transition-transform group-hover:translate-x-0.5 group-hover:text-admin-primary" />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
