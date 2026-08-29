'use client';

import React from 'react';
import { CustomCellRendererProps } from 'ag-grid-react';
import { Button } from '@/components/admin/ui';
import { Eye, MoreHorizontal } from 'lucide-react';

export interface RowAction {
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  onClick: (data: any) => void;
  disabled?: boolean;
}

export function ActionsCell(props: CustomCellRendererProps) {
  const actions: RowAction[] = props.colDef?.cellRendererParams?.actions || [];
  const onInspect = props.colDef?.cellRendererParams?.onInspect;
  const inspectLabel = props.colDef?.cellRendererParams?.inspectLabel || 'Inspect';

  return (
    <div className="flex items-center justify-end gap-1.5 w-full">
      {onInspect && (
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onInspect(props.data);
          }}
          leftIcon={<Eye className="w-4 h-4" />}
        >
          {inspectLabel}
        </Button>
      )}

      {actions.map((act, i) => (
        <Button
          key={i}
          variant={act.variant || 'ghost'}
          size="sm"
          disabled={act.disabled}
          onClick={(e) => {
            e.stopPropagation();
            act.onClick(props.data);
          }}
          leftIcon={act.icon}
        >
          {act.label}
        </Button>
      ))}
    </div>
  );
}
