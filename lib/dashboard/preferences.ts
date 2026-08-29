/**
 * PROPERTY LEDGE — Dashboard preferences + runtime importance override.
 *
 * Preferences come from the onboarding "what matters most" step. They are
 * stored in the profile's user_metadata and influence initial composition.
 * Runtime intelligence can temporarily override static preferences when a
 * severity/urgency signal (e.g. a critical maintenance issue) makes something
 * matter more *right now*.
 */
import type {
  DashboardPreference,
  DashboardPreferenceId,
  OperationalHealth,
} from './types';

export const ALL_PREFERENCES: DashboardPreference[] = [
  { id: 'financial', label: 'Financial performance' },
  { id: 'collections', label: 'Collections' },
  { id: 'occupancy', label: 'Occupancy' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'leasing', label: 'Leasing' },
  { id: 'tenants', label: 'Tenants' },
  { id: 'tasks', label: 'Tasks' },
];

/** Order in which preferred modules are surfaced first. */
export const PREFERENCE_MODULES: Record<DashboardPreferenceId, string> = {
  financial: 'financial-health',
  collections: 'collections',
  occupancy: 'occupancy',
  maintenance: 'maintenance',
  leasing: 'leases',
  tenants: 'leases',
  tasks: 'tasks',
};

/** Read raw preference ids from user metadata. */
export function parseDashboardPreferences(raw: unknown): DashboardPreferenceId[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is DashboardPreferenceId =>
    ALL_PREFERENCES.some((p) => p.id === x)
  );
}

/**
 * Reorder modules so the user's stated preferences come first, unless a live
 * severity signal overrides them (runtime intelligence beats static preference).
 */
export function applyPreferenceOrdering(
  modules: string[],
  preferences: DashboardPreferenceId[],
  operational: OperationalHealth | null,
): string[] {
  const ordered = [...modules];
  const promote = new Set<string>();

  // Runtime override: if operations are critical, keep operational modules first.
  if (operational) {
    if (operational.overdueMaintenance >= 3 || operational.overdueTasks >= 6) {
      promote.add('maintenance');
      promote.add('attention');
      promote.add('operational-health');
    }
    if (operational.overdueInspections > 0) promote.add('inspections');
  }

  // Promote preference modules (respecting override priority).
  for (const pref of preferences) {
    const target = PREFERENCE_MODULES[pref];
    if (target && !promote.has(target)) promote.add(target);
  }

  if (promote.size === 0) return ordered;

  const promoted: string[] = [];
  for (const idi of ordered) {
    if (promote.has(idi)) promoted.push(idi);
  }
  const rest = ordered.filter((m) => !promote.has(m));
  return [...promoted, ...rest];
}