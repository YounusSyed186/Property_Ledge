'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Building2,
  Plus,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Layers,
  Activity,
  ChevronRight,
  MapPin,
  Wrench,
  Receipt,
} from 'lucide-react';
import { Card, CardContent } from '@/components/admin/ui';
import { Button } from '@/components/admin/ui/Button';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { useAppContext } from '@/components/context/AppContextProvider';
import { formatCurrency } from '@/lib/format/currency';
import { fetchDashboardDataAction } from '@/app/actions/dashboard';
import { ManagerDashboard } from '@/components/dashboard/overview/ManagerDashboard';
import { StaffDashboard } from '@/components/dashboard/overview/StaffDashboard';
import { CashFlowChart } from '@/components/dashboard/overview/CashFlowChart';
import { PropertiesOverviewCard } from '@/components/dashboard/overview/PropertiesOverviewCard';
import { buildAttentionItems, buildUpcomingItems } from '@/components/dashboard/overview/NeedsAttentionSection';
import { SetupChecklist } from '@/components/dashboard/setup/SetupChecklist';
import type { SetupProgress } from '@/lib/dashboard/setupProgress';
import {
  PageLayout,
  PageContent,
  PageSkeleton,
} from '@/components/workspace';
import {
  useEntityCacheStore,
  buildCacheKey,
  fetchWithDeduplication,
  isDataFresh,
  formatLastUpdated,
  FRESHNESS_THRESHOLDS,
} from '@/lib/stores/useEntityCacheStore';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';
import { cn } from '@/lib/utils';

const CreateLeaseWizard = dynamic(
  () => import('@/components/dashboard/workflows/CreateLeaseWizard').then((m) => m.CreateLeaseWizard),
  { ssr: false }
);

export function OwnerDashboard({
  userName,
  setupProgress,
  initialData,
}: {
  userName: string;
  setupProgress?: SetupProgress;
  initialData?: any;
}) {
  const { selectedProperty, availableProperties, isLoading: propertyLoading } = usePropertyContext();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const cachedDashboard = useEntityCacheStore((s) => s.dashboard);
  const setCachedDashboard = useEntityCacheStore((s) => s.setDashboard);

  const propertyId = selectedProperty?.propertyId ?? null;
  const cacheKey = buildCacheKey('dashboard', activeWorkspaceId, propertyId);

  const hasMatchingCache =
    cachedDashboard &&
    cachedDashboard.workspaceId === activeWorkspaceId &&
    cachedDashboard.propertyId === propertyId &&
    !!cachedDashboard.data;

  const initialResolved = initialData ?? (hasMatchingCache ? cachedDashboard.data : null);

  const [overview, setOverview] = useState<any>(() => initialResolved?.overview ?? null);
  const [reports, setReports] = useState<any>(() => initialResolved?.reports ?? null);
  const [needsAttention, setNeedsAttention] = useState<any>(() => initialResolved?.needsAttention ?? null);
  const [leases, setLeases] = useState<Array<{ id: string; property_id?: string; end_date: string | null; status: string; rent_amount?: number; unit?: { name?: string; unit_number?: string } }>>(
    () => initialResolved?.leases ?? []
  );

  const [isLoading, setIsLoading] = useState(() => !initialResolved);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<number>(() => cachedDashboard?.fetchedAt ?? (initialData ? Date.now() : 0));
  const [lastUpdatedText, setLastUpdatedText] = useState('just now');

  const latestRequestIdRef = useRef(0);
  const isInitialMount = useRef(true);
  const [leaseWizardOpen, setLeaseWizardOpen] = useState(false);

  const showSetup = setupProgress && !setupProgress.allComplete;

  // Hydrate cache with server initialData on initial mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialData && activeWorkspaceId) {
        setCachedDashboard(initialData, activeWorkspaceId, propertyId);
        setLastFetchedAt(Date.now());
      }
    }
  }, [initialData, activeWorkspaceId, propertyId, setCachedDashboard]);

  // Periodic update of human-readable "Updated X ago"
  useEffect(() => {
    const updateLabel = () => {
      setLastUpdatedText(formatLastUpdated(lastFetchedAt));
    };
    updateLabel();
    const interval = setInterval(updateLabel, 5000);
    return () => clearInterval(interval);
  }, [lastFetchedAt]);

  const loadData = useCallback(async (isManual = false) => {
    if (typeof window !== 'undefined' && !navigator.onLine) {
      return;
    }

    const requestId = ++latestRequestIdRef.current;
    const currentCache = useEntityCacheStore.getState().dashboard;
    const isCurrentMatching =
      currentCache &&
      currentCache.workspaceId === activeWorkspaceId &&
      currentCache.propertyId === propertyId;

    if (!isManual && isCurrentMatching && isDataFresh(currentCache, FRESHNESS_THRESHOLDS.live)) {
      return;
    }

    if (!overview && !reports) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const data = await fetchWithDeduplication(cacheKey, () => fetchDashboardDataAction(propertyId));

      if (requestId !== latestRequestIdRef.current) {
        return;
      }

      setOverview(data.overview);
      setNeedsAttention(data.needsAttention);
      setReports(data.reports);
      setLeases(data.leases as typeof leases);
      setCachedDashboard(data, activeWorkspaceId, propertyId);
      const now = Date.now();
      setLastFetchedAt(now);
      setLastUpdatedText('just now');
    } catch (err) {
      console.error('[DashboardOverview] Data load error:', err);
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [activeWorkspaceId, propertyId, cacheKey, setCachedDashboard, overview, reports]);

  // Main SWR coordination on property or workspace change
  useEffect(() => {
    const currentCache = useEntityCacheStore.getState().dashboard;
    const isCurrentMatching =
      currentCache &&
      currentCache.workspaceId === activeWorkspaceId &&
      currentCache.propertyId === propertyId;

    if (isCurrentMatching && isDataFresh(currentCache, FRESHNESS_THRESHOLDS.live)) {
      if (currentCache.data) {
        setOverview(currentCache.data.overview);
        setNeedsAttention(currentCache.data.needsAttention);
        setReports(currentCache.data.reports);
        setLeases(currentCache.data.leases);
        setLastFetchedAt(currentCache.fetchedAt);
        setIsLoading(false);
      }
      return;
    }

    loadData(false);
  }, [propertyId, activeWorkspaceId, loadData]);

  // Visibility handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentCache = useEntityCacheStore.getState().dashboard;
        if (!isDataFresh(currentCache, FRESHNESS_THRESHOLDS.live)) {
          loadData(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadData]);

  const hasProperties = availableProperties.length > 0;
  const attentionItems = useMemo(() => buildAttentionItems(needsAttention), [needsAttention]);
  const upcomingItems = useMemo(() => buildUpcomingItems(needsAttention, leases), [needsAttention, leases]);

  const stats = overview?.stats;
  const activeLeasesCount = stats?.activeLeases ?? leases.length ?? 0;
  const activeTenantsCount = stats?.activeTenants ?? 0;

  // Real financial figures
  const totalRevenue = Number(reports?.totalRevenue || 0);
  const totalExpenses = Number(reports?.totalExpenses || 0);
  const netCashFlow = totalRevenue - totalExpenses;
  const outstandingBalance = Number(reports?.outstandingBalance || 0);
  const isNetPositive = netCashFlow >= 0;

  const totalFlow = totalRevenue + totalExpenses;
  const incomeRatio = totalFlow > 0 ? Math.round((totalRevenue / totalFlow) * 100) : 100;
  const expenseRatio = 100 - incomeRatio;

  const recentActivityLogs = overview?.recentActivity || [];

  return (
    <PageLayout>
      <PageContent>
        {showSetup && <SetupChecklist progress={setupProgress!} />}

        {propertyLoading || isLoading ? (
          <PageSkeleton />
        ) : !hasProperties ? (
          <Card className="border-dashed bg-admin-surface border-admin-border my-6">
            <CardContent className="p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-admin-primary-soft text-admin-primary border border-admin-primary/20">
                <Building2 className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-admin-foreground mb-1.5">No properties in workspace</h3>
              <p className="mx-auto mb-6 max-w-md text-xs text-admin-muted leading-relaxed">
                Add your first commercial or residential property to start tracking leases, recording tenant payments, and managing automated compliance.
              </p>
              <Button href="/dashboard/properties?new=true" size="md" leftIcon={<Plus className="h-4 w-4" />}>
                Create Your First Property
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8 pb-16">
            {/* Header: Identity, Context & Primary Actions */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1 border-b border-border-subtle pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-admin-muted">
                    {selectedProperty ? 'Property Workspace' : 'Portfolio Overview'}
                  </span>
                  <span className="text-admin-muted select-none">·</span>
                  <span className="text-[11px] font-medium text-admin-primary">
                    {selectedProperty ? selectedProperty.propertyName : `${availableProperties.length} Properties`}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-heading font-semibold tracking-tight text-admin-foreground">
                  {selectedProperty ? selectedProperty.propertyName : 'Dashboard'}
                </h1>
                <div className="flex items-center gap-2.5 pt-0.5">
                  <p className="text-body-sm text-admin-muted">
                    {selectedProperty
                      ? 'Real-time performance, active tenancies, and compliance activity'
                      : 'Aggregated revenue, operational cash flow, and property activities'}
                  </p>
                  <span className="text-border-strong select-none hidden md:inline">·</span>
                  <button
                    type="button"
                    onClick={() => loadData(true)}
                    disabled={isRefreshing}
                    className="hidden md:inline-flex items-center gap-1.5 text-xs text-admin-muted hover:text-admin-foreground transition-colors"
                    title="Refresh data"
                  >
                    <RefreshCw className={cn('w-3 h-3 text-admin-primary', isRefreshing && 'animate-spin')} />
                    <span>{isRefreshing ? 'Refreshing…' : `Updated ${lastUpdatedText}`}</span>
                  </button>
                </div>
              </div>

              {/* Contextual Actions */}
              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  href="/dashboard/money?action=record"
                  className="font-medium text-xs"
                  leftIcon={<DollarSign className="w-3.5 h-3.5 text-admin-primary" />}
                >
                  Record Payment
                </Button>
                <Button
                  size="sm"
                  onClick={() => setLeaseWizardOpen(true)}
                  className="font-medium text-xs"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  New Lease
                </Button>
              </div>
            </div>

            {/* RHYTHM 1: SUMMARY — 4 Intentional High-Level Metrics */}
            <section aria-label="Portfolio Summary Metrics" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-admin-muted">
                  Executive Summary
                </h2>
                <span className="text-[11px] text-admin-muted font-mono">
                  Currency: AUD ($)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1: Net Cash Flow */}
                <div className="rounded-2xl border border-border bg-surface p-5 shadow-2xs hover:border-admin-primary/40 transition-all flex flex-col justify-between min-h-[120px]">
                  <div className="flex items-center justify-between text-admin-muted">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Net Cash Flow
                    </span>
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border',
                      isNetPositive
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                    )}>
                      {isNetPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {isNetPositive ? 'Surplus' : 'Deficit'}
                    </span>
                  </div>
                  <div className="my-2">
                    <p className={cn(
                      'font-heading text-2xl sm:text-[26px] font-bold tabular-nums tracking-tight',
                      isNetPositive ? 'text-admin-foreground' : 'text-rose-600 dark:text-rose-400'
                    )}>
                      {formatCurrency(netCashFlow)}
                    </p>
                  </div>
                  <p className="text-[11px] text-admin-muted truncate">
                    Income minus all operating expenses
                  </p>
                </div>

                {/* Metric 2: Income */}
                <div className="rounded-2xl border border-border bg-surface p-5 shadow-2xs hover:border-admin-primary/40 transition-all flex flex-col justify-between min-h-[120px]">
                  <div className="flex items-center justify-between text-admin-muted">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Total Income
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {incomeRatio}% of volume
                    </span>
                  </div>
                  <div className="my-2">
                    <p className="font-heading text-2xl sm:text-[26px] font-bold tabular-nums tracking-tight text-admin-foreground">
                      {formatCurrency(totalRevenue)}
                    </p>
                  </div>
                  <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-admin-teal h-full rounded-full transition-all duration-500"
                      style={{ width: `${incomeRatio}%` }}
                    />
                  </div>
                </div>

                {/* Metric 3: Operating Expenses */}
                <div className="rounded-2xl border border-border bg-surface p-5 shadow-2xs hover:border-admin-primary/40 transition-all flex flex-col justify-between min-h-[120px]">
                  <div className="flex items-center justify-between text-admin-muted">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Operating Expenses
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {expenseRatio}% of volume
                    </span>
                  </div>
                  <div className="my-2">
                    <p className="font-heading text-2xl sm:text-[26px] font-bold tabular-nums tracking-tight text-admin-foreground">
                      {formatCurrency(totalExpenses)}
                    </p>
                  </div>
                  <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${expenseRatio}%` }}
                    />
                  </div>
                </div>

                {/* Metric 4: Active Tenancies */}
                <div className="rounded-2xl border border-border bg-surface p-5 shadow-2xs hover:border-admin-primary/40 transition-all flex flex-col justify-between min-h-[120px]">
                  <div className="flex items-center justify-between text-admin-muted">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Active Tenancies
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-admin-primary">
                      <Users className="w-3 h-3" />
                      {activeTenantsCount} Tenant{activeTenantsCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="my-2">
                    <p className="font-heading text-2xl sm:text-[26px] font-bold tabular-nums tracking-tight text-admin-foreground">
                      {activeLeasesCount} Active {activeLeasesCount === 1 ? 'Lease' : 'Leases'}
                    </p>
                  </div>
                  <p className="text-[11px] text-admin-muted truncate">
                    {reports?.monthlyRent ? `${formatCurrency(reports.monthlyRent)}/mo rent roll` : 'Lease contracts in good standing'}
                  </p>
                </div>
              </div>
            </section>

            {/* RHYTHM 2: TREND — Visual Cash Flow Analysis */}
            <section aria-label="Visual Financial Performance" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-admin-muted">
                  Cash Flow Analysis
                </h2>
                <Link
                  href="/dashboard/money"
                  className="text-xs font-medium text-admin-primary hover:underline inline-flex items-center gap-1"
                >
                  View Full Ledger <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <CashFlowChart
                totalIncome={totalRevenue}
                totalExpenses={totalExpenses}
                outstandingIncome={outstandingBalance}
                activeLeasesCount={activeLeasesCount}
                totalPropertiesCount={availableProperties.length}
              />
            </section>

            {/* RHYTHM 3: BREAKDOWN — Properties & Asset Performance */}
            <section aria-label="Portfolio Breakdown" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-admin-muted">
                  {selectedProperty ? 'Property Overview' : 'Portfolio Breakdown'}
                </h2>
                <Link
                  href="/dashboard/properties"
                  className="text-xs font-medium text-admin-primary hover:underline inline-flex items-center gap-1"
                >
                  Manage Portfolio <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {!selectedProperty ? (
                <PropertiesOverviewCard
                  properties={availableProperties}
                  leases={leases}
                />
              ) : (
                /* Focused Single Property Card with contextual info */
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-2xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
                    <div className="flex items-center gap-3.5">
                      <div className="h-12 w-12 rounded-xl bg-admin-primary-soft text-admin-primary border border-admin-primary/20 flex items-center justify-center shrink-0">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-admin-foreground leading-tight">
                          {selectedProperty.propertyName}
                        </h3>
                        <p className="text-body-sm text-admin-muted flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-admin-muted" />
                          <span>Property ID: {selectedProperty.propertyId.slice(0, 8)}</span>
                          {selectedProperty.organizationName && (
                            <>
                              <span className="mx-1">·</span>
                              <span>{selectedProperty.organizationName}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {selectedProperty.status || 'Active'}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        href={`/dashboard/properties/${selectedProperty.propertyId}`}
                        className="text-xs font-medium"
                        rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
                      >
                        Property Details
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                    <div>
                      <p className="text-xs font-medium text-admin-muted">Your Role</p>
                      <p className="text-sm font-bold text-admin-foreground capitalize mt-0.5">
                        {selectedProperty.role || 'Owner'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-admin-muted">Active Leases</p>
                      <p className="text-sm font-bold text-admin-foreground mt-0.5 font-mono">
                        {leases.filter((l) => l.status === 'active').length}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-admin-muted">Monthly Rent</p>
                      <p className="text-sm font-bold text-admin-foreground mt-0.5 font-mono">
                        {formatCurrency(reports?.monthlyRent || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-admin-muted">Outstanding</p>
                      <p className="text-sm font-bold text-admin-foreground mt-0.5 font-mono">
                        {formatCurrency(outstandingBalance)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* RHYTHM 4: ACTIONABLE ITEMS & AUDIT FEED */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Needs Attention & Upcomings (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-2xs">
                  <div className="flex items-center justify-between pb-3.5 border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <h3 className="text-sm font-semibold text-admin-foreground">
                        Needs Attention
                      </h3>
                    </div>
                    {attentionItems.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {attentionItems.length} Pending
                      </span>
                    )}
                  </div>

                  {attentionItems.length === 0 ? (
                    <div className="py-8 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-admin-foreground">All caught up</p>
                      <p className="text-[11px] text-admin-muted">No overdue invoices, open maintenance, or expiring items.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border-subtle mt-1">
                      {attentionItems.map((item) => (
                        <div key={item.id} className="py-3 flex items-center justify-between gap-3 group">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-admin-foreground group-hover:text-admin-primary transition-colors truncate">
                              {item.label}
                            </p>
                            {item.sublabel && (
                              <p className="text-[11px] text-admin-muted truncate mt-0.5">
                                {item.sublabel}
                              </p>
                            )}
                          </div>
                          {item.href && (
                            <Link
                              href={item.href}
                              className="text-xs font-semibold text-admin-primary hover:underline shrink-0 inline-flex items-center gap-1"
                            >
                              Resolve <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upcoming Milestones */}
                {upcomingItems.length > 0 && (
                  <div className="rounded-2xl border border-border bg-surface p-5 shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-admin-muted" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-admin-muted">
                          Upcoming Milestones (Next 60 Days)
                        </h3>
                      </div>
                    </div>
                    <div className="divide-y divide-border-subtle mt-1">
                      {upcomingItems.map((item) => (
                        <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-admin-foreground truncate">
                              {item.label}
                            </p>
                            {item.sublabel && (
                              <p className="text-[11px] text-admin-muted truncate">{item.sublabel}</p>
                            )}
                          </div>
                          {item.href && (
                            <Link href={item.href} className="text-xs text-admin-muted hover:text-admin-foreground">
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Live Activity Audit (5 cols) */}
              <div className="lg:col-span-5 rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-2xs">
                <div className="flex items-center justify-between pb-3.5 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-admin-primary" />
                    <h3 className="text-sm font-semibold text-admin-foreground">
                      Recent Portfolio Activity
                    </h3>
                  </div>
                  <Link
                    href="/dashboard/activity"
                    className="text-xs font-medium text-admin-primary hover:underline"
                  >
                    View All
                  </Link>
                </div>

                {recentActivityLogs.length === 0 ? (
                  <div className="py-8 text-center space-y-1.5">
                    <Clock className="w-8 h-8 text-admin-muted mx-auto opacity-50" />
                    <p className="text-xs font-semibold text-admin-foreground">No recent activity</p>
                    <p className="text-[11px] text-admin-muted">Audit logs appear as transactions and leases are updated.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border-subtle mt-1">
                    {recentActivityLogs.slice(0, 6).map((log: any, idx: number) => {
                      const dateStr = log.created_at
                        ? new Date(log.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })
                        : '';
                      return (
                        <div key={log.id || idx} className="py-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-admin-foreground leading-tight line-clamp-1">
                              {log.action || 'Portfolio modification'}
                            </p>
                            <p className="text-[11px] text-admin-muted mt-0.5">
                              {log.entity_type ? `${log.entity_type.toUpperCase()} · ` : ''}{dateStr}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </PageContent>

      <CreateLeaseWizard isOpen={leaseWizardOpen} onClose={() => setLeaseWizardOpen(false)} />
    </PageLayout>
  );
}

export function DashboardOverview({
  userName,
  setupProgress,
  initialDashboardData,
}: {
  userName: string;
  setupProgress?: SetupProgress;
  initialDashboardData?: any;
}) {
  const { persona } = useAppContext();

  if (persona === 'manager') {
    return <ManagerDashboard userName={userName} />;
  }

  if (persona === 'staff') {
    return <StaffDashboard userName={userName} />;
  }

  return (
    <OwnerDashboard
      userName={userName}
      setupProgress={setupProgress}
      initialData={initialDashboardData}
    />
  );
}
