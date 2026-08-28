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
  Shield,
  MoreHorizontal,
} from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { AppContextProvider } from '@/components/context/AppContextProvider';
import { WorkspaceCookieSync } from '@/components/workspace/WorkspaceCookieSync';
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
  exact?: boolean;
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

function buildNavSections(persona: Persona, permissions: string[] = []): NavSection[] {
  const sections: NavSection[] = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items
      .filter((item) => canAccessNavItem(persona, item.id, permissions))
      .map(({ label, href, icon, exact }) => ({ label, href, icon, exact })),
  })).filter((s) => s.items.length > 0);

  if (canAccessNavItem(persona, 'team', permissions)) {
    const teamItems = [{ label: 'Team', href: '/dashboard/team', icon: UserPlus, exact: true }];
    if (permissions.includes('team.role.view')) {
      teamItems.push({ label: 'Team roles', href: '/dashboard/team/roles', icon: Shield, exact: true });
    }
    sections.push({
      label: 'Team',
      items: teamItems,
    });
  }

  if (canAccessNavItem(persona, 'settings', permissions)) {
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

import type { AccessibleWorkspace } from '@/lib/stores/useWorkspaceStore';

interface DashboardClientLayoutProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
  persona?: Persona;
  workspaceId?: string | null;
  workspaceName?: string | null;
  roleName?: string | null;
  permissions?: string[];
  entitlements?: import('@/types/subscriptions').EntitlementMap;
  workspaces?: AccessibleWorkspace[];
}

function DashboardShellInner({
  children,
  userEmail,
  userName,
  persona = 'owner',
  permissions = [],
}: DashboardClientLayoutProps) {
  const router = useRouter();
  const navSections = buildNavSections(persona, permissions);
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
  workspaceName = null,
  roleName = null,
  permissions = [],
  entitlements = {},
  workspaces = [],
}: DashboardClientLayoutProps) {
  return (
    <AppContextProvider
      persona={persona}
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      roleName={roleName}
      permissions={permissions}
      entitlements={entitlements}
      workspaces={workspaces}
    >
      <DashboardShellInner
        userEmail={userEmail}
        userName={userName}
        persona={persona}
        permissions={permissions}
      >
        <WorkspaceCookieSync workspaceId={workspaceId} />
        {children}
      </DashboardShellInner>
    </AppContextProvider>
  );
}
