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
import { PropertySelector } from '@/components/property/PropertySelector';
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
  href?: string,
  homeHref = '/dashboard',
  exact = false
) {
  if (!href) return false;
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

function NavBadge({
  badge,
  variant = 'default',
}: {
  badge?: string | number;
  variant?: 'default' | 'orange' | 'green' | 'teal';
}) {
  if (badge === undefined || badge === null || badge === '') return null;

  const variantClasses = {
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 border border-orange-200/60 dark:border-orange-900/40',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40',
    teal: 'bg-[#008F83]/15 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/30',
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10.5px] font-bold leading-none shrink-0 transition-colors',
        variantClasses[variant] || variantClasses.default
      )}
    >
      {badge}
    </span>
  );
}

interface TreeNavItemProps {
  item: import('./types').NavItem;
  pathname: string;
  search: string;
  homeHref: string;
  isCollapsed: boolean;
  onNavigate?: () => void;
  layoutId: string;
}

function TreeNavItem({
  item,
  pathname,
  search,
  homeHref,
  isCollapsed,
  onNavigate,
}: TreeNavItemProps) {
  const Icon = item.icon;
  const hasChildren = Boolean(item.children && item.children.length > 0);

  // Check if any child or direct item is active
  const isDirectActive = item.href ? isNavActive(pathname, search, item.href, homeHref, item.exact) : false;
  const isChildActive = hasChildren && item.children!.some((child) =>
    isNavActive(pathname, search, child.href, homeHref, child.exact)
  );
  const isParentSelected = isDirectActive || isChildActive;

  // Expanded state (defaults to open if any child is active or default open)
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isChildActive) {
      setIsExpanded(true);
    }
  }, [isChildActive]);

  // Collapsed icon-rail mode
  if (isCollapsed) {
    const targetHref = item.href || (item.children?.[0]?.href ?? homeHref);
    return (
      <div
        className="relative w-full flex justify-center py-0.5"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Link
          href={targetHref}
          onClick={onNavigate}
          className={cn(
            'relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150',
            isParentSelected
              ? 'bg-[#008F83] text-white shadow-md'
              : 'text-[#94A3B8] hover:text-white hover:bg-[#0E1E33]',
            item.comingSoon && 'opacity-50 pointer-events-none'
          )}
          aria-label={item.label}
        >
          <Icon className="w-[18px] h-[18px]" />
          {item.badge !== undefined && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#32D5C4]" />
          )}
        </Link>
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, x: 6 }}
              animate={{ opacity: 1, scale: 1, x: 12 }}
              exit={{ opacity: 0, scale: 0.92, x: 6 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-full top-1/2 -translate-y-1/2 z-50 px-3 py-1.5 rounded-lg bg-[#0E1E33] text-white border border-[#1E293B] font-medium text-[13px] shadow-xl whitespace-nowrap pointer-events-none flex items-center gap-2"
            >
              {item.label}
              {hasChildren && (
                <span className="text-[11px] text-[#94A3B8]">({item.children!.length})</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Standalone root item without children
  if (!hasChildren) {
    return (
      <div className="relative w-full py-0.5">
        <Link
          href={item.href || homeHref}
          onClick={onNavigate}
          className={cn('block select-none w-full', item.comingSoon && 'opacity-50 pointer-events-none')}
        >
          <div
            className={cn(
              'group relative flex items-center justify-between rounded-xl text-[14px] font-medium transition-all duration-150 cursor-pointer w-full px-3 py-2 min-h-[40px]',
              isDirectActive
                ? 'bg-[#0E1E33] text-white font-semibold shadow-xs border border-[#1E293B]'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#0E1E33]/60'
            )}
            aria-current={isDirectActive ? 'page' : undefined}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Icon
                className={cn(
                  'w-[18px] h-[18px] shrink-0 transition-colors',
                  isDirectActive
                    ? 'text-[#32D5C4]'
                    : 'text-[#94A3B8] group-hover:text-white'
                )}
              />
              <span className="truncate">{item.label}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {item.badge !== undefined && (
                <NavBadge badge={item.badge} variant={item.badgeVariant} />
              )}
              {item.comingSoon && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold bg-[#008F83]/20 text-[#32D5C4] border border-[#008F83]/30">
                  Soon
                </span>
              )}
            </div>
          </div>
        </Link>
      </div>
    );
  }

  // Expandable parent item with children tree
  return (
    <div className="relative w-full py-0.5">
      {/* Parent Row Button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className={cn(
          'group relative flex items-center justify-between w-full px-3 py-2 min-h-[40px] rounded-xl text-[14px] font-medium transition-all duration-150 cursor-pointer select-none',
          isParentSelected && !isExpanded
            ? 'bg-[#0E1E33] text-white font-semibold shadow-xs border border-[#1E293B]'
            : 'text-[#94A3B8] hover:text-white hover:bg-[#0E1E33]/60'
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon
            className={cn(
              'w-[18px] h-[18px] shrink-0 transition-colors',
              isParentSelected
                ? 'text-[#32D5C4]'
                : 'text-[#94A3B8] group-hover:text-white'
            )}
          />
          <span className="truncate text-left font-medium">{item.label}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {item.badge !== undefined && (
            <NavBadge badge={item.badge} variant={item.badgeVariant} />
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="text-[#7F8B99] group-hover:text-white"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </div>
      </button>

      {/* Expandable Submenu Tree */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="relative pt-1 pb-1">
              {/* Continuous Vertical Connector Line terminating at the last child */}
              <div
                className="absolute left-[21px] top-0 bottom-[17px] w-[1.5px] bg-[#1E293B] pointer-events-none rounded-full"
                aria-hidden="true"
              />

              <div className="space-y-1">
                {item.children!.map((child) => {
                  const isChildItemActive = isNavActive(pathname, search, child.href, homeHref, child.exact);
                  return (
                    <div key={child.href} className="relative group/child flex items-center">
                      {/* Horizontal Connector Branch */}
                      <div
                        className="absolute left-[21px] top-1/2 -translate-y-1/2 w-[14px] h-[1.5px] bg-[#1E293B] pointer-events-none rounded-full"
                        aria-hidden="true"
                      />

                      {/* Child Navigation Link */}
                      <Link
                        href={child.href}
                        onClick={onNavigate}
                        className={cn(
                          'relative flex items-center justify-between w-full ml-[35px] px-3 py-1.5 rounded-xl text-[13.5px] transition-all duration-150',
                          isChildItemActive
                            ? 'bg-[#0E1E33] text-white font-semibold shadow-xs border border-[#1E293B]'
                            : 'text-[#94A3B8] hover:text-white hover:bg-[#0E1E33]/60 font-normal',
                          child.comingSoon && 'opacity-50 pointer-events-none'
                        )}
                        aria-current={isChildItemActive ? 'page' : undefined}
                      >
                        <span className="truncate">{child.label}</span>
                        {child.badge !== undefined && (
                          <NavBadge badge={child.badge} variant={child.badgeVariant} />
                        )}
                        {child.comingSoon && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold bg-[#008F83]/20 text-[#32D5C4] border border-[#008F83]/30">
                            Soon
                          </span>
                        )}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
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
  settingsHref,
  isCollapsed,
  onToggleCollapse,
  pathname,
  search,
  userName,
  userEmail,
  onLogout,
  onNavigate,
  activeNavLayoutId,
  sidebarWidth,
  onStartResizing,
  onResetWidth,
  isResizing,
}: SidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? SHELL_SIDEBAR_WIDTH_COLLAPSED : sidebarWidth }}
      transition={isResizing ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 32 }}
      className={cn(
        'relative hidden md:flex flex-col shrink-0 h-full bg-[#061222] text-white z-30 select-none overflow-hidden rounded-[24px] border border-[#17283A] shadow-2xl shadow-black/40',
        isCollapsed ? 'p-2' : 'p-3'
      )}
    >
      {/* 1. Sidebar Branding Header */}
      <div
        className={cn(
          'flex items-center shrink-0 border-b border-[#17283A]/80 pb-3 mb-2',
          isCollapsed ? 'justify-center px-0' : 'justify-between px-2 w-full'
        )}
      >
        <Link href={homeHref} className={cn('flex items-center group min-w-0', isCollapsed ? 'justify-center' : 'gap-2.5')}>
          <img
            src="/logo_Dark.png"
            alt="PropertyLedge"
            className="h-7 w-auto object-contain shrink-0 transition-transform group-hover:scale-105"
          />
          {!isCollapsed && (
            <div className="flex items-center justify-between flex-1 min-w-0">
              <span className="font-heading text-[15.5px] font-bold tracking-tight text-white truncate">
                PropertyLedge
              </span>
              {brandBadge && (
                <span className="rounded-full bg-[#008F83]/15 text-[#32D5C4] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0 ml-1 border border-[#008F83]/30">
                  {brandBadge}
                </span>
              )}
            </div>
          )}
        </Link>
      </div>

      {/* 2. Scrollable Hierarchical Tree Navigation List */}
      <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-1 py-1">
        {navSections.map((section, sIdx) => (
          <div key={section.label || `section-${sIdx}`} className="space-y-0.5">
            {section.label && !isCollapsed && (
              <p className="text-[10.5px] font-bold text-[#7F8B99] uppercase tracking-[0.10em] px-3 pt-2 pb-1">
                {section.label}
              </p>
            )}
            {section.items.map((item) => (
              <TreeNavItem
                key={item.label}
                item={item}
                pathname={pathname}
                search={search}
                homeHref={homeHref}
                isCollapsed={isCollapsed}
                onNavigate={onNavigate}
                layoutId={activeNavLayoutId}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* 3. Bottom Footer Area (Settings, User Profile & Collapse Toggle) */}
      <div className={cn('pt-2 border-t border-[#17283A]/80 shrink-0 space-y-1.5', isCollapsed ? 'px-0' : '')}>
        {footerLink && !isCollapsed && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              window.location.href = footerLink.href;
            }}
            className="w-full h-8.5 px-2.5 rounded-xl bg-[#071526] border border-[#17283A] hover:bg-[#0E1E33] text-[#94A3B8] hover:text-white text-[11.5px] font-semibold flex items-center justify-between transition-all"
          >
            <span className="flex items-center gap-2">
              <footerLink.icon className="w-3.5 h-3.5" />
              {footerLink.label}
            </span>
            <ArrowUpRight className="w-3 h-3 text-[#7F8B99]" />
          </motion.button>
        )}

        {settingsHref && !isCollapsed && (
          <Link
            href={settingsHref}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-[#94A3B8] hover:text-white hover:bg-[#0E1E33] transition-colors"
          >
            <Settings className="w-4 h-4 shrink-0 text-[#94A3B8]" />
            Settings
          </Link>
        )}

        {/* User profile row */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#071526]/80 border border-[#17283A]/60 my-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[#0E1E33] border border-[#17283A] flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-xs">
                {userName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-white truncate">{userName}</p>
                <p className="text-[10px] text-[#7F8B99] truncate">{userEmail}</p>
              </div>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onLogout}
              className="p-1 rounded-md text-[#7F8B99] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <div
              className="w-8 h-8 rounded-full bg-[#0E1E33] border border-[#17283A] flex items-center justify-center text-xs font-bold text-white shrink-0 cursor-default"
              title={`${userName} (${userEmail})`}
            >
              {userName.charAt(0)}
            </div>
          </div>
        )}

        {/* Collapse toggle button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          className={cn(
            'flex items-center gap-2.5 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#0E1E33] transition-colors cursor-pointer w-full',
            isCollapsed ? 'w-10 h-10 mx-auto justify-center p-0' : 'px-3 py-1.5 text-[12.5px] font-medium'
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
  settingsHref,
  pathname,
  search,
  userName,
  userEmail,
  onLogout,
  activeNavLayoutId,
}: MobileDrawerProps) {
  if (!isOpen) return null;

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
        className="absolute inset-y-0 left-0 w-4/5 max-w-xs bg-[#061222] text-white flex flex-col justify-between p-5 border-r border-[#17283A] shadow-2xl z-10"
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#17283A]/80">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <img
                src="/logo_Dark.png"
                alt="PropertyLedge Logo"
                className="h-6 w-auto object-contain shrink-0"
              />
              <span className="font-heading font-bold text-base tracking-tight text-white truncate">PropertyLedge</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#7F8B99] hover:text-white hover:bg-[#0E1E33] transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-220px)] no-scrollbar">
            {navSections.map((section, sIdx) => (
              <div key={section.label || `mobile-sec-${sIdx}`} className="space-y-0.5">
                {section.label && (
                  <p className="text-[10px] font-semibold text-[#7F8B99] uppercase tracking-[0.10em] px-3 mb-1 flex items-center gap-1.5">
                    {section.label}
                  </p>
                )}
                {section.items.map((item) => (
                  <TreeNavItem
                    key={item.label}
                    item={item}
                    pathname={pathname}
                    search={search}
                    homeHref={homeHref}
                    isCollapsed={false}
                    onNavigate={onClose}
                    layoutId={activeNavLayoutId}
                  />
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className="pt-3 border-t border-[#17283A]/80 space-y-3">
          {footerLink && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                window.location.href = footerLink.href;
              }}
              className="w-full h-9 px-3 rounded-xl bg-[#071526] border border-[#17283A] hover:bg-[#0E1E33] text-[#94A3B8] text-[11px] font-semibold flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2">
                <footerLink.icon className="w-3.5 h-3.5" />
                {footerLink.label}
              </span>
              <ArrowUpRight className="w-3 h-3 text-[#7F8B99]" />
            </motion.button>
          )}
          {settingsHref && (
            <Link
              href={settingsHref}
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#94A3B8] hover:text-white hover:bg-[#0E1E33]"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#0E1E33] border border-[#17283A] flex items-center justify-center text-xs font-bold text-white shrink-0">
                {userName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{userName}</p>
                <p className="text-[10px] text-[#7F8B99] truncate">{userEmail}</p>
              </div>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onLogout}
              className="p-1.5 rounded-lg text-[#7F8B99] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
      className="app-shell-root h-screen w-full min-w-0 overflow-hidden bg-[#F4F5F7] dark:bg-[#030914] text-slate-800 dark:text-admin-foreground flex flex-row font-sans antialiased p-0 md:p-3.5 gap-0 md:gap-3.5 selection:bg-admin-foreground/10 selection:text-admin-foreground"
      style={{ '--shell-navbar-height': `${SHELL_NAVBAR_HEIGHT}px` } as React.CSSProperties}
    >
      {/* Floating Sidebar on the left */}
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

      {/* Right side: Workspace canvas blending seamlessly with shell */}
      <div className="app-workspace relative flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden bg-transparent rounded-none md:rounded-[24px] max-w-full">
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

        <main className="flex h-full w-full flex-1 flex-col min-w-0 min-h-0 overflow-hidden overflow-x-hidden">
          {children}
        </main>
        <div id="workspace-drawer-root" className="absolute inset-0 z-40 pointer-events-none [&>*]:pointer-events-auto" />
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
