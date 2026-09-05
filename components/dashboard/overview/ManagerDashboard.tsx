'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wrench,
  ClipboardCheck,
  CheckSquare,
  Users,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import { PageContainer, Card, CardContent } from '@/components/admin/ui';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { fetchDashboardOverview, fetchNeedsAttention } from '@/app/actions/dashboard';
import { NeedsAttentionSection, buildAttentionItems } from '@/components/dashboard/overview/NeedsAttentionSection';

function QuickAction({ label, href, icon: Icon, description }: {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 rounded-xl border border-admin-border bg-admin-surface hover:border-admin-primary/50 hover:shadow-md transition-all group"
    >
      <div className="w-10 h-10 rounded-xl bg-admin-primary-soft flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-admin-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-admin-foreground group-hover:text-admin-primary transition-colors">{label}</p>
        {description && <p className="text-body-sm text-admin-muted mt-0.5">{description}</p>}
      </div>
      <ArrowUpRight className="w-4 h-4 text-admin-muted opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

export function ManagerDashboard({ userName }: { userName: string }) {
  const { selectedProperty } = usePropertyContext();
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof fetchDashboardOverview>> | null>(null);
  const [needsAttention, setNeedsAttention] = useState<Awaited<ReturnType<typeof fetchNeedsAttention>> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const propertyId = selectedProperty?.propertyId ?? null;
    Promise.all([
      fetchDashboardOverview(propertyId),
      fetchNeedsAttention(propertyId),
    ])
      .then(([overviewData, attentionData]) => {
        setOverview(overviewData);
        setNeedsAttention(attentionData);
      })
      .catch((err) => {
        console.error('Error fetching manager dashboard data:', err);
      })
      .finally(() => setIsLoading(false));
  }, [selectedProperty?.propertyId]);

  const stats = overview?.stats;
  const attentionItems = buildAttentionItems(needsAttention);

  return (
    <PageContainer className="overflow-y-auto">
      <div className="space-y-6 pb-6">
        <div>
          <p className="text-body-sm text-admin-muted">Welcome back, {userName}</p>
          <p className="text-caption text-admin-muted mt-1">
            Manager view — {selectedProperty ? selectedProperty.propertyName : 'All Properties'} overview
          </p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-caption text-admin-muted">Open Maintenance</p>
                <p className="text-display font-heading tabular-nums">{stats.openMaintenanceRequests}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-caption text-admin-muted">Active Tenants</p>
                <p className="text-display font-heading tabular-nums">{stats.activeTenants}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-caption text-admin-muted">Active Leases</p>
                <p className="text-display font-heading tabular-nums">{stats.activeLeases}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-caption text-admin-muted">Outstanding Invoices</p>
                <p className="text-display font-heading tabular-nums">{stats.outstandingInvoices}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <NeedsAttentionSection items={attentionItems} isLoading={isLoading} />

        <section className="space-y-4">
          <h2 className="workspace-page-title">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <QuickAction label="Report Maintenance" href="/dashboard/maintenance" icon={Wrench} description="Log a new maintenance request" />
            <QuickAction label="Schedule Inspection" href="/dashboard/inspections" icon={ClipboardCheck} description="Book an inspection" />
            <QuickAction label="Add Tenant" href="/dashboard/people" icon={Users} description="Register a new tenant" />
            <QuickAction label="Create Lease" href="/dashboard/leases" icon={FileText} description="Start a new lease" />
            <QuickAction label="Manage Tasks" href="/dashboard/tasks" icon={CheckSquare} description="View and assign tasks" />
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
