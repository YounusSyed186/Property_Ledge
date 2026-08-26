'use client';

import React from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  Layers,
  Home,
  Building2,
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
      { label: 'Workspaces', href: '/admin/workspaces', icon: Building2 },
      { label: 'Properties', href: '/admin/properties', icon: Home },
      { label: 'Activity', href: '/admin/activity', icon: BarChart3 },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Plans', href: '/admin/plans', icon: Layers },
      { label: 'Entitlements', href: '/admin/entitlements', icon: Shield },
      { label: 'Billing Events', href: '/admin/billing-events', icon: Receipt },
      { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
    ],
  },
];

const commandMenuLinks: CommandMenuLink[] = navSections.flatMap((s) =>
  s.items.map((item) => ({ label: item.label, href: item.href, icon: item.icon }))
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
