'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Select } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

interface AdminDataGridPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  labelSingular?: string;
  labelPlural?: string;
}

export function AdminDataGridPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  labelSingular = 'item',
  labelPlural = 'items',
}: AdminDataGridPaginationProps) {
  const from = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const to = totalItems > 0 ? Math.min(currentPage * pageSize, totalItems) : 0;
  const safeTotalPages = Math.max(1, totalPages);

  // Generate numbered pages window (up to 5 pages around current)
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (safeTotalPages <= 7) {
      for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(safeTotalPages);
      } else if (currentPage >= safeTotalPages - 3) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = safeTotalPages - 4; i <= safeTotalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(safeTotalPages);
      }
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 border-t border-admin-divider/60 bg-admin-surface text-xs text-admin-muted">
      {/* Showing counter */}
      <div className="flex items-center gap-3">
        <span className="text-slate-500 dark:text-slate-400 font-medium">
          Showing <span className="font-bold text-slate-900 dark:text-white">{from}</span>–
          <span className="font-bold text-slate-900 dark:text-white">{to}</span> of{' '}
          <span className="font-bold text-slate-900 dark:text-white">{totalItems}</span>{' '}
          {totalItems === 1 ? labelSingular : labelPlural}
        </span>

        {onPageSizeChange && (
          <div className="hidden md:flex items-center gap-1.5 ml-2">
            <span className="text-[11px] text-slate-400">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 px-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#008F83]"
              aria-label="Rows per page"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Centered Numbered Navigation (Modelled after reference mockup) */}
      <div className="flex items-center justify-center gap-1 self-center">
        {/* First & Prev */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="w-8 h-8 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs"
          aria-label="First page"
          title="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="w-8 h-8 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs"
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Numbered Pills */}
        <div className="flex items-center gap-1 mx-1">
          {pageNumbers.map((p, idx) => {
            if (p === 'ellipsis') {
              return (
                <span key={`ellipsis-${idx}`} className="w-6 text-center text-slate-400 font-bold text-xs">
                  ...
                </span>
              );
            }
            const isActive = p === currentPage;
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
                aria-current={isActive ? 'page' : undefined}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next & Last */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= safeTotalPages}
          className="w-8 h-8 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs"
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={currentPage >= safeTotalPages}
          className="w-8 h-8 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs"
          aria-label="Last page"
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
