'use client';

import React from 'react';
import {
  Home,
  CreditCard,
  Wrench,
  FolderOpen,
  Bell,
  User,
} from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { MobileBottomNav } from '@/components/shell/MobileBottomNav';
import type { CommandMenuLink, NavSection } from '@/components/shell/types';

const mobileNavItems = [
  { label: 'Home', href: '/tenant', icon: Home },
  { label: 'Rent', href: '/tenant/rent', icon: CreditCard },
  { label: 'Maintenance', href: '/tenant/maintenance', icon: Wrench },
  { label: 'Docs', href: '/tenant/documents', icon: FolderOpen },
  { label: 'Profile', href: '/tenant/profile', icon: User },
];

const navSections: NavSection[] = [
  {
    label: 'Tenant Portal',
    items: [
      { label: 'Home', href: '/tenant', icon: Home },
      { label: 'Rent', href: '/tenant/rent', icon: CreditCard },
      { label: 'Maintenance', href: '/tenant/maintenance', icon: Wrench },
      { label: 'Documents', href: '/tenant/documents', icon: FolderOpen },
      { label: 'Notifications', href: '/tenant/notifications', icon: Bell },
    ],
  },
  {
    label: 'Account',
    items: [{ label: 'Profile', href: '/tenant/profile', icon: User }],
  },
];

const commandMenuLinks: CommandMenuLink[] = navSections.flatMap((s) =>
  s.items.map((item) => ({ label: item.label, href: item.href, icon: item.icon }))
);

interface TenantClientLayoutProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
  propertyName?: string;
}

export function TenantClientLayout({
  children,
  userEmail,
  userName,
  propertyName,
}: TenantClientLayoutProps) {
  return (
    <AppShell
      variant="dashboard"
      homeHref="/tenant"
      navSections={navSections}
      userEmail={userEmail}
      userName={userName}
      persona="tenant"
      loadingMessage="Loading tenant portal..."
      activeNavLayoutId="tenant-active-nav-pill"
      commandMenuFooter="PropertyLedge Tenant Portal"
      commandMenuLinks={commandMenuLinks}
      settingsHref="/tenant/profile"
      showWorkspaceSettings={false}
      showBilling={false}
      navbarContext={
        propertyName ? (
          <span className="hidden items-center gap-1.5 md:flex">
            <span className="text-admin-sidebar-muted/40 text-sm">/</span>
            <span className="max-w-[180px] truncate text-sm text-admin-sidebar-muted">{propertyName}</span>
          </span>
        ) : undefined
      }
    >
      <div className="pb-16 md:pb-0">{children}</div>
      <MobileBottomNav items={mobileNavItems} />
    </AppShell>
  );
}
