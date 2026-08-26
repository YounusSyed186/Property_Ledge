'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  DollarSign,
  Receipt,
  CreditCard,
  Wallet,
  Wrench,
  ClipboardCheck,
  FolderOpen,
  CheckSquare,
  BarChart3,
  Settings,
  UserPlus,
  MoreHorizontal,
} from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { AppContextProvider } from '@/components/context/AppContextProvider';
import { QuickActionsMenu } from '@/components/shell/QuickActionsMenu';
import { MobileBottomNav } from '@/components/shell/MobileBottomNav';
import { MobileContextMenu, ShellContextBreadcrumb } from '@/components/shell/ShellContextBreadcrumb';
import type { CommandMenuLink, NavSection } from '@/components/shell/types';
import type { Persona } from '@/lib/auth/resolvePersona';
import { canAccessNavItem, type NavItemId } from '@/lib/auth/permissions';

interface NavItemConfig {
  id: NavItemId;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_GROUPS: { label: string; items: NavItemConfig[] }[] = [
  {
    label: 'Home',
    items: [
      { id: 'home', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { id: 'portfolio', label: 'Properties', href: '/dashboard/properties', icon: Building2 },
    ],
  },
  {
    label: 'People',
    items: [
      { id: 'people', label: 'Tenants', href: '/dashboard/people', icon: Users },
      { id: 'leases', label: 'Leases', href: '/dashboard/leases', icon: FileText },
    ],
  },
  {
    label: 'Finance',
    items: [
      { id: 'finances', label: 'Finances', href: '/dashboard/money', icon: DollarSign },
      { id: 'invoices', label: 'Invoices', href: '/dashboard/money?tab=invoices', icon: Receipt },
      { id: 'payments', label: 'Payments', href: '/dashboard/money?tab=payments', icon: CreditCard },
      { id: 'expenses', label: 'Expenses', href: '/dashboard/money?tab=expenses', icon: Wallet },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'maintenance', label: 'Maintenance', href: '/dashboard/maintenance', icon: Wrench },
      { id: 'inspections', label: 'Inspections', href: '/dashboard/inspections', icon: ClipboardCheck },
      { id: 'documents', label: 'Documents', href: '/dashboard/documents', icon: FolderOpen },
      { id: 'tasks', label: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
    ],
  },
  {
    label: 'Insights',
    items: [
      { id: 'reports', label: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
    ],
  },
];

function buildNavSections(persona: Persona): NavSection[] {
  const sections: NavSection[] = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items
      .filter((item) => canAccessNavItem(persona, item.id))
      .map(({ label, href, icon }) => ({ label, href, icon })),
  })).filter((s) => s.items.length > 0);

  if (canAccessNavItem(persona, 'team')) {
    sections.push({
      label: 'Team',
      items: [{ label: 'Team', href: '/dashboard/team', icon: UserPlus }],
    });
  }

  if (canAccessNavItem(persona, 'settings')) {
    sections.push({
      label: 'System',
      items: [{ label: 'Settings', href: '/dashboard/settings', icon: Settings }],
    });
  }

  return sections;
}

const MOBILE_NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Properties', href: '/dashboard/properties', icon: Building2 },
  { label: 'Finances', href: '/dashboard/money', icon: DollarSign },
  { label: 'More', href: '/dashboard/leases', icon: MoreHorizontal },
];

interface DashboardClientLayoutProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
  persona?: Persona;
  workspaceId?: string | null;
}

function DashboardShellInner({ children, userEmail, userName, persona = 'owner' }: DashboardClientLayoutProps) {
  const router = useRouter();
  const navSections = buildNavSections(persona);
  const commandMenuLinks: CommandMenuLink[] = navSections.flatMap((s) =>
    s.items.map((item) => ({ label: item.label, href: item.href, icon: item.icon }))
  );

  return (
    <AppShell
      variant="dashboard"
      homeHref="/dashboard"
      navSections={navSections}
      userEmail={userEmail}
      userName={userName}
      persona={persona}
      loadingMessage="Loading dashboard..."
      activeNavLayoutId="dashboard-active-nav-pill"
      commandMenuFooter="PropertyLedge V3 Dashboard"
      commandMenuLinks={commandMenuLinks}
      useGlobalSearch
      settingsHref="/dashboard/settings"
      navbarContext={<ShellContextBreadcrumb onCreateProperty={() => router.push('/dashboard/properties/new')} />}
      mobileContextMenu={<MobileContextMenu onCreateProperty={() => router.push('/dashboard/properties/new')} />}
      headerExtras={<QuickActionsMenu persona={persona} />}
      mobileBottomNav={<MobileBottomNav items={MOBILE_NAV_ITEMS} />}
    >
      {children}
    </AppShell>
  );
}

export function DashboardClientLayout({
  children,
  userEmail,
  userName,
  persona = 'owner',
  workspaceId = null,
}: DashboardClientLayoutProps) {
  return (
    <AppContextProvider persona={persona} workspaceId={workspaceId}>
      <DashboardShellInner userEmail={userEmail} userName={userName} persona={persona}>
        {children}
      </DashboardShellInner>
    </AppContextProvider>
  );
}
