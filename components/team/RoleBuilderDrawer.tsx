'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Drawer, Button, Input, Textarea, useToast } from '@/components/admin/ui';
import { useAppContext } from '@/components/context/AppContextProvider';
import { PermissionMatrix } from '@/components/rbac/PermissionMatrix';
import { ImpactConfirmModal } from '@/components/admin/config';
import {
  fetchTeamPermissions,
  createWorkspaceRole,
  updateWorkspaceRole,
  deleteWorkspaceRole,
  type WorkspaceRoleRow,
} from '@/app/actions/workspace-roles';
import type { PermissionItem } from '@/components/rbac/PermissionMatrix';

interface RoleBuilderDrawerProps {
  workspaceId: string;
  role: WorkspaceRoleRow | null;
  onClose: () => void;
  onSaved: () => void;
}

export function RoleBuilderDrawer({ workspaceId, role, onClose, onSaved }: RoleBuilderDrawerProps) {
  const { permissions: userPerms, persona, roleName } = useAppContext();
  const { error: toastError, success: toastSuccess } = useToast();
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [allPerms, setAllPerms] = useState<PermissionItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initialSelected, setInitialSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dirty, setDirty] = useState(false);
  const initialSnapshot = useRef({ name: '', description: '', keys: '' });

  useEffect(() => {
    fetchTeamPermissions().then((perms) => {
      setAllPerms(perms);
    });

    if (role?.id) {
      import('@/app/actions/workspace-team').then(({ fetchRolePermissions }) => {
        fetchRolePermissions(role.id).then((perms) => {
          const keys = new Set(perms.map((p) => p.key));
          setSelected(keys);
          setInitialSelected(new Set(keys));
          initialSnapshot.current = {
            name: role.name,
            description: role.description || '',
            keys: [...keys].sort().join(','),
          };
        });
      });
    } else {
      initialSnapshot.current = { name: '', description: '', keys: '' };
    }
  }, [role?.id, role?.name, role?.description]);

  useEffect(() => {
    const keys = [...selected].sort().join(',');
    setDirty(
      name !== initialSnapshot.current.name ||
      description !== initialSnapshot.current.description ||
      keys !== initialSnapshot.current.keys
    );
  }, [name, description, selected]);

  // Anti self-escalation: Owners & platform admins have full permission grantability;
  // Non-owners can only grant permissions they themselves possess.
  const isWorkspaceOwner = persona === 'platform_admin' || roleName?.toLowerCase() === 'owner';
  const grantableKeys = isWorkspaceOwner
    ? new Set(allPerms.map((p) => p.key))
    : new Set(userPerms);

  const added = [...selected]
    .filter((k) => !initialSelected.has(k))
    .map((k) => allPerms.find((p) => p.key === k)?.name || k);

  const removed = [...initialSelected]
    .filter((k) => !selected.has(k))
    .map((k) => allPerms.find((p) => p.key === k)?.name || k);

  function handleClose() {
    if (dirty) {
      if (!window.confirm('You have unsaved changes. Discard them?')) return;
    }
    onClose();
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toastError('Validation Error', 'Role name is required.');
      return;
    }

    if (selected.size === 0) {
      toastError('Validation Error', 'A role must have at least one permission assigned.');
      return;
    }

    setLoading(true);
    try {
      const keys = Array.from(selected);
      if (role) {
        await updateWorkspaceRole(role.id, workspaceId, trimmedName, description.trim(), keys);
        toastSuccess('Role updated', `Role "${trimmedName}" was updated successfully.`);
      } else {
        await createWorkspaceRole(workspaceId, trimmedName, description.trim(), keys);
        toastSuccess('Role created', `Role "${trimmedName}" was created successfully.`);
      }
      setShowSaveConfirm(false);
      onSaved();
    } catch (e) {
      toastError('Failed to save role', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!role) return;
    setLoading(true);
    try {
      await deleteWorkspaceRole(role.id, workspaceId);
      toastSuccess('Role deleted', `Role "${role.name}" was deleted.`);
      setShowDeleteConfirm(false);
      onSaved();
    } catch (e) {
      toastError('Failed to delete role', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Drawer
        isOpen
        onClose={handleClose}
        title={role ? (role.isSystemRole ? `View ${role.name}` : `Edit ${role.name}`) : 'Create custom role'}
        description={
          role?.isSystemRole
            ? 'System roles are managed centrally and cannot be altered.'
            : 'Configure permissions and access capabilities for this workspace role.'
        }
        width="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            {role && !role.isSystemRole ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (role.memberCount > 0) {
                    toastError(
                      'Cannot delete role',
                      `This role is currently assigned to ${role.memberCount} member(s). Reassign them first.`
                    );
                    return;
                  }
                  setShowDeleteConfirm(true);
                }}
                disabled={loading || role.memberCount > 0}
              >
                Delete role
              </Button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleClose}>
                {role?.isSystemRole ? 'Close' : 'Cancel'}
              </Button>
              {!role?.isSystemRole && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (role && (added.length > 0 || removed.length > 0)) {
                      setShowSaveConfirm(true);
                    } else {
                      handleSave();
                    }
                  }}
                  disabled={loading || !name.trim()}
                >
                  {loading ? 'Saving...' : role ? 'Save changes' : 'Create role'}
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Role name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Property Manager"
              disabled={role?.isSystemRole}
              required
            />
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of responsibilities"
              rows={1}
              disabled={role?.isSystemRole}
            />
          </div>

          <div className="pt-2 border-t border-admin-border">
            <div className="mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-admin-foreground">
                Permission Matrix
              </h3>
              <p className="text-[11px] text-admin-muted">
                {role?.isSystemRole
                  ? 'Permissions inherited by members assigned to this system role.'
                  : 'Toggle permissions granted to this custom role. Use column, row, or global selectors to bulk configure.'}
              </p>
            </div>

            <PermissionMatrix
              permissions={allPerms}
              selectedKeys={selected}
              grantableKeys={grantableKeys}
              onChange={setSelected}
              readOnly={role?.isSystemRole}
            />
          </div>
        </div>
      </Drawer>

      <ImpactConfirmModal
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={handleSave}
        title={`Save changes to "${name}"?`}
        description={
          role && role.memberCount > 0
            ? `This will update effective access for ${role.memberCount} member(s) assigned to this role.`
            : undefined
        }
        addedPermissions={added}
        removedPermissions={removed}
        loading={loading}
      />

      <ImpactConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={`Delete "${role?.name}"?`}
        description="This action cannot be undone. Members will no longer have access through this role."
        confirmLabel="Delete role"
        variant="danger"
        loading={loading}
      />
    </>
  );
}
