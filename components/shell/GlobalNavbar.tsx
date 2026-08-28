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

export const SHELL_NAVBAR_HEIGHT = 48;

interface GlobalNavbarProps {
  homeHref: string;
  brandBadge?: string;
  brandLabel?: string;
  themeMode: string;
  userName: string;
  userEmail: string;
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
      className="flex h-[var(--shell-navbar-height,48px)] shrink-0 items-center justify-between gap-2 bg-admin-sidebar px-2 sm:px-3 text-admin-sidebar-foreground z-40"
      style={{ height: SHELL_NAVBAR_HEIGHT }}
    >
      {/* Left: brand + context */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onMobileMenuToggle}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-admin-sidebar-border text-admin-sidebar-muted transition-colors hover:bg-admin-sidebar-hover hover:text-admin-sidebar-foreground md:hidden"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5" />}
        </motion.button>

        <Link href={homeHref} className="flex shrink-0 items-center gap-1.5 group">
          <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-md border border-admin-sidebar-border bg-admin-sidebar-surface">
            <img
              src={isShellDark ? '/logo_Dark.png' : '/logo_Light.png'}
              alt=""
              className="h-3.5 w-3.5 object-contain"
            />
          </div>
          <span className="hidden font-heading text-xs font-bold tracking-tight text-admin-sidebar-foreground sm:inline">
            {brandLabel}
          </span>
          {brandBadge && (
            <span className="hidden rounded border border-admin-sidebar-border bg-admin-sidebar-surface px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-admin-sidebar-muted sm:inline">
              {brandBadge}
            </span>
          )}
        </Link>

        {/* Desktop context breadcrumb */}
        {contextBreadcrumb && (
          <div className="hidden min-w-0 items-center gap-1.5 md:flex">{contextBreadcrumb}</div>
        )}

        {/* Mobile context */}
        {mobileContextMenu && <div className="min-w-0 md:hidden">{mobileContextMenu}</div>}
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        {headerExtras}

        <motion.button
          type="button"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSearchOpen}
          className={cn(
            'hidden items-center gap-1.5 rounded-md border border-admin-shell-search-border bg-admin-shell-search-bg px-2 py-1 text-[11px] text-admin-sidebar-muted transition-colors hover:border-admin-primary/40 hover:text-admin-sidebar-foreground sm:flex',
            'min-w-[120px] lg:min-w-[150px]'
          )}
          aria-label="Open search"
        >
          <Search className="h-3 w-3 shrink-0" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="hidden rounded border border-admin-sidebar-border bg-admin-sidebar px-1 py-px font-mono text-[9px] text-admin-sidebar-muted lg:inline">
            ⌘K
          </kbd>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSearchOpen}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-admin-sidebar-border text-admin-sidebar-muted transition-colors hover:bg-admin-sidebar-hover hover:text-admin-sidebar-foreground sm:hidden"
          aria-label="Open search"
        >
          <Search className="h-3.5 w-3.5" />
        </motion.button>

        {showHelp && <HelpMenu settingsHref={settingsHref} />}
        {showNotifications && <NotificationCenter variant="navbar" />}
        {showTheme && <ThemeSelector variant="navbar" className="hidden sm:block" />}
        <AccountMenu
          userName={userName}
          userEmail={userEmail}
          onLogout={onLogout}
          settingsHref={settingsHref}
          showWorkspaceSettings={showWorkspaceSettings}
          showBilling={showBilling}
        />
      </div>
    </header>
  );
}
