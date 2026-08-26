'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Select } from '@/components/admin/ui';

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

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2 py-1.5 border-t border-admin-divider bg-admin-surface text-[11px] text-admin-muted">
      {/* Showing counter & page size selector */}
      <div className="flex items-center gap-4">
        <span>
          Showing <span className="font-bold text-admin-foreground">{from}</span>–
          <span className="font-bold text-admin-foreground">{to}</span> of{' '}
          <span className="font-bold text-admin-foreground">{totalItems}</span>{' '}
          {totalItems === 1 ? labelSingular : labelPlural}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-metadata text-admin-muted">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 px-2 text-metadata rounded-md bg-admin-surface-subtle border border-admin-border text-admin-foreground focus:outline-none focus:ring-1 focus:ring-admin-primary"
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

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="w-8 h-8 rounded-lg border border-admin-border flex items-center justify-center text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle disabled:opacity-35 disabled:pointer-events-none transition-colors"
          aria-label="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="w-8 h-8 rounded-lg border border-admin-border flex items-center justify-center text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle disabled:opacity-35 disabled:pointer-events-none transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="px-3 text-caption text-admin-muted">
          Page <span className="font-bold text-admin-foreground">{currentPage}</span> of{' '}
          <span className="font-bold text-admin-foreground">{safeTotalPages}</span>
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= safeTotalPages}
          className="w-8 h-8 rounded-lg border border-admin-border flex items-center justify-center text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle disabled:opacity-35 disabled:pointer-events-none transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={currentPage >= safeTotalPages}
          className="w-8 h-8 rounded-lg border border-admin-border flex items-center justify-center text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle disabled:opacity-35 disabled:pointer-events-none transition-colors"
          aria-label="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
