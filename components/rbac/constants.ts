import React from 'react';
import {
  Building2,
  Building,
  Users,
  UserCheck,
  FileText,
  Receipt,
  CreditCard,
  Banknote,
  Wrench,
  ClipboardCheck,
  FolderLock,
  ListTodo,
  BarChart3,
  Shield,
  ShieldAlert,
  Settings,
  History,
  Lock,
  KeyRound,
  FileCheck2,
  Share2,
  Layers,
  Sparkles,
} from 'lucide-react';

// Canonical ordering of actions for consistent column layout
export const CANONICAL_ACTION_ORDER = [
  'view',
  'create',
  'update',
  'delete',
  'manage',
  'approve',
  'assign',
  'invite',
  'export',
  'import',
  'generate',
  'publish',
  'archive',
  'impersonate',
];

// Normalize action keys so redundant duplicates like delete/remove, update/edit map to single columns
export function normalizeActionKey(action: string): string {
  const norm = action.toLowerCase().trim();
  if (norm === 'read') return 'view';
  if (norm === 'add') return 'create';
  if (norm === 'edit') return 'update';
  if (norm === 'remove') return 'delete';
  return norm;
}

// Resource category groupings
export const RESOURCE_CATEGORIES: Record<string, string[]> = {
  'Property Management': ['property', 'unit', 'tenant', 'lease', 'applicant', 'contract'],
  'Financial Operations': ['invoice', 'payment', 'expense', 'billing', 'subscription', 'payout', 'tax'],
  'Operations & Maintenance': ['maintenance', 'inspection', 'document', 'task', 'insights', 'work_order'],
  'Team & Access': ['team.member', 'team.role', 'team.settings', 'team', 'team_role', 'invitation'],
  'Platform Administration': ['user', 'platform_role', 'audit', 'platform.settings', 'security', 'organization', 'api_key'],
};

// Resource display names mapping
export const RESOURCE_NAME_OVERRIDES: Record<string, string> = {
  property: 'Properties',
  tenant: 'Tenants',
  lease: 'Leases',
  invoice: 'Invoices',
  payment: 'Payments',
  expense: 'Expenses',
  billing: 'Billing & Plans',
  subscription: 'Subscriptions',
  maintenance: 'Maintenance',
  inspection: 'Inspections',
  document: 'Documents',
  task: 'Tasks',
  insights: 'Analytics & Insights',
  'team.member': 'Team Members',
  'team.role': 'Workspace Roles',
  'team.settings': 'Workspace Settings',
  team: 'Team Management',
  team_role: 'System Team Roles',
  user: 'Platform Users',
  platform_role: 'Platform Roles',
  audit: 'Audit Logs',
  'platform.settings': 'Platform Settings',
  security: 'Security & Compliance',
};

// Resource descriptions mapping
export const RESOURCE_DESCRIPTIONS: Record<string, string> = {
  property: 'Manage property profiles, addresses, configurations and portfolios',
  tenant: 'Manage tenant profiles, leases, communications and history',
  lease: 'Create, review, renew, execute and terminate lease agreements',
  invoice: 'Generate, send, track and reconcile invoices and fee structures',
  payment: 'Process tenant payments, refunds, payouts and bank transactions',
  expense: 'Track operational expenses, maintenance bills and vendor payments',
  billing: 'Manage platform subscription tiers, payment methods and invoices',
  subscription: 'Configure workspace subscription features and quota allocations',
  maintenance: 'Manage work orders, contractor dispatches and maintenance logs',
  inspection: 'Schedule move-in/move-out audits, checklist logs and reports',
  document: 'Store and secure lease agreements, tax forms and compliance files',
  task: 'Coordinate team workflows, checklist items and operational reminders',
  insights: 'View property portfolio analytics, rent yields and occupancy rates',
  'team.member': 'Invite, manage and assign workspace staff and contributors',
  'team.role': 'Define customized access permissions and role tiers',
  'team.settings': 'Configure workspace preferences, branding and policies',
  team: 'Oversee full team operations and member authorizations',
  team_role: 'Manage global system team roles and default permission sets',
  user: 'Manage platform-wide user accounts, authentication and status',
  platform_role: 'Define root and administrator platform role privileges',
  audit: 'Inspect comprehensive audit trails, security events and action logs',
  'platform.settings': 'Manage global system configuration and platform defaults',
  security: 'Control security policies, authentication safeguards and sessions',
};

export function formatResourceName(resource: string): string {
  if (RESOURCE_NAME_OVERRIDES[resource]) {
    return RESOURCE_NAME_OVERRIDES[resource];
  }
  return resource
    .split(/[._]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function getResourceDescription(resource: string): string {
  return RESOURCE_DESCRIPTIONS[resource] || `Configure ${formatResourceName(resource).toLowerCase()} access rules and privileges`;
}

export function formatActionName(action: string): string {
  const normalized = normalizeActionKey(action);
  const overrides: Record<string, string> = {
    view: 'View',
    create: 'Create',
    update: 'Edit',
    delete: 'Delete',
    manage: 'Manage',
    approve: 'Approve',
    assign: 'Assign',
    invite: 'Invite',
    export: 'Export',
    import: 'Import',
    generate: 'Generate',
    publish: 'Publish',
    archive: 'Archive',
    impersonate: 'Impersonate',
  };
  return overrides[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function getCategoryForResource(resource: string): string {
  for (const [category, resources] of Object.entries(RESOURCE_CATEGORIES)) {
    if (resources.includes(resource)) return category;
  }
  return 'General & Other';
}

export function getResourceIcon(resource: string): React.ComponentType<{ className?: string }> {
  switch (resource.toLowerCase()) {
    case 'property':
      return Building2;
    case 'unit':
      return Building;
    case 'tenant':
      return Users;
    case 'lease':
      return FileText;
    case 'invoice':
      return Receipt;
    case 'payment':
      return CreditCard;
    case 'expense':
      return Banknote;
    case 'billing':
    case 'subscription':
      return Sparkles;
    case 'maintenance':
      return Wrench;
    case 'inspection':
      return ClipboardCheck;
    case 'document':
      return FolderLock;
    case 'task':
      return ListTodo;
    case 'insights':
      return BarChart3;
    case 'team.member':
    case 'team':
      return Users;
    case 'team.role':
    case 'team_role':
      return Shield;
    case 'user':
      return UserCheck;
    case 'platform_role':
      return KeyRound;
    case 'audit':
      return History;
    case 'platform.settings':
    case 'team.settings':
      return Settings;
    case 'security':
      return ShieldAlert;
    default:
      return Layers;
  }
}
