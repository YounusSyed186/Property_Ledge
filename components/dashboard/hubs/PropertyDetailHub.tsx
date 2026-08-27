'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Home, Users, Wallet, AlertTriangle } from 'lucide-react';
import { Button, StatusBadge, NotFoundState } from '@/components/admin/ui';
import { AdminDataGrid } from '@/components/admin/data-grid';
import {
  unitColumns,
  tenantColumns,
  leaseColumns,
  maintenanceColumns,
  documentColumns,
} from '@/components/dashboard/entities/config';
import { UnitDrawer } from '@/components/dashboard/units/UnitDrawer';
import {
  fetchDashboardProperty,
  fetchDashboardUnits,
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
import { cn } from '@/lib/utils';
import type { ColDef } from 'ag-grid-community';

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
  const [units, setUnits] = useState<Array<{ id: string }>>([]);
  const [tenants, setTenants] = useState<Array<{ id: string }>>([]);
  const [leases, setLeases] = useState<Array<{ id: string }>>([]);
  const [maintenance, setMaintenance] = useState<Array<{ id: string }>>([]);
  const [documents, setDocuments] = useState<Array<{ id: string }>>([]);
  const [activity, setActivity] = useState<Array<{ id: string; action: string; entity_type: string; created_at: string }>>([]);
  const [reports, setReports] = useState<Awaited<ReturnType<typeof fetchDashboardReports>> | null>(null);
  const [needsAttention, setNeedsAttention] = useState<Awaited<ReturnType<typeof fetchNeedsAttention>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreate, setIsCreate] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<{ id: string } | null>(null);

  const openFinances = () => {
    const property = availableProperties.find((p) => p.propertyId === propertyId);
    if (property) setSelectedProperty(property);
    router.push('/dashboard/money');
  };

  const loadAll = () => {
    setIsLoading(true);
    Promise.all([
      fetchDashboardProperty(propertyId),
      fetchDashboardUnits(propertyId),
      fetchDashboardTenants(propertyId),
      fetchDashboardLeases(propertyId),
      fetchDashboardMaintenance(propertyId),
      fetchDashboardDocuments(propertyId),
      fetchDashboardActivity(propertyId),
      fetchDashboardReports(propertyId),
      fetchNeedsAttention(propertyId),
    ])
      .then(([prop, u, t, l, m, d, a, r, na]) => {
        setProperty(prop as unknown as PropertyDetail);
        setUnits(u);
        setTenants(t);
        setLeases(l);
        setMaintenance(m);
        setDocuments(d);
        setActivity(a as unknown as typeof activity);
        setReports(r);
        setNeedsAttention(na);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, [propertyId]);

  const unitGridColumns = useMemo<ColDef[]>(() => [...unitColumns], []);

  if (isLoading) {
    return (
      <PageLayout>
        <PageContent><PageSkeleton /></PageContent>
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

  const occupied = reports?.occupiedUnits ?? 0;
  const totalUnits = units.length;
  const occupancyPct = totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0;
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
              {property.property_type || 'Residential'} · {totalUnits} Units
            </p>
          }
          status={<StatusBadge domain="lease" status={property.status === 'active' ? 'active' : 'draft'} />}
          actions={
            <EntityActions
              onEdit={() => router.push('/dashboard/properties')}
              addItems={[
                { label: 'Add Unit', onClick: () => { setSelectedUnit(null); setIsCreate(true); setIsDrawerOpen(true); } },
                { label: 'Add Tenant', onClick: () => router.push('/dashboard/people') },
                { label: 'Create Lease', onClick: () => router.push('/dashboard/leases') },
              ]}
              moreItems={[{ label: 'View in Portfolio', onClick: () => router.push('/dashboard/properties') }]}
            />
          }
        />
        <HubTabs
          tabs={[
            { value: 'overview', label: 'Overview' },
            { value: 'units', label: 'Units', count: units.length },
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
              <CompactKpiCard label="Units" value={totalUnits} icon={Home} accent="blue" />
              <CompactKpiCard label="Occupancy" value={`${occupancyPct}%`} hint={`${occupied} of ${totalUnits} occupied`} icon={Users} accent="teal" />
              <CompactKpiCard label="Monthly Rent" value={formatCurrency(reports?.monthlyRent ?? 0)} icon={Wallet} accent="indigo" />
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

        {activeTab === 'units' && (
          <ListPageGrid>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
              <div className="flex shrink-0 justify-end">
                <Button size="sm" onClick={() => { setSelectedUnit(null); setIsCreate(true); setIsDrawerOpen(true); }}>
                  <Plus className="mr-1 h-3 w-3" /> Add Unit
                </Button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                <AdminDataGrid
                  rowData={units}
                  columnDefs={unitGridColumns}
                  labelSingular="unit"
                  labelPlural="units"
                  onRowClick={(row) => router.push(`/dashboard/properties/${propertyId}/units/${row.id}`)}
                  getRowId={(p) => p.data.id}
                />
              </div>
            </div>
          </ListPageGrid>
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
          <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
          <SectionPanel title="Finances" action={
            <button type="button" onClick={openFinances} className="text-[12px] text-admin-primary hover:underline">
              Open Finances
            </button>
          }>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <CompactKpiCard label="Collected" value={formatCurrency(reports?.totalRevenue ?? 0)} accent="teal" />
              <CompactKpiCard label="Outstanding" value={formatCurrency(reports?.outstandingBalance ?? 0)} accent="blue" />
              <CompactKpiCard label="Expenses" value={formatCurrency(reports?.totalExpenses ?? 0)} accent="neutral" />
            </div>
          </SectionPanel>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <ListPageGrid>
            <AdminDataGrid
              rowData={maintenance}
              columnDefs={maintenanceColumns}
              labelSingular="request"
              labelPlural="requests"
              onRowClick={(row) => router.push(`/dashboard/maintenance/${row.id}`)}
              getRowId={(p) => p.data.id}
            />
          </ListPageGrid>
        )}

        {activeTab === 'inspections' && (
          <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
          <SectionPanel title="Inspections">
            <p className="text-[13px] text-admin-muted">
              <Link href="/dashboard/inspections" className="text-admin-primary hover:underline">View all inspections</Link> for this property.
            </p>
          </SectionPanel>
          </div>
        )}

        {activeTab === 'documents' && (
          <ListPageGrid>
            <AdminDataGrid
              rowData={documents}
              columnDefs={documentColumns}
              labelSingular="document"
              labelPlural="documents"
              getRowId={(p) => p.data.id}
            />
          </ListPageGrid>
        )}

        {activeTab === 'activity' && (
          <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
          <SectionPanel title="Activity log">
            <ActivityTimeline items={activityItems} emptyMessage="No activity recorded yet." />
          </SectionPanel>
          </div>
        )}
      </PageContent>

      <UnitDrawer
        entity={selectedUnit}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={() => { setIsDrawerOpen(false); loadAll(); }}
        propertyId={propertyId}
        isCreate={isCreate}
      />
    </PageLayout>
  );
}
