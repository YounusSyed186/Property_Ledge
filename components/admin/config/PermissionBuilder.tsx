'use client';

import React from 'react';
import { PermissionMatrix as UnifiedPermissionMatrix, type PermissionItem } from '@/components/rbac/PermissionMatrix';

export type PermissionCatalogItem = PermissionItem;

interface PermissionBuilderProps {
  permissions: PermissionCatalogItem[];
  selected: Set<string>;
  grantableKeys: Set<string> | string[];
  onChange: (keys: Set<string>) => void;
  disabled?: boolean;
  className?: string;
}

export function PermissionBuilder({
  permissions,
  selected,
  grantableKeys,
  onChange,
  disabled = false,
  className,
}: PermissionBuilderProps) {
  return (
    <UnifiedPermissionMatrix
      permissions={permissions}
      selectedKeys={selected}
      grantableKeys={grantableKeys}
      onChange={onChange}
      readOnly={disabled}
      className={className}
    />
  );
}
