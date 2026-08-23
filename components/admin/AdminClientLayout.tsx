'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  Layers,
  Activity,
  Settings,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  ArrowUpRight,
  KeyRound,
  ShieldCheck,
  Building2,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { CommandMenu } from '@/components/admin/CommandMenu';
import { ThemeSelector } from '@/components/ui/ThemeSelector';
import { createClient } from '@/lib/supabase/client';
import { ToastProvider } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

interface AdminClientLayoutProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
}

/* ============================================================
   NAVIGATION CONFIGURATION
   ============================================================ */

const navSections = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
      { label: 'Payments', href: '/admin/payments', icon: Receipt },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Plans', href: '/admin/plans', icon: Layers },
      { label: 'Entitlements', href: '/admin/entitlements', icon: KeyRound },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Billing Events', href: '/admin/billing-events', icon: Activity },
      { label: 'Audit Logs', href: '/admin/audit-logs', icon: ShieldCheck },
    ],
  },
];

/* ============================================================
   PAGE CONTEXT
   ============================================================ */

function getPageContext(pathname: string) {
  if (pathname === '/admin') return { title: 'Platform Overview', subtitle: 'Real-time metrics, subscription queues, and system health.' };
  if (pathname.startsWith('/admin/subscriptions')) return { title: 'Subscriptions', subtitle: 'Evaluate billing lifecycle and payments verification queue.' };
  if (pathname.startsWith('/admin/users')) return { title: 'Users', subtitle: 'Inspect property managers, landlord accounts, and customer details.' };
  if (pathname.startsWith('/admin/payments')) return { title: 'Payments', subtitle: 'Audit invoices, transaction logs, and manual bank transfers.' };
  if (pathname.startsWith('/admin/plans')) return { title: 'Plans & Pricing', subtitle: 'Configure platform subscription tiers, pricing, and features.' };
  if (pathname.startsWith('/admin/billing-events')) return { title: 'Billing Events', subtitle: 'Real-time immutable audit trail and security event logs.' };
  if (pathname.startsWith('/admin/entitlements')) return { title: 'Entitlements', subtitle: 'Define system capabilities and limits for subscription plans.' };
  if (pathname.startsWith('/admin/audit-logs')) return { title: 'Audit Logs', subtitle: 'Immutable record of all administrative actions across the platform.' };
  return { title: 'Admin Panel', subtitle: 'System diagnostics, environment status, and database maintenance.' };
}

/* ============================================================
   SIDEBAR ITEM
   ============================================================ */

interface SidebarItemProps {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  isCollapsed: boolean;
  onNavigate?: () => void;
}

function SidebarItem({ label, href, icon: Icon, isActive, isCollapsed, onNavigate }: SidebarItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={href} onClick={onNavigate} className="block select-none">
        <motion.div
          whileHover={{ scale: isCollapsed ? 1.08 : 1.02, x: isCollapsed ? 0 : 2 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'relative flex items-center rounded-xl text-[13px] font-medium transition-colors cursor-pointer',
            isActive
              ? 'text-admin-sidebar-active-text font-semibold'
              : 'text-admin-sidebar-muted hover:text-admin-sidebar-foreground hover:bg-admin-sidebar-hover',
            isCollapsed
              ? 'w-10 h-10 mx-auto justify-center p-0'
              : 'gap-2.5 px-3 py-2 h-10'
          )}
          aria-current={isActive ? 'page' : undefined}
        >
          {/* Animated Shared Layout Pill */}
          {isActive && (
            <motion.div
              layoutId="admin-active-nav-pill"
              className="absolute inset-0 bg-admin-sidebar-active-pill border border-admin-sidebar-active-pill-border rounded-xl shadow-xs z-0"
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 34,
              }}
            />
          )}

          {/* Animated Icon */}
          <motion.div
            whileHover={{ scale: 1.12, rotate: isActive ? 0 : -4 }}
            transition={{ type: 'spring', stiffness: 400 }}
            className="relative z-10 shrink-0 flex items-center justify-center"
          >
            <Icon
              className={cn(
                'w-4 h-4 transition-colors',
                isActive ? 'text-admin-sidebar-active-text' : 'text-admin-sidebar-muted group-hover:text-admin-sidebar-foreground'
              )}
            />
          </motion.div>

          {/* Label with AnimatePresence */}
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

      {/* Popout Floating Tooltip for Collapsed Sidebar */}
      <AnimatePresence>
        {isCollapsed && isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, x: 6 }}
            animate={{ opacity: 1, scale: 1, x: 12 }}
            exit={{ opacity: 0, scale: 0.92, x: 6 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-full top-1/2 -translate-y-1/2 z-50 px-2.5 py-1 rounded-lg bg-admin-sidebar-surface text-admin-sidebar-foreground border border-admin-sidebar-border font-medium text-xs shadow-xl whitespace-nowrap pointer-events-none"
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   SIDEBAR
   ============================================================ */

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  pathname: string;
  userName: string;
  userEmail: string;
  onLogout: () => void;
  onNavigate?: () => void;
}

function Sidebar({ isCollapsed, onToggleCollapse, pathname, userName, userEmail, onLogout, onNavigate }: SidebarProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupLabel: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }));
  };

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isCollapsed ? 70 : 256,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 32,
      }}
      className={cn(
        'hidden md:flex flex-col justify-between shrink-0 bg-transparent text-admin-sidebar-foreground z-30 select-none overflow-hidden h-screen max-h-screen',
        isCollapsed ? 'px-2 py-3.5' : 'p-3.5'
      )}
      aria-label="Admin navigation"
    >
      <div className="space-y-4 overflow-y-auto no-scrollbar flex-1 pr-0.5">
        {/* Brand & Collapse Header */}
        <div
          className={cn(
            'flex items-center min-h-[40px]',
            !isCollapsed ? 'justify-between px-1 py-1' : 'justify-center'
          )}
        >
          {!isCollapsed ? (
            <>
              <Link href="/admin" className="flex items-center gap-2.5 group min-w-0" onClick={onNavigate}>
                <motion.div
                  whileHover={{ scale: 1.08, rotate: -3 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-8 h-8 rounded-xl bg-admin-sidebar-surface border border-admin-sidebar-border flex items-center justify-center shrink-0 shadow-xs transition-shadow group-hover:shadow-md"
                >
                  <Building2 className="w-4 h-4 text-admin-sidebar-foreground" />
                </motion.div>

                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <span className="font-heading font-bold text-[14px] tracking-tight text-admin-sidebar-foreground group-hover:text-admin-sidebar-foreground transition-colors truncate">
                    PropertyLedge
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-admin-sidebar-muted bg-admin-sidebar-surface border border-admin-sidebar-border px-1.5 py-0.5 rounded shrink-0">
                    Admin
                  </span>
                </div>
              </Link>

              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCollapse();
                }}
                className="p-1.5 rounded-xl text-admin-sidebar-muted hover:text-admin-sidebar-foreground hover:bg-admin-sidebar-hover transition-colors ml-auto border border-transparent hover:border-admin-sidebar-border"
                title="Collapse Sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </motion.button>
            </>
          ) : (
            <motion.button
              type="button"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse();
              }}
              className="relative group p-1.5 rounded-xl flex items-center justify-center border border-admin-sidebar-border bg-admin-sidebar-surface hover:bg-admin-sidebar-hover transition-all shadow-xs"
              title="Expand Sidebar"
              aria-label="Expand sidebar"
            >
              <div className="w-6 h-6 flex items-center justify-center relative">
                 <Building2 className="w-4 h-4 text-admin-sidebar-foreground transition-opacity group-hover:opacity-0" />
                <PanelLeftOpen className="w-4 h-4 absolute opacity-0 group-hover:opacity-100 transition-opacity text-admin-sidebar-foreground" />
              </div>
            </motion.button>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="space-y-3 pt-1">
          {navSections.map((section) => {
            const isGroupCollapsed = !!collapsedGroups[section.label];

            return (
              <div key={section.label} className="space-y-1">
                {!isCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(section.label)}
                    className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold text-admin-sidebar-muted hover:text-admin-sidebar-foreground uppercase tracking-widest font-heading transition-colors group/header"
                  >
                    <span>{section.label}</span>
                    <motion.div
                      animate={{ rotate: isGroupCollapsed ? -90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
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
                      {section.items.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                        return (
                          <SidebarItem
                            key={item.href}
                            label={item.label}
                            href={item.href}
                            icon={item.icon}
                            isActive={isActive}
                            isCollapsed={isCollapsed}
                            onNavigate={onNavigate}
                          />
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className={cn('pt-3 border-t border-admin-sidebar-border mt-3 shrink-0', isCollapsed ? 'px-1' : '')}>
        {!isCollapsed && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.02, x: 2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => window.location.href = '/dashboard'}
            className="w-full h-9 px-3 rounded-xl bg-admin-sidebar-surface border border-admin-sidebar-border hover:bg-admin-sidebar-hover text-admin-sidebar-muted hover:text-admin-sidebar-foreground text-[11px] font-semibold flex items-center justify-between transition-all mb-3 shadow-2xs"
          >
            <span className="flex items-center gap-2">
              <Home className="w-3.5 h-3.5" />
              Landlord Dashboard
            </span>
            <ArrowUpRight className="w-3 h-3 text-admin-sidebar-muted" />
          </motion.button>
        )}

        <div className={cn('flex items-center', isCollapsed ? 'flex-col gap-2.5 justify-center' : 'justify-between gap-2')}>
          <div className="flex items-center gap-2.5 min-w-0">
            <motion.div
              whileHover={{ scale: 1.08 }}
              className="w-8 h-8 rounded-xl bg-admin-sidebar-surface border border-admin-sidebar-border flex items-center justify-center text-xs font-bold text-admin-sidebar-foreground shrink-0 shadow-xs"
            >
              {userName.charAt(0)}
            </motion.div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.15 }}
                  className="min-w-0 leading-tight"
                >
                  <p className="text-xs font-semibold text-admin-sidebar-foreground truncate">{userName}</p>
                  <p className="text-[10px] text-admin-sidebar-muted truncate">{userEmail}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className={cn('flex items-center shrink-0', isCollapsed ? 'flex-col gap-2' : 'gap-1')}>
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onLogout}
              className="p-1.5 rounded-lg text-admin-sidebar-muted hover:text-admin-danger hover:bg-admin-sidebar-hover transition-colors"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

/* ============================================================
   MOBILE DRAWER
   ============================================================ */

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
  userName: string;
  userEmail: string;
  onLogout: () => void;
}

function MobileDrawer({ isOpen, onClose, pathname, userName, userEmail, onLogout }: MobileDrawerProps) {
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
        className="absolute inset-y-0 left-0 w-4/5 max-w-xs bg-admin-sidebar text-admin-sidebar-foreground flex flex-col justify-between p-5 border-r border-admin-sidebar-border shadow-elevation-overlay z-10"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-admin-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-admin-sidebar-surface border border-admin-sidebar-border flex items-center justify-center">
                <Building2 className="w-4 h-4 text-admin-sidebar-foreground" />
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
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                    return (
                      <SidebarItem
                        key={item.href}
                        label={item.label}
                        href={item.href}
                        icon={item.icon}
                        isActive={isActive}
                        isCollapsed={false}
                        onNavigate={onClose}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="pt-3 border-t border-admin-sidebar-border space-y-3">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => window.location.href = '/dashboard'}
            className="w-full h-9 px-3 rounded-xl bg-admin-sidebar-surface border border-admin-sidebar-border hover:bg-admin-sidebar-hover text-admin-sidebar-muted hover:text-admin-sidebar-foreground text-[11px] font-semibold flex items-center justify-between transition-all"
          >
            <span className="flex items-center gap-2">
              <Home className="w-3.5 h-3.5" />
              Landlord Dashboard
            </span>
            <ArrowUpRight className="w-3 h-3 text-admin-sidebar-muted" />
          </motion.button>
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

/* ============================================================
   MAIN LAYOUT
   ============================================================ */

export function AdminClientLayout({ children, userEmail = 'admin@propertyledge.com.au', userName = 'PropertyLedge Admin' }: AdminClientLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle hotkeys (⌘K or Ctrl+K)
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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const pageContext = getPageContext(pathname);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-admin-shell flex items-center justify-center text-admin-sidebar-foreground font-sans text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-admin-sidebar-foreground border-t-transparent animate-spin" />
          <span className="text-admin-sidebar-muted font-medium">Verifying Administrator Authorization...</span>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="h-screen w-screen bg-admin-shell text-admin-foreground flex flex-col md:flex-row overflow-hidden font-sans antialiased selection:bg-admin-foreground/10 selection:text-admin-foreground">
        {/* ============ SIDEBAR ============ */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          pathname={pathname}
          userName={userName}
          userEmail={userEmail}
          onLogout={handleLogout}
        />

        {/* ============ MOBILE TOP BAR ============ */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-admin-sidebar-border bg-admin-sidebar text-admin-sidebar-foreground shrink-0 z-30">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-admin-sidebar-surface border border-admin-sidebar-border flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-admin-sidebar-foreground" />
            </div>
            <span className="font-heading font-bold text-sm tracking-tight text-admin-sidebar-foreground">PropertyLedge Admin</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg border border-admin-sidebar-border text-admin-sidebar-muted hover:text-admin-sidebar-foreground hover:bg-admin-sidebar-hover transition-colors"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>

        {/* ============ MOBILE DRAWER ============ */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <MobileDrawer
              isOpen={mobileMenuOpen}
              onClose={() => setMobileMenuOpen(false)}
              pathname={pathname}
              userName={userName}
              userEmail={userEmail}
              onLogout={handleLogout}
            />
          )}
        </AnimatePresence>

        {/* ============ MAIN WORKSPACE (Inset canvas inside shell) ============ */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden p-2 sm:p-2.5 lg:p-3 lg:pl-1 z-10">
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-admin-surface text-admin-foreground rounded-xl lg:rounded-2xl border border-admin-sidebar-border shadow-md dark:shadow-[0_16px_48px_rgba(0,0,0,0.5)] relative">
            {/* Workspace Header */}
            <header className="bg-admin-surface/80 backdrop-blur-md border-b border-admin-border px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0 z-20 transition-colors">
              <div className="space-y-0.5 text-left min-w-0">
                <h1 className="text-lg sm:text-xl font-bold font-heading text-admin-foreground tracking-tight truncate">
                  {pageContext.title}
                </h1>
                <p className="text-[11px] text-admin-muted truncate hidden sm:block">
                  {pageContext.subtitle}
                </p>
              </div>

              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                <div className="hidden lg:flex items-center gap-1.5 bg-admin-surface border border-admin-border px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-admin-muted font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-admin-success animate-pulse" />
                  <span>Production Hub</span>
                </div>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsSearchOpen(true)}
                  className="w-9 h-9 rounded-xl bg-admin-surface hover:bg-admin-surface-elevated border border-admin-border flex items-center justify-center text-admin-muted hover:text-admin-foreground transition-colors shadow-2xs"
                  title="Search (⌘K)"
                  aria-label="Open search"
                >
                  <Search className="w-4 h-4" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-9 h-9 rounded-xl bg-admin-surface hover:bg-admin-surface-elevated border border-admin-border flex items-center justify-center text-admin-muted hover:text-admin-foreground transition-colors relative shadow-2xs"
                  title="Notifications"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-admin-success" />
                </motion.button>

                <ThemeSelector />

                <motion.div
                  whileHover={{ scale: 1.08 }}
                  className="w-9 h-9 rounded-xl bg-admin-surface-elevated border border-admin-border text-admin-foreground flex items-center justify-center text-xs font-bold font-heading shadow-2xs"
                >
                  {userName.charAt(0)}
                </motion.div>
              </div>
            </header>

            {/* Workspace Content */}
            <main className="flex-1 overflow-y-auto admin-scrollbar p-4 sm:p-6 lg:p-8 flex flex-col min-w-0">
              {children}
            </main>
          </div>
        </div>

        <CommandMenu isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </div>
    </ToastProvider>
  );
}