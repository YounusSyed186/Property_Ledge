'use client';

import React from 'react';
import { Search, ChevronDown, ChevronsUpDown, Maximize2, Minimize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Tooltip } from '@/components/admin/ui';
import type { PermissionStatusFilter } from './types';

export interface PermissionToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: PermissionStatusFilter;
  onStatusFilterChange: (status: PermissionStatusFilter) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  totalResources: number;
  filteredResourcesCount: number;
  className?: string;
  placeholder?: string;
}

export function PermissionToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onExpandAll,
  onCollapseAll,
  isFullscreen = false,
  onToggleFullscreen,
  totalResources,
  filteredResourcesCount,
  className,
  placeholder = 'Search permissions by resource, action, key or description...',
}: PermissionToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 font-sans',
        className
      )}
    >
      {/* Left side: Search Box */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full pl-9 pr-8 py-2 text-xs rounded-xl',
            'bg-admin-surface border border-admin-border text-admin-foreground placeholder:text-admin-muted',
            'focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary',
            'transition-all duration-150 shadow-xs'
          )}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-admin-muted hover:text-admin-foreground p-0.5 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Right side: Filter & Expand controls */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
        {/* Status Filter Segment */}
        <div className="flex items-center bg-admin-surface-subtle border border-admin-border/80 rounded-lg p-0.5 shadow-xs text-xs">
          <button
            type="button"
            onClick={() => onStatusFilterChange('all')}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all',
              statusFilter === 'all'
                ? 'bg-admin-surface text-admin-foreground font-semibold shadow-xs border border-admin-border/50'
                : 'text-admin-muted hover:text-admin-foreground'
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onStatusFilterChange('enabled')}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all',
              statusFilter === 'enabled'
                ? 'bg-admin-surface text-admin-foreground font-semibold shadow-xs border border-admin-border/50'
                : 'text-admin-muted hover:text-admin-foreground'
            )}
          >
            Enabled
          </button>
          <button
            type="button"
            onClick={() => onStatusFilterChange('disabled')}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all',
              statusFilter === 'disabled'
                ? 'bg-admin-surface text-admin-foreground font-semibold shadow-xs border border-admin-border/50'
                : 'text-admin-muted hover:text-admin-foreground'
            )}
          >
            Disabled
          </button>
        </div>

        {/* Expand / Collapse Category Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExpandAll}
            className="text-[11px] h-7 px-2 text-admin-muted hover:text-admin-foreground"
          >
            Expand all
          </Button>
          <span className="text-admin-border">•</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCollapseAll}
            className="text-[11px] h-7 px-2 text-admin-muted hover:text-admin-foreground"
          >
            Collapse all
          </Button>
        </div>

        {/* Fullscreen / Maximize Table View */}
        {onToggleFullscreen && (
          <Tooltip content={isFullscreen ? 'Exit full height view' : 'Expand matrix table height'}>
            <Button
              variant="secondary"
              size="sm"
              onClick={onToggleFullscreen}
              className="h-7 w-7 p-0 flex items-center justify-center text-admin-muted hover:text-admin-foreground"
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </Button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
