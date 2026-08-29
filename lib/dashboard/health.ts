// @ts-nocheck
/**
 * PROPERTY LEDGE — Centralized health engine.
 *
 * The health state is derived from real, schema-backed signals through a set
 * of centrally configured thresholds. Rules are intentionally *not* a fixed
 * "60% financial + 40% operational" formula dumped in the UI — each condition
 * carries a concrete reason so the score is always explainable.
 *
 * Configuration lives here (typed), so thresholds can be tuned without
 * touching any UI component or aggregation layer.
 */
import type {
  FinancialHealth,
  HealthReason,
  HealthReport,
  HealthState,
  OperationalHealth,
} from './types';

export interface HealthConfig {
  /** Minimum collection rate considered healthy (0–1). */
  collectionHealthy: number;
  /** Below this, collections read as "attention". */
  collectionAttention: number;
  /** Below this, collections are critical. */
  collectionCritical: number;
  /** Outstanding balance (as multiple of monthly rent) considered healthy. */
  outstandingHealthyRatio: number;
  /** Outstanding ratio at which attention is flagged. */
  outstandingAttentionRatio: number;
  /** Outstanding ratio at which the condition is critical. */
  outstandingCriticalRatio: number;
  /** Expenses exceeding this multiple of last month is flagged. */
  expenseIncreaseFactor: number;
  /** Number of overdue maintenance items that is "critical" for operations. */
  overdueMaintenanceCritical: number;
  /** Open maintenance count at which the surface is "attention". */
  openMaintenanceAttention: number;
  /** Occupancy (0–1) considered healthy. */
  occupancyHealthyRatio: number;
  /** Occupancy below this is critical. */
  occupancyCriticalRatio: number;
  /** Number of leases expiring within 30 days that is "critical". */
  expiringLeasesCritical: number;
  /** Number of past-due tasks at which operations read "attention". */
  overdueTasksAttention: number;
}

const DEFAULTS: HealthConfig = {
  collectionHealthy: 0.85,
  collectionAttention: 0.7,
  collectionCritical: 0.5,
  outstandingHealthyRatio: 0.5,
  outstandingAttentionRatio: 1.0,
  outstandingCriticalRatio: 1.6,
  expenseIncreaseFactor: 1.2,
  overdueMaintenanceCritical: 3,
  openMaintenanceAttention: 5,
  occupancyHealthyRatio: 0.8,
  occupancyCriticalRatio: 0.5,
  expiringLeasesCritical: 3,
  overdueTasksAttention: 6,
};

const clampScore = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function stateFrom(score: number, sevFinancial: boolean, sevOperational: boolean): HealthState {
  if (sevFinancial || sevOperational) return 'critical';
  if (score < 85) return 'attention';
  return 'healthy';
}

/** Accumulate deductions and reasons for the financial dimension only. */
function financialDeductions(financial: FinancialHealth, cfg: HealthConfig): { impact: number; reasons: HealthReason[]; critical: boolean } {
  const reasons: HealthReason[] = [];
  let impact = 0;
  let critical = false;

  if (financial.collectionRate !== null) {
    if (financial.collectionRate < cfg.collectionCritical) {
      critical = true;
      impact += 20;
      reasons.push({ id: 'collections-critical', label: 'Collections are critically low this month', dimension: 'financial', impact: 20 });
    } else if (financial.collectionRate < cfg.collectionAttention) {
      impact += 12;
      reasons.push({ id: 'collections-low', label: 'Collection rate is below target', dimension: 'financial', impact: 12 });
    } else if (financial.collectionRate < cfg.collectionHealthy) {
      impact += 6;
      reasons.push({ id: 'collections-below', label: 'Collections slightly below expected', dimension: 'financial', impact: 6 });
    }
  }

  if (financial.collectedPrevious > 0 && financial.collected < financial.collectedPrevious) {
    impact += 6;
    reasons.push({ id: 'collections-declined', label: 'Collections declined vs last month', dimension: 'financial', impact: 6 });
  }

  if (financial.outstandingRatio !== null) {
    if (financial.outstandingRatio >= cfg.outstandingCriticalRatio) {
      impact += 14;
      reasons.push({ id: 'outstanding-critical', label: 'Outstanding balance is unusually high', dimension: 'financial', impact: 14 });
    } else if (financial.outstandingRatio >= cfg.outstandingAttentionRatio) {
      impact += 8;
      reasons.push({ id: 'outstanding-elevated', label: 'Outstanding balance is elevated', dimension: 'financial', impact: 8 });
    } else if (financial.outstandingRatio >= cfg.outstandingHealthyRatio) {
      impact += 4;
      reasons.push({ id: 'outstanding-moderate', label: 'Some rent remains outstanding', dimension: 'financial', impact: 4 });
    }
  }

  if (financial.expensesPrevious > 0 && financial.expenses > financial.expensesPrevious * cfg.expenseIncreaseFactor) {
    impact += 6;
    reasons.push({ id: 'expenses-increased', label: 'Expenses increased this month', dimension: 'financial', impact: 6 });
  }

  return { impact, reasons, critical };
}
/** Accumulate deductions and reasons for the operational dimension only. */
function operationalDeductions(operational: OperationalHealth, cfg: HealthConfig): { impact: number; reasons: HealthReason[]; critical: boolean } {
  const reasons: HealthReason[] = [];
  let impact = 0;
  let critical = false;

  if (operational.overdueMaintenance > 0) {
    if (operational.overdueMaintenance >= cfg.overdueMaintenanceCritical) {
      impact += 14;
      critical = true;
      reasons.push({ id: 'maintenance-critical', label: 'Multiple maintenance issues overdue', dimension: 'operational', impact: 14 });
    } else {
      impact += 5;
      reasons.push({ id: 'maintenance-overdue', label: 'Maintenance work is overdue', dimension: 'operational', impact: 5 });
    }
  }

  if (operational.openMaintenanceRequests > cfg.openMaintenanceAttention) {
    impact += 5;
    reasons.push({ id: 'maintenance-queue', label: 'Open maintenance queue is growing', dimension: 'operational', impact: 5 });
  }

  if (operational.overdueTasks > 0) {
    const impactThis = operational.overdueTasks >= cfg.overdueTasksAttention ? 7 : 3;
    impact += impactThis;
    reasons.push({
      id: 'tasks-overdue',
      label: operational.overdueTasks >= cfg.overdueTasksAttention ? 'Several tasks are past due' : 'Tasks are overdue',
      dimension: 'operational',
      impact: impactThis,
    });
  }

  if (operational.overdueInspections > 0) {
    impact += Math.min(operational.overdueInspections, 3) * 2;
    reasons.push({ id: 'inspections-overdue', label: 'Inspections are overdue', dimension: 'operational', impact: 2 });
  }

  if (operational.expiringLeases > 0) {
    const toAdd = operational.expiringLeases >= cfg.expiringLeasesCritical ? 6 : 2;
    impact += toAdd;
    reasons.push({ id: 'leases-expiring', label: 'Leases expiring soon', dimension: 'operational', impact: toAdd });
  }

  if (operational.occupancyRate !== null) {
    if (operational.occupancyRate < cfg.occupancyCriticalRatio) {
      impact += 12;
      critical = true;
      reasons.push({ id: 'occupancy-critical', label: 'Occupancy is critically low', dimension: 'operational', impact: 12 });
    } else if (operational.occupancyRate < cfg.occupancyHealthyRatio) {
      impact += 6;
      reasons.push({ id: 'occupancy-low', label: 'Occupancy is below target', dimension: 'operational', impact: 6 });
    }
  }

  return { impact, reasons, critical };
}

/** Overall portfolio/property health (hero ring). */
export function computePortfolioHealth(
  financial: FinancialHealth,
  operational: OperationalHealth,
  cfg: HealthConfig = DEFAULTS,
): HealthReport {
  const fin = financialDeductions(financial, cfg);
  const op = operationalDeductions(operational, cfg);
  const reasons = [...fin.reasons, ...op.reasons].sort((a, b) => b.impact - a.impact);

  const score = clampScore(100 - fin.impact - op.impact);
  const state = stateFrom(score, fin.critical, op.critical);

  // Previous-month financial proxy so "vs last month" is defensible.
  const prevFin: FinancialHealth = {
    ...financial,
    collected: financial.collectedPrevious,
    expenses: financial.expensesPrevious,
    collectionRate:
      financial.expectedMonthlyRent > 0 ? financial.collectedPrevious / financial.expectedMonthlyRent : null,
  };
  const finPrev = financialDeductions(prevFin, cfg);
  const prevScore = clampScore(100 - finPrev.impact - op.impact);

  return {
    score,
    state,
    previousScore: prevScore,
    delta: score - prevScore,
    reasons,
    hasCriticalFinancial: fin.critical,
    hasCriticalOperational: op.critical,
  };
}

/** Standalone financial-health ring score. */
export function computeFinancialHealthReport(
  financial: FinancialHealth,
  cfg: HealthConfig = DEFAULTS,
): HealthReport {
  const fin = financialDeductions(financial, cfg);
  const score = clampScore(100 - fin.impact);
  return {
    score,
    state: stateFrom(score, false, false),
    previousScore: score,
    delta: null,
    reasons: fin.reasons,
    hasCriticalFinancial: fin.critical,
    hasCriticalOperational: false,
  };
}

/** Standalone operational-health ring score. */
export function computeOperationalHealthReport(
  operational: OperationalHealth,
  cfg: HealthConfig = DEFAULTS,
): HealthReport {
  const op = operationalDeductions(operational, cfg);
  const score = clampScore(100 - op.impact);
  return {
    score,
    state: stateFrom(score, false, op.critical),
    previousScore: score,
    delta: null,
    reasons: op.reasons,
    hasCriticalFinancial: false,
    hasCriticalOperational: op.critical,
  };
}

export { DEFAULTS };