'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronsUpDown, Plus, Search, Briefcase } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { switchWorkspace } from '@/app/actions/workspace-team';
import { fetchWorkspaceBootstrap } from '@/app/actions/workspace-context';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';
import { Avatar } from '@/components/ui/avatar';
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
  const roleName = useWorkspaceStore((s) => s.roleName);
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

  useEffect(() => {
    function handleWorkspaceAvatarUpdated() {
      refreshBootstrap();
    }
    window.addEventListener('workspace-avatar-updated', handleWorkspaceAvatarUpdated);
    return () => window.removeEventListener('workspace-avatar-updated', handleWorkspaceAvatarUpdated);
  }, [refreshBootstrap]);

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
    ? 'flex h-10 items-center gap-2.5 rounded-xl border border-admin-sidebar-border bg-[#071526] px-3 text-[13.5px] font-medium text-admin-sidebar-foreground transition-all hover:bg-[#0E1E33] hover:border-[#008F83]/50 focus:outline-none focus:ring-2 focus:ring-[#008F83]/30 cursor-pointer shadow-xs'
    : 'flex w-full min-w-[200px] items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-2.5 transition-colors hover:bg-muted cursor-pointer';

  if (isLoading && !hasKnownWorkspace) {
    return (
      <div className={cn('relative', className)}>
        <button type="button" disabled className={cn(triggerClass, 'text-admin-sidebar-muted opacity-60')}>
          <div className="h-4 w-4 animate-pulse rounded-full bg-admin-sidebar-border" />
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
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs font-medium hover:bg-red-100 transition-colors"
        >
          <span>Couldn&apos;t load organization</span>
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
          className="flex w-full items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 transition-colors hover:bg-muted text-[13px]"
        >
          <Briefcase className="h-4 w-4 text-muted" />
          <span className="truncate font-medium">No Workspace</span>
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
        <Avatar seed={activeWorkspaceId || displayName} avatarUrl={selectedWorkspace?.avatarUrl} name={displayName} size="xs" className="shrink-0 ring-1 ring-white/10" />
        <span className="max-w-[150px] truncate text-left font-semibold text-white text-[13.5px]" data-testid="current-workspace">
          {displayName}
        </span>
        {isNavbar && (
          <span className="rounded-full bg-[#0E1E33] px-2 py-0.5 text-[10px] font-bold text-[#94A3B8] border border-admin-sidebar-border uppercase tracking-wider">
            {selectedWorkspace?.role ? (selectedWorkspace.role.charAt(0).toUpperCase() + selectedWorkspace.role.slice(1)) : (roleName || 'Owner')}
          </span>
        )}
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-[#94A3B8]" />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1.5 overflow-hidden rounded-xl border border-admin-border bg-admin-surface shadow-elevation-3 animate-in fade-in zoom-in-95 duration-120',
            isNavbar ? 'left-0 w-76' : 'left-0 right-0'
          )}
        >
          <div className="border-b border-admin-border/70 px-3.5 py-2.5 flex items-center justify-between bg-admin-surface-subtle/40">
            <div>
              <p className="text-[11px] font-semibold text-admin-foreground">Workspace</p>
              <p className="text-[10px] text-admin-muted">Switch active organization</p>
            </div>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-admin-primary-soft text-admin-primary border border-admin-primary/20">{workspaces.length} active</span>
          </div>
          <div className="border-b border-admin-border/70 p-2.5 bg-admin-surface">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-admin-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workspaces..."
                className="w-full rounded-lg border border-admin-border bg-admin-surface-subtle py-1.5 pl-8 pr-3 text-xs text-admin-foreground placeholder:text-admin-muted focus:outline-none focus:ring-1 focus:ring-admin-primary focus:border-admin-primary/50 transition-colors"
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
                    <Avatar seed={workspace.id || workspace.name} avatarUrl={workspace.avatarUrl} name={workspace.name} size="xs" className="shrink-0" />
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
