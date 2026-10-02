'use client';

import React from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  Layers,
  Home,
  FileText,
  DollarSign,
  Wrench,
  ClipboardCheck,
  FolderOpen,
  CheckSquare,
  BarChart3,
  Shield,
} from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import type { CommandMenuLink, NavSection } from '@/components/shell/types';

const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', href: '/admin', icon: LayoutDashboard }],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
      { label: 'Payments', href: '/admin/payments', icon: Receipt },
      { label: 'Activity', href: '/admin/activity', icon: BarChart3 },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Plans', href: '/admin/plans', icon: Layers },
      { label: 'Entitlements', href: '/admin/entitlements', icon: Shield },
      { label: 'Platform Roles', href: '/admin/platform-roles', icon: Shield },
      { label: 'Team Roles', href: '/admin/team-roles', icon: Users },
      { label: 'Billing Events', href: '/admin/billing-events', icon: Receipt },
      { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
    ],
  },
];

const commandMenuLinks: CommandMenuLink[] = navSections.flatMap((s) =>
  s.items.flatMap((item) => {
    const links: CommandMenuLink[] = [];
    if (item.href) {
      links.push({ label: item.label, href: item.href, icon: item.icon });
    }
    if (item.children) {
      item.children.forEach((child) => {
        links.push({ label: `${item.label} › ${child.label}`, href: child.href, icon: item.icon });
      });
    }
    return links;
  })
);

interface AdminClientLayoutProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
}

export function AdminClientLayout({
  children,
  userEmail = 'admin@propertyledge.com.au',
  userName = 'PropertyLedge Admin',
}: AdminClientLayoutProps) {
  return (
    <AppShell
      variant="admin"
      homeHref="/admin"
      brandBadge="Admin"
      navSections={navSections}
      userEmail={userEmail}
      userName={userName}
      loadingMessage="Verifying Administrator Authorization..."
      activeNavLayoutId="admin-active-nav-pill"
      commandMenuFooter="PropertyLedge V3 Admin"
      commandMenuLinks={commandMenuLinks}
      settingsHref="/admin"
      showWorkspaceSettings={false}
      showBilling={false}
      footerLink={{ label: 'Landlord Dashboard', href: '/dashboard', icon: Home }}
    >
      {children}
    </AppShell>
  );
}
