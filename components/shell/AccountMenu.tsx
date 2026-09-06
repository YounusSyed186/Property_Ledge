'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Settings, CreditCard, Building2 } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface AccountMenuProps {
  userName: string;
  userEmail: string;
  onLogout: () => void;
  settingsHref?: string;
  showWorkspaceSettings?: boolean;
  showBilling?: boolean;
  className?: string;
}

export function AccountMenu({
  userName,
  userEmail,
  onLogout,
  settingsHref = '/dashboard/settings',
  showWorkspaceSettings = true,
  showBilling = true,
  className,
}: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  return (
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
        <Avatar seed={userEmail || userName || 'user'} name={userName || 'User'} size={24} className="w-full h-full" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-md border border-admin-border bg-admin-surface shadow-lg"
            role="menu"
          >
            <div className="border-b border-admin-border px-3 py-3">
              <div className="flex items-center gap-2.5">
                <Avatar seed={userEmail || userName} name={userName} size="md" className="shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-admin-foreground">{userName}</p>
                  <p className="truncate text-xs text-admin-muted">{userEmail}</p>
                </div>
              </div>
            </div>

            <div className="p-1.5">
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
  );
}
