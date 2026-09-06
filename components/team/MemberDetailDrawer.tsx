'use client';

import React, { useEffect, useState } from 'react';
import { Drawer, Button, Select, ConfirmDialog, useToast } from '@/components/admin/ui';
import { useCan } from '@/lib/auth/client-permissions';
import { toastAuthorizationError } from '@/lib/auth/toast-errors';
import { PermissionMatrix } from '@/components/rbac/PermissionMatrix';
import { fetchTeamPermissions } from '@/app/actions/workspace-roles';
import {
  fetchAssignableRoles,
  fetchRolePermissions,
  changeMemberRole,
  removeMember,
  suspendMember,
  type WorkspaceMemberRow,
  type TeamRoleOption,
} from '@/app/actions/workspace-team';
import type { PermissionItem } from '@/components/rbac/PermissionMatrix';
import { Avatar } from '@/components/ui/avatar';

interface MemberDetailDrawerProps {
  workspaceId: string;
  member: WorkspaceMemberRow;
  onClose: () => void;
  onUpdated: () => void;
}

export function MemberDetailDrawer({ workspaceId, member, onClose, onUpdated }: MemberDetailDrawerProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const canUpdate = useCan('team.member.update');
  const canRemove = useCan('team.member.remove');
  const [roles, setRoles] = useState<TeamRoleOption[]>([]);
  const [catalog, setCatalog] = useState<PermissionItem[]>([]);
  const [grantedKeys, setGrantedKeys] = useState<Set<string>>(new Set());
  const [newRoleId, setNewRoleId] = useState(member.roleId || '');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTeamPermissions().then(setCatalog);

    if (member.roleId) {
      fetchRolePermissions(member.roleId).then((perms) => {
        setGrantedKeys(new Set(perms.map((p) => p.key)));
      });
    }

    if (canUpdate) {
      fetchAssignableRoles(workspaceId).then(setRoles);
    }
  }, [member.roleId, workspaceId, canUpdate]);

  async function handleRoleChange() {
    if (!newRoleId || newRoleId === member.roleId) return;
    setLoading(true);
    try {
      await changeMemberRole(workspaceId, member.id, newRoleId);
      toastSuccess('Role updated', 'Member role was updated successfully.');
      onUpdated();
    } catch (e) {
      toastAuthorizationError(e, toastError);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    setLoading(true);
    try {
      await removeMember(workspaceId, member.id);
      toastSuccess('Member removed', 'The member was removed from this workspace.');
      onUpdated();
    } catch (e) {
      toastAuthorizationError(e, toastError);
    } finally {
      setLoading(false);
      setConfirmRemove(false);
    }
  }

  async function handleSuspend() {
    setLoading(true);
    try {
      await suspendMember(workspaceId, member.id);
      toastSuccess('Member suspended', 'The member has been suspended.');
      onUpdated();
    } catch (e) {
      toastAuthorizationError(e, toastError);
    } finally {
      setLoading(false);
    }
  }

  const isOwner = member.roleName?.toLowerCase() === 'owner';

  return (
    <>
      <Drawer
        isOpen
        onClose={onClose}
        title="Member details & access"
        description="View assigned role, access levels, and effective permissions."
        width="lg"
      >
        <div className="space-y-6">
          {/* Member Profile Header */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-admin-surface-subtle/50 border border-admin-border">
            <div className="h-12 w-12 rounded-full bg-admin-primary/15 flex items-center justify-center text-lg font-bold text-admin-primary">
              {(member.fullName || member.publicId || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-admin-foreground truncate">
                  {member.fullName || member.publicId || 'Unknown'}
                </p>
                {member.isSystemRole && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-admin-border text-admin-muted">
                    System Role
                  </span>
                )}
              </div>
              {member.publicId && member.fullName && (
                <p className="text-xs text-admin-muted font-mono">{member.publicId}</p>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-admin-muted">
                <span>
                  Role: <strong className="text-admin-foreground font-medium">{member.roleName || 'None'}</strong>
                </span>
                <span>•</span>
                <span className="capitalize">Status: {member.status}</span>
                {member.joinedAt && (
                  <>
                    <span>•</span>
                    <span>Joined: {new Date(member.joinedAt).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Role Assignment Control */}
          {canUpdate && roles.length > 0 && !isOwner && (
            <div className="p-4 rounded-xl border border-admin-border space-y-3 bg-admin-surface">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-admin-foreground">
                  Change Role Assignment
                </h4>
                <p className="text-[11px] text-admin-muted">
                  Assign a different role to change inherited permissions for this member.
                </p>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    value={newRoleId}
                    onChange={(e) => setNewRoleId(e.target.value)}
                  >
                    {roles.map((r) => (
                      <option key={r.roleId} value={r.roleId}>
                        {r.name} {r.isSystemRole ? '(System)' : '(Custom)'} — {r.permissionCount} perms
                      </option>
                    ))}
                  </Select>
                </div>
                <Button
                  size="sm"
                  onClick={handleRoleChange}
                  disabled={loading || !newRoleId || newRoleId === member.roleId}
                >
                  {loading ? 'Updating...' : 'Save role'}
                </Button>
              </div>
            </div>
          )}

          {/* Effective Permission Matrix */}
          <div>
            <div className="mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-admin-foreground">
                Effective Permissions
              </h4>
              <p className="text-[11px] text-admin-muted">
                Permissions inherited from the assigned role (<span className="text-admin-foreground font-medium">{member.roleName}</span>).
              </p>
            </div>

            <PermissionMatrix
              permissions={catalog}
              selectedKeys={grantedKeys}
              readOnly
            />
          </div>

          {/* Actions: Suspend / Remove */}
          {!isOwner && (
            <div className="flex items-center justify-between border-t border-admin-border pt-4">
              <span className="text-xs text-admin-muted">Administrative actions</span>
              <div className="flex items-center gap-2">
                {canUpdate && member.status === 'active' && (
                  <Button variant="secondary" size="sm" onClick={handleSuspend} disabled={loading}>
                    Suspend member
                  </Button>
                )}
                {canRemove && (
                  <Button variant="destructive" size="sm" onClick={() => setConfirmRemove(true)} disabled={loading}>
                    Remove from team
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={handleRemove}
        title="Remove member from team?"
        description={`${member.fullName || 'This member'} will lose access to this workspace immediately. Their user profile will not be deleted.`}
        confirmLabel="Remove member"
        variant="danger"
      />
    </>
  );
}
