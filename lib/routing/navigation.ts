import type { Persona } from '@/lib/auth/resolvePersona';
import { canAccessNavItem, type NavItemId } from '@/lib/auth/permissions';

export interface RouteConfig {
  id: NavItemId;
  label: string;
  href: string;
  group: 'Home' | 'People' | 'Finance' | 'Operations' | 'Insights' | 'Settings';
  exact?: boolean;
  comingSoon?: boolean;
  requiresWorkspace: boolean;
  supportsPropertyFilter: boolean;
  permission?: string;
}

export const CANONICAL_ROUTES: RouteConfig[] = [
  {
    id: 'home',
    label: 'Dashboard',
    href: '/dashboard',
    group: 'Home',
    exact: true,
    requiresWorkspace: true,
    supportsPropertyFilter: true,
    permission: 'workspace.view',
  },
  {
    id: 'portfolio',
    label: 'Properties',
    href: '/dashboard/properties',
    group: 'Home',
    requiresWorkspace: true,
    supportsPropertyFilter: true,
    permission: 'property.view',
  },
  {
    id: 'people',
    label: 'Tenants',
    href: '/dashboard/people',
    group: 'People',
    requiresWorkspace: true,
    supportsPropertyFilter: true,
    permission: 'tenant.view',
  },
  {
    id: 'leases',
    label: 'Leases',
    href: '/dashboard/leases',
    group: 'People',
    requiresWorkspace: true,
    supportsPropertyFilter: true,
    permission: 'lease.view',
  },
  {
    id: 'condition-reports',
    label: 'Condition Reports',
    href: '/dashboard/condition-reports',
    group: 'Home',
    requiresWorkspace: true,
    supportsPropertyFilter: true,
    permission: 'inspection.view',
  },
  {
    id: 'invoices',
    label: 'Invoices',
    href: '/dashboard/invoices',
    group: 'Finance',
    requiresWorkspace: true,
    supportsPropertyFilter: true,
    permission: 'financial.view',
  },
  {
    id: 'finances',
    label: 'Expenses',
    href: '/dashboard/expenses',
    group: 'Finance',
    requiresWorkspace: true,
    supportsPropertyFilter: true,
    permission: 'financial.view',
  },
  {
    id: 'finances',
    label: 'Transactions',
    href: '/dashboard/money',
    group: 'Finance',
    requiresWorkspace: true,
    supportsPropertyFilter: true,
    permission: 'financial.view',
  },
  {
    id: 'finances',
    label: 'Payment Schedules',
    href: '/dashboard/schedules',
    group: 'Finance',
    requiresWorkspace: true,
    supportsPropertyFilter: true,
    permission: 'financial.view',
  },
  {
    id: 'bas',
    label: 'BAS Activity Statement',
    href: '/dashboard/bas',
    group: 'Finance',
    requiresWorkspace: true,
    supportsPropertyFilter: true,
    permission: 'financial.view',
  },
  {
    id: 'automations',
    label: 'Automations',
    href: '/dashboard/automations',
    group: 'Operations',
    requiresWorkspace: true,
    supportsPropertyFilter: false,
    permission: 'team.settings.view',
  },
  {
    id: 'documents',
    label: 'Documents',
    href: '/dashboard/documents',
    group: 'Operations',
    comingSoon: false,
    requiresWorkspace: true,
    supportsPropertyFilter: true,
    permission: 'document.view',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    href: '/dashboard/tasks',
    group: 'Operations',
    comingSoon: false,
    requiresWorkspace: true,
    supportsPropertyFilter: true,
    permission: 'task.view',
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/dashboard/reports',
    group: 'Insights',
    comingSoon: true,
    requiresWorkspace: true,
    supportsPropertyFilter: true,
    permission: 'financial.view',
  },
  {
    id: 'team',
    label: 'Team',
    href: '/dashboard/team',
    group: 'Settings',
    requiresWorkspace: true,
    supportsPropertyFilter: false,
    permission: 'team.member.view',
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/dashboard/settings',
    group: 'Settings',
    requiresWorkspace: true,
    supportsPropertyFilter: false,
    permission: 'workspace.edit',
  },
];

export function getAuthorizedRoutes(persona: Persona, permissions: string[] = []): RouteConfig[] {
  return CANONICAL_ROUTES.filter((r) => canAccessNavItem(persona, r.id, permissions));
}

export function isRouteActive(currentPath: string, routePath: string, exact: boolean = false): boolean {
  if (exact) {
    return currentPath === routePath;
  }
  return currentPath === routePath || currentPath.startsWith(`${routePath}/`);
}
