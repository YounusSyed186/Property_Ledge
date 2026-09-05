'use client';

import React, { useEffect, useState } from 'react';
import { ConfigDetailDrawer, ConfigDetailActions, PermissionMatrix } from '@/components/admin/config';
import { AdminConfigDrawerSkeleton } from '@/components/admin/config';
import { fetchAdminPlatformRoleDetail, fetchPlatformPermissions } from '@/app/actions/admin-config';
import type { AdminPlatformRoleRow } from '@/lib/admin/types';
import type { PermissionItem } from '@/components/rbac/PermissionMatrix';

interface PlatformRoleDetailDrawerProps {
  role: AdminPlatformRoleRow | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (role: AdminPlatformRoleRow) => void;
  onDelete: (role: AdminPlatformRoleRow) => void;
}

export function PlatformRoleDetailDrawer({
  role,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: PlatformRoleDetailDrawerProps) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchAdminPlatformRoleDetail>>>(null);
  const [catalog, setCatalog] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !role) return;
    setLoading(true);
    Promise.all([
      fetchAdminPlatformRoleDetail(role.id),
      fetchPlatformPermissions(),
    ])
      .then(([d, cat]) => {
        setDetail(d);
        setCatalog(cat);
      })
      .finally(() => setLoading(false));
  }, [isOpen, role?.id]);

  if (!role) return null;

  const grantedKeys = new Set<string>((detail?.permissions || []).map((p: { key: string }) => p.key));

  return (
    <ConfigDetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={role.name}
      description={role.description || undefined}
      badge={role.is_system_role ? { label: 'SYSTEM', variant: 'neutral' } : { label: 'CUSTOM', variant: 'info' }}
      sections={[
        {
          label: 'Administrators',
          value: `${role.user_count} user${role.user_count !== 1 ? 's' : ''} assigned`,
        },
        {
          label: 'Permissions',
          value: `${role.permission_count} permission${role.permission_count !== 1 ? 's' : ''}`,
        },
      ]}
      footer={
        <ConfigDetailActions
          onEdit={() => onEdit(role)}
          onDelete={role.is_system_role ? undefined : () => onDelete(role)}
          deleteDisabled={role.is_system_role}
          deleteTooltip={role.is_system_role ? 'System roles are managed by PropertyLedge and cannot be deleted.' : undefined}
          editLabel="Edit role"
        />
      }
    >
      {loading ? (
        <AdminConfigDrawerSkeleton />
      ) : detail ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-admin-muted">Permissions</p>
          <PermissionMatrix
            permissions={catalog.length > 0 ? catalog : detail.permissions || []}
            grantedKeys={grantedKeys}
            readOnly
          />
        </div>
      ) : null}
    </ConfigDetailDrawer>
  );
}
