'use client';

import React, { useState } from 'react';
import { CustomCellRendererProps } from 'ag-grid-react';
import { Copy, Check } from 'lucide-react';

export function CodeCell(props: CustomCellRendererProps) {
  const [copied, setCopied] = useState(false);
  const value = props.value;
  if (!value) return <span className="text-admin-muted font-mono">—</span>;

  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(str);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group/code flex items-center justify-between gap-1.5 max-w-full min-w-0 overflow-hidden" title={str}>
      <span className="font-mono text-[12px] text-admin-foreground/90 truncate min-w-0 flex-1 bg-admin-surface-subtle/70 px-1.5 py-0.5 rounded border border-admin-border-subtle">
        {str}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="opacity-0 group-hover/code:opacity-100 p-0.5 rounded hover:bg-admin-surface-elevated text-admin-muted hover:text-admin-foreground transition-opacity shrink-0"
        title="Copy"
        aria-label="Copy to clipboard"
      >
        {copied ? <Check className="w-3 h-3 text-admin-success" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}
