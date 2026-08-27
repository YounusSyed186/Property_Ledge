'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, X } from 'lucide-react';
import { handleUpdateEntitlement } from '@/app/actions/admin-config';
import { Input, Textarea, Button } from '@/components/admin/ui';
import {
  getEntitlementKind,
  getKindLabel,
  getTypeDisplayLabel,
} from '@/lib/entitlements/capability-catalog';
import type { AdminEntitlementRow } from '@/lib/admin/types';

interface EditEntitlementDrawerProps {
  entitlement: AdminEntitlementRow | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditEntitlementDrawer({ entitlement, isOpen, onClose }: EditEntitlementDrawerProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(isOpen);
  const [animateIn, setAnimateIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let animFrame: number;
    if (isOpen && entitlement) {
      setMounted(true);
      setAnimateIn(false);
      setName(entitlement.name);
      setDescription(entitlement.description || '');
      setError(null);
      animFrame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    } else {
      setAnimateIn(false);
      timer = setTimeout(() => setMounted(false), 280);
    }
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animFrame);
    };
  }, [isOpen, entitlement]);

  if (!mounted || !entitlement) return null;

  const isPlanLinked = entitlement.planCount > 0;
  const kind = getEntitlementKind(entitlement.value_type);

  function handleSave() {
    if (!name.trim()) { setError('Display name is required.'); return; }
    startTransition(async () => {
      try {
        await handleUpdateEntitlement(entitlement!.id, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
        onClose();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update entitlement');
      }
    });
  }

  return (
    <div className="absolute inset-0 z-40 overflow-hidden font-sans rounded-xl lg:rounded-2xl">
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${animateIn ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10 z-10">
        <div className={`w-full sm:w-[500px] bg-admin-surface border-l border-admin-border flex flex-col shadow-2xl transition-transform duration-300 ${animateIn ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 border-b border-admin-border flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-base font-bold text-white">Edit entitlement</h2>
              <p className="text-xs text-admin-muted mt-0.5">{entitlement.name}</p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg border border-admin-border text-admin-muted hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-admin-danger/10 border border-admin-danger/30 text-admin-danger text-xs flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
              </div>
            )}
            {isPlanLinked && (
              <div className="p-3 rounded-lg bg-admin-warning/10 border border-admin-warning/30 text-xs text-admin-muted">
                This entitlement is assigned to {entitlement.planCount} plan{entitlement.planCount !== 1 ? 's' : ''}. Machine key and value type cannot be changed.
              </div>
            )}
            <Input label="Display name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            <div className="rounded-xl border border-admin-border p-4 space-y-2 opacity-80">
              <p className="text-[10px] font-medium uppercase tracking-wide text-admin-muted">Advanced (read-only)</p>
              <div className="flex justify-between text-sm">
                <span className="text-admin-muted">Type</span>
                <span>{getKindLabel(kind)} · {getTypeDisplayLabel(entitlement.value_type)}</span>
              </div>
              <div>
                <Input label="Machine key" value={entitlement.key} disabled className="font-mono text-xs" />
                <p className="text-[10px] text-admin-muted mt-1">
                  Used by subscription configuration and cannot be changed after creation.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-admin-border flex justify-between shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-admin-border text-xs text-admin-muted">Cancel</button>
            <Button size="sm" onClick={handleSave} disabled={isPending}>{isPending ? 'Saving...' : 'Save changes'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
