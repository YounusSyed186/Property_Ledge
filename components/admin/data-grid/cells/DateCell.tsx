'use client';

import React from 'react';
import { CustomCellRendererProps } from 'ag-grid-react';

export function DateCell(props: CustomCellRendererProps) {
  const value = props.value;
  if (!value) return <span className="text-admin-muted">—</span>;

  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return <span className="text-admin-muted">{String(value)}</span>;

    const formatted = d.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return (
      <span className="text-admin-foreground text-[13px] font-medium whitespace-nowrap">
        {formatted}
      </span>
    );
  } catch {
    return <span className="text-admin-muted">{String(value)}</span>;
  }
}
