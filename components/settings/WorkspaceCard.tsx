'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Camera, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarPickerModal } from '@/components/ui/avatar';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';
import { updateWorkspaceAvatarAction } from '@/app/actions/workspace-context';

export function WorkspaceCard() {
  const router = useRouter();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceName = useWorkspaceStore((s) => s.workspaceName);
  const roleName = useWorkspaceStore((s) => s.roleName);
  const workspaces = useWorkspaceStore((s) => s.workspaces);

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>(activeWs?.avatarUrl || '');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (activeWs?.avatarUrl !== undefined) {
      setCurrentAvatarUrl(activeWs.avatarUrl || '');
    }
  }, [activeWs?.avatarUrl]);

  if (!activeWorkspaceId) return null;

  return (
    <div className="bg-surface dark:bg-[#12181C] border border-border/70 dark:border-[#222B30] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 text-left">
      <div className="flex items-center justify-between pb-4 border-b border-border/60 dark:border-[#222B30]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">Organization & Workspace Identity</h2>
            <p className="text-xs text-muted">Manage branding and avatar icon for the active workspace.</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          Role: {roleName || 'Owner'}
        </span>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-medium border flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
          }`}
        >
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="text-xs opacity-70">
            ✕
          </button>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-surface-subtle/60 dark:bg-[#172025] border border-border/50 dark:border-[#253036] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            seed={activeWorkspaceId || workspaceName || 'workspace'}
            name={workspaceName || 'Workspace'}
            avatarUrl={currentAvatarUrl}
            size="md"
            className="shrink-0"
          />
          <div className="min-w-0">
            <label className="text-xs font-bold text-foreground block truncate">
              {workspaceName || 'Active Workspace'}
            </label>
            <p className="text-[11px] text-muted truncate">
              {currentAvatarUrl ? 'Custom organization logo configured' : 'Using default organization avatar'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-admin-primary text-black font-bold text-xs hover:bg-admin-primary/90 transition-all shadow-xs flex items-center gap-1.5 shrink-0"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Edit Organization Avatar</span>
        </button>
      </div>

      <AvatarPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        currentAvatarUrl={currentAvatarUrl}
        userName={workspaceName}
        onSelectAvatar={async (newAvatarUrl) => {
          setCurrentAvatarUrl(newAvatarUrl);
          window.dispatchEvent(new CustomEvent('workspace-avatar-updated', { detail: { avatarUrl: newAvatarUrl } }));
          const res = await updateWorkspaceAvatarAction(activeWorkspaceId, newAvatarUrl);
          if (res.success) {
            setMessage({ type: 'success', text: 'Workspace avatar updated successfully.' });
            router.refresh();
          } else {
            setMessage({ type: 'error', text: res.error || 'Failed to update workspace avatar.' });
          }
        }}
      />
    </div>
  );
}
