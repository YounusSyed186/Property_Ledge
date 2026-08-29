/**
 * PROPERTY LEDGE — Centralized dashboard capability resolver.
 *
 * Maps the existing RBAC model (workspace role + effective permissions) onto
 * what the dashboard renders and which actions are available. Reuses the same
 * permission keys that already gate navigation and server actions. Never a
 * parallel permission system; never leaks unauthorized modules.
 */
import type {
  DashboardCapability,
  DashboardModuleId,
  DashboardRole,
} from './types';

/** Supported workspace roles mapped from team_roles.name (case-insensitive). */
const ROLE_MAP: Record<string, DashboardRole> = {
  owner: 'owner',
  admin: 'admin',
  manager: 'manager',
  'leasing agent': 'agent',
  agent: 'agent',
  staff: 'staff',
  viewer: 'viewer',
  landlord: 'landlord',
};

const ROLE_LABEL: Record<DashboardRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  viewer: 'Viewer',
  landlord: 'Landlord',
  agent: 'Leasing Agent',
  staff: 'Staff',
};

/** Map a workspace roleName onto its dashboard role. */
export function resolveDashboardRole(roleName: string | null | undefined): DashboardRole {
  if (!roleName) return 'viewer';
  const normalized = roleName.toLowerCase().trim();
  return ROLE_MAP[normalized] ?? 'viewer';
}

/** Permission keys required to render each module (any one suffices). */
const MODULE_PERMISSIONS: Record<DashboardModuleId, string[]> = {
  'portfolio-health': ['property.view'],
  'financial-health': ['invoice.view', 'payment.view', 'expense.view'],
  'operational-health': ['maintenance.view', 'task.view', 'inspection.view', 'lease.view'],
  attention: ['property.view'],
  'property-health': ['property.view'],
  collections: ['payment.view', 'invoice.view'],
  maintenance: ['maintenance.view'],
  leases: ['lease.view'],
  tasks: ['task.view'],
  inspections: ['inspection.view'],
  'recent-activity': ['property.view'],
  occupancy: ['property.view'],
  'workspace-health': ['team.member.view'],
  'team-activity': ['team.member.view'],
};

/** Default module order per role (priority). */
const ROLE_MODULES: Record<DashboardRole, DashboardModuleId[]> = {
  owner: [
    'portfolio-health',
    'financial-health',
    'operational-health',
    'property-health',
    'attention',
    'occupancy',
    'recent-activity',
  ],
  landlord: [
    'portfolio-health',
    'financial-health',
    'operational-health',
    'property-health',
    'attention',
    'occupancy',
  ],
  manager: ['attention', 'operational-health', 'maintenance', 'inspections', 'tasks', 'recent-activity'],
  agent: ['attention', 'leases', 'maintenance', 'operational-health'],
  admin: ['workspace-health', 'operational-health', 'attention', 'team-activity', 'recent-activity'],
  staff: ['attention', 'maintenance', 'tasks', 'inspections'],
  viewer: ['portfolio-health', 'operational-health', 'financial-health', 'attention', 'property-health'],
};

const CREATE_ACTION_SUFFIXES = ['.create', '.update', '.delete'];

export function resolveDashboardCapabilities(input: {
  persona: string;
  roleName: string | null | undefined;
  permissions: string[];
}): DashboardCapability {
  const role = resolveDashboardRole(input.roleName ?? input.persona);
  const permitted = new Set<string>(input.permissions);
  const wants = ROLE_MODULES[role] ?? ROLE_MODULES.viewer;

  const modules = wants.filter((id) => {
    const needed = MODULE_PERMISSIONS[id];
    // When the effective permission list is empty, fall back to role defaults
    // (the server remains authoritative for actual data access).
    return needed.length === 0 || input.permissions.length === 0 || needed.some((p) => permitted.has(p));
  });

  const actions = input.permissions.filter(
    (p) => p === 'maintenance.assign' || /\.(create|update|delete)$/.test(p)
  );

  return {
    role,
    roleLabel: ROLE_LABEL[role],
    permissions: input.permissions,
    modules,
    actions,
  };
}