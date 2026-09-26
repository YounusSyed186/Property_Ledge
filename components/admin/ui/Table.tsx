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
  compact: 'text-[14px] [&_th]:py-3 [&_td]:py-3',
  default: 'text-[14.5px] [&_th]:py-3.5 [&_td]:py-4',
  comfortable: 'text-[15px] [&_th]:py-4 [&_td]:py-5',
};

export function Table({ density = 'default', className, children, ...props }: TableProps) {
  return (
    <div className="w-full overflow-x-auto admin-scrollbar rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
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
        'border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-[12px] font-bold uppercase tracking-wider',
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
    <tbody className={cn('divide-y divide-slate-100 dark:divide-slate-800/60', className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('transition-colors duration-150 hover:bg-slate-50/70 dark:hover:bg-slate-800/50', className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn('px-4 py-3.5 font-bold text-[12px] uppercase tracking-wider text-slate-600 dark:text-slate-400 whitespace-nowrap', className)} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-4 text-[14px] sm:text-[14.5px] text-slate-800 dark:text-slate-200 align-middle', className)} {...props}>
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
        'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900',
        className
      )}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
        {onSearchChange && (
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[14px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#008F83]/20 focus:border-[#008F83] transition-all shadow-xs"
              aria-label={searchPlaceholder}
            />
          </div>
        )}
        {leftContent}
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
  const safeTotalPages = Math.max(1, totalPages);

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (safeTotalPages <= 7) {
      for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
    } else {
      if (page <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(safeTotalPages);
      } else if (page >= safeTotalPages - 3) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = safeTotalPages - 4; i <= safeTotalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = page - 1; i <= page + 1; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(safeTotalPages);
      }
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-500">
      {totalItems !== undefined && (
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Showing <span className="font-bold text-slate-900 dark:text-white">{from}</span>–
          <span className="font-bold text-slate-900 dark:text-white">{to}</span> of{' '}
          <span className="font-bold text-slate-900 dark:text-white">{totalItems}</span>
        </p>
      )}
      <div className="flex items-center justify-center gap-1 self-center">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className="w-8 h-8 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs"
          aria-label="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="w-8 h-8 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <div className="flex items-center gap-1 mx-1">
          {pageNumbers.map((p, idx) => {
            if (p === 'ellipsis') {
              return (
                <span key={`ellipsis-${idx}`} className="w-6 text-center text-slate-400 font-bold text-xs">
                  ...
                </span>
              );
            }
            const isActive = p === page;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-semibold transition-all',
                  isActive
                    ? 'bg-[#008F83] text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-xs'
                )}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= safeTotalPages}
          className="w-8 h-8 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={page >= safeTotalPages}
          className="w-8 h-8 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs"
          aria-label="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}