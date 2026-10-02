'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Building2,
  Plus,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ChevronRight,
  Receipt,
  FileText,
} from 'lucide-react';
import { Card, CardContent } from '@/components/admin/ui';
import { Button } from '@/components/admin/ui/Button';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { useAppContext } from '@/components/context/AppContextProvider';
import { formatCurrency } from '@/lib/format/currency';
import { fetchDashboardDataAction } from '@/app/actions/dashboard';
import { ManagerDashboard } from '@/components/dashboard/overview/ManagerDashboard';
import { StaffDashboard } from '@/components/dashboard/overview/StaffDashboard';
import { DashboardHeader } from '@/components/dashboard/overview/DashboardHeader';
import { TopKpiCards } from '@/components/dashboard/overview/TopKpiCards';
import { CashFlowAnalytics } from '@/components/dashboard/overview/CashFlowAnalytics';
import { PortfolioPerformanceSection } from '@/components/dashboard/overview/PortfolioPerformanceSection';
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
  const netCashFlow = Number(reports?.netCashFlow ?? (totalRevenue - totalExpenses));
  const outstandingBalance = Number(reports?.outstandingBalance || 0);
  const portfolioValue = Number(reports?.portfolioValue || 0);
  const incomeTrend = reports?.incomeTrend ?? null;
  const expenseTrend = reports?.expenseTrend ?? null;
  const monthlyBreakdown = reports?.monthlyBreakdown ?? [];
  const propertyBreakdown = reports?.propertyBreakdown ?? [];
  const occupancyRate = Number(reports?.occupancyRate ?? (activeLeasesCount > 0 ? 100 : 0));
  const categoryBreakdown = reports?.categoryBreakdown ?? {
    residential: availableProperties.length,
    commercial: 0,
    total: availableProperties.length,
  };

  return (
    <PageLayout>
      <PageContent>
        {showSetup && <SetupChecklist progress={setupProgress!} />}

        {propertyLoading || isLoading ? (
          <PageSkeleton />
        ) : !hasProperties ? (
          <Card className="border-dashed bg-white dark:bg-[#07111F] border-slate-200/80 dark:border-[#17283A] my-6 rounded-[24px]">
            <CardContent className="p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#008F83]/10 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/20">
                <Building2 className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">No properties in workspace</h3>
              <p className="mx-auto mb-6 max-w-md text-xs text-slate-500 dark:text-[#7F8B99] leading-relaxed">
                Add your first commercial or residential property to start tracking leases, recording tenant payments, and managing automated compliance.
              </p>
              <Button href="/dashboard/properties?new=true" size="md" leftIcon={<Plus className="h-4 w-4" />}>
                Create Your First Property
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 lg:space-y-7 pb-16">
            {/* 1. Page Header */}
            <DashboardHeader
              selectedProperty={selectedProperty}
              totalPropertiesCount={availableProperties.length}
              lastUpdatedText={lastUpdatedText}
              isRefreshing={isRefreshing}
              onRefresh={() => loadData(true)}
              onNewLease={() => setLeaseWizardOpen(true)}
            />

            {/* 2. Top KPI Row (3 Compact Cards) */}
            <TopKpiCards
              portfolioValue={portfolioValue}
              totalPropertiesCount={availableProperties.length}
              totalIncome={totalRevenue}
              totalExpenses={totalExpenses}
              incomeTrend={incomeTrend}
              expenseTrend={expenseTrend}
              monthlyBreakdown={monthlyBreakdown}
              selectedProperty={selectedProperty}
            />

            {/* 3. Main Chart & Financial Summary (8 / 4 Grid) */}
            <CashFlowAnalytics
              totalRevenue={totalRevenue}
              totalExpenses={totalExpenses}
              netCashFlow={netCashFlow}
              outstandingBalance={outstandingBalance}
              monthlyBreakdown={monthlyBreakdown}
              activeLeasesCount={activeLeasesCount}
            />

            {/* 4. Property Performance & Portfolio Allocation (8 / 4 Grid) */}
            <PortfolioPerformanceSection
              properties={availableProperties}
              propertyBreakdown={propertyBreakdown}
              occupancyRate={occupancyRate}
              categoryBreakdown={categoryBreakdown}
              activeLeasesCount={activeLeasesCount}
              activeTenantsCount={activeTenantsCount}
              selectedProperty={selectedProperty}
            />

            {/* 5. Needs Attention & Upcoming Milestones (Actionable Tray) */}
            {(attentionItems.length > 0 || upcomingItems.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
                {/* Needs Attention (7 cols) */}
                <div className="lg:col-span-7 rounded-[24px] border border-slate-200/80 dark:border-[#17283A] bg-white dark:bg-[#07111F] p-6 lg:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none">
                  <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-[#17283A]/80">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Needs attention
                      </h3>
                    </div>
                    {attentionItems.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        {attentionItems.length} pending
                      </span>
                    )}
                  </div>

                  {attentionItems.length === 0 ? (
                    <div className="py-6 text-center space-y-1.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">All caught up</p>
                      <p className="text-[11px] text-slate-400 dark:text-[#7F8B99]">No overdue invoices, open maintenance, or expiring items.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-[#17283A]/60 mt-1">
                      {attentionItems.map((item) => (
                        <div key={item.id} className="py-3 flex items-center justify-between gap-3 group">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#008F83] dark:group-hover:text-[#32D5C4] transition-colors truncate">
                              {item.label}
                            </p>
                            {item.sublabel && (
                              <p className="text-[11px] text-slate-400 dark:text-[#7F8B99] truncate mt-0.5">
                                {item.sublabel}
                              </p>
                            )}
                          </div>
                          {item.href && (
                            <Link
                              href={item.href}
                              className="text-xs font-semibold text-[#008F83] dark:text-[#32D5C4] hover:underline shrink-0 inline-flex items-center gap-1"
                            >
                              <span>Resolve</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upcoming Milestones (5 cols) */}
                {upcomingItems.length > 0 && (
                  <div className="lg:col-span-5 rounded-[24px] border border-slate-200/80 dark:border-[#17283A] bg-white dark:bg-[#07111F] p-6 lg:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none">
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-[#17283A]/80">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400 dark:text-[#7F8B99]" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Upcoming milestones
                        </h3>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-[#7F8B99]">
                        {upcomingItems.length} items
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-[#17283A]/60 mt-1">
                      {upcomingItems.slice(0, 4).map((item) => (
                        <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {item.label}
                            </p>
                            {item.sublabel && (
                              <p className="text-[10.5px] text-slate-400 dark:text-[#7F8B99] truncate">
                                {item.sublabel}
                              </p>
                            )}
                          </div>
                          {item.href && (
                            <Link
                              href={item.href}
                              className="text-[11px] font-semibold text-[#008F83] dark:text-[#32D5C4] hover:underline shrink-0"
                            >
                              View →
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </PageContent>

      <CreateLeaseWizard
        isOpen={leaseWizardOpen}
        onClose={() => setLeaseWizardOpen(false)}
        propertyId={propertyId || undefined}
        onSuccess={() => loadData(true)}
      />
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
  return (
    <OwnerDashboard
      userName={userName}
      setupProgress={setupProgress}
      initialData={initialDashboardData}
    />
  );
}
