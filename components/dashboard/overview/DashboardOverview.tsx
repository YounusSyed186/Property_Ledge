'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  FileText,
  DollarSign,
  Plus,
  ArrowUpRight,
  Percent,
  Wallet,
  CreditCard,
  TrendingUp,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/admin/ui';
import { Button } from '@/components/admin/ui/Button';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { useAppContext } from '@/components/context/AppContextProvider';
import { formatCurrency } from '@/lib/format/currency';
import { fetchDashboardDataAction } from '@/app/actions/dashboard';
import { ManagerDashboard } from '@/components/dashboard/overview/ManagerDashboard';
import { StaffDashboard } from '@/components/dashboard/overview/StaffDashboard';
import { NeedsAttentionSection, buildAttentionItems, buildUpcomingItems } from '@/components/dashboard/overview/NeedsAttentionSection';
import { AttentionPanel } from '@/components/workspace/AttentionPanel';
import { CreateLeaseWizard } from '@/components/dashboard/workflows/CreateLeaseWizard';
import { SetupChecklist } from '@/components/dashboard/setup/SetupChecklist';
import type { SetupProgress } from '@/lib/dashboard/setupProgress';
import {
  PageLayout,
  PageContent,
  DashboardHeader,
  CompactKpiCard,
  SectionPanel,
  ProgressBar,
  PageSkeleton,
  ActivityTimeline,
  WORKSPACE_PAGE_HEADER,
} from '@/components/workspace';
import { CashFlowChart } from '@/components/dashboard/overview/CashFlowChart';
import { PropertiesOverviewCard } from '@/components/dashboard/overview/PropertiesOverviewCard';
import { useEntityCacheStore } from '@/lib/stores/useEntityCacheStore';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';
import { cn } from '@/lib/utils';

function QuickAction({
  label,
  href,
  icon: Icon,
  description,
  onClick,
}: {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-admin-border bg-admin-surface hover:border-admin-primary/50 hover:shadow-xs transition-all group cursor-pointer">
      <div className="w-9 h-9 rounded-lg bg-admin-primary-soft flex items-center justify-center shrink-0 border border-admin-primary/20 text-admin-primary transition-transform group-hover:scale-105">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-semibold text-admin-foreground group-hover:text-admin-primary transition-colors leading-tight">
          {label}
        </p>
        {description && <p className="text-[11px] text-admin-muted truncate mt-0.5">{description}</p>}
      </div>
      <ArrowUpRight className="w-3.5 h-3.5 text-admin-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }

  return <Link href={href || '#'}>{content}</Link>;
}

function OwnerDashboard({
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
  const hasMatchingCache = cachedDashboard &&
    cachedDashboard.workspaceId === activeWorkspaceId &&
    cachedDashboard.propertyId === propertyId;

  const [overview, setOverview] = useState<any>(() => initialData?.overview ?? (hasMatchingCache ? cachedDashboard.data.overview : null));
  const [reports, setReports] = useState<any>(() => initialData?.reports ?? (hasMatchingCache ? cachedDashboard.data.reports : null));
  const [needsAttention, setNeedsAttention] = useState<any>(() => initialData?.needsAttention ?? (hasMatchingCache ? cachedDashboard.data.needsAttention : null));
  const [leases, setLeases] = useState<Array<{ id: string; property_id?: string; end_date: string | null; status: string; rent_amount?: number; unit?: { name?: string; unit_number?: string } }>>(
    () => initialData?.leases ?? (hasMatchingCache ? (cachedDashboard.data.leases as any[]) : [])
  );
  const [isLoading, setIsLoading] = useState(() => !initialData && !hasMatchingCache);
  const isInitialMount = React.useRef(true);
  const [leaseWizardOpen, setLeaseWizardOpen] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const showSetup = setupProgress && !setupProgress.allComplete;

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialData) {
        setCachedDashboard(initialData, activeWorkspaceId, propertyId);
        return;
      }
    }
    if (!hasMatchingCache) {
      setIsLoading(true);
    }
    fetchDashboardDataAction(propertyId)
      .then((data) => {
        setOverview(data.overview);
        setNeedsAttention(data.needsAttention);
        setReports(data.reports);
        setLeases(data.leases as typeof leases);
        setCachedDashboard(data, activeWorkspaceId, propertyId);
      })
      .catch((err) => {
        console.error('Error fetching dashboard data:', err);
      })
      .finally(() => setIsLoading(false));
  }, [propertyId, activeWorkspaceId]);

  const stats = overview?.stats;
  const hasProperties = availableProperties.length > 0;
  const attentionItems = buildAttentionItems(needsAttention);
  const upcomingItems = buildUpcomingItems(needsAttention, leases);

  // Financial calculations
  const totalIncome = reports?.totalRevenue ?? 0;
  const totalExpenses = reports?.totalExpenses ?? 0;
  const netCashFlow = totalIncome - totalExpenses;
  const outstandingIncome = reports?.outstandingBalance ?? 0;
  const activeLeasesCount = stats?.activeLeases ?? 0;
  const activeTenantsCount = stats?.activeTenants ?? 0;

  const activityItems = (overview?.recentActivity || []).slice(0, 6).map((log: Record<string, unknown>) => {
    const action = String(log.action || '');
    const lower = action.toLowerCase();
    let tone: 'default' | 'success' | 'warning' | 'danger' = 'default';
    if (lower.includes('delete') || lower.includes('remove')) tone = 'danger';
    else if (lower.includes('create') || lower.includes('add') || lower.includes('paid')) tone = 'success';
    else if (lower.includes('update') || lower.includes('edit')) tone = 'warning';
    return {
      id: String((log as { id: string }).id),
      title: action,
      detail: String((log as { entity_type: string }).entity_type),
      time: new Date(String((log as { created_at: string }).created_at)).toLocaleString(),
      tone,
    };
  });

  const contextSubtitle = selectedProperty
    ? `Financial and operational overview for ${selectedProperty.propertyName}.`
    : `Portfolio overview across ${availableProperties.length} managed ${availableProperties.length === 1 ? 'property' : 'properties'}.`;

  return (
    <PageLayout>
      <div className={cn('shrink-0', WORKSPACE_PAGE_HEADER)}>
        <DashboardHeader
          greeting={`${greeting}, ${userName.split(' ')[0]}`}
          subtitle={contextSubtitle}
          actions={
            <div className="flex items-center gap-2">
              <Button href="/dashboard/money?tab=payments" variant="secondary" size="sm" leftIcon={<DollarSign className="h-3.5 w-3.5" />}>
                Record Payment
              </Button>
              <Button href="/dashboard/properties?new=true" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                Add Property
              </Button>
            </div>
          }
        />
      </div>

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
        ) : stats ? (
          <div className="space-y-6">
            {/* 1. Executive KPI Row (Section 10) */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-admin-foreground">
                    {selectedProperty ? selectedProperty.propertyName : 'Portfolio Executive Summary'}
                  </p>
                  <p className="text-[11px] text-admin-muted">Key financial metrics and daily operational health.</p>
                </div>
                <Link href="/dashboard/reports" className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-admin-primary hover:underline">
                  <span>Full Financial Report</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
                <CompactKpiCard
                  label="Total Income"
                  value={formatCurrency(totalIncome)}
                  href="/dashboard/money"
                  icon={TrendingUp}
                  accent="teal"
                  hint={outstandingIncome > 0 ? `${formatCurrency(outstandingIncome)} outstanding` : 'All realized'}
                />
                <CompactKpiCard
                  label="Total Expenses"
                  value={formatCurrency(totalExpenses)}
                  href="/dashboard/expenses"
                  icon={CreditCard}
                  accent="rose"
                  hint="Operating & vendor costs"
                />
                <CompactKpiCard
                  label="Net Cash Flow"
                  value={formatCurrency(netCashFlow)}
                  href="/dashboard/money"
                  icon={Wallet}
                  accent={netCashFlow >= 0 ? 'emerald' : 'amber'}
                  trend={{ value: netCashFlow >= 0 ? 'Surplus' : 'Deficit', positive: netCashFlow >= 0 }}
                />
                <CompactKpiCard
                  label="Properties Managed"
                  value={availableProperties.length}
                  href="/dashboard/properties"
                  icon={Building2}
                  accent="blue"
                  hint={`${activeLeasesCount} active lease${activeLeasesCount === 1 ? '' : 's'}`}
                />
              </div>
            </div>

            {/* 2. Visual Financial Data & Cash Flow Performance (Section 11) */}
            <CashFlowChart
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              outstandingIncome={outstandingIncome}
              activeLeasesCount={activeLeasesCount}
              totalPropertiesCount={availableProperties.length}
            />

            {/* 3. Action Items: Needs Attention & Upcoming (Section 14) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-7">
                <SectionPanel
                  title="Needs Attention"
                  action={
                    attentionItems.length > 0 ? (
                      <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        {attentionItems.length} {attentionItems.length === 1 ? 'Action' : 'Actions'}
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        All Clear
                      </span>
                    )
                  }
                >
                  <NeedsAttentionSection items={attentionItems} />
                </SectionPanel>
              </div>

              <div className="lg:col-span-5">
                <SectionPanel
                  title="Upcoming Events"
                  action={
                    upcomingItems.length > 0 ? (
                      <span className="text-[10px] font-medium text-admin-muted">Next 60 Days</span>
                    ) : undefined
                  }
                >
                  <AttentionPanel
                    items={upcomingItems}
                    emptyMessage="No upcoming lease renewals or due dates in next 60 days."
                  />
                </SectionPanel>
              </div>
            </div>

            {/* 4. Properties Overview (Section 15) */}
            {!selectedProperty && (
              <PropertiesOverviewCard
                properties={availableProperties}
                leases={leases}
              />
            )}

            {/* 5. Recent Activity & Quick Actions (Sections 13, 18, 19) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Activity Timeline (7 cols) */}
              <div className="lg:col-span-7">
                <SectionPanel
                  title="Recent Activity"
                  action={
                    <Link href="/dashboard/activity" className="text-[11px] font-medium text-admin-primary hover:underline">
                      View Audit Log
                    </Link>
                  }
                >
                  <ActivityTimeline items={activityItems} />
                </SectionPanel>
              </div>

              {/* Quick Actions (5 cols) */}
              <div className="lg:col-span-5">
                <SectionPanel title="Quick Actions">
                  <div className="space-y-2">
                    <QuickAction
                      label="Add Property"
                      href="/dashboard/properties?new=true"
                      icon={Building2}
                      description="Create and configure a new property"
                    />
                    <QuickAction
                      label="Register Tenant"
                      href="/dashboard/people"
                      icon={Users}
                      description="Add a new tenant profile"
                    />
                    <QuickAction
                      label="Create Lease"
                      icon={FileText}
                      description="Set terms and start a lease agreement"
                      onClick={() => setLeaseWizardOpen(true)}
                    />
                    <QuickAction
                      label="Record Transaction"
                      href="/dashboard/money?tab=payments"
                      icon={DollarSign}
                      description="Log rental payment or operating expense"
                    />
                  </div>
                </SectionPanel>
              </div>
            </div>
          </div>
        ) : null}
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
