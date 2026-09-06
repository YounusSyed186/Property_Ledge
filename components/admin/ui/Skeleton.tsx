import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('rounded-lg skeleton-shimmer', className)}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3 rounded-md', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-admin-surface border border-admin-border rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-3', className)}>
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl skeleton-shimmer shrink-0" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-1.5 mt-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-2.5 w-36" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('bg-admin-surface border border-admin-border rounded-2xl overflow-hidden shadow-xs', className)}>
      {/* Table header */}
      <div className="flex items-center gap-4 px-5 py-3.5 border-b border-admin-border bg-admin-surface-subtle/50">
        <Skeleton className="h-4 w-4 rounded shrink-0" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24 hidden sm:block" />
        <Skeleton className="h-4 w-28 hidden md:block" />
        <Skeleton className="h-4 w-20 hidden lg:block" />
        <Skeleton className="h-4 w-16 ml-auto shrink-0" />
      </div>
      {/* Table rows */}
      <div className="divide-y divide-admin-border/60">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="h-4 w-4 rounded shrink-0" />
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1 max-w-[200px]">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-2.5 w-2/3" />
              </div>
            </div>
            <Skeleton className="h-4 w-24 hidden sm:block" />
            <Skeleton className="h-5 w-20 rounded-full hidden md:block" />
            <Skeleton className="h-4 w-20 hidden lg:block" />
            <Skeleton className="h-7 w-16 rounded-lg ml-auto shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
