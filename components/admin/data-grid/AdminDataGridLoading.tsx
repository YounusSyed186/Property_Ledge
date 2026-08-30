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
        <div className="w-4 h-4 rounded skeleton-shimmer shrink-0" />
        <div className="h-3.5 rounded w-28 skeleton-shimmer" />
        <div className="h-3.5 rounded w-20 skeleton-shimmer hidden sm:block" />
        <div className="h-3.5 rounded w-24 skeleton-shimmer hidden md:block" />
        <div className="h-3.5 rounded w-16 skeleton-shimmer hidden lg:block" />
        <div className="h-3.5 rounded w-14 ml-auto shrink-0 skeleton-shimmer" />
      </div>

      {/* Row Skeletons */}
      <div className="flex-1 divide-y divide-admin-border/30 overflow-hidden">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="flex items-center h-12 px-4 gap-4 transition-colors bg-admin-surface/30"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* Checkbox / Selection placeholder */}
            <div className="w-4 h-4 rounded skeleton-shimmer shrink-0" style={{ animationDelay: `${i * 80}ms` }} />

            {/* Primary cell content (avatar/title) */}
            <div className="flex items-center gap-3 w-1/3 min-w-[140px]">
              <div className="w-7 h-7 rounded-full skeleton-shimmer shrink-0" style={{ animationDelay: `${i * 80 + 40}ms` }} />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 rounded w-3/4 skeleton-shimmer" style={{ animationDelay: `${i * 80 + 60}ms` }} />
                <div className="h-2.5 rounded w-1/2 skeleton-shimmer" style={{ animationDelay: `${i * 80 + 100}ms` }} />
              </div>
            </div>

            {/* Column 2 */}
            <div className="h-3 rounded w-1/6 hidden sm:block skeleton-shimmer" style={{ animationDelay: `${i * 80 + 120}ms` }} />

            {/* Status Pill Placeholder */}
            <div className="hidden md:block">
              <div className="h-5 w-16 rounded-full skeleton-shimmer" style={{ animationDelay: `${i * 80 + 140}ms` }} />
            </div>

            {/* Column 4 */}
            <div className="h-3 rounded w-1/6 hidden lg:block skeleton-shimmer" style={{ animationDelay: `${i * 80 + 160}ms` }} />

            {/* Right Action / Value */}
            <div className="h-3 rounded w-12 ml-auto shrink-0 skeleton-shimmer" style={{ animationDelay: `${i * 80 + 180}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
