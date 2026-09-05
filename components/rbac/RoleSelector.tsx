'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  Search,
  Shield,
  User,
  Check,
  Building,
  Sparkles,
  Users,
  KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/admin/ui';
import type { MatrixRole } from './types';

export interface RoleSelectorProps {
  roles: MatrixRole[];
  selectedRoleId: string | null;
  onSelectRole: (roleId: string) => void;
  rolePermissionCounts?: Record<string, { enabled: number; total: number }>;
  hasUnsavedChanges?: boolean;
  disabled?: boolean;
  className?: string;
}

export function RoleSelector({
  roles,
  selectedRoleId,
  onSelectRole,
  rolePermissionCounts = {},
  hasUnsavedChanges = false,
  disabled = false,
  className,
}: RoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || roles[0] || null;
  }, [roles, selectedRoleId]);

  // Group roles by System vs Custom
  const { systemRoles, customRoles } = useMemo(() => {
    const system: MatrixRole[] = [];
    const custom: MatrixRole[] = [];

    roles.forEach((r) => {
      if (r.isSystemRole) {
        system.push(r);
      } else {
        custom.push(r);
      }
    });

    return { systemRoles: system, customRoles: custom };
  }, [roles]);

  // Filtered roles based on search
  const filteredSystemRoles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return systemRoles;
    return systemRoles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        'system role'.includes(q)
    );
  }, [systemRoles, searchQuery]);

  const filteredCustomRoles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return customRoles;
    return customRoles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        'custom role'.includes(q)
    );
  }, [customRoles, searchQuery]);

  const flatFilteredRoles = useMemo(() => {
    return [...filteredSystemRoles, ...filteredCustomRoles];
  }, [filteredSystemRoles, filteredCustomRoles]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Auto-focus search input on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setFocusedIndex(
        Math.max(0, flatFilteredRoles.findIndex((r) => r.id === selectedRole?.id))
      );
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, flatFilteredRoles, selectedRole]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1 < flatFilteredRoles.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : flatFilteredRoles.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = flatFilteredRoles[focusedIndex];
      if (target) {
        onSelectRole(target.id);
        setIsOpen(false);
      }
    }
  };

  const getRoleIcon = (role: MatrixRole) => {
    if (role.isSystemRole) {
      if (role.name.toLowerCase().includes('admin')) return Shield;
      return KeyRound;
    }
    if (role.name.toLowerCase().includes('property')) return Building;
    if (role.name.toLowerCase().includes('team') || role.name.toLowerCase().includes('agent'))
      return Users;
    return User;
  };

  const selectedCount = selectedRole ? rolePermissionCounts[selectedRole.id] : null;

  return (
    <div className={cn('relative w-full max-w-xl font-sans', className)} ref={containerRef}>
      <label className="block text-xs font-semibold text-admin-foreground uppercase tracking-wider mb-1.5">
        Role
      </label>

      {/* Main Role Dropdown Trigger Button */}
      <button
        type="button"
        disabled={disabled || roles.length === 0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select role to view and manage permissions"
        className={cn(
          'w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-left',
          'bg-admin-surface border border-admin-border/90 shadow-xs',
          'transition-all duration-150 outline-none',
          'hover:border-admin-primary/60 hover:bg-admin-surface-subtle/50',
          'focus-visible:ring-2 focus-visible:ring-admin-primary/40 focus-visible:border-admin-primary',
          disabled && 'opacity-50 cursor-not-allowed hover:border-admin-border'
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {selectedRole ? (
            <>
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border',
                  selectedRole.isSystemRole
                    ? 'bg-admin-primary/10 border-admin-primary/20 text-admin-primary'
                    : 'bg-admin-surface-elevated border-admin-border text-admin-foreground'
                )}
              >
                {React.createElement(getRoleIcon(selectedRole), { className: 'w-4 h-4' })}
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-admin-foreground truncate">
                    {selectedRole.name}
                  </span>
                  <Badge
                    variant={selectedRole.isSystemRole ? 'neutral' : 'info'}
                    size="sm"
                    className="text-[10px] py-0 px-1.5 font-medium tracking-wide uppercase shrink-0"
                  >
                    {selectedRole.isSystemRole ? 'SYSTEM ROLE' : 'CUSTOM ROLE'}
                  </Badge>
                  {hasUnsavedChanges && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] text-amber-500 font-medium shrink-0"
                      title="Unsaved permission changes"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Unsaved
                    </span>
                  )}
                </div>

                {selectedRole.description ? (
                  <span className="text-xs text-admin-muted truncate mt-0.5">
                    {selectedRole.description}
                  </span>
                ) : (
                  <span className="text-xs text-admin-muted/70 italic mt-0.5">
                    No description provided
                  </span>
                )}
              </div>

              {selectedCount && (
                <div className="hidden sm:flex flex-col items-end shrink-0 pl-2 border-l border-admin-border/50 text-right">
                  <span className="text-xs font-semibold text-admin-foreground">
                    {selectedCount.enabled} / {selectedCount.total}
                  </span>
                  <span className="text-[10px] text-admin-muted">permissions</span>
                </div>
              )}
            </>
          ) : (
            <span className="text-sm text-admin-muted">Select a role...</span>
          )}
        </div>

        <ChevronDown
          className={cn(
            'w-4 h-4 text-admin-muted shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180 text-admin-primary'
          )}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 left-0 right-0 mt-1.5 rounded-xl',
            'bg-admin-surface border border-admin-border shadow-xl',
            'flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150',
            'max-h-[380px]'
          )}
        >
          {/* Search Box */}
          <div className="p-2.5 border-b border-admin-border/80 bg-admin-surface-subtle/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-admin-muted pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search roles..."
                className={cn(
                  'w-full pl-8 pr-3 py-1.5 text-xs rounded-lg',
                  'bg-admin-surface border border-admin-border text-admin-foreground placeholder:text-admin-muted',
                  'focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary',
                  'transition-all duration-150'
                )}
              />
            </div>
          </div>

          {/* Roles List */}
          <div ref={listRef} className="overflow-y-auto p-1.5 flex flex-col gap-1 divide-y divide-admin-border/40">
            {flatFilteredRoles.length === 0 ? (
              <div className="py-6 px-4 text-center text-xs text-admin-muted">
                {searchQuery ? (
                  <>
                    <p className="font-semibold text-admin-foreground">No roles found</p>
                    <p className="mt-1">Try a different role name or search query.</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-admin-foreground">No roles available</p>
                    <p className="mt-1">Create a role before managing permissions.</p>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* SYSTEM ROLES GROUP */}
                {filteredSystemRoles.length > 0 && (
                  <div className="flex flex-col gap-0.5 pt-1 first:pt-0">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-admin-muted uppercase tracking-wider">
                      System Roles
                    </div>
                    {filteredSystemRoles.map((role) => {
                      const Icon = getRoleIcon(role);
                      const isSelected = selectedRole?.id === role.id;
                      const counts = rolePermissionCounts[role.id];
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => {
                            onSelectRole(role.id);
                            setIsOpen(false);
                          }}
                          className={cn(
                            'w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-left',
                            'transition-all duration-100 outline-none',
                            isSelected
                              ? 'bg-admin-primary/10 text-admin-primary font-medium'
                              : 'text-admin-foreground hover:bg-admin-surface-subtle'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={cn(
                                'w-7 h-7 rounded-md flex items-center justify-center shrink-0 border',
                                isSelected
                                  ? 'bg-admin-primary/15 border-admin-primary/30 text-admin-primary'
                                  : 'bg-admin-surface-elevated border-admin-border text-admin-muted'
                              )}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold truncate text-admin-foreground">
                                  {role.name}
                                </span>
                              </div>
                              {role.description && (
                                <span className="text-[11px] text-admin-muted truncate">
                                  {role.description}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {counts && (
                              <span className="text-[11px] text-admin-muted font-mono">
                                {counts.enabled}/{counts.total}
                              </span>
                            )}
                            {isSelected && <Check className="w-4 h-4 text-admin-primary" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* CUSTOM ROLES GROUP */}
                {filteredCustomRoles.length > 0 && (
                  <div className="flex flex-col gap-0.5 pt-1.5">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-admin-muted uppercase tracking-wider">
                      Custom Roles
                    </div>
                    {filteredCustomRoles.map((role) => {
                      const Icon = getRoleIcon(role);
                      const isSelected = selectedRole?.id === role.id;
                      const counts = rolePermissionCounts[role.id];
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => {
                            onSelectRole(role.id);
                            setIsOpen(false);
                          }}
                          className={cn(
                            'w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-left',
                            'transition-all duration-100 outline-none',
                            isSelected
                              ? 'bg-admin-primary/10 text-admin-primary font-medium'
                              : 'text-admin-foreground hover:bg-admin-surface-subtle'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={cn(
                                'w-7 h-7 rounded-md flex items-center justify-center shrink-0 border',
                                isSelected
                                  ? 'bg-admin-primary/15 border-admin-primary/30 text-admin-primary'
                                  : 'bg-admin-surface-elevated border-admin-border text-admin-muted'
                              )}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold truncate text-admin-foreground">
                                  {role.name}
                                </span>
                              </div>
                              {role.description && (
                                <span className="text-[11px] text-admin-muted truncate">
                                  {role.description}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {counts && (
                              <span className="text-[11px] text-admin-muted font-mono">
                                {counts.enabled}/{counts.total}
                              </span>
                            )}
                            {isSelected && <Check className="w-4 h-4 text-admin-primary" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
