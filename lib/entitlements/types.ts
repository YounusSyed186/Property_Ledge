export * from '@/types/subscriptions';

export const ENTITLEMENT_KEYS = {
  PROPERTIES_MAX: 'properties.max',
  REPORTS_ENABLED: 'reports.enabled',
  ADVANCED_REPORTS_ENABLED: 'advanced_reports.enabled',
  TEAM_MEMBERS_MAX: 'team_members.max',
  INSIGHTS_ENABLED: 'insights.enabled',
  TEAM_MANAGEMENT_ENABLED: 'team_management.enabled',
  CUSTOM_ROLES_ENABLED: 'custom_roles.enabled',
  CUSTOM_ROLES_MAX: 'custom_roles.max',
} as const;

export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[keyof typeof ENTITLEMENT_KEYS] | string;
