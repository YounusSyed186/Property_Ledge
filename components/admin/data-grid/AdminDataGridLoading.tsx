'use client';

import React from 'react';

export function AdminDataGridLoading() {
  return (
    <div className="w-full p-4 space-y-3 animate-pulse">
      <div className="h-10 bg-admin-surface-subtle/80 rounded-lg w-full" />
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-12 bg-admin-surface-subtle/50 rounded-lg w-full flex items-center px-4 gap-4"
          >
            <div className="w-6 h-6 rounded-full bg-admin-border/50 shrink-0" />
            <div className="h-4 bg-admin-border/50 rounded w-1/4" />
            <div className="h-4 bg-admin-border/40 rounded w-1/6" />
            <div className="h-4 bg-admin-border/40 rounded w-1/5 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
