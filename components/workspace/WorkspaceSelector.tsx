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
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs font-medium hover:bg-red-100 transition-colors"
        >
          <span>Couldn't load organization</span>
          <span className="underline font-semibold text-[11px]">Try again</span>
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
          className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 transition-colors hover:bg-muted"
        >
          <Briefcase className="h-3.5 w-3.5 text-muted" />
          <span className="truncate text-xs font-medium">No Workspace</span>
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
        {!isNavbar && <Briefcase className="h-3.5 w-3.5 shrink-0 text-admin-primary" />}
        <span className="flex-1 truncate text-left max-w-[140px]" data-testid="current-workspace">
          {displayName}
        </span>
        <ChevronDown className={cn('h-3 w-3 shrink-0 text-admin-sidebar-muted transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1.5 overflow-hidden rounded-lg border border-admin-border bg-admin-surface shadow-elevation-2 animate-in fade-in zoom-in-95 duration-100',
            isNavbar ? 'left-0 w-72' : 'left-0 right-0'
          )}
        >
          <div className="border-b border-admin-border px-3 py-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-admin-foreground">Organization / Workspace</p>
            <span className="text-[10px] text-admin-muted font-normal">{workspaces.length} active</span>
          </div>
          <div className="border-b border-admin-border p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workspaces..."
                className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
            {(filteredWorkspaces.length > 0 ? filteredWorkspaces : selectedWorkspace ? [selectedWorkspace] : []).map(
              (workspace) => {
                const isSelected = workspace.id === activeWorkspaceId;
                return (
                  <button
                    key={workspace.id}
                    type="button"
                    onClick={() => handleSelect(workspace)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors',
                      isSelected
                        ? 'bg-admin-primary-soft font-semibold text-admin-primary border border-admin-primary/20'
                        : 'text-foreground hover:bg-admin-surface-subtle'
                    )}
                  >
                    <div className={cn(
                      'flex items-center justify-center w-6 h-6 rounded-md shrink-0',
                      isSelected ? 'bg-admin-primary text-white' : 'bg-admin-surface-subtle text-admin-muted'
                    )}>
                      <Briefcase className="h-3.5 w-3.5" />
                    </div>
                    <span className="flex-1 truncate text-left">{workspace.name}</span>
                    {workspace.role ? (
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted/15 text-muted font-medium">{workspace.role}</span>
                    ) : null}
                  </button>
                );
              }
            )}
          </div>
          {showCreateLink && (
            <div className="border-t border-admin-border p-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push('/onboarding/workspace');
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-admin-primary transition-colors hover:bg-admin-primary-soft"
              >
                <Plus className="h-3.5 w-3.5" />
                Add workspace
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
