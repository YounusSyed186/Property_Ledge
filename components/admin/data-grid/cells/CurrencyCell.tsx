'use client';

import React from 'react';
import { CustomCellRendererProps } from 'ag-grid-react';

export function CurrencyCell(props: CustomCellRendererProps) {
  const value = props.value;
  if (value === null || value === undefined || isNaN(Number(value))) {
    return <span className="text-admin-muted font-mono">—</span>;
  }

  const num = typeof value === 'number' ? value : parseFloat(value);
  const formatted = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: props.data?.currency || 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  return (
    <span className="font-semibold text-admin-foreground font-mono text-[13.5px]">
      {formatted}
    </span>
  );
}
