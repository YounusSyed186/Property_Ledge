'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Shield, CreditCard, Layers, Key, History, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
    { name: 'Plans', href: '/admin/plans', icon: Layers },
    { name: 'Entitlements', href: '/admin/entitlements', icon: Key },
    { name: 'Billing Events', href: '/admin/billing-events', icon: History },
  ];

  return (
    <aside className="hidden md:flex flex-col justify-between shrink-0 w-64 p-4 bg-admin-sidebar text-admin-sidebar-foreground border-r border-admin-sidebar-border transition-all duration-300">
      <div>
        <div className="flex items-center gap-3 px-3 py-4 border-b border-admin-sidebar-border mb-6">
          <div className="w-9 h-9 rounded-lg bg-admin-primary/15 border border-admin-primary/30 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-admin-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold font-heading text-white truncate">PropertyLedge Admin</h2>
            <p className="text-metadata text-admin-sidebar-muted">Platform Management</p>
          </div>
        </div>

        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex items-center gap-2.5 h-10 px-3 rounded-lg text-[13px] font-medium transition-all duration-200 group',
                  isActive
                    ? 'bg-admin-primary-soft text-admin-primary font-semibold'
                    : 'text-admin-sidebar-muted hover:text-admin-sidebar-foreground hover:bg-white/[0.04]'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-admin-primary" aria-hidden="true" />
                )}
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    isActive ? 'text-admin-primary' : 'text-admin-sidebar-muted group-hover:text-admin-sidebar-foreground'
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-3 border-t border-admin-sidebar-border">
        <Link
          href="/subscription"
          className="flex items-center gap-2 text-caption font-semibold text-admin-sidebar-muted hover:text-white hover:bg-white/[0.04] transition-colors px-3 py-2 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" /> Back to App
        </Link>
      </div>
    </aside>
  );
}