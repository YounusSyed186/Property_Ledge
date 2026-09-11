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
  Home,
  Percent,
  Wallet,
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
import { useEntityCacheStore } from '@/lib/stores/useEntityCacheStore';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';
import { cn } from '@/lib/utils';

function QuickAction({ label, href, icon: Icon, description, onClick }: {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-admin-border bg-admin-surface hover:border-admin-primary/50 hover:shadow-md transition-all group">
      <div className="w-10 h-10 rounded-xl bg-admin-primary-soft flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-admin-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-admin-foreground group-hover:text-admin-primary transition-colors">{label}</p>
        {description && <p className="text-body-sm text-admin-muted mt-0.5">{description}</p>}
      </div>
      <ArrowUpRight className="w-4 h-4 text-admin-muted opacity-0 group-hover:opacity-100 transition-opacity" />
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

function OwnerDashboard({ userName, setupProgress }: { userName: string; setupProgress?: SetupProgress }) {
  const { selectedProperty, availableProperties, isLoading: propertyLoading } = usePropertyContext();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const cachedDashboard = useEntityCacheStore((s) => s.dashboard);
  const setCachedDashboard = useEntityCacheStore((s) => s.setDashboard);

  const propertyId = selectedProperty?.propertyId ?? null;
  const hasMatchingCache = cachedDashboard && 
    cachedDashboard.workspaceId === activeWorkspaceId && 
    cachedDashboard.propertyId === propertyId;

  const [overview, setOverview] = useState<any>(() => hasMatchingCache ? cachedDashboard.data.overview : null);
  const [reports, setReports] = useState<any>(() => hasMatchingCache ? cachedDashboard.data.reports : null);
  const [needsAttention, setNeedsAttention] = useState<any>(() => hasMatchingCache ? cachedDashboard.data.needsAttention : null);
  const [leases, setLeases] = useState<Array<{ id: string; end_date: string | null; status: string; unit?: { name?: string; unit_number?: string } }>>(
    () => hasMatchingCache ? (cachedDashboard.data.leases as any[]) : []
  );
  const [isLoading, setIsLoading] = useState(() => !hasMatchingCache);
  const [leaseWizardOpen, setLeaseWizardOpen] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const showSetup = setupProgress && !setupProgress.allComplete;

  useEffect(() => {
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
  const totalUnits = stats?.totalUnits ?? 0;
  const occupied = reports?.occupiedUnits ?? 0;
  const occupancyPct = totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0;
  const collected = reports?.totalRevenue ?? 0;
  const outstanding = reports?.outstandingBalance ?? 0;
  const expected = collected + outstanding;
  const collectionPct = expected > 0 ? Math.round((collected / expected) * 100) : 0;

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
    ? `Here's what's happening with ${selectedProperty.propertyName}.`
    : "Here's an overview of what's happening across your portfolio.";

  return (
    <PageLayout>
      <div className={cn('shrink-0', WORKSPACE_PAGE_HEADER)}>
        <DashboardHeader
          greeting={`${greeting}, ${userName.split(' ')[0]}`}
          subtitle={contextSubtitle}
          actions={
            <Button href="/dashboard/properties?new=true" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
              Add property
            </Button>
          }
        />
      </div>
      <PageContent>
        {showSetup && <SetupChecklist progress={setupProgress!} />}

        {propertyLoading || isLoading ? (
          <PageSkeleton />
        ) : !hasProperties ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Building2 className="mx-auto mb-3 h-12 w-12 text-admin-primary/60" />
              <h3 className="text-base font-semibold text-admin-foreground mb-1.5">No properties yet</h3>
              <p className="mx-auto mb-5 max-w-sm text-xs text-admin-muted leading-relaxed">
                Add your first property to start managing tenants, leases, and payments all in one place.
              </p>
              <Button href="/dashboard/properties?new=true" size="md" leftIcon={<Plus className="h-4 w-4" />}>
                Add property
              </Button>
            </CardContent>
          </Card>
        ) : stats ? (
          <div className="space-y-5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-admin-foreground">
                    {selectedProperty ? selectedProperty.propertyName : 'All Properties'} at a glance
                  </p>
                  <p className="text-[11px] text-admin-muted">Key numbers and daily operational metrics.</p>
                </div>
                <Link href="/dashboard/properties" className="hidden text-xs font-medium text-admin-primary hover:underline sm:block">
                  View properties →
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
                <CompactKpiCard label="Properties" value={availableProperties.length} href="/dashboard/properties" icon={Building2} accent="blue" />
                <CompactKpiCard label="Tenants" value={stats?.activeTenants ?? 0} href="/dashboard/tenants" icon={Users} accent="indigo" />
                <CompactKpiCard label="Active Leases" value={stats?.activeLeases ?? 0} href="/dashboard/leases" icon={Percent} accent="teal" />
                <CompactKpiCard label="Rent collected" value={formatCurrency(collected)} href="/dashboard/money" icon={Wallet} accent="blue" hint={outstanding > 0 ? `${formatCurrency(outstanding)} to collect` : undefined} />
              </div>
            </div>

            <SectionPanel
              title="Needs attention"
              action={
                attentionItems.length > 0 ? (
                  <span className="rounded-full bg-admin-warning-soft px-2 py-1 text-metadata font-semibold text-admin-warning">
                    {attentionItems.length} {attentionItems.length === 1 ? 'item' : 'items'}
                  </span>
                ) : (
                  <span className="rounded-full bg-admin-success-soft px-2 py-1 text-metadata font-semibold text-admin-success">All clear</span>
                )
              }
            >
                <NeedsAttentionSection items={attentionItems} />
            </SectionPanel>

            {upcomingItems.length > 0 && (
              <SectionPanel title="Upcoming">
                <AttentionPanel items={upcomingItems} emptyMessage="Nothing scheduled in the next 60 days." />
              </SectionPanel>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <SectionPanel title="Rent collection" action={<Button variant="soft" size="sm" href="/dashboard/money">View Payments</Button>}>
                <p className="mb-2 text-body-sm text-admin-muted">
                  {formatCurrency(collected)} collected · {formatCurrency(outstanding)} outstanding
                </p>
                <ProgressBar value={collectionPct} />
                <p className="mt-2 text-caption font-medium">{collectionPct}% collected</p>
              </SectionPanel>
              <SectionPanel title="Lease Status" action={<Button variant="soft" size="sm" href="/dashboard/properties">View Properties</Button>}>
                <p className="text-display font-heading font-semibold tabular-nums">{stats?.activeLeases ?? 0} Active</p>
                <p className="mt-1 text-body-sm text-admin-muted">Active leases across {availableProperties.length} standalone properties</p>
                <ProgressBar value={availableProperties.length > 0 ? Math.round(((stats?.activeLeases ?? 0) / availableProperties.length) * 100) : 0} accent="teal" className="mt-3" />
              </SectionPanel>
            </div>

            {activityItems.length > 0 && (
              <SectionPanel title="Recent activity" action={<Link href="/dashboard/activity" className="text-caption text-admin-primary hover:underline">View all</Link>}>
                <ActivityTimeline items={activityItems} />
              </SectionPanel>
            )}
          </div>
        ) : null}

        <section className="mt-6 space-y-3">
          <h2 className="text-section-title font-semibold text-admin-foreground">Quick actions</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction label="Add Property" href="/dashboard/properties?new=true" icon={Building2} description="Create a new property" />
            <QuickAction label="Add Tenant" href="/dashboard/people" icon={Users} description="Register a tenant" />
            <QuickAction label="Create Lease" icon={FileText} description="Start a lease" onClick={() => setLeaseWizardOpen(true)} />
            <QuickAction label="Record Payment" href="/dashboard/money?tab=payments" icon={DollarSign} description="Log a payment" />
          </div>
        </section>
      </PageContent>

      <CreateLeaseWizard isOpen={leaseWizardOpen} onClose={() => setLeaseWizardOpen(false)} />
    </PageLayout>
  );
}

export function DashboardOverview({
  userName,
  setupProgress,
}: {
  userName: string;
  setupProgress?: SetupProgress;
}) {
  const { persona } = useAppContext();

  if (persona === 'manager') {
    return <ManagerDashboard userName={userName} />;
  }

  if (persona === 'staff') {
    return <StaffDashboard userName={userName} />;
  }

  return <OwnerDashboard userName={userName} setupProgress={setupProgress} />;
}
