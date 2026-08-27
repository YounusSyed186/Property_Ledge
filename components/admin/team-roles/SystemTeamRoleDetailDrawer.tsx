'use client';

import React, { useEffect, useState } from 'react';
import { ConfigDetailDrawer, ConfigDetailActions, PermissionMatrix } from '@/components/admin/config';
import { AdminConfigDrawerSkeleton } from '@/components/admin/config';
import { fetchAdminSystemTeamRoleDetail } from '@/app/actions/admin-config';
import type { AdminSystemTeamRoleRow } from '@/lib/admin/types';

interface SystemTeamRoleDetailDrawerProps {
  role: AdminSystemTeamRoleRow | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (role: AdminSystemTeamRoleRow) => void;
}

export function SystemTeamRoleDetailDrawer({ role, isOpen, onClose, onEdit }: SystemTeamRoleDetailDrawerProps) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchAdminSystemTeamRoleDetail>>>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !role) return;
    setLoading(true);
    fetchAdminSystemTeamRoleDetail(role.id).then(setDetail).finally(() => setLoading(false));
  }, [isOpen, role?.id]);

  if (!role) return null;

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
      ) : detail?.permissions ? (
        <PermissionMatrix permissions={detail.permissions} grantedKeys={detail.permissions.map((p: { key: string }) => p.key)} />
      ) : null}
    </ConfigDetailDrawer>
  );
}
