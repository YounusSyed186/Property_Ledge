/**
 * PROPERTY LEDGE — Dashboard engine types.
 *
 * These types define the structured contract between the centralized dashboard
 * data layer (server) and the role-aware dashboard UI (client).
 *
 * They are intentionally explicit and strict — no `any`. All values are derived
 * from the existing database schema via the aggregation layer. Nothing here is
 * fabricated.
 */

/**
 * The health-state classification for a portfolio or property.
 *
 * The engine produces a continuous 0–100 score plus a categorical state. Each
 * state carries semantic color mapping in the UI (healthy → success,
 * attention → warning, critical → danger).
 */
export type HealthState = 'healthy' | 'attention' | 'critical';

/**
 * A single explanatory "reason" surfaced on the dashboard so the health score
 * is never an arbitrary number.
 */
export interface HealthReason {
  /**
   * Stable id, used for keys and stable ordering (never rendered to end users).
   */
  id: string;
  /** Human-readable, short explanation, e.g. "Collections declined". */
  label: string;
  /** Which side of the business drove the condition. */
  dimension: 'financial' | 'operational';
  /**
   * Impact weight of this condition — contributes to the deduction driving the
   * overall score.
   */
  impact: number;
}
/** A computed health report for a portfolio or a single property. */
export interface HealthReport {
  /** 0–100 continuous score. */
  score: number;
  /** Categorical classification derived from the score + conditions. */
  state: HealthState;
  /** Previous score (for animated transitions). */
  previousScore: number;
  /** Delta vs the comparison period (e.g. last month). */
  delta: number | null;
  /** Reasons ("Driven by …") explaining the current state. Sorted by impact. */
  reasons: HealthReason[];
  /** True when severe financial conditions are present. */
  hasCriticalFinancial: boolean;
  /** True when severe operational conditions are present. */
  hasCriticalOperational: boolean;
}

/** Current-month financial ledger (numbers; UI formats via formatCurrency). */
export interface FinancialHealth {
  /** Sum of completed payments received during the current month. */
  collected: number;
  /** Collected during the previous month (for delta). */
  collectedPrevious: number;
  /** Sum of invoice balance_due not yet settled (issued / partially / overdue). */
  outstanding: number;
  /** Paid expenses during the current month. */
  expenses: number;
  /** Paid expenses during the previous month. */
  expensesPrevious: number;
  /** Expected recurring rent for the current month (sum of active lease rent). */
  expectedMonthlyRent: number;
  /** Collected ÷ expected rent for the current month, 0–1. */
  collectionRate: number | null;
  /** Outstanding balance expressed as a multiple of expected monthly rent. */
  outstandingRatio: number | null;
  /** Overdue invoice count (status = overdue). */
  overdueInvoiceCount: number;
}

/** Operational health snapshot (current state, not month-scoped). */
export interface OperationalHealth {
  /** Open / in-progress / scheduled maintenance requests. */
  openMaintenanceRequests: number;
  /** Maintenance requests that appear overdue (past-due scheduling or stale). */
  overdueMaintenance: number;
  /** Pending / in-progress tasks. */
  pendingTasks: number;
  /** Past-due tasks. */
  overdueTasks: number;
  /** Inspections due within 30 days, or already past due. */
  inspectionsDue: number;
  /** Overdue inspections. */
  overdueInspections: number;
  /** Active leases expiring within the next 30 days. */
  expiringLeases: number;
  /** Total count of units considered (active). */
  totalUnits: number;
  /** Number of occupied units in the snapshot. */
  occupiedUnits: number;
  /** 0–1 occupancy rate. */
  occupancyRate: number | null;
  /** Count of vacant units. */
  vacantUnits: number;
}

/** One property in the portfolio health field. */
export interface PropertyHealthSignal {
  propertyId: string;
  propertyName: string;
  /** Used for the property's visual identity block. */
  propertyType: string | null;
  /** Primary location line. */
  city: string;
  /** Per-property health report. */
  health: HealthReport;
  /** Per-property operational snapshot. */
  operational: OperationalHealth;
  /** Number of attention items associated with the property. */
  attentionCount: number;
  /** Highest severity among the property's attention items. */
  attentionTone: 'high' | 'medium' | 'low' | 'none';
}

/** Severity used to rank attention items (impact + urgency + severity). */
export type AttentionSeverity = 'high' | 'medium' | 'low';

/** Category of an attention item, per the brief's four attention domains. */
export type AttentionCategory = 'financial' | 'occupancy' | 'operations' | 'lease';

/**
 * A prioritized attention item. Ranking is computed from impact + urgency +
 * severity, never from creation date alone.
 */
export interface AttentionItem {
  id: string;
  category: AttentionCategory;
  title: string;
  /** Short supporting text (e.g. formatted amount). */
  description: string;
  /** Resolved severity used for ranking & tone. */
  severity: AttentionSeverity;
  /** Numeric rank score used to order the list. Higher is more important. */
  rank: number;
  /** Target href for the item's contextual destination. */
  href: string;
  /** Optional property id the item belongs to. */
  propertyId?: string;
  propertyName?: string;
}

/** The list of dashboard roles the engine can target. */
export type DashboardRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'viewer'
  | 'landlord'
  | 'agent'
  | 'staff';

/** Dashboard preference dimensions (from onboarding "what matters most"). */
export type DashboardPreferenceId =
  | 'financial'
  | 'collections'
  | 'occupancy'
  | 'maintenance'
  | 'leasing'
  | 'tenants'
  | 'tasks';

export interface DashboardPreference {
  id: DashboardPreferenceId;
  label: string;
}

/** Identifiers for the module set (role/permission aware dashboard parts). */
export type DashboardModuleId =
  | 'portfolio-health'
  | 'financial-health'
  | 'operational-health'
  | 'attention'
  | 'property-health'
  | 'collections'
  | 'maintenance'
  | 'leases'
  | 'tasks'
  | 'inspections'
  | 'recent-activity'
  | 'occupancy'
  | 'workspace-health'
  | 'team-activity';
/** A registered dashboard module with its availability constraints. */
export interface DashboardModuleDescriptor {
  id: DashboardModuleId;
  /**
   * At least one of these permissions must be held. Empty array = no specific
   * permission required (beyond workspace membership).
   */
  requiredPermissions: string[];
  /** Roles for which the module is relevant. */
  roles: DashboardRole[];
  /** Composition priority — lower renders first. */
  priority: number;
  /** Group heading used to organise the dashboard surface. */
  label: string;
}

/**
 * Resolved capabilities for the current user + workspace. This is the single
 * source of truth the dashboard UI uses to decide what to render and which
 * actions are available. It is derived from the existing RBAC model — never a
 * parallel permission system.
 */
export interface DashboardCapability {
  /** Resolved dashboard role. */
  role: DashboardRole;
  /** Workspace-role display label, e.g. "Owner", "Manager". */
  roleLabel: string;
  /** Effective workspace permissions. */
  permissions: string[];
  /** Modules the user can see, ordered by priority. */
  modules: DashboardModuleId[];
  /** Actions (permission keys) the user may perform. */
  actions: string[];
}

/** The selected portfolio scope for the dashboard. */
export type PortfolioScope =
  | { scope: 'all' }
  | { scope: 'property'; propertyId: string; propertyName: string };

/** Aggregated, scope-aware dashboard context returned by the server action. */
export interface DashboardContext {
  /** Greeting scope label. */
  scopeLabel: string;
  /** Role-aware capabilities. */
  capability: DashboardCapability;
  /** Ignored for owner first-viewport; used by manager/viewer. */
  preferences: DashboardPreference[];
  /** Overall portfolio health (scope-aware). */
  portfolioHealth: HealthReport;
  /** Financial ledger (scope-aware). */
  financial: FinancialHealth;
  /** Operational snapshot (scope-aware). */
  operational: OperationalHealth;
  /** Per-property health signals for the portfolio field. */
  properties: PropertyHealthSignal[];
  /** Prioritized attention items (scope-aware). */
  attention: AttentionItem[];
  /** True when the user has no accessible properties (empty state). */
  noProperties: boolean;
  /** Recent activity (scope-aware, when permitted). */
  recentActivity: ActivityItem[];
}

/** Rolled-up financial report (scope-aware) returned to the UI. */
export type FinancialHealthReport = FinancialHealth;

/** A normalized activity timeline item. */
export interface ActivityItem {
  id: string;
  title: string;
  detail?: string;
  time: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

/** The compact struct returned to the property workspace header. */
export interface PropertyContextBundle {
  propertyId: string;
  propertyName: string;
  health: HealthReport;
  operational: OperationalHealth;
}