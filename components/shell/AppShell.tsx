'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  ChevronDown,
  X,
  ArrowUpRight,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from 'lucide-react';
import { CommandMenu } from '@/components/admin/CommandMenu';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { GlobalNavbar, SHELL_NAVBAR_HEIGHT } from '@/components/shell/GlobalNavbar';
import { createClient } from '@/lib/supabase/client';
import { ToastProvider } from '@/components/admin/ui';
import { cn } from '@/lib/utils';
import type { AppShellProps, NavSection } from './types';

export const SHELL_SIDEBAR_WIDTH_EXPANDED = 248;
export const SHELL_SIDEBAR_WIDTH_COLLAPSED = 52;

function isNavActive(pathname: string, href: string, homeHref: string) {
  const path = href.split('?')[0];
  if (pathname === path) return true;
  if (path === homeHref) return false;
  return pathname.startsWith(path);
}

interface SidebarItemProps {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  isCollapsed: boolean;
  onNavigate?: () => void;
  layoutId: string;
}

function SidebarItem({ label, href, icon: Icon, isActive, isCollapsed, onNavigate, layoutId }: SidebarItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <Link href={href} onClick={onNavigate} className="block select-none">
        <motion.div
          whileHover={{ scale: isCollapsed ? 1.04 : 1.01, x: isCollapsed ? 0 : 1 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'relative flex items-center rounded-md text-[12px] font-medium transition-colors cursor-pointer',
            isActive
              ? 'text-admin-sidebar-active-text font-semibold'
              : 'text-admin-sidebar-muted hover:text-admin-sidebar-foreground hover:bg-admin-sidebar-hover',
            isCollapsed ? 'w-8 h-8 mx-auto justify-center p-0' : 'gap-2 px-2.5 py-1.5 h-8'
          )}
          aria-current={isActive ? 'page' : undefined}
        >
          {isActive && (
            <>
              <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-admin-sidebar-active-icon z-20" aria-hidden="true" />
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 bg-admin-sidebar-active-pill border border-admin-sidebar-active-pill-border rounded-md z-0"
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              />
            </>
          )}
          <motion.div
            className="relative z-10 shrink-0 flex items-center justify-center"
          >
            <Icon
              className={cn(
                'w-3.5 h-3.5 transition-colors',
                isActive ? 'text-admin-sidebar-active-icon' : 'text-admin-sidebar-muted group-hover:text-admin-sidebar-foreground'
              )}
            />
          </motion.div>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="truncate relative z-10 font-medium"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </Link>
      <AnimatePresence>
        {isCollapsed && isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, x: 6 }}
            animate={{ opacity: 1, scale: 1, x: 12 }}
            exit={{ opacity: 0, scale: 0.92, x: 6 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-full top-1/2 -translate-y-1/2 z-50 px-2 py-1 rounded-md bg-admin-sidebar-surface text-admin-sidebar-foreground border border-admin-sidebar-border font-medium text-xs shadow-lg whitespace-nowrap pointer-events-none"
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SidebarProps {
  navSections: NavSection[];
  homeHref: string;
  brandBadge?: string;
  footerLink?: AppShellProps['footerLink'];
  sidebarExtras?: React.ReactNode;
  settingsHref?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  pathname: string;
  userName: string;
  userEmail: string;
  onLogout: () => void;
  onNavigate?: () => void;
  themeMode: string;
  activeNavLayoutId: string;
}

function Sidebar({
  navSections,
  homeHref,
  brandBadge,
  footerLink,
  sidebarExtras,
  settingsHref,
  isCollapsed,
  onToggleCollapse,
  pathname,
  userName,
  userEmail,
  onLogout,
  onNavigate,
  themeMode,
  activeNavLayoutId,
}: SidebarProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? SHELL_SIDEBAR_WIDTH_COLLAPSED : SHELL_SIDEBAR_WIDTH_EXPANDED }}
      transition={{ type: 'spring', stiffness: 300, damping: 32 }}
      className={cn(
        'hidden md:flex flex-col shrink-0 h-full bg-admin-sidebar text-admin-sidebar-foreground z-30 select-none overflow-hidden',
        isCollapsed ? 'px-1' : 'px-1.5'
      )}
    >
      <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-1.5 pt-2 pb-1">
          {navSections.map((section) => {
            const isGroupCollapsed = !!collapsedGroups[section.label];
            return (
              <div key={section.label} className="space-y-1">
                {!isCollapsed ? (
                  <button
                    type="button"
                    onClick={() => setCollapsedGroups((prev) => ({ ...prev, [section.label]: !prev[section.label] }))}
                    className="w-full flex items-center justify-between px-2 py-0.5 text-[10px] font-semibold text-admin-sidebar-muted hover:text-admin-sidebar-foreground uppercase tracking-wider font-heading transition-colors group/header"
                  >
                    <span>{section.label}</span>
                    <motion.div animate={{ rotate: isGroupCollapsed ? -90 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-3 h-3 opacity-60 group-hover/header:opacity-100 transition-opacity" />
                    </motion.div>
                  </button>
                ) : (
                  <div className="h-px bg-admin-sidebar-border my-1.5 mx-1" />
                )}
                <AnimatePresence initial={false}>
                  {(!isGroupCollapsed || isCollapsed) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-1 overflow-hidden"
                    >
                      {section.items.map((item) => (
                        <SidebarItem
                          key={item.href}
                          label={item.label}
                          href={item.href}
                          icon={item.icon}
                          isActive={isNavActive(pathname, item.href, homeHref)}
                          isCollapsed={isCollapsed}
                          onNavigate={onNavigate}
                          layoutId={activeNavLayoutId}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
      </nav>

      <div className={cn('pt-1.5 border-t border-admin-sidebar-border/50 shrink-0 pb-2', isCollapsed ? 'px-0.5' : '')}>
        {footerLink && !isCollapsed && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              window.location.href = footerLink.href;
            }}
            className="w-full h-8 px-2.5 rounded-md bg-admin-sidebar-surface border border-admin-sidebar-border hover:bg-admin-sidebar-hover text-admin-sidebar-muted hover:text-admin-sidebar-foreground text-[11px] font-semibold flex items-center justify-between transition-all mb-2"
          >
            <span className="flex items-center gap-2">
              <footerLink.icon className="w-3.5 h-3.5" />
              {footerLink.label}
            </span>
            <ArrowUpRight className="w-3 h-3 text-admin-sidebar-muted" />
          </motion.button>
        )}

        {settingsHref && !isCollapsed && (
          <Link
            href={settingsHref}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] text-admin-sidebar-muted hover:text-admin-sidebar-foreground hover:bg-admin-sidebar-hover transition-colors mb-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </Link>
        )}

        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          className={cn(
            'flex items-center gap-2 rounded-md text-admin-sidebar-muted hover:text-admin-sidebar-foreground hover:bg-admin-sidebar-hover transition-colors',
            isCollapsed ? 'w-8 h-8 mx-auto justify-center p-0' : 'w-full px-2.5 py-1.5 text-[11px] font-medium'
          )}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-3.5 h-3.5" />
          ) : (
            <>
              <PanelLeftClose className="w-3.5 h-3.5 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.aside>
  );
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  navSections: NavSection[];
  homeHref: string;
  footerLink?: AppShellProps['footerLink'];
  sidebarExtras?: React.ReactNode;
  settingsHref?: string;
  pathname: string;
  userName: string;
  userEmail: string;
  onLogout: () => void;
  themeMode: string;
  activeNavLayoutId: string;
}

function MobileDrawer({
  isOpen,
  onClose,
  navSections,
  homeHref,
  footerLink,
  sidebarExtras,
  settingsHref,
  pathname,
  userName,
  userEmail,
  onLogout,
  themeMode,
  activeNavLayoutId,
}: MobileDrawerProps) {
  if (!isOpen) return null;
  const isShellDark = themeMode === 'light' || themeMode === 'full-dark' || themeMode === 'dark';

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', stiffness: 350, damping: 32 }}
        className="absolute inset-y-0 left-0 w-4/5 max-w-xs bg-admin-sidebar text-admin-sidebar-foreground flex flex-col justify-between p-5 border-r border-admin-sidebar-border shadow-elevation-overlay z-10"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-admin-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-admin-sidebar-surface border border-admin-sidebar-border flex items-center justify-center overflow-hidden">
                <img
                  src={isShellDark ? '/logo_Dark.png' : '/logo_Light.png'}
                  alt="PropertyLedge Logo"
                  className="w-5 h-5 object-contain"
                />
              </div>
              <span className="font-heading font-bold text-base tracking-tight text-admin-sidebar-foreground">PropertyLedge</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-1.5 rounded-lg text-admin-sidebar-muted hover:text-admin-sidebar-foreground hover:bg-admin-sidebar-hover transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          <nav className="space-y-5">
            {navSections.map((section) => (
              <div key={section.label}>
                <p className="text-[10px] font-semibold text-admin-sidebar-muted/70 uppercase tracking-[0.1em] px-3 mb-1.5">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <SidebarItem
                      key={item.href}
                      label={item.label}
                      href={item.href}
                      icon={item.icon}
                      isActive={isNavActive(pathname, item.href, homeHref)}
                      isCollapsed={false}
                      onNavigate={onClose}
                      layoutId={activeNavLayoutId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="pt-3 border-t border-admin-sidebar-border space-y-3">
          {footerLink && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                window.location.href = footerLink.href;
              }}
              className="w-full h-9 px-3 rounded-xl bg-admin-sidebar-surface border border-admin-sidebar-border hover:bg-admin-sidebar-hover text-admin-sidebar-muted hover:text-admin-sidebar-foreground text-[11px] font-semibold flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2">
                <footerLink.icon className="w-3.5 h-3.5" />
                {footerLink.label}
              </span>
              <ArrowUpRight className="w-3 h-3 text-admin-sidebar-muted" />
            </motion.button>
          )}
          {settingsHref && (
            <Link
              href={settingsHref}
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-admin-sidebar-muted hover:text-admin-sidebar-foreground hover:bg-admin-sidebar-hover"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-admin-sidebar-surface border border-admin-sidebar-border flex items-center justify-center text-xs font-bold text-admin-sidebar-foreground shrink-0">
                {userName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-admin-sidebar-foreground truncate">{userName}</p>
                <p className="text-[10px] text-admin-sidebar-muted truncate">{userEmail}</p>
              </div>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onLogout}
              className="p-1.5 rounded-lg text-admin-sidebar-muted hover:text-admin-danger hover:bg-admin-sidebar-hover transition-colors"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function AppShell({
  children,
  userEmail = 'user@propertyledge.com.au',
  userName = 'PropertyLedge User',
  navSections,
  variant,
  homeHref,
  brandBadge,
  footerLink,
  headerExtras,
  navbarContext,
  mobileContextMenu,
  sidebarExtras,
  loadingMessage = 'Loading...',
  commandMenuLinks,
  activeNavLayoutId = 'app-active-nav-pill',
  hubLabel = 'Production Hub',
  commandMenuFooter = 'PropertyLedge V3',
  settingsHref,
  useGlobalSearch = false,
  showHelp = true,
  showNotifications = true,
  showWorkspaceSettings = true,
  showBilling = true,
  mobileBottomNav,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [themeMode, setThemeMode] = useState<'light' | 'full-light' | 'full-dark' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const stored = localStorage.getItem('propertyledge_theme') as typeof themeMode | null;
      const currentMode = stored || (document.documentElement.getAttribute('data-theme-mode') as typeof themeMode) || 'light';
      setThemeMode(currentMode);
    }
    const syncTheme = () => {
      const stored = localStorage.getItem('propertyledge_theme') as typeof themeMode | null;
      if (stored) setThemeMode(stored);
    };
    window.addEventListener('theme-change', syncTheme);
    return () => window.removeEventListener('theme-change', syncTheme);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const mobileTitle = variant === 'admin' ? 'PropertyLedge Admin' : 'PropertyLedge';

  if (!mounted) {
    return (
      <div className="min-h-screen bg-admin-sidebar flex items-center justify-center text-admin-sidebar-foreground font-sans text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-admin-sidebar-foreground border-t-transparent animate-spin" />
          <span className="text-admin-sidebar-muted font-medium">{loadingMessage}</span>
        </div>
      </div>
    );
  }

  const sidebarProps = {
    navSections,
    homeHref,
    brandBadge,
    footerLink,
    sidebarExtras,
    settingsHref,
    pathname,
    userName,
    userEmail,
    onLogout: handleLogout,
    themeMode,
    activeNavLayoutId,
  };

  return (
    <ToastProvider>
      <div
        className="h-screen w-screen bg-admin-sidebar text-admin-foreground flex flex-col overflow-hidden font-sans antialiased selection:bg-admin-foreground/10 selection:text-admin-foreground"
        style={{ '--shell-navbar-height': `${SHELL_NAVBAR_HEIGHT}px` } as React.CSSProperties}
      >
        <GlobalNavbar
          homeHref={homeHref}
          brandBadge={brandBadge}
          brandLabel={mobileTitle}
          themeMode={themeMode}
          userName={userName}
          userEmail={userEmail}
          onLogout={handleLogout}
          onSearchOpen={() => setIsSearchOpen(true)}
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          mobileMenuOpen={mobileMenuOpen}
          contextBreadcrumb={navbarContext}
          mobileContextMenu={mobileContextMenu}
          settingsHref={settingsHref}
          showWorkspaceSettings={showWorkspaceSettings}
          showBilling={showBilling}
          showHelp={showHelp}
          showNotifications={showNotifications}
          headerExtras={headerExtras}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden bg-admin-sidebar">
          <Sidebar
            {...sidebarProps}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />

          <AnimatePresence>
            {mobileMenuOpen && (
              <MobileDrawer {...sidebarProps} isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
            )}
          </AnimatePresence>

          <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden p-0.5 pl-0 md:pl-0.5 bg-admin-background">
            <div className="app-workspace relative flex flex-1 flex-col min-h-0 overflow-hidden bg-admin-surface text-admin-foreground rounded-lg border border-admin-border text-body mb-14 md:mb-0">
              <main className="flex h-full w-full flex-1 flex-col min-w-0 min-h-0 overflow-hidden p-0.5">
                <div className="flex h-full min-h-0 w-full flex-1 flex-col">{children}</div>
              </main>
              <div id="workspace-drawer-root" className="absolute inset-0 z-40 pointer-events-none [&>*]:pointer-events-auto" />
            </div>
          </div>
        </div>

        {useGlobalSearch ? (
          <GlobalSearch
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            quickLinks={commandMenuLinks}
            footerLabel={commandMenuFooter}
          />
        ) : (
          <CommandMenu
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            links={commandMenuLinks}
            footerLabel={commandMenuFooter}
          />
        )}

        {mobileBottomNav}
      </div>
    </ToastProvider>
  );
}
