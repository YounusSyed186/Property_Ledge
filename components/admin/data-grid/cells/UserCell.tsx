'use client';

import React from 'react';
import { CustomCellRendererProps } from 'ag-grid-react';
import { DiceBearAvatar } from '@/components/admin/ui/DiceBearAvatar';

export function UserCell(props: CustomCellRendererProps) {
  const value = props.value;
  const name = typeof value === 'string'
    ? value
    : (props.data?.name || props.data?.userName || props.data?.full_name || value || 'Unknown');

  return (
    <div className="flex items-center gap-2.5 py-1 min-w-0 max-w-full overflow-hidden" title={name}>
      <DiceBearAvatar seed={name} size={28} alt={name} />
      <span className="font-semibold text-admin-foreground text-[13.5px] truncate min-w-0">
        {name}
      </span>
    </div>
  );
}
