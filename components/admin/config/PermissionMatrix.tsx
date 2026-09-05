'use client';

import React from 'react';
import { PermissionMatrix as UnifiedPermissionMatrix, type PermissionItem } from '@/components/rbac/PermissionMatrix';

export type PermissionCatalogItem = PermissionItem;

interface PermissionMatrixProps {
  permissions: PermissionCatalogItem[];
  grantedKeys?: Set<string> | string[];
  selectedKeys?: Set<string> | string[];
  grantableKeys?: Set<string> | string[];
  onChange?: (keys: Set<string>) => void;
  readOnly?: boolean;
  className?: string;
}

export function PermissionMatrix({
  permissions,
  grantedKeys,
  selectedKeys,
  grantableKeys,
  onChange,
  readOnly = true,
  className,
}: PermissionMatrixProps) {
  const effectiveKeys = selectedKeys ?? grantedKeys ?? new Set<string>();

  return (
    <UnifiedPermissionMatrix
      permissions={permissions}
      selectedKeys={effectiveKeys}
      grantableKeys={grantableKeys}
      onChange={onChange}
      readOnly={readOnly && !onChange}
      className={className}
    />
  );
}
