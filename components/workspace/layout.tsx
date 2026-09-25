'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/admin/ui';

/* ── Shared spacing ───────────────────────────────────────── */

export const WORKSPACE_PAGE_X = 'px-4 md:px-6';
export const WORKSPACE_PAGE_HEADER = `${WORKSPACE_PAGE_X} pt-4`;

/** Wrapper for AG Grid inside ListPage — fills remaining viewport height */
export function ListPageGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden w-full', className)}>{children}</div>;
}

/* ── Page shell ───────────────────────────────────────────── */

export const PageLayout = React.forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode;
    className?: string;
  }
>(function PageLayout({ children, className }, ref) {
  return (
    <div ref={ref} className={cn('flex h-full min-h-0 w-full flex-1 flex-col', className)}>
      {children}
    </div>
  );
});

export function PageContent({
  children,
  className,
  fill = false,
}: {
  children: React.ReactNode;
  className?: string;
  fill?: boolean;
}) {
  return (
    <div className={cn('flex flex-1 min-h-0 flex-col overflow-hidden w-full', className)}>
      <div
        className={cn(
          'flex w-full flex-1 flex-col min-h-0',
          WORKSPACE_PAGE_X,
          fill ? 'gap-2 overflow-hidden pb-4 pt-2' : 'gap-6 overflow-y-auto pb-8 pt-4 no-scrollbar'
        )}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Headers ──────────────────────────────────────────────── */

interface ListPageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  className?: string;
}

export function ListPageHeader({ title, description, breadcrumb, actions, className }: ListPageHeaderProps) {
  return (
    <header className={cn('shrink-0 space-y-1 border-b border-admin-border pb-5', className)}>
      {breadcrumb && breadcrumb.length > 0 && <Breadcrumb items={breadcrumb} />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-page-title font-semibold tracking-tight text-admin-foreground">{title}</h1>
          {description && (
            <p className="mt-1 max-w-2xl text-caption leading-relaxed text-admin-muted">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

interface DashboardHeaderProps {
  greeting: string;
  subtitle: string;
  actions?: React.ReactNode;
  className?: string;
}

export function DashboardHeader({ greeting, subtitle, actions, className }: DashboardHeaderProps) {
  return (
    <header className={cn('flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="font-heading text-page-title font-semibold tracking-tight text-admin-foreground">{greeting}</h1>
        <p className="text-caption text-admin-muted">{subtitle}</p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

interface EntityDetailHeaderProps {
  breadcrumb: { label: string; href?: string }[];
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  identitySurface?: boolean;
  className?: string;
}

export function EntityDetailHeader({
  breadcrumb,
  title,
  subtitle,
  meta,
  status,
  actions,
  identitySurface = false,
  className,
}: EntityDetailHeaderProps) {
  return (
    <header
      className={cn(
        'shrink-0 space-y-3 border-b border-admin-border pb-5',
        identitySurface && 'rounded-xl border border-admin-primary-border bg-gradient-to-br from-[#F8FBFF] to-[#EEF5FF] p-5 mb-0',
        className
      )}
    >
      <Breadcrumb items={breadcrumb} />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-entity-title font-semibold tracking-tight text-admin-foreground">{title}</h1>
            {status}
          </div>
          {subtitle && <p className="text-body-sm text-admin-muted">{subtitle}</p>}
          {meta}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/* ── KPI & panels ─────────────────────────────────────────── */

export type KpiAccent = 'blue' | 'indigo' | 'teal' | 'amber' | 'emerald' | 'rose' | 'neutral';

const KPI_ACCENT_STYLES: Record<KpiAccent, string> = {
  blue: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
  indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
  teal: 'bg-[#008F83]/10 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/20',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
  neutral: 'bg-admin-surface-subtle text-admin-muted border border-admin-border',
};

interface CompactKpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  trend?: { value: string; positive?: boolean };
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: KpiAccent;
  className?: string;
}

export function CompactKpiCard({ label, value, hint, trend, href, icon: Icon, accent = 'teal', className }: CompactKpiCardProps) {
  const inner = (
    <div
      className={cn(
        'group relative rounded-xl border border-admin-border bg-admin-surface p-4 sm:p-5 transition-all duration-200 w-full h-full min-h-[110px] flex flex-col justify-between shadow-xs hover:shadow-md hover:border-admin-primary/40',
        href && 'cursor-pointer',
        className
      )}
    >
      {/* Top row: Label + Icon */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-admin-muted truncate">{label}</p>
        {Icon && (
          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105', KPI_ACCENT_STYLES[accent])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Middle row: Big Value */}
      <div className="my-1.5">
        <p className="font-heading text-2xl sm:text-[26px] font-bold tabular-nums tracking-tight text-admin-foreground leading-tight">
          {value}
        </p>
      </div>

      {/* Bottom row: Trend badge & comparison text */}
      {(trend || hint) && (
        <div className="flex items-center gap-2 pt-0.5 min-w-0">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0',
                trend.positive !== false
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              )}
            >
              {trend.positive !== false ? '↑' : '↓'} {trend.value}
            </span>
          )}
          {hint && <span className="text-[11px] text-admin-muted truncate font-normal">{hint}</span>}
        </div>
      )}
    </div>
  );

  if (href) return <Link href={href} className="h-full flex flex-col">{inner}</Link>;
  return inner;
}

export function SectionPanel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border border-admin-border bg-admin-surface w-full shadow-xs overflow-hidden', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-admin-border/70 px-4 sm:px-5 py-3 bg-admin-surface-subtle/30">
        <h2 className="text-xs sm:text-sm font-semibold text-admin-foreground tracking-tight">{title}</h2>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function ProgressBar({
  value,
  className,
  accent = 'primary',
}: {
  value: number;
  className?: string;
  accent?: 'primary' | 'teal';
}) {
  const pct = Math.min(100, Math.max(0, value));
  const barColor = accent === 'teal' ? 'bg-admin-teal' : 'bg-admin-primary';
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-admin-surface-subtle', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', barColor)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function HubTabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex gap-0 overflow-x-auto border-b border-admin-border no-scrollbar w-full',
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative shrink-0 px-3 py-2.5 text-body-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary/30',
              active
                ? 'text-admin-primary-hover bg-admin-primary-soft/50'
                : 'text-admin-muted hover:text-admin-foreground'
            )}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              {tab.count !== undefined && (
                <span className="rounded bg-admin-surface-subtle px-1.5 py-px text-metadata font-semibold text-admin-muted">
                  {tab.count}
                </span>
              )}
            </span>
            {active && (
              <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-admin-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ActivityTimeline({
  items,
  emptyMessage = 'No recent activity',
  getDotColor,
}: {
  items: Array<{ id: string; title: string; detail?: string; time: string; tone?: 'default' | 'success' | 'warning' | 'danger' }>;
  emptyMessage?: string;
  getDotColor?: (item: { tone?: string }) => string;
}) {
  const dotColor = (tone?: string) => {
    if (getDotColor) return getDotColor({ tone });
    if (tone === 'success') return 'border-admin-success bg-admin-success-soft';
    if (tone === 'warning') return 'border-admin-warning bg-admin-warning-soft';
    if (tone === 'danger') return 'border-admin-danger bg-admin-danger-soft';
    return 'border-admin-primary bg-admin-primary-soft';
  };

  if (items.length === 0) {
    return <p className="text-body-sm text-admin-muted">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-4 w-full">
      {items.map((item, i) => (
        <li key={item.id} className="relative flex gap-3 pl-0">
          {i < items.length - 1 && (
            <span className="absolute left-[5px] top-3 h-[calc(100%+8px)] w-px bg-admin-border" aria-hidden />
          )}
          <span className={cn('relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2', dotColor(item.tone))} />
          <div className="min-w-0 pb-1 flex-1">
            <p className="text-body-sm font-medium text-admin-foreground">{item.title}</p>
            {item.detail && <p className="mt-0.5 text-caption text-admin-muted">{item.detail}</p>}
            <p className="mt-0.5 text-metadata text-admin-muted/80">{item.time}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4 w-full">
      <div className="h-8 w-48 rounded bg-admin-surface-subtle" />
      <div className="h-4 w-72 max-w-full rounded bg-admin-surface-subtle" />
      <div className="grid grid-cols-2 gap-4 pt-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-admin-surface-subtle" />
        ))}
      </div>
      <div className="h-40 rounded-lg bg-admin-surface-subtle" />
      {rows > 0 && <div className="h-64 rounded-lg bg-admin-surface-subtle" />}
    </div>
  );
}
