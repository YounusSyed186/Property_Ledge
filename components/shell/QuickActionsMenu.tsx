'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Building2,
  Home,
  Users,
  FileText,
  Receipt,
  DollarSign,
  Wrench,
  CheckSquare,
  ClipboardCheck,
  ChevronDown,
} from 'lucide-react';
import {
  canPerformQuickAction,
  QUICK_ACTION_LABELS,
  QUICK_ACTION_ROUTES,
  type Persona,
  type QuickActionId,
} from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';

const ACTION_ICONS: Record<QuickActionId, React.ComponentType<{ className?: string }>> = {
  property: Building2,
  unit: Home,
  tenant: Users,
  lease: FileText,
  invoice: Receipt,
  payment: DollarSign,
  maintenance: Wrench,
  task: CheckSquare,
};

const ACTION_GROUPS: { label: string; actions: QuickActionId[] }[] = [
  { label: 'Property', actions: ['property'] },
  { label: 'People', actions: ['tenant', 'lease'] },
  { label: 'Finance', actions: ['invoice', 'payment'] },
  { label: 'Operations', actions: ['maintenance', 'task'] },
];

interface QuickActionsMenuProps {
  persona: Persona;
  className?: string;
}

export function QuickActionsMenu({ persona, className }: QuickActionsMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const groupedActions = ACTION_GROUPS.map((group) => ({
    ...group,
    actions: group.actions.filter((action) => canPerformQuickAction(persona, action)),
  })).filter((g) => g.actions.length > 0);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (groupedActions.length === 0) return null;

  return (
    <div className={cn('relative', className)} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="quick-actions-menu"
        className="flex h-7 items-center gap-1 rounded-md border border-admin-border bg-admin-primary px-2.5 py-1 text-[11px] font-semibold text-admin-primary-foreground transition-colors hover:bg-admin-primary/90"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Plus className="h-3 w-3" />
        <span>Add</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-md border border-admin-border bg-admin-surface shadow-lg animate-in fade-in zoom-in-95 duration-150"
          role="menu"
        >
          {groupedActions.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 && <div className="border-t border-admin-border" />}
              <div className="px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-admin-muted">{group.label}</p>
              </div>
              <div className="px-1 pb-1">
                {group.actions.map((action) => {
                  const Icon = ACTION_ICONS[action];
                  return (
                    <button
                      key={action}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        router.push(QUICK_ACTION_ROUTES[action]);
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-admin-foreground transition-colors hover:bg-admin-primary-soft hover:text-admin-primary"
                    >
                      <Icon className="h-4 w-4 text-admin-muted" />
                      {QUICK_ACTION_LABELS[action]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
