'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Menu, Search, X } from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { ThemeSelector } from '@/components/ui/ThemeSelector';
import { AccountMenu } from './AccountMenu';
import { HelpMenu } from './HelpMenu';
import { cn } from '@/lib/utils';

export const SHELL_NAVBAR_HEIGHT = 58;

interface GlobalNavbarProps {
  homeHref: string;
  brandBadge?: string;
  brandLabel?: string;
  themeMode: string;
  userName: string;
  userEmail: string;
  userAvatarUrl?: string;
  onLogout: () => void;
  onSearchOpen: () => void;
  onMobileMenuToggle: () => void;
  mobileMenuOpen: boolean;
  contextBreadcrumb?: React.ReactNode;
  mobileContextMenu?: React.ReactNode;
  settingsHref?: string;
  showWorkspaceSettings?: boolean;
  showBilling?: boolean;
  showHelp?: boolean;
  showNotifications?: boolean;
  showTheme?: boolean;
  headerExtras?: React.ReactNode;
}

export function GlobalNavbar({
  homeHref,
  brandBadge,
  brandLabel = 'PropertyLedge',
  themeMode,
  userName,
  userEmail,
  userAvatarUrl,
  onLogout,
  onSearchOpen,
  onMobileMenuToggle,
  mobileMenuOpen,
  contextBreadcrumb,
  mobileContextMenu,
  settingsHref,
  showWorkspaceSettings = true,
  showBilling = true,
  showHelp = true,
  showNotifications = true,
  showTheme = true,
  headerExtras,
}: GlobalNavbarProps) {
  const isShellDark = themeMode === 'light' || themeMode === 'full-dark' || themeMode === 'dark';

  return (
    <header
      className="flex h-[var(--shell-navbar-height,58px)] shrink-0 items-center justify-between gap-3 bg-admin-sidebar px-3 sm:px-5 text-admin-sidebar-foreground z-40 border-b border-admin-sidebar-border"
      style={{ height: SHELL_NAVBAR_HEIGHT }}
    >
      {/* Left: brand + context */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onMobileMenuToggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-admin-sidebar-border text-admin-sidebar-muted transition-colors hover:bg-admin-sidebar-hover hover:text-white md:hidden"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </motion.button>

        <Link href={homeHref} className="flex shrink-0 items-center gap-2.5 group py-1 md:hidden">
          <img
            src={isShellDark ? '/logo_Dark.png' : '/logo_Light.png'}
            alt="PropertyLedge"
            className="h-7 w-auto object-contain shrink-0"
          />
          <span className="font-heading text-[15px] font-bold tracking-tight text-white">
            {brandLabel}
          </span>
          {brandBadge && (
            <span className="rounded-full bg-[#008F83]/20 text-[#32D5C4] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border border-[#008F83]/30">
              {brandBadge}
            </span>
          )}
        </Link>

        {/* Desktop context breadcrumb */}
        {contextBreadcrumb && (
          <div className="hidden min-w-0 items-center gap-2 md:flex">{contextBreadcrumb}</div>
        )}

        {/* Mobile context */}
        {mobileContextMenu && <div className="min-w-0 md:hidden">{mobileContextMenu}</div>}
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {headerExtras}

        <motion.button
          type="button"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSearchOpen}
          className={cn(
            'hidden items-center gap-2.5 rounded-xl border border-admin-sidebar-border bg-[#071526] px-3.5 py-2 text-[13px] text-[#94A3B8] transition-all hover:border-[#008F83]/50 hover:text-white sm:flex h-10',
            'min-w-[160px] lg:min-w-[210px]'
          )}
          aria-label="Open search"
        >
          <Search className="h-4 w-4 shrink-0 text-[#94A3B8]" />
          <span className="flex-1 text-left">Search portfolio…</span>
          <kbd className="hidden rounded-md border border-[#1E293B] bg-[#0E1E33] px-1.5 py-0.5 font-mono text-[10px] text-[#94A3B8] lg:inline font-semibold">
            ⌘K
          </kbd>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSearchOpen}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-admin-sidebar-border text-admin-sidebar-muted transition-colors hover:bg-admin-sidebar-hover hover:text-white sm:hidden"
          aria-label="Open search"
        >
          <Search className="h-4 w-4" />
        </motion.button>

        {showHelp && <HelpMenu settingsHref={settingsHref} />}
        {showNotifications && <NotificationCenter variant="navbar" />}
        {showTheme && <ThemeSelector variant="navbar" className="hidden sm:block" />}
        <AccountMenu
          userName={userName}
          userEmail={userEmail}
          userAvatarUrl={userAvatarUrl}
          onLogout={onLogout}
          settingsHref={settingsHref}
          showWorkspaceSettings={showWorkspaceSettings}
          showBilling={showBilling}
        />
      </div>
    </header>
  );
}
