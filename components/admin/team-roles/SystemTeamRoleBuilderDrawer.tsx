'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, X } from 'lucide-react';
import {
  fetchAdminSystemTeamRoleDetail,
  handleUpdateSystemTeamRole,
  fetchTeamPermissionsCatalog,
} from '@/app/actions/admin-config';
import { Textarea, Button } from '@/components/admin/ui';
import { PermissionBuilder, ImpactConfirmModal } from '@/components/admin/config';
import type { AdminSystemTeamRoleRow } from '@/lib/admin/types';

interface SystemTeamRoleBuilderDrawerProps {
  role: AdminSystemTeamRoleRow | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SystemTeamRoleBuilderDrawer({ role, isOpen, onClose }: SystemTeamRoleBuilderDrawerProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(isOpen);
  const [animateIn, setAnimateIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [description, setDescription] = useState('');
  const [allPerms, setAllPerms] = useState<Array<{ key: string; name: string; resource: string; action: string }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initialSelected, setInitialSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let animFrame: number;
    if (isOpen && role) {
      setMounted(true);
      setAnimateIn(false);
      setDescription(role.description || '');
      setError(null);
      fetchTeamPermissionsCatalog().then(setAllPerms);
      fetchAdminSystemTeamRoleDetail(role.id).then((d) => {
        if (d?.permissions) {
          const keys = new Set<string>(d.permissions.map((p: { key: string }) => p.key));
          setSelected(keys);
          setInitialSelected(new Set(keys));
        }
      });
      animFrame = requestAnimationFrame(() => requestAnimationFrame(() => setAnimateIn(true)));
    } else {
      setAnimateIn(false);
      timer = setTimeout(() => setMounted(false), 280);
    }
    return () => { clearTimeout(timer); cancelAnimationFrame(animFrame); };
  }, [isOpen, role?.id]);

  if (!mounted || !role) return null;

  const grantableKeys = new Set(allPerms.map((p) => p.key));
  const added = [...selected].filter((k) => !initialSelected.has(k)).map((k) => allPerms.find((p) => p.key === k)?.name || k);
  const removed = [...initialSelected].filter((k) => !selected.has(k)).map((k) => allPerms.find((p) => p.key === k)?.name || k);

  function handleSave() {
    startTransition(async () => {
      try {
        await handleUpdateSystemTeamRole({
          id: role!.id,
          description: description.trim(),
          permissionKeys: Array.from(selected),
        });
        onClose();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save');
        setShowConfirm(false);
      }
    });
  }

  return (
    <>
      <div className="absolute inset-0 z-40 overflow-hidden font-sans rounded-xl lg:rounded-2xl">
        <div className={`absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${animateIn ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
        <div className="absolute inset-y-0 right-0 max-w-full flex pl-10 z-10">
          <div className={`w-full sm:w-[720px] lg:w-[840px] bg-admin-surface border-l border-admin-border flex flex-col shadow-2xl transition-transform duration-300 ${animateIn ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-6 border-b border-admin-border flex justify-between shrink-0">
              <div>
                <h2 className="text-base font-bold text-white">Edit system role</h2>
                <p className="text-xs text-admin-muted">{role.name}</p>
              </div>
              <button type="button" onClick={onClose} className="p-1.5 rounded-lg border border-admin-border text-admin-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {error && <div className="p-3 rounded-lg bg-admin-danger/10 text-admin-danger text-xs flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
              {role.member_count > 0 && (
                <div className="p-3 rounded-lg bg-admin-warning/10 border border-admin-warning/30 text-xs text-admin-muted">
                  Changing this role will affect {role.member_count} member{role.member_count !== 1 ? 's' : ''} across {role.workspace_count} workspace{role.workspace_count !== 1 ? 's' : ''}.
                </div>
              )}
              <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              <PermissionBuilder permissions={allPerms} selected={selected} grantableKeys={grantableKeys} onChange={setSelected} />
            </div>
            <div className="p-4 border-t border-admin-border flex justify-between shrink-0">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-admin-border text-xs text-admin-muted">Cancel</button>
              <Button size="sm" onClick={() => {
                if (added.length > 0 || removed.length > 0) setShowConfirm(true);
                else handleSave();
              }} disabled={isPending}>{isPending ? 'Saving...' : 'Save changes'}</Button>
            </div>
          </div>
        </div>
      </div>
      <ImpactConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSave}
        title={`Update "${role.name}"?`}
        description={`This change will affect ${role.member_count} member${role.member_count !== 1 ? 's' : ''}.`}
        addedPermissions={added}
        removedPermissions={removed}
        loading={isPending}
      />
    </>
  );
}
