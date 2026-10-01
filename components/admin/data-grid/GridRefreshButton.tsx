'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GridRefreshButtonProps {
  onRefresh: () => Promise<void> | void;
  isRefreshing?: boolean;
  lastRefreshedAt?: Date | null;
  className?: string;
  disabled?: boolean;
  label?: string;
  showLastUpdated?: boolean;
}

export function formatRelativeTime(date: Date | null): string {
  if (!date) return '';
  const now = Date.now();
  const diffSec = Math.floor((now - date.getTime()) / 1000);

  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ago`;
}

export function GridRefreshButton({
  onRefresh,
  isRefreshing: controlledIsRefreshing,
  lastRefreshedAt: controlledLastRefreshedAt,
  className,
  disabled = false,
  label = 'Refresh',
  showLastUpdated = true,
}: GridRefreshButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalLastRefreshed, setInternalLastRefreshed] = useState<Date | null>(null);
  const [, setTick] = useState(0);
  const isExecutingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    setInternalLastRefreshed(new Date());
  }, []);

  const isRefreshing = controlledIsRefreshing !== undefined ? controlledIsRefreshing : internalLoading;
  const lastRefreshed = controlledLastRefreshedAt !== undefined ? controlledLastRefreshedAt : internalLastRefreshed;

  // Re-calculate relative time string every 5 seconds
  useEffect(() => {
    if (!mounted) return;
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, [mounted]);

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Guard against simultaneous or double clicks
    if (isRefreshing || isExecutingRef.current || disabled) {
      return;
    }

    isExecutingRef.current = true;
    if (controlledIsRefreshing === undefined) {
      setInternalLoading(true);
    }

    try {
      await onRefresh();
      setInternalLastRefreshed(new Date());
    } catch (err) {
      console.error('[GridRefreshButton] Error during data refresh:', err);
    } finally {
      isExecutingRef.current = false;
      if (controlledIsRefreshing === undefined) {
        setInternalLoading(false);
      }
    }
  }, [onRefresh, isRefreshing, disabled, controlledIsRefreshing]);

  const relativeTime = mounted && lastRefreshed ? formatRelativeTime(lastRefreshed) : '';

  return (
    <div className="flex items-center gap-2 shrink-0">
      {showLastUpdated && relativeTime && (
        <span
          suppressHydrationWarning
          className="hidden md:inline-block text-[11px] text-slate-600 dark:text-slate-300 select-none whitespace-nowrap"
          title={mounted && lastRefreshed ? `Last updated at ${lastRefreshed.toLocaleTimeString()}` : undefined}
        >
          Updated {relativeTime}
        </span>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={isRefreshing || disabled}
        aria-label={`${label} table data`}
        aria-busy={isRefreshing}
        title={isRefreshing ? 'Refreshing data...' : 'Refresh latest data'}
        className={cn(
          'h-10 px-3.5 rounded-xl border text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 select-none focus:outline-none focus:ring-2 focus:ring-[#008F83]/30',
          'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-300',
          isRefreshing && 'opacity-80 cursor-wait bg-slate-50 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300',
          disabled && !isRefreshing && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <RefreshCw
          className={cn(
            'w-3.5 h-3.5 text-slate-600 dark:text-slate-300 transition-transform',
            isRefreshing && 'animate-spin text-[#008F83]'
          )}
        />
        <span>{isRefreshing ? 'Refreshing...' : label}</span>
      </button>
    </div>
  );
}
