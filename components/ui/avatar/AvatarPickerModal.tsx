'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Check, X } from 'lucide-react';
import { Avatar } from './Avatar';
import { CURATED_AVATAR_SEEDS, generateRandomSeed, getDiceBearUrl } from './avatar-utils';
import { Button } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

export interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAvatar: (avatarUrl: string) => Promise<void> | void;
  currentAvatarUrl?: string | null;
  userName?: string | null;
}

export function AvatarPickerModal({
  isOpen,
  onClose,
  onSelectAvatar,
  currentAvatarUrl,
  userName = 'User',
}: AvatarPickerModalProps) {
  const [seedsList, setSeedsList] = useState<string[]>(CURATED_AVATAR_SEEDS);
  const [selectedSeed, setSelectedSeed] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Default to initial curated seed or userName
      setSelectedSeed(userName || 'User');
    }
  }, [isOpen, userName]);

  if (!isOpen) return null;

  const handleSurpriseMe = () => {
    const newSeed = generateRandomSeed();
    setSeedsList((prev) => (prev.includes(newSeed) ? prev : [newSeed, ...prev]));
    setSelectedSeed(newSeed);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const generatedUrl = getDiceBearUrl(selectedSeed);
      await onSelectAvatar(generatedUrl);
      onClose();
    } catch (err) {
      console.error('Failed to save avatar choice:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-surface dark:bg-[#12181C] border border-border dark:border-[#2A3032] rounded-3xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-picker-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div>
            <h2 id="avatar-picker-title" className="text-lg font-extrabold text-foreground font-heading">
              Choose Your Avatar
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Select any avatar or click Surprise Me
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Preview Header */}
        <div className="flex items-center justify-center gap-4 py-3 bg-surface-subtle/60 dark:bg-[#1A2226]/60 rounded-2xl border border-border/40">
          <Avatar seed={selectedSeed} name={userName} size="xl" className="ring-4 ring-red-500/20" />
          <div className="text-left">
            <p className="text-xs text-muted font-medium">Selected Avatar</p>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              Active Selection
            </p>
          </div>
        </div>

        {/* Avatar Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
          {seedsList.map((seedItem) => {
            const isSelected = selectedSeed === seedItem;
            return (
              <button
                key={seedItem}
                type="button"
                onClick={() => setSelectedSeed(seedItem)}
                className={cn(
                  'relative group p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all border outline-none',
                  isSelected
                    ? 'border-red-500 dark:border-red-400 bg-red-500/10 shadow-sm ring-2 ring-red-500/30'
                    : 'border-border/60 dark:border-[#2A3032] hover:border-foreground/30 hover:bg-black/5 dark:hover:bg-white/5'
                )}
              >
                <Avatar seed={seedItem} size="lg" decorative />
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={handleSurpriseMe}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Surprise Me</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving || !selectedSeed}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
            >
              {isSaving ? 'Saving...' : 'Save Avatar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
