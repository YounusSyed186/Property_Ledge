'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
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
  ChevronRight,
  Menu,
  X,
  ArrowUpRight,
} from 'lucide-react';
import { CommandMenu } from '@/components/admin/CommandMenu';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { createClient } from '@/lib/supabase/client';

interface AdminClientLayoutProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
}

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

  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Payments', href: '/admin/payments', icon: Receipt },
    { label: 'Plans', href: '/admin/plans', icon: Layers },
    { label: 'Activity', href: '/admin/billing-events', icon: Activity },
  ];

  const getPageTitle = () => {
    if (pathname === '/admin') return 'Admin Overview';
    if (pathname.startsWith('/admin/subscriptions')) return 'Subscription Portal';
    if (pathname.startsWith('/admin/users')) return 'User Directory';
    if (pathname.startsWith('/admin/payments')) return 'Payments Ledger';
    if (pathname.startsWith('/admin/plans')) return 'Plans & Pricing';
    if (pathname.startsWith('/admin/billing-events')) return 'Audit Trail & Events';
    if (pathname.startsWith('/admin/entitlements')) return 'Entitlements Control';
    return 'Admin Panel';
  };

  const getPageSubtitle = () => {
    if (pathname === '/admin') return 'Real-time metrics, subscription queues, and system overview.';
    if (pathname.startsWith('/admin/subscriptions')) return 'Evaluate billing lifecycle and payments verification queue.';
    if (pathname.startsWith('/admin/users')) return 'Inspect property managers, landlord accounts, and customer details.';
    if (pathname.startsWith('/admin/payments')) return 'Audit invoices, transaction logs, and manual bank transfers.';
    if (pathname.startsWith('/admin/plans')) return 'Configure platform subscription tiers, pricing, and features.';
    if (pathname.startsWith('/admin/billing-events')) return 'Real-time immutable audit trail and security event logs.';
    return 'System diagnostics, environment status, and database maintenance.';
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-admin-sidebar flex items-center justify-center text-admin-sidebar-foreground font-sans text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-admin-success border-t-transparent animate-spin" />
          <span className="text-admin-sidebar-muted font-medium">Verifying Administrator Authorization...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-admin-background text-admin-foreground flex flex-col md:flex-row overflow-hidden font-sans antialiased selection:bg-admin-primary/20 selection:text-admin-primary">
      {/* INTEGRATED DESKTOP SIDEBAR */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 bg-admin-sidebar text-admin-sidebar-foreground border-r border-admin-sidebar-border transition-all duration-300 z-30 ${
          isSidebarCollapsed ? 'w-[72px] p-3.5' : 'w-60 p-4'
        }`}
      >
        <div className="space-y-5">
          {/* Brand Logo & Collapse Toggle */}
          <div className="flex items-center justify-between gap-2 pb-1">
            <Link href="/admin" className="flex items-center gap-2.5 group min-w-0">
              <div className="w-8 h-8 rounded-lg bg-admin-success/15 border border-admin-success/30 flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
                <span className="text-admin-success font-bold text-sm">◆</span>
              </div>
              {!isSidebarCollapsed && (
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <span className="font-heading font-bold text-base tracking-tight text-white group-hover:text-admin-success transition-colors truncate">
                    PropertyLedge
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-admin-success bg-admin-success/10 border border-admin-success/20 px-1 py-0.5 rounded shrink-0">
                    Admin
                  </span>
                </div>
              )}
            </Link>

            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1 rounded-md text-admin-sidebar-muted hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>

          {/* Quick Search Trigger */}
          {!isSidebarCollapsed ? (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full bg-admin-sidebar-surface/60 hover:bg-admin-sidebar-surface border border-admin-sidebar-border hover:border-admin-sidebar-border-subtle rounded-lg px-2.5 py-1.5 flex items-center justify-between text-xs text-admin-sidebar-muted hover:text-white transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-admin-sidebar-muted" />
                <span className="text-[11px]">Quick search...</span>
              </span>
              <kbd className="text-[9px] font-mono font-medium text-admin-sidebar-muted bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 rounded">⌘K</kbd>
            </button>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex justify-center p-2 rounded-lg text-admin-sidebar-muted hover:text-white hover:bg-admin-sidebar-surface transition-colors"
              title="Search (⌘K)"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Nav Items */}
          <nav className="space-y-4 pt-1">
            <div>
              {!isSidebarCollapsed && (
                <p className="text-[9px] font-mono font-bold text-admin-sidebar-muted/70 uppercase tracking-widest px-2.5 mb-1.5">Main</p>
              )}
              <div className="space-y-0.5">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group ${
                        isActive
                          ? 'bg-admin-sidebar-surface text-white border-l-2 border-admin-success font-semibold shadow-xs'
                          : 'text-admin-sidebar-muted hover:text-white hover:bg-white/[0.04]'
                      } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
                    >
                      <item.icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-admin-success' : 'text-admin-sidebar-muted group-hover:text-white'}`} />
                      {!isSidebarCollapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div>
              {!isSidebarCollapsed && (
                <p className="text-[9px] font-mono font-bold text-admin-sidebar-muted/70 uppercase tracking-widest px-2.5 mb-1.5">Config</p>
              )}
              <div className="space-y-0.5">
                <Link
                  href="/admin/entitlements"
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group ${
                    pathname === '/admin/entitlements'
                      ? 'bg-admin-sidebar-surface text-white border-l-2 border-admin-success font-semibold shadow-xs'
                      : 'text-admin-sidebar-muted hover:text-white hover:bg-white/[0.04]'
                  } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <Settings className={`w-4 h-4 shrink-0 transition-transform ${pathname === '/admin/entitlements' ? 'text-admin-success' : 'text-admin-sidebar-muted group-hover:text-white'}`} />
                  {!isSidebarCollapsed && <span>Entitlements</span>}
                </Link>
              </div>
            </div>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-3 border-t border-admin-sidebar-border space-y-3">
          {!isSidebarCollapsed && (
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="w-full py-1.5 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-admin-sidebar-muted hover:text-white text-[10px] font-semibold flex items-center justify-between transition-all"
            >
              <span>Open Landlord Dashboard</span>
              <ArrowUpRight className="w-3 h-3 text-admin-primary" />
            </button>
          )}

          <div className={`flex items-center gap-2.5 justify-between ${isSidebarCollapsed ? 'flex-col gap-3' : ''}`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-admin-primary/20 border border-admin-primary/40 flex items-center justify-center text-xs font-bold text-admin-primary shrink-0">
                {userName.charAt(0)}
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{userName}</p>
                  <p className="text-[9px] text-admin-sidebar-muted truncate font-mono">{userEmail}</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-md text-admin-sidebar-muted hover:text-admin-danger hover:bg-white/[0.04] transition-colors shrink-0"
              title="Log out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-admin-sidebar-border bg-admin-sidebar text-white shrink-0 z-30">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-admin-success/15 border border-admin-success/30 flex items-center justify-center">
            <span className="text-admin-success font-bold text-xs">◆</span>
          </div>
          <span className="font-heading font-bold text-sm tracking-tight text-white">PropertyLedge Admin</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg border border-white/[0.1] text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-admin-sidebar text-white h-full flex flex-col justify-between p-5 border-r border-admin-sidebar-border z-10 shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-admin-sidebar-border">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-admin-success/15 border border-admin-success/30 flex items-center justify-center">
                    <span className="text-admin-success font-bold text-xs">◆</span>
                  </div>
                  <span className="font-heading font-bold text-base tracking-tight text-white">PropertyLedge</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-white/50 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-admin-sidebar-surface text-white border-l-2 border-admin-success font-semibold'
                          : 'text-admin-sidebar-muted hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <item.icon className={`w-4 h-4 ${isActive ? 'text-admin-success' : 'text-admin-sidebar-muted'}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* MAIN APPLICATION FRAME */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-admin-background relative z-10">
        <header className="bg-admin-surface/80 backdrop-blur-md border-b border-admin-border px-5 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 shrink-0 z-20 transition-colors">
          <div className="space-y-0.5 text-left min-w-0">
            <h1 className="text-lg sm:text-xl font-bold font-heading text-admin-foreground tracking-tight truncate">
              {getPageTitle()}
            </h1>
            <p className="text-[11px] text-admin-muted truncate hidden sm:block">
              {getPageSubtitle()}
            </p>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="hidden lg:flex items-center gap-1.5 bg-admin-surface border border-admin-border px-2.5 py-1 rounded-md text-[10px] font-mono text-admin-muted font-medium shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-admin-success animate-pulse" />
              <span>Production Hub</span>
            </div>

            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="w-8 h-8 rounded-lg bg-admin-surface hover:bg-admin-surface-elevated border border-admin-border flex items-center justify-center text-admin-muted hover:text-admin-foreground shadow-xs transition-colors"
              title="Search (⌘K)"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            <button
              className="w-8 h-8 rounded-lg bg-admin-surface hover:bg-admin-surface-elevated border border-admin-border flex items-center justify-center text-admin-muted hover:text-admin-foreground shadow-xs transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-admin-success" />
            </button>

            <ThemeToggle />

            <div className="w-8 h-8 rounded-full bg-admin-primary/15 border border-admin-primary/30 text-admin-primary flex items-center justify-center text-xs font-bold font-heading shadow-xs">
              {userName.charAt(0)}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 flex flex-col min-w-0">
          <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col">
            {children}
          </div>
        </main>
      </div>

      <CommandMenu isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
