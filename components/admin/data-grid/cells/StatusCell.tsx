'use client';

import React from 'react';
import { CustomCellRendererProps } from 'ag-grid-react';
import { Badge } from '@/components/admin/ui';

export function StatusCell(props: CustomCellRendererProps) {
  const rawStatus = props.value || props.data?.status || '';
  const statusStr = String(rawStatus).toLowerCase().trim();

  let variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' = 'neutral';

  if (['active', 'verified', 'processed', 'completed', 'active admin'].includes(statusStr)) {
    variant = 'success';
  } else if (['under_review', 'under review', 'trialing', 'pending', 'received', 'in_progress'].includes(statusStr)) {
    variant = 'warning';
  } else if (['suspended', 'rejected', 'failed', 'canceled', 'cancelled', 'past_due', 'expired', 'deactivated'].includes(statusStr)) {
    variant = 'danger';
  } else if (['draft', 'inactive', 'archived', 'not_started'].includes(statusStr)) {
    variant = 'neutral';
  } else if (statusStr.includes('admin') || statusStr.includes('primary')) {
    variant = 'primary';
  }

  const displayText = statusStr
    ? statusStr.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : '—';

  return (
    <div className="flex items-center">
      <Badge variant={variant} dot size="sm">
        {displayText}
      </Badge>
    </div>
  );
}
