'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, MoreHorizontal, ChevronDown } from 'lucide-react';
import { Button, ConfirmDialog } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

export interface EntityActionItem {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  separator?: boolean;
}

export interface EntityAddItem {
  label: string;
  onClick: () => void;
}

interface EntityActionsProps {
  onEdit?: () => void;
  editLabel?: string;
  addItems?: EntityAddItem[];
  moreItems?: EntityActionItem[];
  className?: string;
}

export function EntityActions({
  onEdit,
  editLabel = 'Edit',
  addItems = [],
  moreItems = [],
  className,
}: EntityActionsProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [pendingDestructive, setPendingDestructive] = useState<EntityActionItem | null>(null);
  const addRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {onEdit && (
        <Button variant="secondary" size="sm" onClick={onEdit}>
          {editLabel}
        </Button>
      )}
      {addItems.length > 0 && (
        <div className="relative" ref={addRef}>
          <Button size="sm" onClick={() => setAddOpen(!addOpen)}>
            <Plus className="mr-1 h-3 w-3" />
            Add
            <ChevronDown className={cn('ml-1 h-3 w-3 transition-transform', addOpen && 'rotate-180')} />
          </Button>
          {addOpen && (
            <div className="absolute right-0 z-50 mt-1 w-48 rounded-md border border-admin-border bg-admin-surface py-1 shadow-lg">
              {addItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => { item.onClick(); setAddOpen(false); }}
                  className="flex w-full px-3 py-2 text-left text-[12px] text-admin-foreground hover:bg-admin-surface-subtle"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {moreItems.length > 0 && (
        <div className="relative" ref={moreRef}>
          <Button variant="secondary" size="sm" onClick={() => setMoreOpen(!moreOpen)}>
            <MoreHorizontal className="h-3.5 w-3.5" />
            <span className="ml-1">More</span>
          </Button>
          {moreOpen && (
            <div className="absolute right-0 z-50 mt-1 w-48 rounded-md border border-admin-border bg-admin-surface py-1 shadow-lg">
              {moreItems.map((item, i) => (
                <React.Fragment key={`${item.label}-${i}`}>
                  {item.separator && <div className="my-1 border-t border-admin-border" />}
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      if (item.destructive) {
                        setPendingDestructive(item);
                      } else {
                        item.onClick();
                      }
                    }}
                    className={cn(
                      'flex w-full px-3 py-2 text-left text-[12px] hover:bg-admin-surface-subtle',
                      item.destructive ? 'text-admin-danger' : 'text-admin-foreground'
                    )}
                  >
                    {item.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        isOpen={Boolean(pendingDestructive)}
        onClose={() => setPendingDestructive(null)}
        onConfirm={() => {
          pendingDestructive?.onClick();
          setPendingDestructive(null);
        }}
        title={`${pendingDestructive?.label ?? 'Confirm'}?`}
        description="This action cannot be undone."
        confirmLabel={pendingDestructive?.label ?? 'Confirm'}
        variant="danger"
      />
    </div>
  );
}
