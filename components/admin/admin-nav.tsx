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
        <div className="flex items-center gap-2.5 px-2 py-3 border-b border-admin-sidebar-border mb-5 w-full">
          <img
            src="/logo_Dark.png"
            alt="PropertyLedge"
            className="h-6 w-auto object-contain shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold font-heading text-white truncate">PropertyLedge Admin</h2>
            <p className="text-[10px] text-admin-sidebar-muted">Platform Management</p>
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
                  'relative flex items-center gap-2.5 h-9 px-3 rounded-lg text-[12px] font-medium transition-all duration-150 group',
                  isActive
                    ? 'bg-[#008F83] text-white font-semibold shadow-xs'
                    : 'text-[#D5DCE3] hover:text-white hover:bg-[#08182A]'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={cn(
                    'w-3.5 h-3.5 shrink-0 transition-colors',
                    isActive ? 'text-white' : 'text-[#D5DCE3] group-hover:text-white'
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