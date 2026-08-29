'use client';

import React from 'react';

export function AdminDataGridLoading({ overlay = false }: { overlay?: boolean }) {
  return (
    <div
      className={`w-full h-full flex flex-col min-h-[220px] select-none ${
        overlay
          ? 'absolute inset-0 z-20 bg-admin-surface/80 backdrop-blur-xs'
          : 'bg-admin-surface'
      }`}
    >
      {/* Table Header Skeleton */}
      <div className="flex items-center h-10 px-4 border-b border-admin-border/60 bg-admin-surface-subtle/40 gap-4 shrink-0">
        <div className="w-4 h-4 rounded bg-admin-border/40 shrink-0 animate-pulse" />
        <div className="h-3.5 bg-admin-border/50 rounded w-28 animate-pulse" />
        <div className="h-3.5 bg-admin-border/40 rounded w-20 animate-pulse hidden sm:block" />
        <div className="h-3.5 bg-admin-border/40 rounded w-24 animate-pulse hidden md:block" />
        <div className="h-3.5 bg-admin-border/40 rounded w-16 animate-pulse hidden lg:block" />
        <div className="h-3.5 bg-admin-border/50 rounded w-14 ml-auto shrink-0 animate-pulse" />
      </div>

      {/* Row Skeletons */}
      <div className="flex-1 divide-y divide-admin-border/30 overflow-hidden">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="flex items-center h-12 px-4 gap-4 transition-colors bg-admin-surface/30"
          >
            {/* Checkbox / Selection placeholder */}
            <div className="w-4 h-4 rounded bg-admin-border/30 shrink-0 animate-pulse" />

            {/* Primary cell content (avatar/title) */}
            <div className="flex items-center gap-3 w-1/3 min-w-[140px]">
              <div className="w-7 h-7 rounded-full bg-admin-border/40 shrink-0 animate-pulse" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 bg-admin-border/50 rounded w-3/4 animate-pulse" />
                <div className="h-2.5 bg-admin-border/30 rounded w-1/2 animate-pulse" />
              </div>
            </div>

            {/* Column 2 */}
            <div className="h-3 bg-admin-border/40 rounded w-1/6 hidden sm:block animate-pulse" />

            {/* Status Pill Placeholder */}
            <div className="hidden md:block">
              <div className="h-5 w-16 rounded-full bg-admin-border/40 animate-pulse" />
            </div>

            {/* Column 4 */}
            <div className="h-3 bg-admin-border/30 rounded w-1/6 hidden lg:block animate-pulse" />

            {/* Right Action / Value */}
            <div className="h-3 bg-admin-border/40 rounded w-12 ml-auto shrink-0 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
