'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Link2, UserSearch, Copy, Check } from 'lucide-react';
import { Modal, Button, useToast } from '@/components/admin/ui';
import {
  fetchAssignableRoles,
  fetchRolePermissions,
  createInviteLink,
  lookupProfile,
  addMemberByProfileId,
  type TeamRoleOption,
  type PermissionRow,
} from '@/app/actions/workspace-team';

type Step = 'choose' | 'invite-link' | 'invite-created' | 'profile-id' | 'profile-preview' | 'profile-role';

interface AddMemberModalProps {
  workspaceId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function RolePreview({ role, permissions }: { role: TeamRoleOption | undefined; permissions: PermissionRow[] }) {
  if (!role) return null;

  const highlights = permissions.slice(0, 6).map((p) => p.name);
  const canManage = permissions.filter((p) => p.action !== 'view').slice(0, 4).map((p) => p.name);

  return (
    <div className="rounded-xl border border-admin-border p-4 space-y-2">
      <div>
        <p className="font-medium text-admin-foreground">{role.name}</p>
        {role.description && <p className="text-xs text-admin-muted">{role.description}</p>}
        <p className="text-xs text-admin-muted mt-1">{role.permissionCount} permissions</p>
      </div>
      {canManage.length > 0 && (
        <div>
          <p className="text-[10px] font-medium uppercase text-admin-muted mb-1">Can</p>
          <ul className="text-xs text-admin-foreground space-y-0.5">
            {canManage.map((h) => <li key={h}>✓ {h}</li>)}
          </ul>
        </div>
      )}
      {highlights.length > canManage.length && (
        <div>
          <p className="text-[10px] font-medium uppercase text-admin-muted mb-1">Includes</p>
          <ul className="text-xs text-admin-muted space-y-0.5">
            {highlights.filter((h) => !canManage.includes(h)).slice(0, 3).map((h) => <li key={h}>• {h}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function RoleSelect({
  roles,
  selectedRoleId,
  onChange,
}: {
  roles: TeamRoleOption[];
  selectedRoleId: string;
  onChange: (id: string) => void;
}) {
  const systemRoles = roles.filter((r) => r.isSystemRole);
  const customRoles = roles.filter((r) => !r.isSystemRole);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-admin-foreground">Role</label>
      <select
        value={selectedRoleId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-sm"
      >
        <option value="">Select role...</option>
        {systemRoles.length > 0 && (
          <optgroup label="System Roles">
            {systemRoles.map((r) => (
              <option key={r.roleId} value={r.roleId}>{r.name}</option>
            ))}
          </optgroup>
        )}
        {customRoles.length > 0 && (
          <optgroup label="Custom Roles">
            {customRoles.map((r) => (
              <option key={r.roleId} value={r.roleId}>{r.name}</option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}

export function AddMemberModal({ workspaceId, onClose, onSuccess }: AddMemberModalProps) {
  const { error: toastError } = useToast();
  const [step, setStep] = useState<Step>('choose');
  const [roles, setRoles] = useState<TeamRoleOption[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publicId, setPublicId] = useState('');
  const [profilePreview, setProfilePreview] = useState<{
    id: string;
    publicId: string;
    fullName: string | null;
    avatarUrl: string | null;
  } | null>(null);

  useEffect(() => {
    fetchAssignableRoles(workspaceId).then(setRoles).catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    if (!selectedRoleId) { setPermissions([]); return; }
    fetchRolePermissions(selectedRoleId).then(setPermissions).catch(() => {});
  }, [selectedRoleId]);

  const selectedRole = useMemo(() => roles.find((r) => r.roleId === selectedRoleId), [roles, selectedRoleId]);

  async function handleCreateInvite() {
    if (!selectedRoleId) return;
    setLoading(true);
    try {
      const result = await createInviteLink(workspaceId, selectedRoleId);
      setInviteUrl(result.inviteUrl);
      setStep('invite-created');
    } catch (e) {
      toastError('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearchProfile() {
    if (!publicId.trim()) return;
    setLoading(true);
    try {
      const profile = await lookupProfile(publicId);
      if (!profile) {
        toastError('Not found', "We couldn't find a PropertyLedge profile with that ID.");
        return;
      }
      setProfilePreview(profile);
      setStep('profile-preview');
    } catch (e) {
      toastError('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddProfile() {
    if (!selectedRoleId || !profilePreview) return;
    setLoading(true);
    try {
      await addMemberByProfileId(workspaceId, profilePreview.publicId, selectedRoleId);
      onSuccess();
    } catch (e) {
      toastError('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal isOpen onClose={onClose} title="Add team member" size="md">
      {step === 'choose' && (
        <div className="space-y-4 p-1">
          <p className="text-sm text-admin-muted">Choose how you&apos;d like to add them.</p>
          <button type="button" onClick={() => setStep('invite-link')} className="w-full flex items-start gap-4 rounded-xl border border-admin-border p-4 text-left hover:border-admin-primary/50 transition-colors">
            <Link2 className="h-6 w-6 text-admin-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Invite link</p>
              <p className="text-sm text-admin-muted">Generate a secure invitation link.</p>
            </div>
          </button>
          <button type="button" onClick={() => setStep('profile-id')} className="w-full flex items-start gap-4 rounded-xl border border-admin-border p-4 text-left hover:border-admin-primary/50 transition-colors">
            <UserSearch className="h-6 w-6 text-admin-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Profile ID</p>
              <p className="text-sm text-admin-muted">Add an existing PropertyLedge user directly.</p>
            </div>
          </button>
        </div>
      )}

      {(step === 'invite-link' || step === 'profile-role') && (
        <div className="space-y-4">
          <RoleSelect roles={roles} selectedRoleId={selectedRoleId} onChange={setSelectedRoleId} />
          <RolePreview role={selectedRole} permissions={permissions} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStep(step === 'profile-role' ? 'profile-preview' : 'choose')}>Back</Button>
            <Button onClick={step === 'profile-role' ? handleAddProfile : handleCreateInvite} disabled={!selectedRoleId || loading}>
              {loading ? 'Processing...' : step === 'profile-role' ? 'Add member' : 'Generate link'}
            </Button>
          </div>
        </div>
      )}

      {step === 'invite-created' && (
        <div className="space-y-4">
          <p className="text-sm text-admin-muted">Invitation created. Share this link with your teammate.</p>
          <div className="flex gap-2">
            <input readOnly value={inviteUrl} className="flex-1 rounded-lg border border-admin-border bg-admin-muted/30 px-3 py-2 text-sm" />
            <Button variant="secondary" onClick={copyLink}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
          </div>
          <Button className="w-full" onClick={onSuccess}>Done</Button>
        </div>
      )}

      {step === 'profile-id' && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Profile ID</label>
            <input value={publicId} onChange={(e) => setPublicId(e.target.value)} placeholder="PL-ABC123" className="mt-1 w-full rounded-lg border border-admin-border px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStep('choose')}>Back</Button>
            <Button onClick={handleSearchProfile} disabled={!publicId.trim() || loading}>{loading ? 'Searching...' : 'Search'}</Button>
          </div>
        </div>
      )}

      {step === 'profile-preview' && profilePreview && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-xl border border-admin-border p-4">
            <div className="h-12 w-12 rounded-full bg-admin-primary/10 flex items-center justify-center text-admin-primary font-semibold">
              {(profilePreview.fullName || '?')[0]}
            </div>
            <div>
              <p className="font-medium">{profilePreview.fullName || 'Unknown'}</p>
              <p className="text-sm text-admin-muted">{profilePreview.publicId}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStep('profile-id')}>Back</Button>
            <Button onClick={() => setStep('profile-role')}>Continue</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
