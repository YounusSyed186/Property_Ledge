'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NotFoundState, StatusBadge, Button } from '@/components/admin/ui';
import { fetchDashboardUnit } from '@/app/actions/dashboard';
import { CreateLeaseWizard } from '@/components/dashboard/workflows/CreateLeaseWizard';
import { UnitDrawer } from '@/components/dashboard/units/UnitDrawer';
import { cn } from '@/lib/utils';
import {
  PageLayout,
  PageContent,
  EntityDetailHeader,
  HubTabs,
  SectionPanel,
  CompactKpiCard,
  EntityActions,
  PageSkeleton,
  WORKSPACE_PAGE_HEADER,
} from '@/components/workspace';

interface UnitDetailHubProps {
  propertyId: string;
  unitId: string;
}

type UnitDetail = {
  id: string;
  name: string;
  unit_number: string;
  unit_type: string | null;
  status: string;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  rent_amount: number | null;
  description: string | null;
  leases?: Array<{
    id: string;
    start_date: string;
    end_date: string;
    rent_amount: number;
    status: string;
    lease_tenants?: Array<{ tenant?: { id: string; first_name: string; last_name: string } }>;
  }>;
  maintenance_requests?: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    created_at: string;
  }>;
};

export function UnitDetailHub({ propertyId, unitId }: UnitDetailHubProps) {
  const router = useRouter();
  const [unit, setUnit] = useState<UnitDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [leaseWizardOpen, setLeaseWizardOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const loadUnit = () => {
    setIsLoading(true);
    fetchDashboardUnit(propertyId, unitId)
      .then((data) => setUnit(data as unknown as UnitDetail | null))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadUnit();
  }, [propertyId, unitId]);

  if (isLoading) {
    return (
      <PageLayout>
        <PageContent><PageSkeleton /></PageContent>
      </PageLayout>
    );
  }

  if (!unit) {
    return (
      <PageLayout>
        <PageContent>
          <NotFoundState
            title="Unit not found"
            action={
              <Link href={`/dashboard/properties/${propertyId}`} className="text-admin-primary hover:underline text-sm">
                Back to Property
              </Link>
            }
          />
        </PageContent>
      </PageLayout>
    );
  }

  const activeLease = unit.leases?.find((l) => l.status === 'active');
  const tenant = activeLease?.lease_tenants?.[0]?.tenant;
  const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}`.trim() : '—';
  const openMaintenance = unit.maintenance_requests?.filter((r) => r.status !== 'completed').length ?? 0;

  return (
    <PageLayout>
      <div className={cn('shrink-0', WORKSPACE_PAGE_HEADER)}>
        <EntityDetailHeader
          breadcrumb={[
            { label: 'Properties', href: '/dashboard/properties' },
            { label: 'Property', href: `/dashboard/properties/${propertyId}` },
            { label: 'Units' },
            { label: unit.name },
          ]}
          title={unit.name}
          subtitle={`Unit ${unit.unit_number}${unit.unit_type ? ` · ${unit.unit_type}` : ''}`}
          status={<StatusBadge domain="unit" status={unit.status} />}
          actions={
            <EntityActions
              onEdit={() => setIsEditOpen(true)}
              addItems={[
                { label: 'Create Lease', onClick: () => setLeaseWizardOpen(true) },
              ]}
              moreItems={[
                { label: 'View Maintenance', onClick: () => router.push('/dashboard/maintenance') },
              ]}
            />
          }
        />
        <div className="mt-4">
          <HubTabs
            tabs={[
              { value: 'overview', label: 'Overview' },
              { value: 'tenant', label: 'Tenant' },
              { value: 'lease', label: 'Lease' },
              { value: 'maintenance', label: 'Maintenance', count: unit.maintenance_requests?.length },
              { value: 'payments', label: 'Payments' },
              { value: 'documents', label: 'Documents' },
              { value: 'inspection', label: 'Inspection' },
              { value: 'activity', label: 'Activity' },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
        </div>
      </div>
      <PageContent>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <CompactKpiCard label="Status" value={unit.status} />
            <CompactKpiCard label="Current Tenant" value={tenantName} />
            <CompactKpiCard label="Rent" value={unit.rent_amount ? `₹${unit.rent_amount.toLocaleString()}` : '—'} />
            <CompactKpiCard label="Open Maintenance" value={openMaintenance} />
          </div>
        )}
        {activeTab === 'overview' && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <SectionPanel title="Unit Details">
              <div className="space-y-1 text-[13px]">
                <p><span className="text-admin-muted">Bedrooms:</span> {unit.bedrooms ?? '—'}</p>
                <p><span className="text-admin-muted">Bathrooms:</span> {unit.bathrooms ?? '—'}</p>
                <p><span className="text-admin-muted">Sq Ft:</span> {unit.square_feet ?? '—'}</p>
                {unit.description && <p><span className="text-admin-muted">Notes:</span> {unit.description}</p>}
              </div>
            </SectionPanel>
            <SectionPanel title="Current Lease">
              {activeLease ? (
                <div className="space-y-1 text-[13px]">
                  <p className="font-medium">{tenantName}</p>
                  <p className="text-admin-muted">
                    {activeLease.start_date} → {activeLease.end_date} · ₹{activeLease.rent_amount}/mo
                  </p>
                  <Button variant="soft" size="sm" onClick={() => router.push(`/dashboard/leases/${activeLease.id}`)}>
                    View lease
                  </Button>
                </div>
              ) : (
                <p className="text-[13px] text-admin-muted">No active lease.</p>
              )}
            </SectionPanel>
          </div>
        )}
        {activeTab === 'tenant' && (
          <SectionPanel title="Tenant">
            {tenant ? (
              <Button variant="soft" size="sm" onClick={() => router.push(`/dashboard/people/${tenant.id}`)}>
                {tenantName}
              </Button>
            ) : (
              <p className="text-[13px] text-admin-muted">No tenant assigned.</p>
            )}
          </SectionPanel>
        )}
        {activeTab === 'lease' && (
          <SectionPanel title="Leases">
            <ul className="space-y-2">
              {(unit.leases || []).map((lease) => (
                <li key={lease.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border border-admin-border px-3 py-2 text-left text-[13px] hover:bg-admin-surface-subtle"
                    onClick={() => router.push(`/dashboard/leases/${lease.id}`)}
                  >
                    <span>
                      {lease.lease_tenants?.map((lt) => `${lt.tenant?.first_name || ''} ${lt.tenant?.last_name || ''}`).join(', ') || 'Lease'}
                      <span className="block text-[12px] text-admin-muted">
                        {lease.start_date} → {lease.end_date}
                      </span>
                    </span>
                    <StatusBadge domain="lease" status={lease.status} />
                  </button>
                </li>
              ))}
              {(unit.leases || []).length === 0 && (
                <p className="text-[13px] text-admin-muted">No leases for this unit.</p>
              )}
            </ul>
          </SectionPanel>
        )}
        {activeTab === 'maintenance' && (
          <SectionPanel title="Maintenance">
            <ul className="space-y-2">
              {(unit.maintenance_requests || []).map((req) => (
                <li key={req.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border border-admin-border px-3 py-2 text-left text-[13px] hover:bg-admin-surface-subtle"
                    onClick={() => router.push(`/dashboard/maintenance/${req.id}`)}
                  >
                    <span>{req.title}</span>
                    <StatusBadge domain="maintenance" status={req.status} />
                  </button>
                </li>
              ))}
              {(unit.maintenance_requests || []).length === 0 && (
                <p className="text-[13px] text-admin-muted">No maintenance requests.</p>
              )}
            </ul>
          </SectionPanel>
        )}
        {['payments', 'documents', 'inspection', 'activity'].includes(activeTab) && (
          <SectionPanel title={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}>
            <p className="text-[13px] text-admin-muted">
              View full {activeTab} in the{' '}
              <Link href={`/dashboard/${activeTab === 'payments' ? 'money?tab=payments' : activeTab}`} className="text-admin-primary hover:underline">
                {activeTab === 'payments' ? 'Finances' : activeTab}
              </Link>{' '}
              section.
            </p>
          </SectionPanel>
        )}
      </PageContent>

      <CreateLeaseWizard
        isOpen={leaseWizardOpen}
        onClose={() => setLeaseWizardOpen(false)}
        preselectedUnitId={unitId}
      />

      <UnitDrawer
        entity={unit}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => {
          setIsEditOpen(false);
          loadUnit();
        }}
        propertyId={propertyId}
        isCreate={false}
      />
    </PageLayout>
  );
}
