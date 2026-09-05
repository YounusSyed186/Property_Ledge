'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { Search, ShieldAlert, Info, X, ChevronDown, ChevronRight, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Tooltip } from '@/components/admin/ui';
import { PermissionToggle } from './PermissionToggle';
import { PermissionToolbar } from './PermissionToolbar';
import {
  CANONICAL_ACTION_ORDER,
  formatResourceName,
  getResourceDescription,
  formatActionName,
  getResourceIcon,
  getCategoryForResource,
  normalizeActionKey,
} from './constants';
import type { PermissionItem, ResourceGroupData, PermissionStatusFilter } from './types';

export type { PermissionItem };

export interface PermissionMatrixProps {
  /** Full list of permissions available in the system or catalog */
  permissions: PermissionItem[];
  /** Currently selected / granted permission keys */
  selectedKeys: Set<string> | string[];
  /** Keys that the current user is permitted to grant/toggle. If omitted, all permissions in catalog are grantable. */
  grantableKeys?: Set<string> | string[];
  /** Callback fired when selection changes in editable mode */
  onChange?: (nextSelected: Set<string>) => void;
  /** If true, renders a read-only matrix */
  readOnly?: boolean;
  /** Optional custom class name */
  className?: string;
  /** Optional placeholder for search input */
  searchPlaceholder?: string;
  /** Whether to show top toolbar controls */
  showToolbar?: boolean;
}

export function PermissionMatrix({
  permissions,
  selectedKeys,
  grantableKeys,
  onChange,
  readOnly = false,
  className,
  searchPlaceholder = 'Search permissions by resource, action or key...',
  showToolbar = true,
}: PermissionMatrixProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PermissionStatusFilter>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hideEmptyColumns, setHideEmptyColumns] = useState(false);

  // Normalized Selected Set
  const selected = useMemo(() => {
    return new Set(Array.isArray(selectedKeys) ? selectedKeys : [...selectedKeys]);
  }, [selectedKeys]);

  // Normalized Grantable Set
  const grantable = useMemo(() => {
    if (!grantableKeys) return new Set(permissions.map((p) => p.key));
    return new Set(Array.isArray(grantableKeys) ? grantableKeys : [...grantableKeys]);
  }, [grantableKeys, permissions]);

  // Distinct normalized action columns across all permissions in catalog
  const allActionColumns = useMemo(() => {
    const set = new Set<string>();
    permissions.forEach((p) => {
      set.add(normalizeActionKey(p.action));
    });
    return [...set].sort((a, b) => {
      const idxA = CANONICAL_ACTION_ORDER.indexOf(a);
      const idxB = CANONICAL_ACTION_ORDER.indexOf(b);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
  }, [permissions]);

  // Group permissions by resource
  const resourceGroups = useMemo<ResourceGroupData[]>(() => {
    const resourceMap = new Map<string, PermissionItem[]>();
    permissions.forEach((p) => {
      if (!resourceMap.has(p.resource)) {
        resourceMap.set(p.resource, []);
      }
      resourceMap.get(p.resource)!.push(p);
    });

    const groups: ResourceGroupData[] = [];

    for (const [resource, perms] of resourceMap.entries()) {
      const actionsMap = new Map<string, PermissionItem>();
      perms.forEach((p) => {
        const normalizedAction = normalizeActionKey(p.action);
        actionsMap.set(normalizedAction, p);
      });

      const enabledCount = perms.filter((p) => selected.has(p.key)).length;
      const grantableCount = perms.filter((p) => grantable.has(p.key)).length;

      groups.push({
        resource,
        label: formatResourceName(resource),
        description: getResourceDescription(resource),
        category: getCategoryForResource(resource),
        permissions: perms,
        actionsMap,
        totalCount: perms.length,
        enabledCount,
        grantableCount,
      });
    }

    return groups.sort((a, b) => a.label.localeCompare(b.label));
  }, [permissions, selected, grantable]);

  // Filter groups according to search & status filter
  const filteredGroups = useMemo<ResourceGroupData[]>(() => {
    const q = searchQuery.toLowerCase().trim();

    return resourceGroups
      .map((group) => {
        if (statusFilter === 'enabled' && group.enabledCount === 0) return null;
        if (statusFilter === 'disabled' && group.enabledCount === group.totalCount) return null;

        if (!q) return group;

        const matchesGroup =
          group.label.toLowerCase().includes(q) ||
          group.resource.toLowerCase().includes(q) ||
          (group.description && group.description.toLowerCase().includes(q)) ||
          group.category.toLowerCase().includes(q);

        const matchingPerms = group.permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.key.toLowerCase().includes(q) ||
            p.action.toLowerCase().includes(q) ||
            formatActionName(p.action).toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
        );

        if (matchesGroup || matchingPerms.length > 0) {
          return group;
        }

        return null;
      })
      .filter(Boolean) as ResourceGroupData[];
  }, [resourceGroups, searchQuery, statusFilter]);

  // Dynamic action columns filter (if hideEmptyColumns is active)
  const activeActionColumns = useMemo(() => {
    if (!hideEmptyColumns) return allActionColumns;
    const supportedActions = new Set<string>();
    filteredGroups.forEach((g) => {
      g.permissions.forEach((p) => supportedActions.add(normalizeActionKey(p.action)));
    });
    return allActionColumns.filter((act) => supportedActions.has(act));
  }, [allActionColumns, filteredGroups, hideEmptyColumns]);

  // Group filtered resources by category
  const categoriesMap = useMemo(() => {
    const map = new Map<string, ResourceGroupData[]>();
    filteredGroups.forEach((g) => {
      if (!map.has(g.category)) {
        map.set(g.category, []);
      }
      map.get(g.category)!.push(g);
    });
    return map;
  }, [filteredGroups]);

  // Global grantable stats
  const totalAvailable = permissions.length;
  const totalSelected = selected.size;
  const allGrantableKeys = useMemo(() => {
    return permissions.filter((p) => grantable.has(p.key)).map((p) => p.key);
  }, [permissions, grantable]);

  const isAllGlobalSelected =
    allGrantableKeys.length > 0 &&
    allGrantableKeys.every((k) => selected.has(k));
  const isGlobalIndeterminate =
    totalSelected > 0 && !isAllGlobalSelected && allGrantableKeys.some((k) => selected.has(k));

  // Category & Row Toggle Handlers
  const handleToggleSingle = useCallback(
    (key: string) => {
      if (readOnly || !onChange || !grantable.has(key)) return;
      const next = new Set(selected);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      onChange(next);
    },
    [readOnly, onChange, grantable, selected]
  );

  const handleToggleResourceAll = useCallback(
    (resource: string, targetState: boolean) => {
      if (readOnly || !onChange) return;
      const group = resourceGroups.find((g) => g.resource === resource);
      if (!group) return;

      const next = new Set(selected);
      const grantableInGroup = group.permissions.filter((p) => grantable.has(p.key));

      grantableInGroup.forEach((p) => {
        if (targetState) {
          next.add(p.key);
        } else {
          next.delete(p.key);
        }
      });

      onChange(next);
    },
    [readOnly, onChange, resourceGroups, grantable, selected]
  );

  const handleToggleCategoryAll = useCallback(
    (category: string, targetState: boolean) => {
      if (readOnly || !onChange) return;
      const categoryResources = categoriesMap.get(category) || [];
      const next = new Set(selected);

      categoryResources.forEach((group) => {
        const grantableInGroup = group.permissions.filter((p) => grantable.has(p.key));
        grantableInGroup.forEach((p) => {
          if (targetState) {
            next.add(p.key);
          } else {
            next.delete(p.key);
          }
        });
      });

      onChange(next);
    },
    [readOnly, onChange, categoriesMap, grantable, selected]
  );

  const handleToggleColumnAll = useCallback(
    (action: string, targetState: boolean) => {
      if (readOnly || !onChange) return;
      const actionPerms = permissions.filter(
        (p) => normalizeActionKey(p.action) === action && grantable.has(p.key)
      );

      const next = new Set(selected);
      actionPerms.forEach((p) => {
        if (targetState) {
          next.add(p.key);
        } else {
          next.delete(p.key);
        }
      });

      onChange(next);
    },
    [readOnly, onChange, permissions, grantable, selected]
  );

  const handleToggleGlobalAll = useCallback(() => {
    if (readOnly || !onChange) return;
    const next = new Set(selected);
    if (isAllGlobalSelected) {
      allGrantableKeys.forEach((k) => next.delete(k));
    } else {
      allGrantableKeys.forEach((k) => next.add(k));
    }
    onChange(next);
  }, [readOnly, onChange, isAllGlobalSelected, allGrantableKeys, selected]);

  // Collapse / Expand Category Handlers
  const handleExpandAll = () => setCollapsedCategories(new Set());
  const handleCollapseAll = () => {
    setCollapsedCategories(new Set(Array.from(categoriesMap.keys())));
  };
  const handleToggleCollapseCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  if (permissions.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl border border-admin-border/80 bg-admin-surface-subtle/30 text-admin-muted text-xs">
        <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-admin-muted/60" />
        <p className="font-semibold text-admin-foreground">No permissions available</p>
        <p className="mt-1">There are currently no permission definitions configured.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 font-sans transition-all duration-200',
        isFullscreen && 'fixed inset-3 sm:inset-6 z-50 bg-admin-surface p-4 sm:p-6 rounded-2xl border border-admin-border shadow-2xl flex flex-col',
        className
      )}
    >
      {/* Search & Filter Toolbar */}
      {showToolbar && (
        <PermissionToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          totalResources={resourceGroups.length}
          filteredResourcesCount={filteredGroups.length}
        />
      )}

      {/* Dynamic Column Option Notice */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-admin-surface-subtle/40 border border-admin-border/60 text-xs">
        <div className="flex items-center gap-2 text-admin-muted text-[11px]">
          <span>
            <strong className="text-admin-foreground font-semibold">{totalSelected}</strong> of {totalAvailable} permissions granted
          </span>
        </div>

        <button
          type="button"
          onClick={() => setHideEmptyColumns(!hideEmptyColumns)}
          className={cn(
            'px-2.5 py-0.5 rounded-md text-[11px] font-medium border transition-colors flex items-center gap-1',
            hideEmptyColumns
              ? 'bg-admin-primary/10 border-admin-primary/30 text-admin-primary font-semibold'
              : 'bg-admin-surface border-admin-border/60 text-admin-muted hover:text-admin-foreground'
          )}
        >
          <Filter className="w-3 h-3" />
          <span>{hideEmptyColumns ? 'Showing Active Columns' : 'Hide Empty Columns'}</span>
        </button>
      </div>

      {/* ONE UNIFIED DATA TABLE CONTAINER */}
      <div
        className={cn(
          'w-full overflow-hidden rounded-2xl border border-admin-border/90 bg-admin-surface shadow-xs',
          isFullscreen ? 'flex-1 min-h-0' : ''
        )}
      >
        <div
          className={cn(
            'overflow-x-auto overflow-y-auto',
            isFullscreen ? 'h-full' : 'max-h-[640px]'
          )}
        >
          <table className="w-full text-left border-collapse text-xs">
            {/* Multi-Level Sticky Header */}
            <thead className="sticky top-0 z-30 bg-admin-surface-subtle border-b border-admin-border/80 shadow-xs">
              {/* Header Row 1: Section Grouping */}
              <tr className="border-b border-admin-border/40 text-[10px] uppercase font-bold text-admin-muted tracking-wider">
                <th className="py-2.5 px-4 sticky left-0 z-40 bg-admin-surface-subtle border-r border-admin-border/60 min-w-[260px] shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span>MODULE / RESOURCE</span>
                    {!readOnly && (
                      <PermissionToggle
                        checked={isAllGlobalSelected}
                        indeterminate={isGlobalIndeterminate}
                        disabled={allGrantableKeys.length === 0}
                        onChange={handleToggleGlobalAll}
                        ariaLabel="Select or clear all permissions"
                        tooltipTitle="Select / clear all permissions"
                        size="sm"
                      />
                    )}
                  </div>
                </th>
                <th
                  colSpan={activeActionColumns.length}
                  className="py-2.5 px-4 text-center bg-admin-primary/5 text-admin-primary border-b border-admin-border/40"
                >
                  PERMISSIONS
                </th>
              </tr>

              {/* Header Row 2: Individual Action Column Headers */}
              <tr className="text-[11px] font-semibold text-admin-foreground">
                <th className="py-3 px-4 sticky left-0 z-40 bg-admin-surface-subtle border-r border-admin-border/60 min-w-[260px] shadow-xs">
                  Resource Name & Description
                </th>
                {activeActionColumns.map((action) => {
                  const actionPerms = permissions.filter(
                    (p) => normalizeActionKey(p.action) === action && grantable.has(p.key)
                  );
                  const total = actionPerms.length;
                  const count = actionPerms.filter((p) => selected.has(p.key)).length;
                  const isChecked = total > 0 && count === total;
                  const isIndeterminate = count > 0 && count < total;

                  return (
                    <th
                      key={action}
                      className="py-3 px-2 text-center min-w-[80px] border-r border-admin-border/30 last:border-r-0"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="uppercase text-[11px] tracking-wider font-semibold text-admin-foreground">
                          {formatActionName(action)}
                        </span>
                        {!readOnly && (
                          <PermissionToggle
                            checked={isChecked}
                            indeterminate={isIndeterminate}
                            disabled={total === 0}
                            onChange={() => handleToggleColumnAll(action, !isChecked)}
                            ariaLabel={`Select all ${formatActionName(action)} permissions`}
                            tooltipTitle={`Toggle all ${formatActionName(action)} permissions`}
                            size="sm"
                          />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Unified Matrix Rows */}
            <tbody className="divide-y divide-admin-border/40">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeActionColumns.length + 1}
                    className="py-12 px-4 text-center text-xs text-admin-muted"
                  >
                    No matching resources found.
                  </td>
                </tr>
              ) : (
                Array.from(categoriesMap.entries()).map(([catName, catResources]) => {
                  const isCatCollapsed = collapsedCategories.has(catName);
                  const catPerms = catResources.flatMap((g) => g.permissions);
                  const catGrantable = catPerms.filter((p) => grantable.has(p.key));
                  const catEnabledCount = catPerms.filter((p) => selected.has(p.key)).length;
                  const isCatAllSelected = catGrantable.length > 0 && catEnabledCount === catGrantable.length;
                  const isCatIndeterminate = catEnabledCount > 0 && catEnabledCount < catGrantable.length;

                  return (
                    <React.Fragment key={catName}>
                      {/* CATEGORY GROUP HEADER ROW */}
                      <tr className="bg-admin-surface-subtle/80 border-y border-admin-border/70 select-none">
                        <td
                          colSpan={activeActionColumns.length + 1}
                          className="py-2 px-4 font-bold text-[10px] uppercase tracking-wider text-admin-muted"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggleCollapseCategory(catName)}
                              className="flex items-center gap-2 text-left hover:text-admin-foreground transition-colors group"
                            >
                              {isCatCollapsed ? (
                                <ChevronRight className="w-3.5 h-3.5 text-admin-muted group-hover:text-admin-foreground shrink-0" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-admin-muted group-hover:text-admin-foreground shrink-0" />
                              )}
                              <span className="font-bold text-admin-foreground text-[11px] tracking-wide">
                                {catName}
                              </span>
                              <span className="text-[10px] text-admin-muted font-normal">
                                ({catResources.length} {catResources.length === 1 ? 'module' : 'modules'})
                              </span>
                            </button>

                            <div className="flex items-center gap-2">
                              {!readOnly && (
                                <PermissionToggle
                                  checked={isCatAllSelected}
                                  indeterminate={isCatIndeterminate}
                                  disabled={catGrantable.length === 0}
                                  onChange={() => handleToggleCategoryAll(catName, !isCatAllSelected)}
                                  ariaLabel={`Select all ${catName} permissions`}
                                  tooltipTitle={`Toggle all ${catName} permissions`}
                                  size="sm"
                                />
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* CATEGORY RESOURCE ROWS */}
                      {!isCatCollapsed &&
                        catResources.map((group) => {
                          const Icon = getResourceIcon(group.resource);
                          const grantablePerms = group.permissions.filter((p) => grantable.has(p.key));
                          const grantableCount = grantablePerms.length;
                          const enabledGrantableCount = grantablePerms.filter((p) => selected.has(p.key)).length;

                          const isAllRowSelected = grantableCount > 0 && enabledGrantableCount === grantableCount;
                          const isRowIndeterminate = enabledGrantableCount > 0 && enabledGrantableCount < grantableCount;

                          return (
                            <tr
                              key={group.resource}
                              className="hover:bg-admin-surface-subtle/40 transition-colors group"
                            >
                              {/* Sticky Left Resource Column */}
                              <td className="py-3 px-4 sticky left-0 z-20 bg-admin-surface group-hover:bg-admin-surface-subtle/80 border-r border-admin-border/60 min-w-[260px] shadow-xs">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    {!readOnly && (
                                      <PermissionToggle
                                        checked={isAllRowSelected}
                                        indeterminate={isRowIndeterminate}
                                        disabled={grantableCount === 0}
                                        onChange={() => handleToggleResourceAll(group.resource, !isAllRowSelected)}
                                        ariaLabel={`Select all permissions for ${group.label}`}
                                        tooltipTitle={`Toggle all ${group.label} permissions`}
                                        size="sm"
                                      />
                                    )}
                                    <div className="w-7 h-7 rounded-lg bg-admin-surface-elevated border border-admin-border flex items-center justify-center shrink-0 text-admin-foreground">
                                      <Icon className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                      <span className="font-semibold text-xs text-admin-foreground truncate">
                                        {group.label}
                                      </span>
                                      {group.description && (
                                        <span className="text-[10px] text-admin-muted truncate" title={group.description}>
                                          {group.description}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div
                                    className={cn(
                                      'px-2 py-0.5 rounded text-[10px] font-mono font-semibold shrink-0 border',
                                      group.enabledCount === group.totalCount && group.totalCount > 0
                                        ? 'bg-admin-success/10 border-admin-success/20 text-admin-success'
                                        : group.enabledCount > 0
                                        ? 'bg-admin-primary/10 border-admin-primary/20 text-admin-primary'
                                        : 'bg-admin-surface border-admin-border/60 text-admin-muted/60'
                                    )}
                                  >
                                    {group.enabledCount}/{group.totalCount}
                                  </div>
                                </div>
                              </td>

                              {/* Action Permission Cells */}
                              {activeActionColumns.map((action) => {
                                const perm = group.actionsMap.get(action);

                                if (!perm) {
                                  return (
                                    <td
                                      key={action}
                                      className="py-3 px-2 text-center select-none border-r border-admin-border/20 last:border-r-0"
                                    >
                                      <span
                                        className="text-admin-muted/30 text-xs font-mono cursor-help"
                                        title={`${group.label} does not support ${formatActionName(action).toLowerCase()} action.`}
                                      >
                                        ·
                                      </span>
                                    </td>
                                  );
                                }

                                const isChecked = selected.has(perm.key);
                                const canGrant = grantable.has(perm.key);

                                return (
                                  <td
                                    key={action}
                                    className="py-3 px-2 text-center border-r border-admin-border/20 last:border-r-0"
                                  >
                                    <div className="flex items-center justify-center">
                                      <PermissionToggle
                                        checked={isChecked}
                                        disabled={!canGrant}
                                        readOnly={readOnly}
                                        onChange={() => handleToggleSingle(perm.key)}
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
                          );
                        })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Note */}
      <div className="flex items-center justify-between text-[11px] text-admin-muted px-1">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>Dots (&quot;·&quot;) indicate actions not supported by that resource.</span>
        </div>
        {!readOnly && (
          <span className="italic font-medium">Click category chevrons or expand/collapse buttons to toggle groups.</span>
        )}
      </div>
    </div>
  );
}

/**
 * Reusable export for backward compatibility
 */
export const PermissionGrid = PermissionMatrix;
