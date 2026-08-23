'use client';

import React from 'react';
import { Button } from '@/components/admin/ui';
import { SearchX, Inbox, RotateCcw } from 'lucide-react';

interface AdminDataGridEmptyProps {
  isFiltered?: boolean;
  onClearFilters?: () => void;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function AdminDataGridEmpty({
  isFiltered = false,
  onClearFilters,
  title,
  description,
  icon,
}: AdminDataGridEmptyProps) {
  if (isFiltered) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center max-w-sm mx-auto animate-fade-in">
        <div className="w-12 h-12 rounded-2xl bg-admin-surface-subtle border border-admin-border flex items-center justify-center text-admin-muted mb-4 shadow-xs">
          <SearchX className="w-6 h-6" />
        </div>
        <h3 className="text-card-title text-admin-foreground font-semibold mb-1">
          {title || 'No matching records'}
        </h3>
        <p className="text-body-sm text-admin-muted mb-5">
          {description || 'No records match your current search and filter criteria. Try adjusting or clearing your filters.'}
        </p>
        {onClearFilters && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onClearFilters}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Clear all filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center max-w-sm mx-auto animate-fade-in">
      <div className="w-12 h-12 rounded-2xl bg-admin-surface-subtle border border-admin-border flex items-center justify-center text-admin-muted mb-4 shadow-xs">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-card-title text-admin-foreground font-semibold mb-1">
        {title || 'No records available'}
      </h3>
      <p className="text-body-sm text-admin-muted">
        {description || 'There are currently no records in this dataset.'}
      </p>
    </div>
  );
}
