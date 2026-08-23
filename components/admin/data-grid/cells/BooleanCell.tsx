'use client';

import React from 'react';
import { CustomCellRendererProps } from 'ag-grid-react';
import { Check, X } from 'lucide-react';

export function BooleanCell(props: CustomCellRendererProps) {
  const isTrue = Boolean(props.value);
  const trueLabel = props.colDef?.cellRendererParams?.trueLabel || 'Yes';
  const falseLabel = props.colDef?.cellRendererParams?.falseLabel || 'No';

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
          isTrue
            ? 'bg-admin-success-soft text-admin-success border border-admin-success/30'
            : 'bg-admin-surface-subtle text-admin-muted border border-admin-border'
        }`}
      >
        {isTrue ? <Check className="w-3 h-3 stroke-[2.5]" /> : <X className="w-3 h-3 stroke-[2]" />}
      </span>
      <span className="text-[13px] text-admin-foreground font-medium">
        {isTrue ? trueLabel : falseLabel}
      </span>
    </div>
  );
}
