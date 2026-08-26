'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react';

/* ============================================================
   TABLE
   ============================================================ */

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  density?: 'compact' | 'default' | 'comfortable';
}

const densityStyles = {
  compact: 'text-[13px] [&_th]:py-2.5 [&_td]:py-2.5',
  default: 'text-body-sm [&_th]:py-3 [&_td]:py-3.5',
  comfortable: 'text-body-sm [&_th]:py-3.5 [&_td]:py-4',
};

export function Table({ density = 'default', className, children, ...props }: TableProps) {
  return (
    <div className="w-full overflow-x-auto admin-scrollbar">
      <table className={cn('w-full text-left', densityStyles[density], className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        'border-b border-admin-divider bg-admin-sidebar-surface/40 text-admin-muted uppercase tracking-wide text-[11px] font-semibold',
        className
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('divide-y divide-admin-divider/60', className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('transition-colors duration-150 hover:bg-admin-surface-subtle/50', className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn('px-4 font-semibold whitespace-nowrap', className)} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 text-admin-foreground align-middle', className)} {...props}>
      {children}
    </td>
  );
}

/* ============================================================
   TABLE TOOLBAR
   ============================================================ */

interface TableToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
}

export function TableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  leftContent,
  rightContent,
  className,
  ...props
}: TableToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-admin-divider bg-admin-sidebar-surface/20',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {leftContent}
        {onSearchChange && (
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-admin-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-admin-sidebar-surface border border-admin-border text-body-sm text-admin-foreground placeholder:text-admin-muted/60 focus:outline-none focus:ring-2 focus:ring-admin-primary/40 focus:border-admin-primary transition-all duration-200"
              aria-label={searchPlaceholder}
            />
          </div>
        )}
      </div>
      {rightContent && <div className="flex items-center gap-2 shrink-0">{rightContent}</div>}
    </div>
  );
}

/* ============================================================
   PAGINATION
   ============================================================ */

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
}

export function Pagination({ page, totalPages, totalItems, onPageChange, pageSize = 10 }: PaginationProps) {
  const from = totalItems ? (page - 1) * pageSize + 1 : 0;
  const to = totalItems ? Math.min(page * pageSize, totalItems) : 0;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-admin-divider">
      {totalItems !== undefined && (
        <p className="text-caption text-admin-muted">
          Showing <span className="font-semibold text-admin-foreground">{from}</span>–
          <span className="font-semibold text-admin-foreground">{to}</span> of{' '}
          <span className="font-semibold text-admin-foreground">{totalItems}</span>
        </p>
      )}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className="w-8 h-8 rounded-lg border border-admin-border flex items-center justify-center text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="w-8 h-8 rounded-lg border border-admin-border flex items-center justify-center text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-3 text-caption text-admin-muted">
          Page <span className="font-semibold text-admin-foreground">{page}</span> of{' '}
          <span className="font-semibold text-admin-foreground">{totalPages || 1}</span>
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="w-8 h-8 rounded-lg border border-admin-border flex items-center justify-center text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="w-8 h-8 rounded-lg border border-admin-border flex items-center justify-center text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}