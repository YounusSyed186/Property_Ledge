'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { WorkspaceSelector } from '@/components/workspace/WorkspaceSelector';
import { PropertySelector } from '@/components/property/PropertySelector';
import { cn } from '@/lib/utils';

function ContextDivider() {
  return <span className="text-admin-sidebar-muted/40 text-sm select-none" aria-hidden>/</span>;
}

interface ShellContextBreadcrumbProps {
  onCreateProperty?: () => void;
  className?: string;
}

export function ShellContextBreadcrumb({ onCreateProperty, className }: ShellContextBreadcrumbProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-1.5 text-xs', className)}>
      <ContextDivider />
      <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors">
        <span className="text-[11px] font-medium text-admin-sidebar-muted">Org:</span>
        <WorkspaceSelector variant="navbar" />
      </div>
      <ContextDivider />
      <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors">
        <span className="text-[11px] font-medium text-admin-sidebar-muted">Property:</span>
        <PropertySelector variant="navbar" onCreateClick={onCreateProperty} />
      </div>
    </div>
  );
}

interface MobileContextMenuProps {
  onCreateProperty?: () => void;
}

export function MobileContextMenu({ onCreateProperty }: MobileContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex max-w-[160px] items-center gap-1 truncate rounded-md px-1.5 py-1 text-xs font-medium text-admin-sidebar-muted hover:bg-admin-sidebar-hover hover:text-admin-sidebar-foreground"
        aria-expanded={isOpen}
      >
        <span className="truncate">Context</span>
        <ChevronDown className={cn('h-3 w-3 shrink-0 transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 space-y-2 rounded-xl border border-admin-border bg-admin-surface p-2 shadow-lg">
          <WorkspaceSelector variant="sidebar" />
          <PropertySelector variant="sidebar" onCreateClick={onCreateProperty} />
        </div>
      )}
    </div>
  );
}
