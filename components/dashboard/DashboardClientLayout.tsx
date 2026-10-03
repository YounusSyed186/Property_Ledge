'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  SquaresFour,
  Buildings,
  Users,
  FileText,
  CurrencyDollar,
  Receipt,
  CreditCard,
  Wallet,
  Wrench,
  ClipboardText,
  FolderSimple,
  CheckSquare,
  ChartBar,
  Gear,
  UserPlus,
  ShieldCheck,
  DotsThree,
  ArrowRight,
  Lightning,
  CalendarBlank,
  Calculator,
} from '@phosphor-icons/react';
import { AppShell } from '@/components/shell/AppShell';
import { AppContextProvider } from '@/components/context/AppContextProvider';
import { WorkspaceCookieSync } from '@/components/workspace/WorkspaceCookieSync';
import { QuickActionsMenu } from '@/components/shell/QuickActionsMenu';
import { MobileBottomNav } from '@/components/shell/MobileBottomNav';
import { MobileContextMenu, ShellContextBreadcrumb } from '@/components/shell/ShellContextBreadcrumb';
import type { CommandMenuLink, NavSection } from '@/components/shell/types';
import type { Persona } from '@/lib/auth/resolvePersona';
import { canAccessNavItem, type NavItemId } from '@/lib/auth/permissions';

interface NavSubItemConfig {
  id: NavItemId;
  label: string;
  href: string;
  exact?: boolean;
  comingSoon?: boolean;
  badge?: string | number;
  badgeVariant?: 'default' | 'orange' | 'green' | 'teal';
}

interface NavItemConfig {
  id?: NavItemId;
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  comingSoon?: boolean;
  badge?: string | number;
  badgeVariant?: 'default' | 'orange' | 'green' | 'teal';
  children?: NavSubItemConfig[];
}

const HIERARCHICAL_NAV: NavItemConfig[] = [
  {
    id: 'home',
    label: 'Dashboard',
    href: '/dashboard',
    icon: SquaresFour,
    exact: true,
  },
  {
    id: 'portfolio',
    label: 'Properties',
    icon: Buildings,
    children: [
      { id: 'portfolio', label: 'Overview', href: '/dashboard/properties', exact: true },
      { id: 'people', label: 'Tenants', href: '/dashboard/people' },
      { id: 'leases', label: 'Leases', href: '/dashboard/leases' },
      { id: 'condition-reports', label: 'Condition Reports', href: '/dashboard/condition-reports' },
    ],
  },
  {
    id: 'finances',
    label: 'Finance',
    icon: CurrencyDollar,
    children: [
      { id: 'money', label: 'Overview', href: '/dashboard/money', exact: true },
      { id: 'expenses', label: 'Expenses', href: '/dashboard/expenses' },
      { id: 'invoices', label: 'Invoices', href: '/dashboard/invoices' },
      { id: 'finances', label: 'Payment Schedules', href: '/dashboard/schedules' },
      { id: 'bas', label: 'BAS Statement', href: '/dashboard/bas' },
    ],
  },
  {
    id: 'tasks',
    label: 'Operations',
    icon: ClipboardText,
    children: [
      { id: 'documents', label: 'Documents', href: '/dashboard/documents' },
      { id: 'automations', label: 'Automations', href: '/dashboard/automations' },
      { id: 'tasks', label: 'Tasks', href: '/dashboard/tasks' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/dashboard/reports',
    icon: ChartBar,
  },
];

function buildNavSections(persona: Persona, permissions: string[] = []): NavSection[] {
  const items = HIERARCHICAL_NAV.map((item) => {
    // If the item has children, filter children by permission
    if (item.children) {
      const allowedChildren = item.children.filter((child) =>
        canAccessNavItem(persona, child.id, permissions)
      );
      if (allowedChildren.length === 0) return null;
      return {
        ...item,
        children: allowedChildren,
      };
    }

    // Direct item check
    if (item.id && !canAccessNavItem(persona, item.id, permissions)) {
      return null;
    }

    return item;
  }).filter((item): item is NavItemConfig => item !== null);

  const sections: NavSection[] = [
    {
      items,
    },
  ];

  if (canAccessNavItem(persona, 'team', permissions)) {
    const teamChildren = [
      { label: 'Team', href: '/dashboard/team', exact: true },
    ];
    if (permissions.includes('team.role.view')) {
      teamChildren.push({ label: 'Roles & Permissions', href: '/dashboard/team/roles', exact: true });
    }
    sections[0].items.push({
      label: 'Team',
      icon: UserPlus,
      children: teamChildren,
    });
  }

  if (canAccessNavItem(persona, 'settings', permissions)) {
    sections[0].items.push({
      label: 'Settings',
      href: '/dashboard/settings',
      icon: Gear,
    });
  }

  return sections;
}

const MOBILE_NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: SquaresFour },
  { label: 'Properties', href: '/dashboard/properties', icon: Buildings },
  { label: 'Transactions', href: '/dashboard/money', icon: CurrencyDollar },
  { label: 'More', href: '/dashboard/leases', icon: DotsThree },
];

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { authClient } from '@/modules/auth';
import type { AccessibleWorkspace } from '@/lib/stores/useWorkspaceStore';

import type { UserPropertyAccess } from '@/lib/properties/queries';

interface DashboardClientLayoutProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
  userAvatarUrl?: string;
  persona?: Persona;
  workspaceId?: string | null;
  workspaceName?: string | null;
  roleName?: string | null;
  permissions?: string[];
  entitlements?: import('@/types/subscriptions').EntitlementMap;
  workspaces?: AccessibleWorkspace[];
  initialProperties?: UserPropertyAccess[];
  isOnboardingPending?: boolean;
}

function DashboardShellInner({
  children,
  userEmail,
  userName,
  userAvatarUrl,
  persona = 'owner',
  permissions = [],
  isOnboardingPending: initialIsOnboardingPending = false,
}: DashboardClientLayoutProps) {
  const router = useRouter();
  const [isOnboardingPending] = useState(initialIsOnboardingPending);

  const navSections = buildNavSections(persona, permissions);
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

  return (
    <AppShell
      variant="dashboard"
      homeHref="/dashboard"
      navSections={navSections}
      userEmail={userEmail}
      userName={userName}
      userAvatarUrl={userAvatarUrl}
      persona={persona}
      loadingMessage="Loading dashboard..."
      activeNavLayoutId="dashboard-active-nav-pill"
      commandMenuFooter="PropertyLedge V4 Dashboard"
      commandMenuLinks={commandMenuLinks}
      useGlobalSearch
      settingsHref="/dashboard/settings"
      navbarContext={<ShellContextBreadcrumb onCreateProperty={() => router.push('/dashboard/properties?new=true')} />}
      mobileContextMenu={<MobileContextMenu onCreateProperty={() => router.push('/dashboard/properties?new=true')} />}
      headerExtras={
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isOnboardingPending && (
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 rounded-md border border-[#C7A66A]/40 bg-[#C7A66A]/15 px-2 sm:px-2.5 py-1 text-[11px] font-bold text-[#C7A66A] hover:bg-[#C7A66A]/25 transition-all shadow-sm"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C7A66A] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#C7A66A]"></span>
              </span>
              <span className="hidden sm:inline">Continue Setup</span>
              <span className="sm:hidden">Setup</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
          <QuickActionsMenu persona={persona} />
        </div>
      }
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
  userAvatarUrl,
  persona = 'owner',
  workspaceId = null,
  workspaceName = null,
  roleName = null,
  permissions = [],
  entitlements = {},
  workspaces = [],
  initialProperties,
  isOnboardingPending = false,
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
      initialProperties={initialProperties}
    >
      <DashboardShellInner
        userEmail={userEmail}
        userName={userName}
        userAvatarUrl={userAvatarUrl}
        persona={persona}
        permissions={permissions}
        isOnboardingPending={isOnboardingPending}
      >
        <WorkspaceCookieSync workspaceId={workspaceId} />
        {children}
      </DashboardShellInner>
    </AppContextProvider>
  );
}

