'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
import { authClient } from '@/modules/auth';
import { ToastProvider } from '@/components/admin/ui';
import { cn } from '@/lib/utils';
import type { AppShellProps, NavSection } from './types';

export const SHELL_SIDEBAR_WIDTH_DEFAULT = 256;
export const SHELL_SIDEBAR_WIDTH_MIN = 200;
export const SHELL_SIDEBAR_WIDTH_MAX = 380;
export const SHELL_SIDEBAR_WIDTH_COLLAPSED = 64;
export const SHELL_SIDEBAR_WIDTH_EXPANDED = 256;

export function isNavActive(
  pathname: string,
  search: string,
  href: string,
  homeHref: string,
  exact = false
) {
  const [path, hrefQuery = ''] = href.split('?');
  const hrefParams = new URLSearchParams(hrefQuery);
  const currentParams = new URLSearchParams(search);

  if (pathname !== path) {
    if (exact) return false;
    if (path === homeHref) return false;
    return pathname.startsWith(path);
  }

  if (hrefQuery) {
    for (const [key, value] of hrefParams.entries()) {
      if (currentParams.get(key) !== value) return false;
    }
    return true;
  }

  // Same path without query — only active when no tab sub-route is selected (e.g. Finances overview).
  if (path === '/dashboard/money' && currentParams.get('tab')) {
    return false;
  }

  return true;
}

interface SidebarItemProps {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  isCollapsed: boolean;
  onNavigate?: () => void;
  layoutId: string;
  comingSoon?: boolean;
}

function SidebarItem({ label, href, icon: Icon, isActive, isCollapsed, onNavigate, layoutId, comingSoon }: SidebarItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative w-full" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <Link href={href} onClick={onNavigate} className={cn('block select-none w-full', comingSoon && 'opacity-50 pointer-events-none')}>
        <motion.div
          whileHover={{ scale: isCollapsed ? 1.04 : 1.01, x: isCollapsed ? 0 : 2 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'relative flex items-center rounded-xl text-[14px] font-medium transition-all duration-150 cursor-pointer w-full',
            isActive
              ? 'text-white font-semibold shadow-xs'
              : 'text-[#94A3B8] hover:text-white hover:bg-[#0E1E33]',
            isCollapsed ? 'w-10 h-10 mx-auto justify-center p-0' : 'gap-3 px-3 py-2.5 min-h-[42px]'
          )}
          aria-current={isActive ? 'page' : undefined}
        >
          {isActive && (
            <motion.div
              layoutId={layoutId}
              className="absolute inset-0 bg-[#008F83] rounded-xl shadow-xs z-0"
              transition={{ type: 'spring', stiffness: 400, damping: 34 }}
            />
          )}
          <motion.div
            className="relative z-10 shrink-0 flex items-center justify-center"
          >
            <Icon
              className={cn(
                'w-[18px] h-[18px] transition-colors',
                isActive ? 'text-white' : 'text-[#94A3B8] group-hover:text-white'
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
                className="truncate relative z-10 font-medium flex items-center justify-between flex-1 min-w-0"
              >
                <span className="truncate">{label}</span>
                {comingSoon && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#008F83]/20 text-[#32D5C4] leading-none tracking-wide ml-1.5 shrink-0 border border-[#008F83]/30">
                    Soon
                  </span>
                )}
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
            className="absolute left-full top-1/2 -translate-y-1/2 z-50 px-3 py-1.5 rounded-lg bg-[#0E1E33] text-white border border-[#1E293B] font-medium text-[13px] shadow-elevation-2 whitespace-nowrap pointer-events-none flex items-center gap-2"
          >
            {label}
            {comingSoon && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-[#008F83]/20 text-[#32D5C4]">
                Soon
              </span>
            )}
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
  search: string;
  userName: string;
  userEmail: string;
  onLogout: () => void;
  onNavigate?: () => void;
  themeMode: string;
  activeNavLayoutId: string;
  sidebarWidth: number;
  onStartResizing: (e: React.MouseEvent) => void;
  onResetWidth: () => void;
  onChangeWidth: (delta: number) => void;
  isResizing: boolean;
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
  search,
  userName,
  userEmail,
  onLogout,
  onNavigate,
  themeMode,
  activeNavLayoutId,
  sidebarWidth,
  onStartResizing,
  onResetWidth,
  onChangeWidth,
  isResizing,
}: SidebarProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const isShellDark = themeMode === 'light' || themeMode === 'full-dark' || themeMode === 'dark';

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? SHELL_SIDEBAR_WIDTH_COLLAPSED : sidebarWidth }}
      transition={isResizing ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 32 }}
      className={cn(
        'relative hidden md:flex flex-col shrink-0 h-full bg-admin-sidebar text-admin-sidebar-foreground z-30 select-none overflow-hidden border-r border-admin-sidebar-border',
        isCollapsed ? 'px-2' : 'px-3'
      )}
    >
      {/* Sidebar Branding Header (occupies full width of the sidebar) */}
      <div
        className={cn(
          'flex items-center shrink-0 border-b border-admin-sidebar-border mb-1.5',
          isCollapsed ? 'h-[58px] justify-center px-1' : 'h-[58px] px-2 w-full'
        )}
      >
        <Link href={homeHref} className="flex items-center gap-3 group w-full min-w-0">
          <img
            src={isShellDark ? '/logo_Dark.png' : '/logo_Light.png'}
            alt="PropertyLedge"
            className="h-8 w-auto object-contain shrink-0"
          />
          {!isCollapsed && (
            <div className="flex items-center justify-between flex-1 min-w-0">
              <span className="font-heading text-[16px] font-bold tracking-tight text-white truncate">
                PropertyLedge
              </span>
              {brandBadge && (
                <span className="rounded-full bg-[#008F83]/20 text-[#32D5C4] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0 ml-1 border border-[#008F83]/30">
                  {brandBadge}
                </span>
              )}
            </div>
          )}
        </Link>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2 pt-2 pb-2">
          {navSections.map((section) => {
            const isGroupCollapsed = !!collapsedGroups[section.label];
            return (
              <div key={section.label} className="space-y-1">
                {!isCollapsed ? (
                  <button
                    type="button"
                    onClick={() => setCollapsedGroups((prev) => ({ ...prev, [section.label]: !prev[section.label] }))}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-[#8C9BAE] hover:text-white uppercase tracking-[0.10em] transition-colors group/header select-none rounded-lg hover:bg-[#0E1E33]/40"
                  >
                    <span className="flex items-center gap-1.5">
                      {section.label}
                      {section.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#008F83]/20 text-[#32D5C4] leading-none normal-case tracking-normal">
                          {section.badge}
                        </span>
                      )}
                    </span>
                    <motion.div animate={{ rotate: isGroupCollapsed ? -90 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-3.5 h-3.5 opacity-70 group-hover/header:opacity-100 transition-opacity" />
                    </motion.div>
                  </button>
                ) : (
                  <div className="h-px bg-admin-sidebar-border my-2 mx-1" />
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
                          isActive={isNavActive(pathname, search, item.href, homeHref, item.exact)}
                          isCollapsed={isCollapsed}
                          onNavigate={onNavigate}
                          layoutId={activeNavLayoutId}
                          comingSoon={item.comingSoon}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
      </nav>

      <div className={cn('pt-2 border-t border-admin-sidebar-border shrink-0 pb-3 space-y-1', isCollapsed ? 'px-0.5' : '')}>
        {footerLink && !isCollapsed && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              window.location.href = footerLink.href;
            }}
            className="w-full h-9 px-3 rounded-xl bg-admin-sidebar-surface border border-admin-sidebar-border hover:bg-admin-sidebar-hover text-admin-sidebar-muted hover:text-white text-[12px] font-semibold flex items-center justify-between transition-all mb-1.5"
          >
            <span className="flex items-center gap-2">
              <footerLink.icon className="w-4 h-4" />
              {footerLink.label}
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-admin-sidebar-muted" />
          </motion.button>
        )}

        {settingsHref && !isCollapsed && (
          <Link
            href={settingsHref}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13.5px] font-medium text-[#94A3B8] hover:text-white hover:bg-[#0E1E33] transition-colors"
          >
            <Settings className="w-4 h-4 shrink-0 text-[#94A3B8]" />
            Settings
          </Link>
        )}

        <div className="flex items-center justify-between gap-1 w-full">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            className={cn(
              'flex items-center gap-2.5 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#0E1E33] transition-colors cursor-pointer flex-1',
              isCollapsed ? 'w-10 h-10 mx-auto justify-center p-0' : 'px-3 py-2 text-[13px] font-medium'
            )}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </motion.button>

          {!isCollapsed && (
            <div className="flex items-center gap-0.5 px-1 py-1 rounded-lg bg-[#0E1E33]/60 border border-admin-sidebar-border">
              <button
                type="button"
                onClick={() => onChangeWidth(-20)}
                className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors"
                title="Narrower sidebar"
              >
                −
              </button>
              <button
                type="button"
                onClick={onResetWidth}
                className="px-1.5 h-6 rounded flex items-center justify-center text-[10px] font-semibold text-[#64748B] hover:text-white hover:bg-[#1E293B] transition-colors"
                title="Reset width to default (256px)"
              >
                {sidebarWidth}
              </button>
              <button
                type="button"
                onClick={() => onChangeWidth(20)}
                className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors"
                title="Wider sidebar"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Drag-to-Resize Right Border Handle */}
      {!isCollapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={sidebarWidth}
          title="Drag to resize sidebar width · Double-click to reset"
          onMouseDown={onStartResizing}
          onDoubleClick={onResetWidth}
          className={cn(
            'absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-40 group hover:bg-[#008F83] transition-colors',
            isResizing && 'bg-[#008F83] w-2'
          )}
        />
      )}
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
  search: string;
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
  search,
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
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <img
                src={isShellDark ? '/logo_Dark.png' : '/logo_Light.png'}
                alt="PropertyLedge Logo"
                className="h-6 w-auto object-contain shrink-0"
              />
              <span className="font-heading font-bold text-base tracking-tight text-admin-sidebar-foreground truncate">PropertyLedge</span>
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
                <p className="text-[10px] font-semibold text-[#7F8B99] uppercase tracking-[0.10em] px-3 mb-1.5 flex items-center gap-1.5">
                  {section.label}
                  {section.badge && (
                    <span className="px-1 py-px rounded text-[8px] font-semibold bg-[#008F83]/15 text-[#32D5C4] leading-none normal-case tracking-normal">
                      {section.badge}
                    </span>
                  )}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <SidebarItem
                      key={item.href}
                      label={item.label}
                      href={item.href}
                      icon={item.icon}
                      isActive={isNavActive(pathname, search, item.href, homeHref, item.exact)}
                      isCollapsed={false}
                      onNavigate={onClose}
                      layoutId={activeNavLayoutId}
                      comingSoon={item.comingSoon}
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
  userAvatarUrl,
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
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const [themeMode, setThemeMode] = useState<'light' | 'full-light' | 'full-dark' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SHELL_SIDEBAR_WIDTH_DEFAULT);
  const [isResizing, setIsResizing] = useState(false);
  const isDraggingRef = React.useRef(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarUrlState, setAvatarUrlState] = useState<string | undefined>(userAvatarUrl);

  useEffect(() => {
    try {
      const storedWidth = localStorage.getItem('propertyledge_sidebar_width');
      if (storedWidth) {
        const parsed = parseInt(storedWidth, 10);
        if (!isNaN(parsed) && parsed >= SHELL_SIDEBAR_WIDTH_MIN && parsed <= SHELL_SIDEBAR_WIDTH_MAX) {
          setSidebarWidth(parsed);
        }
      }
    } catch {}
  }, []);

  const handleStartResizing = React.useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    isDraggingRef.current = true;
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newWidth = Math.min(
        SHELL_SIDEBAR_WIDTH_MAX,
        Math.max(SHELL_SIDEBAR_WIDTH_MIN, mouseMoveEvent.clientX)
      );
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setSidebarWidth((currentWidth) => {
        try {
          localStorage.setItem('propertyledge_sidebar_width', String(currentWidth));
        } catch {}
        return currentWidth;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleResetWidth = React.useCallback(() => {
    setSidebarWidth(SHELL_SIDEBAR_WIDTH_DEFAULT);
    try {
      localStorage.setItem('propertyledge_sidebar_width', String(SHELL_SIDEBAR_WIDTH_DEFAULT));
    } catch {}
  }, []);

  const handleChangeWidth = React.useCallback((delta: number) => {
    setSidebarWidth((prev) => {
      const next = Math.min(SHELL_SIDEBAR_WIDTH_MAX, Math.max(SHELL_SIDEBAR_WIDTH_MIN, prev + delta));
      try {
        localStorage.setItem('propertyledge_sidebar_width', String(next));
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    setAvatarUrlState(userAvatarUrl);
  }, [userAvatarUrl]);

  useEffect(() => {
    function handleAvatarUpdated(e: Event) {
      const customEvent = e as CustomEvent<{ avatarUrl?: string }>;
      if (customEvent.detail?.avatarUrl !== undefined) {
        setAvatarUrlState(customEvent.detail.avatarUrl);
      }
    }
    window.addEventListener('user-avatar-updated', handleAvatarUpdated);
    return () => window.removeEventListener('user-avatar-updated', handleAvatarUpdated);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const stored = localStorage.getItem('propertyledge_theme') as typeof themeMode | null;
      const currentMode = stored || (document.documentElement.getAttribute('data-theme-mode') as typeof themeMode) || 'dark';
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
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await authClient.signOut();
    router.push('/login');
  };

  const mobileTitle = variant === 'admin' ? 'PropertyLedge Admin' : 'PropertyLedge';

  const sidebarProps = {
    navSections,
    homeHref,
    brandBadge,
    footerLink,
    sidebarExtras,
    settingsHref,
    pathname,
    search,
    userName,
    userEmail,
    onLogout: handleLogout,
    themeMode,
    activeNavLayoutId,
  };

  return (
    <div
      className="h-screen w-screen bg-admin-sidebar text-admin-foreground flex flex-row overflow-hidden font-sans antialiased selection:bg-admin-foreground/10 selection:text-admin-foreground"
      style={{ '--shell-navbar-height': `${SHELL_NAVBAR_HEIGHT}px` } as React.CSSProperties}
    >
        {/* Full-height Sidebar on the left */}
        <Sidebar
          {...sidebarProps}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          sidebarWidth={sidebarWidth}
          onStartResizing={handleStartResizing}
          onResetWidth={handleResetWidth}
          onChangeWidth={handleChangeWidth}
          isResizing={isResizing}
        />

        <AnimatePresence>
          {mobileMenuOpen && (
            <MobileDrawer {...sidebarProps} isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
          )}
        </AnimatePresence>

        {/* Right side: Navbar at top (spanning rest of width) + Workspace below */}
        <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden bg-admin-sidebar">
          <GlobalNavbar
            homeHref={homeHref}
            brandBadge={brandBadge}
            brandLabel={mobileTitle}
            themeMode={themeMode}
            userName={userName}
            userEmail={userEmail}
            userAvatarUrl={avatarUrlState}
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

          <div className="app-workspace relative flex flex-1 flex-col min-h-0 overflow-hidden bg-admin-surface text-admin-foreground rounded-lg text-body mb-14 md:mb-0 md:mt-0 md:mr-0 md:ml-0 md:rounded-tl-xl border-t md:border-l border-admin-sidebar-border/60 shadow-xs">
            <main className="flex h-full w-full flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
              <div className="flex h-full min-h-0 w-full flex-1 flex-col">
                {!mounted ? (
                  <div className="flex flex-1 items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-6 h-6 rounded-full border-2 border-admin-primary border-t-transparent animate-spin" />
                      <span className="text-xs text-admin-muted font-medium">{loadingMessage}</span>
                    </div>
                  </div>
                ) : (
                  children
                )}
              </div>
            </main>
            <div id="workspace-drawer-root" className="absolute inset-0 z-40 pointer-events-none [&>*]:pointer-events-auto" />
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
  );
}
