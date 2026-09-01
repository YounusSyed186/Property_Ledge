'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Home, Users, Wallet, AlertTriangle, DollarSign, Wrench, ClipboardCheck, FolderOpen, Activity } from 'lucide-react';
import { StatusBadge, NotFoundState } from '@/components/admin/ui';
import { AdminDataGrid } from '@/components/admin/data-grid';
import { ComingSoonPage } from '@/components/dashboard/ComingSoonPage';
import {
  tenantColumns,
  leaseColumns,
} from '@/components/dashboard/entities/config';
import {
  fetchDashboardProperty,
  fetchDashboardTenants,
  fetchDashboardLeases,
  fetchDashboardMaintenance,
  fetchDashboardDocuments,
  fetchDashboardActivity,
  fetchDashboardReports,
  fetchNeedsAttention,
} from '@/app/actions/dashboard';
import { formatCurrency } from '@/lib/format/currency';
import {
  PageLayout,
  PageContent,
  EntityDetailHeader,
  HubTabs,
  CompactKpiCard,
  SectionPanel,
  ActivityTimeline,
  EntityActions,
  PageSkeleton,
  WORKSPACE_PAGE_HEADER,
  ListPageGrid,
} from '@/components/workspace';
import { NeedsAttentionSection, buildAttentionItems } from '@/components/dashboard/overview/NeedsAttentionSection';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { TenancySetupWizard } from '@/components/dashboard/workflows/TenancySetupWizard';
import { CreateLeaseWizard } from '@/components/dashboard/workflows/CreateLeaseWizard';
import { cn } from '@/lib/utils';

interface PropertyDetailHubProps {
  propertyId: string;
}

type PropertyDetail = {
  id: string;
  name: string;
  property_type: string | null;
  status: string;
  address_line_1: string;
  city: string;
  state: string;
  postal_code: string;
  description: string | null;
};

export function PropertyDetailHub({ propertyId }: PropertyDetailHubProps) {
  const router = useRouter();
  const { availableProperties, setSelectedProperty } = usePropertyContext();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [tenants, setTenants] = useState<Array<{ id: string }>>([]);
  const [leases, setLeases] = useState<Array<{ id: string }>>([]);
  const [maintenance, setMaintenance] = useState<Array<{ id: string }>>([]);
  const [documents, setDocuments] = useState<Array<{ id: string }>>([]);
  const [activity, setActivity] = useState<Array<{ id: string; action: string; entity_type: string; created_at: string }>>([]);
  const [reports, setReports] = useState<Awaited<ReturnType<typeof fetchDashboardReports>> | null>(null);
  const [needsAttention, setNeedsAttention] = useState<Awaited<ReturnType<typeof fetchNeedsAttention>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const [isTenancyWizardOpen, setIsTenancyWizardOpen] = useState(false);
  const [isCreateLeaseWizardOpen, setIsCreateLeaseWizardOpen] = useState(false);

  const loadAll = () => {
    setIsLoading(true);
    setLoadError(null);
    Promise.all([
      fetchDashboardProperty(propertyId),
      fetchDashboardTenants(propertyId),
      fetchDashboardLeases(propertyId),
      fetchDashboardMaintenance(propertyId),
      fetchDashboardDocuments(propertyId),
      fetchDashboardActivity(propertyId),
      fetchDashboardReports(propertyId),
      fetchNeedsAttention(propertyId),
    ])
      .then(([prop, t, l, m, d, a, r, na]) => {
        setProperty(prop as unknown as PropertyDetail);
        setTenants(t);
        setLeases(l);
        setMaintenance(m);
        setDocuments(d);
        setActivity(a as unknown as typeof activity);
        setReports(r);
        setNeedsAttention(na);
      })
      .catch((err) => {
        console.error('Failed to load property detail:', err);
        setLoadError(err?.message || 'Failed to load property details. Please try again.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, [propertyId]);

  if (isLoading) {
    return (
      <PageLayout>
        <PageContent><PageSkeleton /></PageContent>
      </PageLayout>
    );
  }

  if (loadError) {
    return (
      <PageLayout>
        <PageContent>
          <div className="p-8 max-w-lg mx-auto text-center space-y-4 rounded-2xl bg-admin-surface-elevated border border-admin-border shadow-elevation-2">
            <h2 className="text-lg font-bold text-admin-foreground">Unable to load property</h2>
            <p className="text-xs text-admin-muted">{loadError}</p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={loadAll}
                className="px-4 py-2 rounded-xl bg-admin-primary text-black font-semibold text-xs hover:bg-admin-primary/90 transition-all"
              >
                Retry
              </button>
              <Link
                href="/dashboard/properties"
                className="px-4 py-2 rounded-xl bg-admin-surface-subtle border border-admin-border text-admin-foreground font-semibold text-xs hover:bg-admin-surface transition-all"
              >
                Back to Properties
              </Link>
            </div>
          </div>
        </PageContent>
      </PageLayout>
    );
  }

  if (!property) {
    return (
      <PageLayout>
        <PageContent>
          <NotFoundState
            title="Property not found"
            action={<Link href="/dashboard/properties" className="text-admin-primary text-sm hover:underline">Back to Properties</Link>}
          />
        </PageContent>
      </PageLayout>
    );
  }

  const activeLease = leases.find((l: Record<string, unknown>) => l.status === 'active');
  const isOccupied = !!activeLease;
  const attentionItems = buildAttentionItems(needsAttention);

  const activityItems = activity.slice(0, 8).map((log) => ({
    id: log.id,
    title: `${log.action} · ${log.entity_type}`,
    time: new Date(log.created_at).toLocaleString(),
  }));

  return (
    <PageLayout>
      <div className={cn('shrink-0 space-y-4', WORKSPACE_PAGE_HEADER)}>
        <EntityDetailHeader
          breadcrumb={[
            { label: 'Properties', href: '/dashboard/properties' },
            { label: property.name },
          ]}
          title={property.name}
          subtitle={`${property.address_line_1} · ${property.city}`}
          identitySurface
          meta={
            <p className="text-[12px] text-admin-muted">
              {property.property_type || 'Standalone Property'} · {isOccupied ? 'Occupied' : 'Vacant'}
            </p>
          }
          status={<StatusBadge domain="lease" status={isOccupied ? 'active' : 'draft'} />}
          actions={
            <EntityActions
              onEdit={() => router.push('/dashboard/properties')}
              addItems={[
                { label: 'Setup Tenancy / Tenant', onClick: () => setIsTenancyWizardOpen(true) },
                { label: 'Create Lease', onClick: () => setIsCreateLeaseWizardOpen(true) },
              ]}
              moreItems={[{ label: 'View in Portfolio', onClick: () => router.push('/dashboard/properties') }]}
            />
          }
        />
        <HubTabs
          tabs={[
            { value: 'overview', label: 'Overview' },
            { value: 'tenants', label: 'Tenants', count: tenants.length },
            { value: 'leases', label: 'Leases', count: leases.length },
            { value: 'finances', label: 'Finances' },
            { value: 'maintenance', label: 'Maintenance', count: maintenance.length },
            { value: 'inspections', label: 'Inspections' },
            { value: 'documents', label: 'Documents', count: documents.length },
            { value: 'activity', label: 'Activity' },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <PageContent fill>
        {activeTab === 'overview' && (
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <CompactKpiCard label="Status" value={isOccupied ? 'Occupied' : 'Vacant'} icon={Home} accent={isOccupied ? 'teal' : 'amber'} />
              <CompactKpiCard label="Tenants" value={tenants.length} icon={Users} accent="indigo" />
              <CompactKpiCard label="Monthly Rent" value={formatCurrency(reports?.monthlyRent ?? 0)} icon={Wallet} accent="teal" />
              <CompactKpiCard label="Outstanding" value={formatCurrency(reports?.outstandingBalance ?? 0)} icon={AlertTriangle} accent="amber" />
            </div>
            {attentionItems.length > 0 && (
              <SectionPanel title="Needs attention">
                <NeedsAttentionSection items={attentionItems} />
              </SectionPanel>
            )}
            <SectionPanel title="Recent activity">
              <ActivityTimeline items={activityItems} />
            </SectionPanel>
            <SectionPanel title="Property information">
              <div className="space-y-1 text-[13px]">
                <p><span className="text-admin-muted">Type:</span> {property.property_type || '—'}</p>
                <p><span className="text-admin-muted">Address:</span> {property.address_line_1}, {property.city} {property.state} {property.postal_code}</p>
                {property.description && <p><span className="text-admin-muted">Description:</span> {property.description}</p>}
              </div>
            </SectionPanel>
          </div>
        )}

        {activeTab === 'tenants' && (
          <ListPageGrid>
            <AdminDataGrid
              rowData={tenants}
              columnDefs={tenantColumns}
              labelSingular="tenant"
              labelPlural="tenants"
              onRowClick={(row) => router.push(`/dashboard/people/${row.id}`)}
              getRowId={(p) => p.data.id}
            />
          </ListPageGrid>
        )}

        {activeTab === 'leases' && (
          <ListPageGrid>
            <AdminDataGrid
              rowData={leases}
              columnDefs={leaseColumns}
              labelSingular="lease"
              labelPlural="leases"
              onRowClick={(row) => router.push(`/dashboard/leases/${row.id}`)}
              getRowId={(p) => p.data.id}
            />
          </ListPageGrid>
        )}

        {activeTab === 'finances' && (
          <ComingSoonPage
            title="Property Finances"
            description="Detailed financial tracking per property — rent collected, outstanding balances, and expenses — is coming soon."
            icon={DollarSign}
          />
        )}

        {activeTab === 'maintenance' && (
          <ComingSoonPage
            title="Maintenance"
            description="Track and manage maintenance requests for this property. Full maintenance management is coming soon."
            icon={Wrench}
          />
        )}

        {activeTab === 'inspections' && (
          <ComingSoonPage
            title="Inspections"
            description="Schedule and record property inspections with photos, checklists, and sign-offs. Coming soon."
            icon={ClipboardCheck}
          />
        )}

        {activeTab === 'documents' && (
          <ComingSoonPage
            title="Documents"
            description="Securely store leases, agreements, and property documents in one place. Coming soon."
            icon={FolderOpen}
          />
        )}

        {activeTab === 'activity' && (
          <ComingSoonPage
            title="Activity Log"
            description="A full audit trail of all actions taken on this property is coming soon."
            icon={Activity}
          />
        )}
      </PageContent>

      {/* Tenancy Setup Wizard Modal */}
      {isTenancyWizardOpen && property && (
        <TenancySetupWizard
          isOpen={true}
          propertyId={property.id}
          propertyName={property.name}
          propertyAddress={property.address_line_1}
          defaultRentAmount={reports?.monthlyRent || 0}
          onClose={() => setIsTenancyWizardOpen(false)}
          onSuccess={() => {
            loadAll();
          }}
        />
      )}

      {/* Create Lease Wizard Modal */}
      {isCreateLeaseWizardOpen && property && (
        <CreateLeaseWizard
          isOpen={true}
          propertyId={property.id}
          propertyName={property.name}
          onClose={() => setIsCreateLeaseWizardOpen(false)}
          onSuccess={() => {
            loadAll();
          }}
        />
      )}
    </PageLayout>
  );
}
