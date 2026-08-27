'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, HelpCircle } from 'lucide-react';
import { PageContainer, Button, useToast } from '@/components/admin/ui';
import { AdminConfigPageHeader, AdminSummaryCards, HowItWorksDrawer, ImpactConfirmModal } from '@/components/admin/config';
import { AdminPlatformRolesGridView } from '@/components/admin/data-grid/views/AdminPlatformRolesGridView';
import { PlatformRoleDetailDrawer } from '@/components/admin/platform-roles/PlatformRoleDetailDrawer';
import { PlatformRoleBuilderDrawer } from '@/components/admin/platform-roles/PlatformRoleBuilderDrawer';
import { handleDeletePlatformRole } from '@/app/actions/admin-config';
import type { AdminPlatformRoleRow } from '@/lib/admin/types';

interface AdminPlatformRolesPageViewProps {
  roles: AdminPlatformRoleRow[];
}

export function AdminPlatformRolesPageView({ roles }: AdminPlatformRolesPageViewProps) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const [showHelp, setShowHelp] = useState(false);
  const [builderRole, setBuilderRole] = useState<AdminPlatformRoleRow | null | undefined>(undefined);
  const [viewRole, setViewRole] = useState<AdminPlatformRoleRow | null>(null);
  const [deleteRole, setDeleteRole] = useState<AdminPlatformRoleRow | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const systemCards = useMemo(() =>
    roles.filter((r) => r.is_system_role).slice(0, 3).map((r) => ({
      id: r.id,
      label: r.name,
      value: r.permission_count,
      sublabel: r.description || undefined,
    })),
  [roles]);

  function handleDelete() {
    if (!deleteRole) return;
    startDelete(async () => {
      try {
        await handleDeletePlatformRole(deleteRole.id);
        toastSuccess('Role deleted', `${deleteRole.name} was removed.`);
        setDeleteRole(null);
        setViewRole(null);
        router.refresh();
      } catch (e) {
        toastError('Could not delete', e instanceof Error ? e.message : 'Delete failed');
      }
    });
  }

  return (
    <PageContainer className="relative">
      <AdminConfigPageHeader
        title="Platform Roles"
        description="Control administrative access to the PropertyLedge platform."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowHelp(true)} leftIcon={<HelpCircle className="w-4 h-4" />}>
              How this works
            </Button>
            <Button size="sm" onClick={() => setBuilderRole(null)} leftIcon={<Plus className="w-4 h-4" />}>
              Create platform role
            </Button>
          </>
        }
      />

      {systemCards.length > 0 && (
        <AdminSummaryCards items={systemCards.map((c) => ({ ...c, label: c.label, value: `${c.value} perms` }))} />
      )}

      <div className="flex-1 min-h-0">
        <AdminPlatformRolesGridView
          roles={roles}
          onView={setViewRole}
          onEdit={(r) => { setViewRole(null); setBuilderRole(r); }}
          onDelete={setDeleteRole}
        />
      </div>

      <HowItWorksDrawer topic="platform_roles" isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <PlatformRoleDetailDrawer
        role={viewRole}
        isOpen={!!viewRole}
        onClose={() => setViewRole(null)}
        onEdit={(r) => { setViewRole(null); setBuilderRole(r); }}
        onDelete={setDeleteRole}
      />
      {builderRole !== undefined && (
        <PlatformRoleBuilderDrawer
          role={builderRole}
          isOpen={true}
          onClose={() => setBuilderRole(undefined)}
        />
      )}

      <ImpactConfirmModal
        isOpen={!!deleteRole}
        onClose={() => setDeleteRole(null)}
        onConfirm={handleDelete}
        title={deleteRole ? `Delete "${deleteRole.name}"?` : ''}
        description={
          deleteRole && deleteRole.user_count > 0
            ? `This role is assigned to ${deleteRole.user_count} administrator${deleteRole.user_count !== 1 ? 's' : ''}. You must reassign them before deleting.`
            : 'This action cannot be undone.'
        }
        confirmLabel="Delete role"
        variant="danger"
        loading={isDeleting}
      />
    </PageContainer>
  );
}
