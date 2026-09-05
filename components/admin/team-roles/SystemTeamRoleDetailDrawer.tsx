'use client';

import React, { useEffect, useState } from 'react';
import { ConfigDetailDrawer, ConfigDetailActions, PermissionMatrix } from '@/components/admin/config';
import { AdminConfigDrawerSkeleton } from '@/components/admin/config';
import { fetchAdminSystemTeamRoleDetail, fetchTeamPermissionsCatalog } from '@/app/actions/admin-config';
import type { AdminSystemTeamRoleRow } from '@/lib/admin/types';
import type { PermissionItem } from '@/components/rbac/PermissionMatrix';

interface SystemTeamRoleDetailDrawerProps {
  role: AdminSystemTeamRoleRow | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (role: AdminSystemTeamRoleRow) => void;
}

export function SystemTeamRoleDetailDrawer({ role, isOpen, onClose, onEdit }: SystemTeamRoleDetailDrawerProps) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchAdminSystemTeamRoleDetail>>>(null);
  const [catalog, setCatalog] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !role) return;
    setLoading(true);
    Promise.all([
      fetchAdminSystemTeamRoleDetail(role.id),
      fetchTeamPermissionsCatalog(),
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
      badge={{ label: 'SYSTEM ROLE', variant: 'neutral' }}
      sections={[
        { label: 'Used across', value: `${role.workspace_count} workspace${role.workspace_count !== 1 ? 's' : ''}` },
        { label: 'Members', value: `${role.member_count} member${role.member_count !== 1 ? 's' : ''}` },
        { label: 'Permissions', value: `${role.permission_count} permissions` },
      ]}
      footer={
        <ConfigDetailActions
          onEdit={() => onEdit(role)}
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
