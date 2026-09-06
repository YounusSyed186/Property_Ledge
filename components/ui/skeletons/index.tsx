import React from 'react';
import { Skeleton, SkeletonCard, SkeletonTable } from '@/components/admin/ui/Skeleton';
import { cn } from '@/lib/utils';

export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-5 p-6 max-w-7xl mx-auto w-full', className)}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-admin-border/50">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-44 rounded-xl" />
          <Skeleton className="h-3.5 w-64 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-1.5 bg-admin-surface border border-admin-border rounded-xl">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <div className="flex items-center gap-2 ml-auto">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      </div>

      {/* Table Data */}
      <SkeletonTable rows={6} />
    </div>
  );
}

export function TableSkeleton({ rows = 8, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-4 p-6 max-w-7xl mx-auto w-full', className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-36 rounded-xl" />
          <Skeleton className="h-3.5 w-52 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-60 rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>
      <SkeletonTable rows={rows} />
    </div>
  );
}

export function DetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6 p-6 max-w-7xl mx-auto w-full', className)}>
      <div className="flex items-start justify-between gap-4 pb-3 border-b border-admin-border/60">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-xl" />
          <Skeleton className="h-4 w-40 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="rounded-2xl border border-admin-border bg-admin-surface p-6 space-y-4 shadow-xs">
        <Skeleton className="h-5 w-48 rounded-lg" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function TeamSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-5 p-6 max-w-7xl mx-auto w-full', className)}>
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-admin-border/50">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-32 rounded-xl" />
          <Skeleton className="h-3.5 w-56 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <SkeletonTable rows={5} />
    </div>
  );
}
