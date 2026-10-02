import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ============================================================
   PROPERTYLEDGE DESIGN PRIMITIVES
   Shared, presentational building blocks for the redesigned UI.
   Dependency-light: pure SVG, no chart library, no client hooks.
   ============================================================ */

/* ── Section header — open layout, no container ───────────── */

export interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h2 className="font-heading text-section-title font-semibold tracking-tight text-admin-foreground">
          {title}
        </h2>
        {description && <p className="mt-1 text-caption text-admin-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ── Sparkline — restrained inline trend (pure SVG) ───────── */

export type SparkTone = 'brand' | 'positive' | 'negative' | 'muted';

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  tone?: SparkTone;
  showArea?: boolean;
  className?: string;
  strokeWidth?: number;
}

const SPARK_STROKE: Record<SparkTone, string> = {
  brand: 'var(--accent)',
  positive: 'var(--success)',
  negative: 'var(--danger)',
  muted: 'var(--ink-tertiary, var(--admin-muted))',
};

export function Sparkline({
  data,
  width = 116,
  height = 34,
  tone = 'brand',
  showArea = true,
  strokeWidth = 1.75,
  className,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 3;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`)
    .join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  const stroke = SPARK_STROKE[tone];

  return (
    <svg
      className={cn('overflow-visible', className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      {showArea && <path d={area} fill={stroke} fillOpacity={0.1} stroke="none" />}
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ── Trend delta — direction + value, not colour alone ────── */

export type TrendDirection = 'up' | 'down' | 'flat';

export interface TrendDeltaProps {
  value: string;
  direction: TrendDirection;
  /** When true, "up" is treated as bad (e.g. expenses rising). */
  invert?: boolean;
  className?: string;
}

export function TrendDelta({ value, direction, invert = false, className }: TrendDeltaProps) {
  const positive = invert ? direction === 'down' : direction === 'up';
  const negative = invert ? direction === 'up' : direction === 'down';

  const tone = positive ? 'text-admin-success' : negative ? 'text-admin-danger' : 'text-admin-muted';
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold tabular', tone, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {value}
    </span>
  );
}

/* ── Metric stat — headline number + trend + sparkline ────── */

export interface MetricStatProps {
  label: string;
  value: string;
  delta?: { value: string; direction: TrendDirection; invert?: boolean };
  sparkline?: number[];
  sparkTone?: SparkTone;
  hint?: string;
  className?: string;
}

export function MetricStat({
  label,
  value,
  delta,
  sparkline,
  sparkTone,
  hint,
  className,
}: MetricStatProps) {
  const resolvedSparkTone: SparkTone =
    sparkTone ?? (delta?.direction === 'down' ? 'negative' : delta?.direction === 'up' ? 'positive' : 'brand');

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <p className="text-caption font-medium text-admin-muted">{label}</p>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="pl-metric truncate text-[26px] text-admin-foreground">{value}</p>
          {(delta || hint) && (
            <div className="mt-1.5 flex items-center gap-2">
              {delta && <TrendDelta value={delta.value} direction={delta.direction} invert={delta.invert} />}
              {hint && <span className="pl-meta truncate">{hint}</span>}
            </div>
          )}
        </div>
        {sparkline && sparkline.length > 1 && (
          <Sparkline data={sparkline} tone={resolvedSparkTone} className="shrink-0" />
        )}
      </div>
    </div>
  );
}

/* ── Financial value — sign + weight + restrained colour ──── */

export type FinancialTone = 'income' | 'expense' | 'neutral';

export interface FinancialValueProps {
  value: string;
  tone?: FinancialTone;
  size?: 'sm' | 'md' | 'lg';
  /** Render a leading +/- sign derived from the tone. */
  showSign?: boolean;
  className?: string;
}

const FIN_SIZE: Record<NonNullable<FinancialValueProps['size']>, string> = {
  sm: 'text-[13px]',
  md: 'text-sm',
  lg: 'text-lg',
};

export function FinancialValue({
  value,
  tone = 'neutral',
  size = 'md',
  showSign = false,
  className,
}: FinancialValueProps) {
  const sign = showSign ? (tone === 'income' ? '+' : tone === 'expense' ? '−' : '') : '';
  const toneClass =
    tone === 'income' ? 'text-admin-success' : tone === 'expense' ? 'text-admin-danger' : 'text-admin-foreground';

  return (
    <span className={cn('tabular font-semibold', FIN_SIZE[size], toneClass, className)}>
      {sign}
      {value}
    </span>
  );
}

/* ── Proportional bar — subtle inline comparison ──────────── */

export interface ProportionalBarProps {
  value: number;
  max?: number;
  tone?: 'brand' | 'positive' | 'warning' | 'negative';
  className?: string;
}

export function ProportionalBar({ value, max = 100, tone = 'brand', className }: ProportionalBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const color =
    tone === 'positive'
      ? 'var(--success)'
      : tone === 'warning'
        ? 'var(--warning)'
        : tone === 'negative'
          ? 'var(--danger)'
          : 'var(--accent)';

  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-admin-surface-subtle', className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}
