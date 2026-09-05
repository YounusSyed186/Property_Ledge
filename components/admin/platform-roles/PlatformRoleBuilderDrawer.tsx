'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, X } from 'lucide-react';
import {
  fetchPlatformPermissions,
  fetchAdminPlatformRoleDetail,
  handleCreatePlatformRole,
  handleUpdatePlatformRole,
} from '@/app/actions/admin-config';
import { Input, Textarea, Button } from '@/components/admin/ui';
import { PermissionBuilder, ImpactConfirmModal } from '@/components/admin/config';
import type { AdminPlatformRoleRow } from '@/lib/admin/types';

interface PlatformRoleBuilderDrawerProps {
  role: AdminPlatformRoleRow | null;
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'info' | 'permissions' | 'review';

export function PlatformRoleBuilderDrawer({ role, isOpen, onClose }: PlatformRoleBuilderDrawerProps) {
  const router = useRouter();
  const isEdit = !!role;
  const [mounted, setMounted] = useState(isOpen);
  const [animateIn, setAnimateIn] = useState(false);
  const [step, setStep] = useState<Step>('info');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [allPerms, setAllPerms] = useState<Array<{ key: string; name: string; resource: string; action: string }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initialSelected, setInitialSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let animFrame: number;
    if (isOpen) {
      setMounted(true);
      setAnimateIn(false);
      setStep('info');
      setError(null);
      setName(role?.name || '');
      setDescription(role?.description || '');
      setSelected(new Set());
      setInitialSelected(new Set());
      fetchPlatformPermissions().then(setAllPerms);
      if (role?.id) {
        fetchAdminPlatformRoleDetail(role.id).then((d) => {
          if (d?.permissions) {
            const keys = new Set<string>(d.permissions.map((p: { key: string }) => p.key));
            setSelected(keys);
            setInitialSelected(new Set(keys));
          }
        });
      }
      animFrame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    } else {
      setAnimateIn(false);
      timer = setTimeout(() => setMounted(false), 280);
    }
    return () => { clearTimeout(timer); cancelAnimationFrame(animFrame); };
  }, [isOpen, role?.id]);

  if (!mounted) return null;

  const grantableKeys = new Set(allPerms.map((p) => p.key));

  const added = [...selected].filter((k) => !initialSelected.has(k)).map((k) => allPerms.find((p) => p.key === k)?.name || k);
  const removed = [...initialSelected].filter((k) => !selected.has(k)).map((k) => allPerms.find((p) => p.key === k)?.name || k);

  function handleSave() {
    startTransition(async () => {
      try {
        if (isEdit && role) {
          await handleUpdatePlatformRole({
            id: role.id,
            name: name.trim(),
            description: description.trim(),
            permissionKeys: Array.from(selected),
          });
        } else {
          await handleCreatePlatformRole({
            name: name.trim(),
            description: description.trim(),
            permissionKeys: Array.from(selected),
          });
        }
        onClose();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save role');
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
            <div className="p-6 border-b border-admin-border flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-bold text-white">{isEdit ? 'Edit platform role' : 'Create platform role'}</h2>
                <p className="text-xs text-admin-muted mt-0.5">Step {step === 'info' ? 1 : step === 'permissions' ? 2 : 3} of 3</p>
              </div>
              <button type="button" onClick={onClose} className="p-1.5 rounded-lg border border-admin-border text-admin-muted hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-admin-danger/10 border border-admin-danger/30 text-admin-danger text-xs flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
                </div>
              )}

              {step === 'info' && (
                <>
                  <Input label="Role name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Billing Admin" required disabled={role?.is_system_role} />
                  <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Billing and subscription management" />
                </>
              )}

              {step === 'permissions' && (
                <PermissionBuilder
                  permissions={allPerms}
                  selected={selected}
                  grantableKeys={grantableKeys}
                  onChange={setSelected}
                />
              )}

              {step === 'review' && (
                <div className="rounded-xl border border-admin-border p-4 space-y-2 text-sm">
                  <p><span className="text-admin-muted">Role:</span> <strong>{name}</strong></p>
                  <p><span className="text-admin-muted">Permissions:</span> {selected.size}</p>
                  {isEdit && role && role.user_count > 0 && (
                    <p className="text-admin-warning">This change will affect {role.user_count} administrator{role.user_count !== 1 ? 's' : ''}.</p>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-admin-border flex justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (step === 'permissions') setStep('info');
                  else if (step === 'review') setStep('permissions');
                  else onClose();
                }}
                className="px-4 py-2 rounded-lg border border-admin-border text-xs text-admin-muted"
              >
                {step === 'info' ? 'Cancel' : 'Back'}
              </button>
              {step === 'info' && (
                <Button size="sm" onClick={() => { if (!name.trim()) { setError('Role name is required.'); return; } setError(null); setStep('permissions'); }}>Next: Permissions</Button>
              )}
              {step === 'permissions' && (
                <Button size="sm" onClick={() => setStep('review')}>Next: Review</Button>
              )}
              {step === 'review' && (
                <Button size="sm" onClick={() => {
                  if (isEdit && (added.length > 0 || removed.length > 0)) setShowConfirm(true);
                  else handleSave();
                }} disabled={isPending}>
                  {isPending ? 'Saving...' : isEdit ? 'Save changes' : 'Create role'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ImpactConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSave}
        title={`Update "${name}"?`}
        description={role ? `This role is assigned to ${role.user_count} administrator${role.user_count !== 1 ? 's' : ''}.` : undefined}
        addedPermissions={added}
        removedPermissions={removed}
        loading={isPending}
      />
    </>
  );
}
