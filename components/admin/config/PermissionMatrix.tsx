'use client';

import React, { useMemo } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PermissionCatalogItem {
  key: string;
  name: string;
  resource: string;
  action: string;
}

interface PermissionMatrixProps {
  permissions: PermissionCatalogItem[];
  grantedKeys: Set<string> | string[];
  className?: string;
}

const ACTION_ORDER = ['view', 'create', 'update', 'delete', 'manage', 'invite', 'remove', 'assign'];

function formatResource(resource: string) {
  return resource
    .split(/[._]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatAction(action: string) {
  return action.charAt(0).toUpperCase() + action.slice(1);
}

export function PermissionMatrix({ permissions, grantedKeys, className }: PermissionMatrixProps) {
  const granted = useMemo(
    () => new Set(Array.isArray(grantedKeys) ? grantedKeys : [...grantedKeys]),
    [grantedKeys]
  );

  const { resources, actions } = useMemo(() => {
    const resourceSet = new Set<string>();
    const actionSet = new Set<string>();
    permissions.forEach((p) => {
      resourceSet.add(p.resource);
      actionSet.add(p.action);
    });
    const sortedActions = [...actionSet].sort(
      (a, b) => (ACTION_ORDER.indexOf(a) === -1 ? 99 : ACTION_ORDER.indexOf(a)) -
        (ACTION_ORDER.indexOf(b) === -1 ? 99 : ACTION_ORDER.indexOf(b))
    );
    return { resources: [...resourceSet].sort(), actions: sortedActions };
  }, [permissions]);

  const matrix = useMemo(() => {
    const map = new Map<string, Map<string, boolean>>();
    permissions.forEach((p) => {
      if (!map.has(p.resource)) map.set(p.resource, new Map());
      map.get(p.resource)!.set(p.action, granted.has(p.key));
    });
    return map;
  }, [permissions, granted]);

  if (permissions.length === 0) {
    return <p className="text-sm text-admin-muted">No permissions assigned.</p>;
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-admin-border">
            <th className="text-left py-2 pr-4 font-medium text-admin-muted">Resource</th>
            {actions.map((action) => (
              <th key={action} className="px-2 py-2 text-center font-medium text-admin-muted min-w-[52px]">
                {formatAction(action)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {resources.map((resource) => (
            <tr key={resource} className="border-b border-admin-border/50">
              <td className="py-2 pr-4 font-medium text-admin-foreground">{formatResource(resource)}</td>
              {actions.map((action) => {
                const has = matrix.get(resource)?.get(action);
                if (has === undefined) {
                  return (
                    <td key={action} className="px-2 py-2 text-center text-admin-muted/40">
                      <Minus className="h-3.5 w-3.5 mx-auto" />
                    </td>
                  );
                }
                return (
                  <td key={action} className="px-2 py-2 text-center">
                    {has ? (
                      <Check className="h-3.5 w-3.5 mx-auto text-admin-success" />
                    ) : (
                      <Minus className="h-3.5 w-3.5 mx-auto text-admin-muted/40" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
