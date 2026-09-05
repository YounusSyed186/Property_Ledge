'use client';

import React from 'react';
import { Shield, Sparkles, AlertCircle, Info, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/admin/ui';
import type { MatrixRole } from './types';

export interface RoleSummaryProps {
  role: MatrixRole;
  enabledCount: number;
  totalCount: number;
  hasUnsavedChanges?: boolean;
  resourceCounts?: Array<{ resource: string; label: string; enabled: number; total: number }>;
  isReadOnly?: boolean;
  className?: string;
}

export function RoleSummary({
  role,
  enabledCount,
  totalCount,
  hasUnsavedChanges = false,
  resourceCounts = [],
  isReadOnly = false,
  className,
}: RoleSummaryProps) {
  const percentage = totalCount > 0 ? Math.round((enabledCount / totalCount) * 100) : 0;

  return (
    <div
      className={cn(
        'rounded-2xl border border-admin-border/80 bg-admin-surface/70 backdrop-blur-sm p-4 sm:p-5 shadow-xs',
        'flex flex-col gap-4 font-sans',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Role Identity & Metadata */}
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-xs',
              role.isSystemRole
                ? 'bg-admin-primary/10 border-admin-primary/25 text-admin-primary'
                : 'bg-admin-surface-elevated border-admin-border text-admin-foreground'
            )}
          >
            <Shield className="w-5 h-5" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-admin-foreground tracking-tight">
                {role.name}
              </h2>
              <Badge
                variant={role.isSystemRole ? 'neutral' : 'info'}
                size="sm"
                className="text-[10px] font-semibold tracking-wider uppercase py-0.5"
              >
                {role.isSystemRole ? 'SYSTEM ROLE' : 'CUSTOM ROLE'}
              </Badge>
              {hasUnsavedChanges && (
                <Badge
                  variant="warning"
                  size="sm"
                  className="text-[10px] font-medium animate-pulse py-0.5"
                >
                  Unsaved Changes
                </Badge>
              )}
            </div>

            <p className="text-xs sm:text-sm text-admin-muted mt-1 leading-relaxed max-w-2xl">
              {role.description ||
                (role.isSystemRole
                  ? 'Standard system role with predefined platform capabilities.'
                  : 'Custom role configured for workspace specific responsibilities.')}
            </p>
          </div>
        </div>

        {/* Permission Counter & Gauge */}
        <div className="flex flex-col items-start sm:items-end justify-center shrink-0 bg-admin-surface-subtle/50 px-3.5 py-2.5 rounded-xl border border-admin-border/50 min-w-[180px]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-admin-foreground">{enabledCount}</span>
            <span className="text-xs text-admin-muted font-medium">/ {totalCount} permissions enabled</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-admin-border/60 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300 rounded-full',
                percentage === 100
                  ? 'bg-admin-success'
                  : percentage > 50
                  ? 'bg-admin-primary'
                  : 'bg-admin-indigo'
              )}
              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            />
          </div>

          <span className="text-[10px] text-admin-muted font-mono self-end mt-1 font-medium">
            {percentage}% access coverage
          </span>
        </div>
      </div>

      {/* Read-only notification if applicable */}
      {isReadOnly && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-admin-surface-subtle border border-admin-border/60 text-xs text-admin-muted">
          <Lock className="w-3.5 h-3.5 text-admin-muted shrink-0" />
          <span>
            This role is read-only. Permissions cannot be modified directly in workspace settings.
          </span>
        </div>
      )}

      {/* Top Resource Quick Breakdown Chips */}
      {resourceCounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-admin-border/40">
          <span className="text-[11px] font-semibold text-admin-muted uppercase tracking-wider mr-1">
            Module Access:
          </span>
          {resourceCounts.map((res) => {
            const isFull = res.enabled === res.total && res.total > 0;
            const isNone = res.enabled === 0;
            return (
              <div
                key={res.resource}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] border font-medium transition-colors',
                  isFull && 'bg-admin-success/10 border-admin-success/20 text-admin-success',
                  !isFull && !isNone && 'bg-admin-primary/10 border-admin-primary/20 text-admin-primary',
                  isNone && 'bg-admin-surface border-admin-border/60 text-admin-muted/70 opacity-60'
                )}
              >
                <span>{res.label}</span>
                <span className="font-mono text-[10px] opacity-80">
                  {res.enabled}/{res.total}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
