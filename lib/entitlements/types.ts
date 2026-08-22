export * from '@/types/subscriptions';

export const ENTITLEMENT_KEYS = {
  PROPERTIES_MAX: 'properties.max',
  REPORTS_ENABLED: 'reports.enabled',
  ADVANCED_REPORTS_ENABLED: 'advanced_reports.enabled',
  TEAM_MEMBERS_MAX: 'team_members.max',
} as const;

export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[keyof typeof ENTITLEMENT_KEYS] | string;
