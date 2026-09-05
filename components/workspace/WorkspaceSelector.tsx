'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, Search, Briefcase } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { switchWorkspace } from '@/app/actions/workspace-team';
import { fetchWorkspaceBootstrap } from '@/app/actions/workspace-context';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';
import { cn } from '@/lib/utils';

interface WorkspaceSelectorProps {
  className?: string;
  showCreateLink?: boolean;
  variant?: 'sidebar' | 'navbar';
}

export function WorkspaceSelector({ className, showCreateLink = true, variant = 'sidebar' }: WorkspaceSelectorProps) {
  const router = useRouter();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceName = useWorkspaceStore((s) => s.workspaceName);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const isSwitching = useWorkspaceStore((s) => s.isSwitching);
  const updateFromServer = useWorkspaceStore((s) => s.updateFromServer);
  const setSwitching = useWorkspaceStore((s) => s.setSwitching);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) ??
    (activeWorkspaceId && workspaceName
      ? { id: activeWorkspaceId, name: workspaceName, slug: '', status: 'active', role: '' }
      : null);

  const displayName = isSwitching
    ? 'Switching...'
    : (selectedWorkspace?.name ?? workspaceName ?? 'Select Workspace');

  const hasKnownWorkspace = !!(activeWorkspaceId || workspaceName || workspaces.length > 0);

  const refreshBootstrap = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const bootstrap = await fetchWorkspaceBootstrap();
      if (bootstrap) {
        updateFromServer(bootstrap);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load workspaces');
      console.error('Error fetching workspaces:', err);
    } finally {
      setIsLoading(false);
    }
  }, [updateFromServer]);

  useEffect(() => {
    if (workspaces.length === 0 && hasKnownWorkspace) {
      refreshBootstrap();
    }
  }, [workspaces.length, hasKnownWorkspace, refreshBootstrap]);

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

  const handleSelect = async (workspace: (typeof workspaces)[0]) => {
    if (workspace.id === activeWorkspaceId) {
      setIsOpen(false);
      return;
    }

    setIsOpen(false);
    setSearchQuery('');
    setSwitching(true);

    try {
      await switchWorkspace(workspace.id);
      const bootstrap = await fetchWorkspaceBootstrap();
      if (bootstrap) {
        updateFromServer(bootstrap);
      }
      router.refresh();
    } catch (err) {
      console.error('Failed to switch workspace:', err);
    } finally {
      setSwitching(false);
    }
  };

  const isNavbar = variant === 'navbar';
  const triggerClass = isNavbar
    ? 'flex min-w-0 max-w-[160px] items-center gap-0.5 rounded-md px-1 py-0.5 text-xs font-medium text-admin-sidebar-foreground transition-colors hover:bg-admin-sidebar-hover'
    : 'flex w-full min-w-[180px] items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 transition-colors hover:bg-muted';

  if (isLoading && !hasKnownWorkspace) {
    return (
      <div className={cn('relative', className)}>
        <button type="button" disabled className={cn(triggerClass, 'text-admin-sidebar-muted opacity-60')}>
          <div className="h-3.5 w-3.5 animate-pulse rounded bg-admin-sidebar-border" />
          <div className="h-3.5 w-20 animate-pulse rounded bg-admin-sidebar-border" />
        </button>
      </div>
    );
  }

  if (error && !hasKnownWorkspace) {
    return (
      <div className={cn('relative', className)}>
        <button
          type="button"
          onClick={() => refreshBootstrap()}
          title="Click to retry loading workspaces"
          className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
        >
          <span>Error loading workspaces</span>
          <span className="underline font-bold text-[10px]">Retry</span>
        </button>
      </div>
    );
  }

  if (!hasKnownWorkspace) {
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
        disabled={isSwitching}
        data-testid="workspace-selector"
        className={cn(triggerClass, isSwitching && 'opacity-60')}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {!isNavbar && <Briefcase className="h-4 w-4 shrink-0 text-accent" />}
        <span className="flex-1 truncate text-left" data-testid="current-workspace">
          {displayName}
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-2 overflow-hidden rounded-xl border border-admin-border bg-admin-surface shadow-lg animate-in fade-in zoom-in-95 duration-150',
            isNavbar ? 'left-0 w-72' : 'left-0 right-0'
          )}
        >
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
            {(filteredWorkspaces.length > 0 ? filteredWorkspaces : selectedWorkspace ? [selectedWorkspace] : []).map(
              (workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => handleSelect(workspace)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                    workspace.id === activeWorkspaceId
                      ? 'bg-accent/10 font-medium text-accent'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <Briefcase className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate text-left">{workspace.name}</span>
                  {workspace.role ? (
                    <span className="text-[10px] uppercase text-muted-foreground">{workspace.role}</span>
                  ) : null}
                </button>
              )
            )}
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
