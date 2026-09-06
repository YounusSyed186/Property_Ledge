'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Settings, CreditCard, Building2, Sparkles } from 'lucide-react';
import { Avatar, AvatarPickerModal } from '@/components/ui/avatar';
import { updateProfileAction } from '@/lib/auth/actions';
import { cn } from '@/lib/utils';

interface AccountMenuProps {
  userName: string;
  userEmail: string;
  userAvatarUrl?: string;
  onLogout: () => void;
  onAvatarChange?: (newAvatarUrl: string) => void;
  settingsHref?: string;
  showWorkspaceSettings?: boolean;
  showBilling?: boolean;
  className?: string;
}

export function AccountMenu({
  userName,
  userEmail,
  userAvatarUrl,
  onLogout,
  onAvatarChange,
  settingsHref = '/dashboard/settings',
  showWorkspaceSettings = true,
  showBilling = true,
  className,
}: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(userAvatarUrl || '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userAvatarUrl !== undefined) {
      setCurrentAvatarUrl(userAvatarUrl);
    }
  }, [userAvatarUrl]);

  useEffect(() => {
    function handleAvatarUpdated(e: Event) {
      const customEvent = e as CustomEvent<{ avatarUrl?: string }>;
      if (customEvent.detail?.avatarUrl !== undefined) {
        setCurrentAvatarUrl(customEvent.detail.avatarUrl);
      }
    }
    window.addEventListener('user-avatar-updated', handleAvatarUpdated);
    return () => window.removeEventListener('user-avatar-updated', handleAvatarUpdated);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelectAvatar = async (newUrl: string) => {
    setCurrentAvatarUrl(newUrl);
    window.dispatchEvent(new CustomEvent('user-avatar-updated', { detail: { avatarUrl: newUrl } }));
    try {
      await updateProfileAction({ avatarUrl: newUrl });
      if (onAvatarChange) onAvatarChange(newUrl);
    } catch (err) {
      console.error('Failed to update user avatar:', err);
    }
  };

  return (
    <>
      <div className={cn('relative', className)} ref={ref}>
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-admin-sidebar-border bg-admin-sidebar-surface transition-all hover:border-[#008F83] focus:outline-none focus:ring-2 focus:ring-[#008F83]/40"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="Account menu"
        >
          <Avatar
            seed={userEmail || userName || 'user'}
            name={userName || 'User'}
            avatarUrl={currentAvatarUrl}
            size={24}
            className="w-full h-full"
          />
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-admin-border bg-admin-surface shadow-elevation-2"
              role="menu"
            >
              <div className="border-b border-admin-border px-3 py-3">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setIsAvatarPickerOpen(true);
                    }}
                    className="relative group rounded-full shrink-0"
                    title="Click to edit avatar"
                  >
                    <Avatar
                      seed={userEmail || userName}
                      name={userName}
                      avatarUrl={currentAvatarUrl}
                      size="md"
                      className="shrink-0 group-hover:opacity-80 transition-opacity"
                    />
                    <div className="absolute inset-0 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-admin-foreground">{userName}</p>
                    <p className="truncate text-xs text-admin-muted">{userEmail}</p>
                  </div>
                </div>
              </div>

              <div className="p-1.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsAvatarPickerOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-admin-primary transition-colors hover:bg-admin-primary-soft"
                  role="menuitem"
                >
                  <Sparkles className="h-4 w-4 text-admin-primary" />
                  Customize avatar
                </button>

                <Link
                  href={settingsHref}
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-admin-foreground transition-colors hover:bg-admin-surface-subtle"
                  role="menuitem"
                >
                  <Settings className="h-4 w-4 text-admin-muted" />
                  Account settings
                </Link>
                {showWorkspaceSettings && (
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setIsOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-admin-foreground transition-colors hover:bg-admin-surface-subtle"
                    role="menuitem"
                  >
                    <Building2 className="h-4 w-4 text-admin-muted" />
                    Workspace settings
                  </Link>
                )}
                {showBilling && (
                  <Link
                    href="/dashboard/settings/subscription"
                    onClick={() => setIsOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-admin-foreground transition-colors hover:bg-admin-surface-subtle"
                    role="menuitem"
                  >
                    <CreditCard className="h-4 w-4 text-admin-muted" />
                    Billing & subscription
                  </Link>
                )}
              </div>

              <div className="border-t border-admin-border p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-admin-danger transition-colors hover:bg-admin-danger/10"
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        isOpen={isAvatarPickerOpen}
        onClose={() => setIsAvatarPickerOpen(false)}
        currentAvatarUrl={currentAvatarUrl}
        userName={userName}
        onSelectAvatar={handleSelectAvatar}
      />
    </>
  );
}

