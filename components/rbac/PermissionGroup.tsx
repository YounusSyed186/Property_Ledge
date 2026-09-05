'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, Minus, Check, Lock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge, Tooltip } from '@/components/admin/ui';
import { PermissionToggle } from './PermissionToggle';
import { getResourceIcon, formatActionName } from './constants';
import type { ResourceGroupData, PermissionItem } from './types';

export interface PermissionGroupProps {
  group: ResourceGroupData;
  displayedActions: string[];
  selectedKeys: Set<string>;
  grantableKeys?: Set<string>;
  readOnly?: boolean;
  onTogglePermission: (permissionKey: string) => void;
  onToggleResourceAll: (resource: string, targetState: boolean) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function PermissionGroup({
  group,
  displayedActions,
  selectedKeys,
  grantableKeys,
  readOnly = false,
  onTogglePermission,
  onToggleResourceAll,
  isCollapsed = false,
  onToggleCollapse,
  className,
}: PermissionGroupProps) {
  const Icon = getResourceIcon(group.resource);

  // Group permission state
  const grantablePerms = useMemo(() => {
    if (!grantableKeys) return group.permissions;
    return group.permissions.filter((p) => grantableKeys.has(p.key));
  }, [group.permissions, grantableKeys]);

  const grantableCount = grantablePerms.length;
  const enabledGrantableCount = grantablePerms.filter((p) => selectedKeys.has(p.key)).length;
  const totalEnabled = group.permissions.filter((p) => selectedKeys.has(p.key)).length;

  const isAllSelected = grantableCount > 0 && enabledGrantableCount === grantableCount;
  const isIndeterminate = enabledGrantableCount > 0 && enabledGrantableCount < grantableCount;

  const handleBulkToggle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (readOnly || grantableCount === 0) return;
    onToggleResourceAll(group.resource, !isAllSelected);
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-admin-border/80 bg-admin-surface overflow-hidden shadow-xs transition-all duration-200',
        'hover:border-admin-border-strong/70',
        className
      )}
    >
      {/* Resource Header Bar */}
      <div
        onClick={onToggleCollapse}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 cursor-pointer select-none',
          'bg-admin-surface border-b border-admin-border/60 transition-colors',
          'hover:bg-admin-surface-subtle/50'
        )}
      >
        {/* Left: Icon + Title + Description */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-admin-surface-elevated border border-admin-border flex items-center justify-center shrink-0 text-admin-foreground shadow-xs">
            <Icon className="w-4 h-4" />
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-admin-foreground tracking-tight">
                {group.label}
              </span>
              <span className="text-[10px] text-admin-muted font-mono hidden sm:inline-block">
                ({group.resource})
              </span>
            </div>
            {group.description && (
              <span className="text-xs text-admin-muted truncate mt-0.5">
                {group.description}
              </span>
            )}
          </div>
        </div>

        {/* Right: Enabled Counter + Tri-state Toggle + Chevron */}
        <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Enabled count badge */}
          <div
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-semibold font-mono border',
              totalEnabled === group.totalCount && group.totalCount > 0
                ? 'bg-admin-success/10 border-admin-success/20 text-admin-success'
                : totalEnabled > 0
                ? 'bg-admin-primary/10 border-admin-primary/20 text-admin-primary'
                : 'bg-admin-surface-subtle border-admin-border/60 text-admin-muted'
            )}
          >
            {totalEnabled} / {group.totalCount}
          </div>

          {/* Tri-state Bulk Resource Checkbox */}
          {!readOnly && (
            <div className="flex items-center">
              <PermissionToggle
                checked={isAllSelected}
                indeterminate={isIndeterminate}
                disabled={grantableCount === 0}
                onChange={handleBulkToggle}
                ariaLabel={`Select all permissions for ${group.label}`}
                tooltipTitle={`Toggle all ${group.label} permissions`}
                tooltipDescription={
                  isAllSelected ? 'Click to deselect all' : 'Click to grant all permissions in this module'
                }
                size="sm"
              />
            </div>
          )}

          {/* Collapse toggle chevron */}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? `Expand ${group.label}` : `Collapse ${group.label}`}
            className="p-1 rounded-md text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-elevated transition-colors"
          >
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isCollapsed && '-rotate-90'
              )}
            />
          </button>
        </div>
      </div>

      {/* Expanded Content: Desktop Matrix Table + Mobile Stacked List */}
      {!isCollapsed && (
        <div className="p-0">
          {/* Desktop & Tablet Matrix Grid */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-admin-border/50 bg-admin-surface-subtle/40">
                  <th className="py-2.5 px-4 font-semibold text-admin-muted text-[11px] uppercase tracking-wider w-[240px]">
                    Action Column
                  </th>
                  {displayedActions.map((action) => (
                    <th
                      key={action}
                      className="py-2.5 px-2 font-semibold text-admin-muted text-[11px] uppercase tracking-wider text-center min-w-[72px]"
                    >
                      {formatActionName(action)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border/40">
                <tr className="hover:bg-admin-surface-subtle/20 transition-colors">
                  <td className="py-3 px-4 text-xs font-medium text-admin-foreground">
                    <div className="flex flex-col">
                      <span>Standard Actions</span>
                      <span className="text-[10px] text-admin-muted">
                        Module permissions for {group.label}
                      </span>
                    </div>
                  </td>
                  {displayedActions.map((action) => {
                    const perm = group.actionsMap.get(action);

                    if (!perm) {
                      return (
                        <td key={action} className="py-3 px-2 text-center text-admin-muted/30 select-none font-bold">
                          —
                        </td>
                      );
                    }

                    const isChecked = selectedKeys.has(perm.key);
                    const canGrant = !grantableKeys || grantableKeys.has(perm.key);

                    return (
                      <td key={action} className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center">
                          <PermissionToggle
                            checked={isChecked}
                            disabled={!canGrant}
                            readOnly={readOnly}
                            onChange={() => onTogglePermission(perm.key)}
                            ariaLabel={`${group.label}: ${perm.name}`}
                            tooltipTitle={perm.name}
                            tooltipKey={perm.key}
                            tooltipDescription={perm.description || undefined}
                            disabledReason={
                              !canGrant
                                ? 'You do not hold this permission and cannot grant it.'
                                : undefined
                            }
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile & Small Screen Stacked Layout */}
          <div className="md:hidden p-3.5 flex flex-col gap-2 divide-y divide-admin-border/40">
            {group.permissions.map((perm) => {
              const isChecked = selectedKeys.has(perm.key);
              const canGrant = !grantableKeys || grantableKeys.has(perm.key);

              return (
                <div
                  key={perm.key}
                  onClick={() => {
                    if (!readOnly && canGrant) onTogglePermission(perm.key);
                  }}
                  className={cn(
                    'flex items-center justify-between gap-3 pt-2 first:pt-0 cursor-pointer rounded-lg p-2 -mx-1',
                    'hover:bg-admin-surface-subtle/60 transition-colors'
                  )}
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-medium text-admin-foreground">
                      {formatActionName(perm.action)} ({perm.name})
                    </span>
                    <span className="text-[10px] text-admin-muted font-mono truncate">
                      {perm.key}
                    </span>
                  </div>

                  <PermissionToggle
                    checked={isChecked}
                    disabled={!canGrant}
                    readOnly={readOnly}
                    onChange={() => onTogglePermission(perm.key)}
                    ariaLabel={`${group.label}: ${perm.name}`}
                    tooltipTitle={perm.name}
                    tooltipKey={perm.key}
                    tooltipDescription={perm.description || undefined}
                    disabledReason={
                      !canGrant
                        ? 'You do not hold this permission and cannot grant it.'
                        : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
