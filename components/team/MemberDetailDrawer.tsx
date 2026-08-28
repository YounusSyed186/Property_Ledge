'use client';

import React, { useEffect, useState } from 'react';
import { Drawer, Button, Select, ConfirmDialog, useToast } from '@/components/admin/ui';
import { useCan } from '@/lib/auth/client-permissions';
import { toastAuthorizationError } from '@/lib/auth/toast-errors';
import {
  fetchAssignableRoles,
  fetchRolePermissions,
  changeMemberRole,
  removeMember,
  suspendMember,
  type WorkspaceMemberRow,
  type TeamRoleOption,
  type PermissionRow,
} from '@/app/actions/workspace-team';

interface MemberDetailDrawerProps {
  workspaceId: string;
  member: WorkspaceMemberRow;
  onClose: () => void;
  onUpdated: () => void;
}

export function MemberDetailDrawer({ workspaceId, member, onClose, onUpdated }: MemberDetailDrawerProps) {
  const { error: toastError } = useToast();
  const canUpdate = useCan('team.member.update');
  const canRemove = useCan('team.member.remove');
  const [roles, setRoles] = useState<TeamRoleOption[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [newRoleId, setNewRoleId] = useState(member.roleId || '');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member.roleId) fetchRolePermissions(member.roleId).then(setPermissions);
    if (canUpdate) fetchAssignableRoles(workspaceId).then(setRoles);
  }, [member.roleId, workspaceId, canUpdate]);

  const grouped = permissions.reduce<Record<string, PermissionRow[]>>((acc, p) => {
    (acc[p.resource] ||= []).push(p);
    return acc;
  }, {});

  async function handleRoleChange() {
    if (!newRoleId || newRoleId === member.roleId) return;
    setLoading(true);
    try {
      await changeMemberRole(workspaceId, member.id, newRoleId);
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
      onUpdated();
    } catch (e) {
      toastAuthorizationError(e, toastError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Drawer isOpen onClose={onClose} title="Member details" width="md">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-admin-primary/10 flex items-center justify-center text-lg font-semibold text-admin-primary">
              {(member.fullName || member.publicId || '?')[0]}
            </div>
            <div>
              <p className="font-semibold text-admin-foreground">{member.fullName || member.publicId || 'Unknown'}</p>
              {member.publicId && member.fullName && (
                <p className="text-sm text-admin-muted">{member.publicId}</p>
              )}
              {!member.fullName && member.publicId && (
                <p className="text-xs text-admin-muted">No display name set</p>
              )}
              <p className="text-sm capitalize text-admin-muted">{member.status}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-admin-muted mb-1">Role</p>
            <p className="font-medium">{member.roleName}</p>
            {member.isSystemRole && (
              <span className="text-xs text-admin-muted">SYSTEM</span>
            )}
          </div>

          {member.joinedAt && (
            <div>
              <p className="text-xs font-medium text-admin-muted mb-1">Joined</p>
              <p className="text-sm">{new Date(member.joinedAt).toLocaleDateString()}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-admin-foreground mb-2">Effective permissions</p>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {Object.entries(grouped).map(([resource, perms]) => (
                <div key={resource}>
                  <p className="text-xs font-medium capitalize text-admin-muted">{resource}</p>
                  <ul className="text-sm ml-2">
                    {perms.map((p) => (
                      <li key={p.key} className="text-admin-foreground">✓ {p.name}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {canUpdate && roles.length > 0 && (
            <div className="space-y-2 border-t border-admin-border pt-4">
              <Select
                label="Change role"
                value={newRoleId}
                onChange={(e) => setNewRoleId(e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r.roleId} value={r.roleId}>{r.name}</option>
                ))}
              </Select>
              <Button
                size="sm"
                onClick={handleRoleChange}
                disabled={loading || newRoleId === member.roleId}
              >
                Change role
              </Button>
            </div>
          )}

          <div className="flex gap-2 border-t border-admin-border pt-4">
            {canUpdate && member.status === 'active' && (
              <Button variant="secondary" size="sm" onClick={handleSuspend} disabled={loading}>
                Suspend
              </Button>
            )}
            {canRemove && (
              <Button variant="destructive" size="sm" onClick={() => setConfirmRemove(true)} disabled={loading}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={handleRemove}
        title="Remove member?"
        description={`${member.fullName || 'This member'} will lose access to this workspace. They will not be deleted from PropertyLedge.`}
        confirmLabel="Remove member"
        variant="danger"
      />
    </>
  );
}
