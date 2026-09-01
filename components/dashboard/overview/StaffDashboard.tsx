'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wrench,
  CheckSquare,
  ClipboardCheck,
  FolderOpen,
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

export function StaffDashboard({ userName }: { userName: string }) {
  const { selectedProperty } = usePropertyContext();
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof fetchDashboardOverview>> | null>(null);
  const [needsAttention, setNeedsAttention] = useState<Awaited<ReturnType<typeof fetchNeedsAttention>> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!selectedProperty) {
      setOverview(null);
      setNeedsAttention(null);
      return;
    }
    setIsLoading(true);
    Promise.all([
      fetchDashboardOverview(selectedProperty.propertyId),
      fetchNeedsAttention(selectedProperty.propertyId),
    ])
      .then(([overviewData, attentionData]) => {
        setOverview(overviewData);
        setNeedsAttention(attentionData);
      })
      .catch((err) => {
        console.error('Error fetching staff dashboard data:', err);
      })
      .finally(() => setIsLoading(false));
  }, [selectedProperty?.propertyId]);

  const stats = overview?.stats;
  const maintenanceItems = buildAttentionItems(needsAttention).filter(
    (item) => item.href.includes('maintenance') || item.href.includes('properties')
  );

  return (
    <PageContainer className="overflow-y-auto">
      <div className="space-y-6 pb-6">
        <div>
          <p className="text-body-sm text-admin-muted">Welcome back, {userName}</p>
          <p className="text-caption text-admin-muted mt-1">Staff view — your assigned work</p>
        </div>

        {selectedProperty && stats && (
          <div className="grid grid-cols-2 gap-4">
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
          </div>
        )}

        <NeedsAttentionSection items={maintenanceItems} isLoading={isLoading} />

        <section className="space-y-4">
          <h2 className="workspace-page-title">Your Tasks</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <QuickAction label="My Tasks" href="/dashboard/tasks" icon={CheckSquare} description="View assigned tasks" />
            <QuickAction label="Maintenance Queue" href="/dashboard/maintenance" icon={Wrench} description="Work on open requests" />
            <QuickAction label="Inspections" href="/dashboard/inspections" icon={ClipboardCheck} description="Scheduled inspections" />
            <QuickAction label="Documents" href="/dashboard/documents" icon={FolderOpen} description="Access property documents" />
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
