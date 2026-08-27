'use client';

import React, { useMemo } from 'react';
import { Tooltip } from '@/components/admin/ui';
import type { PermissionCatalogItem } from './PermissionMatrix';

interface PermissionBuilderProps {
  permissions: PermissionCatalogItem[];
  selected: Set<string>;
  grantableKeys: Set<string> | string[];
  onChange: (keys: Set<string>) => void;
  disabled?: boolean;
}

function formatResource(resource: string) {
  return resource
    .split(/[._]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function PermissionBuilder({
  permissions,
  selected,
  grantableKeys,
  onChange,
  disabled = false,
}: PermissionBuilderProps) {
  const grantable = useMemo(
    () => new Set(Array.isArray(grantableKeys) ? grantableKeys : [...grantableKeys]),
    [grantableKeys]
  );

  const grouped = useMemo(() => {
    const map: Record<string, PermissionCatalogItem[]> = {};
    permissions.forEach((p) => {
      (map[p.resource] ||= []).push(p);
    });
    return map;
  }, [permissions]);

  function toggle(key: string) {
    if (!grantable.has(key) || disabled) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  function selectAll(resource: string) {
    const keys = grouped[resource]?.filter((p) => grantable.has(p.key)).map((p) => p.key) || [];
    onChange(new Set([...selected, ...keys]));
  }

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([resource, perms]) => (
        <div key={resource} className="rounded-xl border border-admin-border p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-admin-muted">
              {formatResource(resource)}
            </p>
            {!disabled && (
              <button
                type="button"
                className="text-xs text-admin-primary hover:underline"
                onClick={() => selectAll(resource)}
              >
                Select all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {perms.map((p) => {
              const canGrant = grantable.has(p.key);
              const label = (
                <label
                  className={`flex items-center gap-2 text-sm ${!canGrant || disabled ? 'opacity-50' : 'cursor-pointer'}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(p.key)}
                    onChange={() => toggle(p.key)}
                    disabled={!canGrant || disabled}
                    className="h-4 w-4 rounded border-admin-border accent-admin-primary"
                  />
                  <span className="text-admin-foreground">{p.name}</span>
                </label>
              );
              if (!canGrant) {
                return (
                  <Tooltip key={p.key} content="You don't have this permission and cannot grant it to another role.">
                    {label}
                  </Tooltip>
                );
              }
              return <div key={p.key}>{label}</div>;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
