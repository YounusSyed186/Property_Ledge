export type Persona =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'agent'
  | 'staff'
  | 'viewer'
  | 'tenant'
  | 'platform_admin';

export type NavItemId =
  | 'home'
  | 'portfolio'
  | 'units'
  | 'people'
  | 'leases'
  | 'money'
  | 'finances'
  | 'invoices'
  | 'payments'
  | 'expenses'
  | 'maintenance'
  | 'inspections'
  | 'tasks'
  | 'documents'
  | 'reports'
  | 'team'
  | 'settings';

export type QuickActionId =
  | 'property'
  | 'unit'
  | 'tenant'
  | 'lease'
  | 'invoice'
  | 'payment'
  | 'maintenance'
  | 'task';

const NAV_ACCESS: Record<NavItemId, Persona[]> = {
  home: ['owner', 'admin', 'manager', 'agent', 'staff', 'viewer'],
  portfolio: ['owner', 'admin', 'manager', 'agent', 'staff', 'viewer'],
  units: ['owner', 'admin', 'manager', 'agent', 'staff', 'viewer'],
  people: ['owner', 'admin', 'manager', 'agent', 'staff'],
  leases: ['owner', 'admin', 'manager', 'agent', 'staff'],
  money: ['owner', 'admin', 'manager', 'agent'],
  finances: ['owner', 'admin', 'manager', 'agent'],
  invoices: ['owner', 'admin', 'manager', 'agent'],
  payments: ['owner', 'admin', 'manager', 'agent'],
  expenses: ['owner', 'admin', 'manager', 'agent'],
  maintenance: ['owner', 'admin', 'manager', 'agent', 'staff'],
  inspections: ['owner', 'admin', 'manager', 'agent', 'staff'],
  tasks: ['owner', 'admin', 'manager', 'agent', 'staff', 'viewer'],
  documents: ['owner', 'admin', 'manager', 'agent', 'staff', 'viewer'],
  reports: ['owner', 'admin', 'manager', 'agent'],
  team: ['owner', 'admin', 'manager'],
  settings: ['owner', 'admin', 'manager', 'agent', 'staff', 'viewer'],
};

const QUICK_ACTION_ACCESS: Record<QuickActionId, Persona[]> = {
  property: ['owner', 'admin', 'manager'],
  unit: ['owner', 'admin', 'manager', 'agent'],
  tenant: ['owner', 'admin', 'manager', 'agent'],
  lease: ['owner', 'admin', 'manager', 'agent'],
  invoice: ['owner', 'admin', 'manager', 'agent'],
  payment: ['owner', 'admin', 'manager', 'agent'],
  maintenance: ['owner', 'admin', 'manager', 'agent', 'staff'],
  task: ['owner', 'admin', 'manager', 'agent', 'staff'],
};

export function canAccessNavItem(persona: Persona, itemId: NavItemId): boolean {
  return NAV_ACCESS[itemId]?.includes(persona) ?? false;
}

export function canPerformQuickAction(persona: Persona, actionId: QuickActionId): boolean {
  return QUICK_ACTION_ACCESS[actionId]?.includes(persona) ?? false;
}

export const QUICK_ACTION_ROUTES: Record<QuickActionId, string> = {
  property: '/dashboard/properties/new',
  unit: '/dashboard/units',
  tenant: '/dashboard/people',
  lease: '/dashboard/leases',
  invoice: '/dashboard/invoices',
  payment: '/dashboard/payments',
  maintenance: '/dashboard/maintenance',
  task: '/dashboard/tasks',
};

export const QUICK_ACTION_LABELS: Record<QuickActionId, string> = {
  property: 'New Property',
  unit: 'New Unit',
  tenant: 'New Tenant',
  lease: 'New Lease',
  invoice: 'New Invoice',
  payment: 'Record Payment',
  maintenance: 'Maintenance Request',
  task: 'New Task',
};
