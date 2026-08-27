'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Drawer, Button, Input, useToast } from '@/components/admin/ui';
import { useAppContext } from '@/components/context/AppContextProvider';
import { PermissionBuilder, ImpactConfirmModal } from '@/components/admin/config';
import { PermissionMatrix } from '@/components/admin/config';
import { SegmentedControl } from '@/components/admin/ui';
import {
  fetchTeamPermissions,
  createWorkspaceRole,
  updateWorkspaceRole,
  deleteWorkspaceRole,
  type WorkspaceRoleRow,
} from '@/app/actions/workspace-roles';

interface RoleBuilderDrawerProps {
  workspaceId: string;
  role: WorkspaceRoleRow | null;
  onClose: () => void;
  onSaved: () => void;
}

export function RoleBuilderDrawer({ workspaceId, role, onClose, onSaved }: RoleBuilderDrawerProps) {
  const { permissions: userPerms } = useAppContext();
  const { error: toastError, success: toastSuccess } = useToast();
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [allPerms, setAllPerms] = useState<Array<{ key: string; name: string; resource: string; action: string }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initialSelected, setInitialSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'builder' | 'matrix'>('builder');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dirty, setDirty] = useState(false);
  const initialSnapshot = useRef({ name: '', description: '', keys: '' });

  useEffect(() => {
    fetchTeamPermissions().then(setAllPerms);
    if (role?.id) {
      import('@/app/actions/workspace-team').then(({ fetchRolePermissions }) => {
        fetchRolePermissions(role.id).then((perms) => {
          const keys = new Set(perms.map((p) => p.key));
          setSelected(keys);
          setInitialSelected(new Set(keys));
          initialSnapshot.current = { name: role.name, description: role.description || '', keys: [...keys].sort().join(',') };
        });
      });
    } else {
      initialSnapshot.current = { name: '', description: '', keys: '' };
    }
  }, [role?.id]);

  useEffect(() => {
    const keys = [...selected].sort().join(',');
    setDirty(
      name !== initialSnapshot.current.name ||
      description !== initialSnapshot.current.description ||
      keys !== initialSnapshot.current.keys
    );
  }, [name, description, selected]);

  const grouped = allPerms.reduce<Record<string, typeof allPerms>>((acc, p) => {
    (acc[p.resource] ||= []).push(p);
    return acc;
  }, {});

  const grantableKeys = new Set(userPerms);
  const added = [...selected].filter((k) => !initialSelected.has(k)).map((k) => allPerms.find((p) => p.key === k)?.name || k);
  const removed = [...initialSelected].filter((k) => !selected.has(k)).map((k) => allPerms.find((p) => p.key === k)?.name || k);

  function handleClose() {
    if (dirty) {
      if (!window.confirm('You have unsaved permission changes. Discard them?')) return;
    }
    onClose();
  }

  async function handleSave() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const keys = Array.from(selected);
      if (role) {
        await updateWorkspaceRole(role.id, workspaceId, name, description, keys);
        toastSuccess('Role updated', `${name} was saved.`);
      } else {
        await createWorkspaceRole(workspaceId, name, description, keys);
        toastSuccess('Role created', `${name} was created.`);
      }
      setShowSaveConfirm(false);
      onSaved();
    } catch (e) {
      toastError('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!role) return;
    setLoading(true);
    try {
      await deleteWorkspaceRole(role.id, workspaceId);
      toastSuccess('Role deleted', `${role.name} was removed.`);
      setShowDeleteConfirm(false);
      onSaved();
    } catch (e) {
      toastError('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const selectedPerms = allPerms.filter((p) => selected.has(p.key));

  return (
    <>
      <Drawer
        isOpen
        onClose={handleClose}
        title={role ? 'Edit custom role' : 'Create custom role'}
        description="Create a workspace-specific role using permissions you are authorized to grant."
        width="lg"
        footer={
          <div className="flex justify-between w-full">
            {role && !role.isSystemRole ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (role.memberCount > 0) {
                    toastError('Cannot delete', `${role.name} is assigned to ${role.memberCount} members. Reassign them first.`);
                    return;
                  }
                  setShowDeleteConfirm(true);
                }}
                disabled={loading || role.memberCount > 0}
              >
                Delete role
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={() => {
                  if (role && (added.length > 0 || removed.length > 0)) setShowSaveConfirm(true);
                  else handleSave();
                }}
                disabled={loading || !name.trim()}
              >
                {loading ? 'Saving...' : role ? 'Save changes' : 'Create role'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Role name" value={name} onChange={(e) => setName(e.target.value)} disabled={role?.isSystemRole} />
          <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={role?.isSystemRole} />

          <p className="text-sm text-admin-muted">
            {selected.size} permissions across {Object.keys(grouped).filter((r) => selectedPerms.some((p) => p.resource === r)).length} resources
          </p>

          <SegmentedControl
            value={tab}
            onChange={(v) => setTab(v as 'builder' | 'matrix')}
            options={[
              { value: 'builder', label: 'Choose permissions' },
              { value: 'matrix', label: 'Preview matrix' },
            ]}
          />

          {tab === 'builder' ? (
            <PermissionBuilder
              permissions={allPerms}
              selected={selected}
              grantableKeys={grantableKeys}
              onChange={setSelected}
              disabled={role?.isSystemRole}
            />
          ) : (
            <PermissionMatrix permissions={allPerms} grantedKeys={selected} />
          )}
        </div>
      </Drawer>

      <ImpactConfirmModal
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={handleSave}
        title={`Save changes to "${name}"?`}
        description={role && role.memberCount > 0 ? `This will affect ${role.memberCount} member${role.memberCount !== 1 ? 's' : ''}.` : undefined}
        addedPermissions={added}
        removedPermissions={removed}
        loading={loading}
      />

      <ImpactConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={`Delete "${role?.name}"?`}
        description="This action cannot be undone."
        confirmLabel="Delete role"
        variant="danger"
        loading={loading}
      />
    </>
  );
}
