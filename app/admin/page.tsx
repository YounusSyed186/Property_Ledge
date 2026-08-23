import React from 'react';
import { getAdminOverviewMetrics } from '@/lib/admin/queries';
import {
  PageContainer,
  PageHeader,
  StatCard,
  Card,
  CardHeader,
  CardContent,
  Badge,
  EmptyState,
} from '@/components/admin/ui';
import {
  Users,
  CreditCard,
  Layers,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0;

export default async function AdminDashboardPage() {
  let metrics: any = null;
  let metricsError = false;

  try {
    metrics = await getAdminOverviewMetrics();
  } catch (err) {
    metricsError = true;
  }

  const totalSubscriptions =
    (metrics?.activeSubscriptions || 0) +
    (metrics?.trialingSubscriptions || 0) +
    (metrics?.pastDueSubscriptions || 0) +
    (metrics?.canceledSubscriptions || 0);

  return (
    <PageContainer>
      {/* ============ KPI CARDS ============ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Accounts"
          value={metrics?.totalAccounts ?? '—'}
          icon={<Users className="w-5 h-5" />}
          hint="Registered platform accounts"
        />
        <StatCard
          label="Active Subscriptions"
          value={metrics?.activeSubscriptions ?? '—'}
          icon={<CreditCard className="w-5 h-5" />}
          hint={`${totalSubscriptions} total subscriptions`}
        />
        <StatCard
          label="Available Plans"
          value={metrics?.availablePlans ?? '—'}
          icon={<Layers className="w-5 h-5" />}
          hint="Active subscription tiers"
        />
        <StatCard
          label="Pending Review"
          value={metrics?.pastDueSubscriptions ?? '—'}
          icon={<Clock className="w-5 h-5" />}
          hint="Subscriptions past due"
        />
      </div>

      {/* ============ SUBSCRIPTION HEALTH ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Subscription Health"
            description="Distribution of subscription lifecycle states"
            icon={<Activity className="w-5 h-5" />}
          />
          <CardContent>
            {metricsError ? (
              <EmptyState
                icon={<AlertTriangle className="w-6 h-6" />}
                title="Unable to load metrics"
                description="There was an issue fetching subscription health data."
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-admin-surface-subtle border border-admin-border">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-admin-success" />
                    <span className="text-body-sm font-medium text-admin-foreground">Active</span>
                  </div>
                  <span className="text-body-sm font-bold text-admin-foreground">{metrics?.activeSubscriptions ?? 0}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-admin-surface-subtle border border-admin-border">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-admin-info" />
                    <span className="text-body-sm font-medium text-admin-foreground">Trialing</span>
                  </div>
                  <span className="text-body-sm font-bold text-admin-foreground">{metrics?.trialingSubscriptions ?? 0}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-admin-surface-subtle border border-admin-border">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-admin-warning" />
                    <span className="text-body-sm font-medium text-admin-foreground">Past Due</span>
                  </div>
                  <span className="text-body-sm font-bold text-admin-foreground">{metrics?.pastDueSubscriptions ?? 0}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-admin-surface-subtle border border-admin-border">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-admin-danger" />
                    <span className="text-body-sm font-medium text-admin-foreground">Canceled</span>
                  </div>
                  <span className="text-body-sm font-bold text-admin-foreground">{metrics?.canceledSubscriptions ?? 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ============ QUICK ACTIONS ============ */}
        <Card>
          <CardHeader
            title="Quick Actions"
            description="Common administrative tasks"
            icon={<ShieldCheck className="w-5 h-5" />}
          />
          <CardContent className="space-y-2">
            <Link
              href="/admin/subscriptions"
              className="flex items-center justify-between p-3 rounded-lg border border-admin-border hover:border-admin-border-subtle hover:bg-admin-surface-elevated transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-admin-muted" />
                <span className="text-body-sm font-medium text-admin-foreground">Review Subscriptions</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-admin-muted group-hover:text-admin-foreground transition-colors" />
            </Link>
            <Link
              href="/admin/payments"
              className="flex items-center justify-between p-3 rounded-lg border border-admin-border hover:border-admin-border-subtle hover:bg-admin-surface-elevated transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-admin-muted" />
                <span className="text-body-sm font-medium text-admin-foreground">Verify Payments</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-admin-muted group-hover:text-admin-foreground transition-colors" />
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center justify-between p-3 rounded-lg border border-admin-border hover:border-admin-border-subtle hover:bg-admin-surface-elevated transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-admin-muted" />
                <span className="text-body-sm font-medium text-admin-foreground">Manage Users</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-admin-muted group-hover:text-admin-foreground transition-colors" />
            </Link>
            <Link
              href="/admin/plans"
              className="flex items-center justify-between p-3 rounded-lg border border-admin-border hover:border-admin-border-subtle hover:bg-admin-surface-elevated transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-admin-muted" />
                <span className="text-body-sm font-medium text-admin-foreground">Configure Plans</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-admin-muted group-hover:text-admin-foreground transition-colors" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ============ SYSTEM STATUS ============ */}
      <Card>
        <CardHeader
          title="System Status"
          description="Platform infrastructure and service health"
          icon={<TrendingUp className="w-5 h-5" />}
          action={<Badge variant="success" dot>Operational</Badge>}
        />
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-admin-surface-subtle border border-admin-border">
              <p className="text-caption text-admin-muted">Database</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="w-2 h-2 rounded-full bg-admin-success" />
                <span className="text-body-sm font-semibold text-admin-foreground">Healthy</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-admin-surface-subtle border border-admin-border">
              <p className="text-caption text-admin-muted">Authentication</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="w-2 h-2 rounded-full bg-admin-success" />
                <span className="text-body-sm font-semibold text-admin-foreground">Operational</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-admin-surface-subtle border border-admin-border">
              <p className="text-caption text-admin-muted">Billing Provider</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="w-2 h-2 rounded-full bg-admin-success" />
                <span className="text-body-sm font-semibold text-admin-foreground">Connected</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-admin-surface-subtle border border-admin-border">
              <p className="text-caption text-admin-muted">Webhook Events</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="w-2 h-2 rounded-full bg-admin-success" />
                <span className="text-body-sm font-semibold text-admin-foreground">Processing</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}