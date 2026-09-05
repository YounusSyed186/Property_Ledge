'use client';

import React from 'react';
import { Skeleton } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

export function PermissionMatrixSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-4 animate-in fade-in-50 duration-200', className)}>
      {/* Role Summary Banner Skeleton */}
      <div className="rounded-2xl border border-admin-border/80 bg-admin-surface/70 p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3 w-full max-w-md">
            <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
            <div className="flex flex-col gap-2 w-full">
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-3.5 w-64 rounded" />
            </div>
          </div>
          <Skeleton className="h-14 w-44 rounded-xl shrink-0" />
        </div>
        <div className="flex gap-2 pt-2 border-t border-admin-border/40">
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="h-6 w-20 rounded-md" />
        </div>
      </div>

      {/* Toolbar Skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <Skeleton className="h-9 w-full sm:w-80 rounded-xl" />
        <Skeleton className="h-8 w-48 rounded-lg" />
      </div>

      {/* Resource Cards Skeletons */}
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-admin-border/80 bg-admin-surface overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-admin-border/60">
              <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-xl" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-48 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-14 rounded-lg" />
                <Skeleton className="w-5 h-5 rounded-md" />
              </div>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
