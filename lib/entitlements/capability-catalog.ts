/**
 * Supported PropertyLedge entitlement definitions.
 * Keys must match application behavior — see lib/entitlements/types.ts ENTITLEMENT_KEYS.
 */

export type EntitlementValueType = 'boolean' | 'number' | 'string';
export type EntitlementKind = 'feature' | 'limit';
export type CapabilityCategory = 'Team' | 'Properties' | 'Reports' | 'Features';

export interface SupportedEntitlementDefinition {
  key: string;
  displayName: string;
  description: string;
  shortDescription: string;
  category: CapabilityCategory;
  valueType: EntitlementValueType;
  kind: EntitlementKind;
  defaultDescription: string;
  /** Example default when configuring plan values (not stored on entitlement row) */
  exampleDefault?: number | boolean;
  unitLabel?: string;
  isSupported: true;
}

export const SUPPORTED_ENTITLEMENT_CATALOG: SupportedEntitlementDefinition[] = [
  {
    key: 'team_members.max',
    displayName: 'Maximum Team Members',
    description: 'Maximum number of team members allowed by a subscription plan.',
    shortDescription: 'Limit the number of team members allowed in a workspace.',
    category: 'Team',
    valueType: 'number',
    kind: 'limit',
    defaultDescription: 'Maximum number of team members allowed by a plan.',
    exampleDefault: 25,
    unitLabel: 'members',
    isSupported: true,
  },
  {
    key: 'properties.max',
    displayName: 'Maximum Properties',
    description: 'Maximum number of properties that can be managed under a subscription plan.',
    shortDescription: 'Limit the number of properties managed under a plan.',
    category: 'Properties',
    valueType: 'number',
    kind: 'limit',
    defaultDescription: 'Maximum number of properties allowed by a plan.',
    exampleDefault: 25,
    unitLabel: 'properties',
    isSupported: true,
  },
  {
    key: 'reports.enabled',
    displayName: 'Standard Reports',
    description: 'Access to basic financial and tenant reports for a subscription plan.',
    shortDescription: 'Control access to standard reports.',
    category: 'Reports',
    valueType: 'boolean',
    kind: 'feature',
    defaultDescription: 'Enable standard reports for a plan.',
    exampleDefault: true,
    isSupported: true,
  },
  {
    key: 'advanced_reports.enabled',
    displayName: 'Advanced Analytics',
    description: 'Access to advanced analytics, exports, and custom reports for a subscription plan.',
    shortDescription: 'Control access to advanced analytics.',
    category: 'Reports',
    valueType: 'boolean',
    kind: 'feature',
    defaultDescription: 'Enable advanced analytics for a plan.',
    exampleDefault: true,
    isSupported: true,
  },
  {
    key: 'insights.enabled',
    displayName: 'Insights',
    description: 'Access to workspace insights and analytics.',
    shortDescription: 'Control access to Insights.',
    category: 'Features',
    valueType: 'boolean',
    kind: 'feature',
    defaultDescription: 'Enable Insights for a plan.',
    exampleDefault: true,
    isSupported: true,
  },
  {
    key: 'team_management.enabled',
    displayName: 'Team Management',
    description: 'Enable team member management for a workspace.',
    shortDescription: 'Control team member management features.',
    category: 'Team',
    valueType: 'boolean',
    kind: 'feature',
    defaultDescription: 'Enable team management for a plan.',
    exampleDefault: true,
    isSupported: true,
  },
  {
    key: 'custom_roles.enabled',
    displayName: 'Custom Team Roles',
    description: 'Allow workspaces to create custom team roles.',
    shortDescription: 'Control custom team role creation.',
    category: 'Team',
    valueType: 'boolean',
    kind: 'feature',
    defaultDescription: 'Enable custom team roles for a plan.',
    exampleDefault: true,
    isSupported: true,
  },
  {
    key: 'custom_roles.max',
    displayName: 'Maximum Custom Roles',
    description: 'Maximum number of custom team roles per workspace.',
    shortDescription: 'Limit custom team roles per workspace.',
    category: 'Team',
    valueType: 'number',
    kind: 'limit',
    defaultDescription: 'Maximum custom roles allowed per workspace.',
    exampleDefault: 10,
    unitLabel: 'roles',
    isSupported: true,
  },
];

export const CAPABILITY_CATEGORIES: Array<CapabilityCategory | 'All'> = [
  'All',
  'Team',
  'Properties',
  'Reports',
  'Features',
];

export function findCapabilityByKey(key: string): SupportedEntitlementDefinition | undefined {
  return SUPPORTED_ENTITLEMENT_CATALOG.find((c) => c.key === key);
}

export function isSupportedCapabilityKey(key: string): boolean {
  return SUPPORTED_ENTITLEMENT_CATALOG.some((c) => c.key === key);
}

export function getEntitlementKind(valueType: EntitlementValueType): EntitlementKind {
  return valueType === 'boolean' ? 'feature' : 'limit';
}

export function getKindLabel(kind: EntitlementKind): string {
  return kind === 'feature' ? 'Feature' : 'Limit';
}

export function getTypeDisplayLabel(valueType: EntitlementValueType): string {
  const kind = getEntitlementKind(valueType);
  const technical = valueType === 'boolean' ? 'Boolean' : valueType === 'number' ? 'Number' : 'String';
  return `${getKindLabel(kind)} · ${technical}`;
}

export function getControlDescription(def: SupportedEntitlementDefinition): string {
  if (def.kind === 'feature') {
    return 'Choose whether this capability can be enabled for a plan.';
  }
  return `Set the maximum ${def.unitLabel || 'value'} a plan can allow.`;
}

export function searchCapabilities(
  query: string,
  category: CapabilityCategory | 'All' = 'All'
): SupportedEntitlementDefinition[] {
  const q = query.trim().toLowerCase();
  return SUPPORTED_ENTITLEMENT_CATALOG.filter((cap) => {
    if (category !== 'All' && cap.category !== category) return false;
    if (!q) return true;
    return (
      cap.displayName.toLowerCase().includes(q) ||
      cap.description.toLowerCase().includes(q) ||
      cap.shortDescription.toLowerCase().includes(q) ||
      cap.category.toLowerCase().includes(q) ||
      cap.key.toLowerCase().includes(q)
    );
  });
}

export function suggestMachineKeyFromName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s._-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  if (!slug) return '';
  if (slug.includes('.')) return slug;
  return slug;
}

export const MACHINE_KEY_REGEX = /^[a-z][a-z0-9_.]*$/;

export function validateMachineKey(key: string): string | null {
  if (!key.trim()) return 'Internal identifier is required.';
  if (!MACHINE_KEY_REGEX.test(key)) {
    return 'Use lowercase letters, numbers, and dots. Do not use spaces.';
  }
  return null;
}

export function getWhatItControlsText(
  entitlement: { key: string; name: string; value_type: EntitlementValueType; description?: string | null }
): string {
  const cap = findCapabilityByKey(entitlement.key);
  if (cap) return cap.shortDescription;
  return entitlement.description || 'Custom platform configuration';
}
