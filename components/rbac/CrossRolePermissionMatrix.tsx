'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Shield, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/admin/ui';
import { RoleSelector } from './RoleSelector';
import { RoleSummary } from './RoleSummary';
import { PermissionMatrix } from './PermissionMatrix';
import { PermissionSaveBar } from './PermissionSaveBar';
import { UnsavedChangesModal } from './UnsavedChangesModal';
import type {
  PermissionItem,
  MatrixRole,
  ResourceGroupData,
} from './types';

export interface CrossRolePermissionMatrixProps {
  permissions: PermissionItem[];
  roles: MatrixRole[];
  initialRolePermissions: Record<string, string[]>;
  grantableKeys?: Set<string> | string[];
  onSave: (
    updatedRolePermissions: Record<string, string[]>,
    changedRoleIds: string[]
  ) => Promise<void>;
  readOnly?: boolean;
  className?: string;
  title?: string;
  description?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  selectedRoleId?: string;
  onSelectRole?: (roleId: string) => void;
}

export function CrossRolePermissionMatrix({
  permissions,
  roles,
  initialRolePermissions,
  grantableKeys,
  onSave,
  readOnly = false,
  className,
  title = 'Permission Management',
  description = 'Manage access controls, modules and capabilities for workspace roles.',
  selectedRoleId: controlledSelectedRoleId,
  onSelectRole: controlledOnSelectRole,
}: CrossRolePermissionMatrixProps) {
  // Selected Role ID state
  const [internalSelectedRoleId, setInternalSelectedRoleId] = useState<string>(() => {
    return controlledSelectedRoleId || roles[0]?.id || '';
  });

  const selectedRoleId = controlledSelectedRoleId ?? internalSelectedRoleId;

  // Track pending target role when switching with unsaved changes
  const [pendingTargetRoleId, setPendingTargetRoleId] = useState<string | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Local state for permissions per role
  const [rolePerms, setRolePerms] = useState<Record<string, Set<string>>>(() => {
    const initial: Record<string, Set<string>> = {};
    roles.forEach((r) => {
      initial[r.id] = new Set(initialRolePermissions[r.id] || []);
    });
    return initial;
  });

  const [isSaving, setIsSaving] = useState(false);

  // Sync when initialRolePermissions change
  useEffect(() => {
    const next: Record<string, Set<string>> = {};
    roles.forEach((r) => {
      next[r.id] = new Set(initialRolePermissions[r.id] || []);
    });
    setRolePerms(next);
  }, [initialRolePermissions, roles]);

  // Sync selected role if current selected is no longer in roles
  useEffect(() => {
    if (roles.length > 0 && !roles.some((r) => r.id === selectedRoleId)) {
      const fallbackId = roles[0].id;
      setInternalSelectedRoleId(fallbackId);
      if (controlledOnSelectRole) controlledOnSelectRole(fallbackId);
    }
  }, [roles, selectedRoleId, controlledOnSelectRole]);

  // Selected role object
  const activeRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || roles[0] || null;
  }, [roles, selectedRoleId]);

  // Current active role permission set
  const activeRoleSelectedKeys = useMemo(() => {
    if (!activeRole) return new Set<string>();
    return rolePerms[activeRole.id] || new Set<string>();
  }, [rolePerms, activeRole]);

  // Normalized Grantable Keys
  const grantable = useMemo(() => {
    if (!grantableKeys) return new Set(permissions.map((p) => p.key));
    return new Set(Array.isArray(grantableKeys) ? grantableKeys : [...grantableKeys]);
  }, [grantableKeys, permissions]);

  // Check if a specific role is dirty
  const isRoleDirty = useCallback(
    (roleId: string) => {
      const current = rolePerms[roleId] || new Set<string>();
      const initial = new Set(initialRolePermissions[roleId] || []);
      if (current.size !== initial.size) return true;
      for (const k of current) {
        if (!initial.has(k)) return true;
      }
      return false;
    },
    [rolePerms, initialRolePermissions]
  );

  const activeRoleIsDirty = activeRole ? isRoleDirty(activeRole.id) : false;

  // List of all dirty role IDs across workspace
  const dirtyRoleIds = useMemo(() => {
    return roles.filter((r) => isRoleDirty(r.id)).map((r) => r.id);
  }, [roles, isRoleDirty]);

  // Live role permission counts map
  const rolePermissionCounts = useMemo(() => {
    const counts: Record<string, { enabled: number; total: number }> = {};
    roles.forEach((r) => {
      const perms = rolePerms[r.id] || new Set<string>();
      counts[r.id] = {
        enabled: perms.size,
        total: permissions.length,
      };
    });
    return counts;
  }, [roles, rolePerms, permissions.length]);

  // Is active role editable
  const isRoleEditable = activeRole ? activeRole.isEditable !== false && !readOnly : false;

  // Handlers for switching role
  const handleSelectRole = (targetRoleId: string) => {
    if (targetRoleId === selectedRoleId) return;

    if (activeRoleIsDirty) {
      setPendingTargetRoleId(targetRoleId);
      setShowUnsavedModal(true);
      return;
    }

    setInternalSelectedRoleId(targetRoleId);
    if (controlledOnSelectRole) {
      controlledOnSelectRole(targetRoleId);
    }
  };

  const handleConfirmDiscardAndSwitch = () => {
    if (activeRole) {
      setRolePerms((prev) => ({
        ...prev,
        [activeRole.id]: new Set(initialRolePermissions[activeRole.id] || []),
      }));
    }

    if (pendingTargetRoleId) {
      setInternalSelectedRoleId(pendingTargetRoleId);
      if (controlledOnSelectRole) {
        controlledOnSelectRole(pendingTargetRoleId);
      }
    }

    setShowUnsavedModal(false);
    setPendingTargetRoleId(null);
  };

  const handleCancelSwitch = () => {
    setShowUnsavedModal(false);
    setPendingTargetRoleId(null);
  };

  // Change handler for active role permissions
  const handleActiveRoleChange = (nextSelected: Set<string>) => {
    if (!activeRole || !isRoleEditable) return;
    setRolePerms((prev) => ({
      ...prev,
      [activeRole.id]: nextSelected,
    }));
  };

  // Discard all changes for active role
  const handleDiscardActiveRole = () => {
    if (!activeRole) return;
    setRolePerms((prev) => ({
      ...prev,
      [activeRole.id]: new Set(initialRolePermissions[activeRole.id] || []),
    }));
  };

  // Save changes across all dirty roles
  const handleSave = async () => {
    if (dirtyRoleIds.length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      const serializable: Record<string, string[]> = {};
      Object.entries(rolePerms).forEach(([rId, permSet]) => {
        serializable[rId] = Array.from(permSet);
      });

      await onSave(serializable, dirtyRoleIds);
    } finally {
      setIsSaving(false);
    }
  };

  if (roles.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl border border-admin-border bg-admin-surface/60 text-admin-muted text-xs">
        <Shield className="w-10 h-10 mx-auto mb-3 text-admin-muted/60" />
        <p className="font-semibold text-admin-foreground text-sm">No roles available</p>
        <p className="mt-1">Create or configure roles to manage permission assignments.</p>
      </div>
    );
  }

  const pendingTargetRole = roles.find((r) => r.id === pendingTargetRoleId);

  return (
    <div className={cn('flex flex-col gap-5 font-sans relative pb-16', className)}>
      {/* Top Bar: Title & Prominent Role Selector */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-admin-border/60">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-xl font-bold text-admin-foreground tracking-tight flex items-center gap-2">
            <span>{title}</span>
          </h1>
          <p className="text-xs sm:text-sm text-admin-muted leading-relaxed">
            {description}
          </p>
        </div>

        {/* Prominent Role Dropdown Selector */}
        <div className="w-full md:w-80 shrink-0">
          <RoleSelector
            roles={roles}
            selectedRoleId={selectedRoleId}
            onSelectRole={handleSelectRole}
            rolePermissionCounts={rolePermissionCounts}
            hasUnsavedChanges={activeRoleIsDirty}
          />
        </div>
      </div>

      {/* Selected Role Summary Banner */}
      {activeRole && (
        <RoleSummary
          role={activeRole}
          enabledCount={activeRoleSelectedKeys.size}
          totalCount={permissions.length}
          hasUnsavedChanges={activeRoleIsDirty}
          isReadOnly={!isRoleEditable}
        />
      )}

      {/* Unified ONE Data Table Permission Matrix */}
      <PermissionMatrix
        permissions={permissions}
        selectedKeys={activeRoleSelectedKeys}
        grantableKeys={grantable}
        onChange={handleActiveRoleChange}
        readOnly={!isRoleEditable}
        searchPlaceholder="Search permissions by module, action or key..."
      />

      {/* Floating Save Bar */}
      <PermissionSaveBar
        isVisible={dirtyRoleIds.length > 0}
        isSaving={isSaving}
        roleName={activeRole?.name || 'Selected role'}
        changesCount={dirtyRoleIds.length}
        onDiscard={handleDiscardActiveRole}
        onSave={handleSave}
      />

      {/* Unsaved Changes Interception Modal */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        currentRoleName={activeRole?.name || 'Selected role'}
        targetRoleName={pendingTargetRole?.name || 'Target role'}
        onCancel={handleCancelSwitch}
        onConfirmDiscard={handleConfirmDiscardAndSwitch}
      />
    </div>
  );
}

/**
 * Reusable export matching RolePermissionMatrix naming
 */
export const RolePermissionMatrix = CrossRolePermissionMatrix;
