'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, Search, Briefcase } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/context/AppContextProvider';
import { cn } from '@/lib/utils';

interface AccessibleWorkspace {
  id: string;
  name: string;
  slug: string;
  status: string;
  role: string;
}

interface WorkspaceSelectorProps {
  className?: string;
  showCreateLink?: boolean;
  variant?: 'sidebar' | 'navbar';
}

export function WorkspaceSelector({ className, showCreateLink = true, variant = 'sidebar' }: WorkspaceSelectorProps) {
  const router = useRouter();
  const { workspaceId, setWorkspaceId } = useAppContext();
  const [workspaces, setWorkspaces] = useState<AccessibleWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedWorkspace = workspaces.find((w) => w.id === workspaceId) ?? null;

  const fetchWorkspaces = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/workspaces/accessible');
      if (!response.ok) throw new Error('Failed to fetch workspaces');

      const data = await response.json();
      const list: AccessibleWorkspace[] = data.workspaces || [];
      setWorkspaces(list);

      const storedId = localStorage.getItem('selectedWorkspaceId');
      const stored = list.find((w) => w.id === storedId);
      if (stored) {
        setWorkspaceId(stored.id);
      } else if (list.length > 0) {
        setWorkspaceId(list[0].id);
      }
    } catch (err) {
      console.error('Error fetching workspaces:', err);
    } finally {
      setIsLoading(false);
    }
  }, [setWorkspaceId]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  const filteredWorkspaces = workspaces.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (workspace: AccessibleWorkspace) => {
    setWorkspaceId(workspace.id);
    setIsOpen(false);
    setSearchQuery('');
  };

  const isNavbar = variant === 'navbar';
  const triggerClass = isNavbar
    ? 'flex min-w-0 max-w-[160px] items-center gap-0.5 rounded-md px-1 py-0.5 text-xs font-medium text-admin-sidebar-foreground transition-colors hover:bg-admin-sidebar-hover'
    : 'flex w-full min-w-[180px] items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 transition-colors hover:bg-muted';

  if (isLoading) {
    return (
      <div className={cn('relative', className)}>
        <button type="button" disabled className={cn(triggerClass, 'text-admin-sidebar-muted opacity-60')}>
          <div className="h-3.5 w-3.5 animate-pulse rounded bg-admin-sidebar-border" />
          <div className="h-3.5 w-20 animate-pulse rounded bg-admin-sidebar-border" />
        </button>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className={cn('relative', className)} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => showCreateLink && router.push('/onboarding/workspace')}
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 transition-colors hover:bg-muted"
        >
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <span className="truncate text-sm font-medium">No Workspace</span>
        </button>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="workspace-selector"
        className={triggerClass}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {!isNavbar && <Briefcase className="h-4 w-4 shrink-0 text-accent" />}
        <span className="flex-1 truncate text-left" data-testid="current-workspace">
          {selectedWorkspace?.name ?? 'Select Workspace'}
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className={cn(
          'absolute z-50 mt-2 overflow-hidden rounded-xl border border-admin-border bg-admin-surface shadow-lg animate-in fade-in zoom-in-95 duration-150',
          isNavbar ? 'left-0 w-72' : 'left-0 right-0'
        )}>
          <div className="border-b border-admin-border px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-admin-muted">Workspace</p>
          </div>
          <div className="border-b border-admin-border p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workspaces..."
                className="w-full rounded-lg border border-admin-border bg-admin-surface py-2 pl-10 pr-3 text-sm text-admin-foreground focus:outline-none focus:ring-2 focus:ring-admin-success/30"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredWorkspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                onClick={() => handleSelect(workspace)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  workspace.id === workspaceId
                    ? 'bg-accent/10 font-medium text-accent'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                <Briefcase className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate text-left">{workspace.name}</span>
                <span className="text-[10px] uppercase text-muted-foreground">{workspace.role}</span>
              </button>
            ))}
          </div>
          {showCreateLink && (
            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push('/onboarding/workspace');
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
              >
                <Plus className="h-4 w-4" />
                Create Workspace
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
