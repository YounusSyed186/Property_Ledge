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

interface NavItemConfig {
  id: NavItemId;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  comingSoon?: boolean;
}

const NAV_GROUPS: { label: string; items: NavItemConfig[] }[] = [
  {
    label: 'Home',
    items: [
      { id: 'home', label: 'Dashboard', href: '/dashboard', icon: SquaresFour },
      { id: 'portfolio', label: 'Properties', href: '/dashboard/properties', icon: Buildings },
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
      { id: 'finances', label: 'Finances', href: '/dashboard/money', icon: CurrencyDollar, comingSoon: true },
      { id: 'invoices', label: 'Invoices', href: '/dashboard/money?tab=invoices', icon: Receipt, comingSoon: true },
      { id: 'payments', label: 'Payments', href: '/dashboard/money?tab=payments', icon: CreditCard, comingSoon: true },
      { id: 'expenses', label: 'Expenses', href: '/dashboard/money?tab=expenses', icon: Wallet, comingSoon: true },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'maintenance', label: 'Maintenance', href: '/dashboard/maintenance', icon: Wrench, comingSoon: true },
      { id: 'inspections', label: 'Inspections', href: '/dashboard/inspections', icon: ClipboardText, comingSoon: true },
      { id: 'documents', label: 'Documents', href: '/dashboard/documents', icon: FolderSimple, comingSoon: true },
      { id: 'tasks', label: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare, comingSoon: true },
    ],
  },
  {
    label: 'Insights',
    items: [
      { id: 'reports', label: 'Reports', href: '/dashboard/reports', icon: ChartBar, comingSoon: true },
    ],
  },
];

function buildNavSections(persona: Persona, permissions: string[] = []): NavSection[] {
  const COMING_SOON_SECTIONS = new Set(['Finance', 'Operations', 'Insights']);

  const sections: NavSection[] = NAV_GROUPS.map((group) => ({
    label: group.label,
    badge: COMING_SOON_SECTIONS.has(group.label) ? 'Coming Soon' : undefined,
    items: group.items
      .filter((item) => canAccessNavItem(persona, item.id, permissions))
      .map(({ label, href, icon, exact, comingSoon }) => ({ label, href, icon, exact, comingSoon })),
  })).filter((s) => s.items.length > 0);

  if (canAccessNavItem(persona, 'team', permissions)) {
    const teamItems = [{ label: 'Team', href: '/dashboard/team', icon: UserPlus, exact: true }];
    if (permissions.includes('team.role.view')) {
      teamItems.push({ label: 'Team roles', href: '/dashboard/team/roles', icon: ShieldCheck, exact: true });
    }
    sections.push({
      label: 'Team',
      items: teamItems,
    });
  }

  if (canAccessNavItem(persona, 'settings', permissions)) {
    sections.push({
      label: 'System',
      items: [{ label: 'Settings', href: '/dashboard/settings', icon: Gear }],
    });
  }

  return sections;
}

const MOBILE_NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: SquaresFour },
  { label: 'Properties', href: '/dashboard/properties', icon: Buildings },
  { label: 'Finances', href: '/dashboard/money', icon: CurrencyDollar },
  { label: 'More', href: '/dashboard/leases', icon: DotsThree },
];

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
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
  const [isOnboardingPending, setIsOnboardingPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: accountContext } = await (supabase as any)
          .from('account_context')
          .select('onboarding_status')
          .eq('user_id', user.id)
          .maybeSingle();
        const status =
          accountContext?.onboarding_status ??
          user.user_metadata?.onboarding?.status ??
          'not_started';
        setIsOnboardingPending(status !== 'completed');
      }
    });
  }, []);

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
