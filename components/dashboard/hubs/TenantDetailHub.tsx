'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PropertyRequired } from '@/components/dashboard/PropertyRequired';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { fetchDashboardTenant } from '@/app/actions/dashboard';
import { CreateLeaseWizard } from '@/components/dashboard/workflows/CreateLeaseWizard';
import { NotFoundState, StatusBadge, Button } from '@/components/admin/ui';
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

interface TenantDetailPageProps {
  tenantId: string;
}

type TenantDetail = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  notes: string | null;
  lease_tenants?: Array<{
    lease_id: string;
    role: string;
    is_primary: boolean;
    lease?: {
      id: string;
      start_date: string;
      end_date: string;
      rent_amount: number;
      status: string;
      unit?: { id: string; name: string; unit_number: string };
    };
  }>;
};

export function TenantDetailHub({ tenantId }: TenantDetailPageProps) {
  const router = useRouter();
  const { selectedProperty } = usePropertyContext();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [leaseWizardOpen, setLeaseWizardOpen] = useState(false);

  useEffect(() => {
    if (!selectedProperty) return;
    setIsLoading(true);
    fetchDashboardTenant(selectedProperty.propertyId, tenantId)
      .then((data) => setTenant(data as unknown as TenantDetail | null))
      .finally(() => setIsLoading(false));
  }, [selectedProperty?.propertyId, tenantId]);

  if (isLoading) {
    return (
      <PropertyRequired>
        <PageLayout>
          <PageContent><PageSkeleton /></PageContent>
        </PageLayout>
      </PropertyRequired>
    );
  }

  if (!tenant) {
    return (
      <PropertyRequired>
        <PageLayout>
          <PageContent>
            <NotFoundState
              title="Tenant not found"
              action={
                <Link href="/dashboard/people" className="text-admin-primary hover:underline text-sm">
                  Back to Tenants
                </Link>
              }
            />
          </PageContent>
        </PageLayout>
      </PropertyRequired>
    );
  }

  const leases = tenant.lease_tenants?.map((lt) => lt.lease).filter(Boolean) || [];
  const activeLease = leases.find((l) => l?.status === 'active');
  const unitLabel = activeLease?.unit
    ? `${activeLease.unit.name} · Unit ${activeLease.unit.unit_number}`
    : selectedProperty?.propertyName || '—';

  return (
    <PropertyRequired>
      <PageLayout>
        <div className={cn('shrink-0', WORKSPACE_PAGE_HEADER)}>
          <EntityDetailHeader
            breadcrumb={[
              { label: 'Tenants', href: '/dashboard/people' },
              { label: `${tenant.first_name} ${tenant.last_name}` },
            ]}
            title={`${tenant.first_name} ${tenant.last_name}`}
            subtitle={`${unitLabel} · ${tenant.email}`}
            status={<StatusBadge domain="lease" status={tenant.status === 'active' ? 'active' : tenant.status} />}
            actions={
              <EntityActions
                onEdit={() => router.push('/dashboard/people')}
                addItems={[
                  { label: 'Create Lease', onClick: () => setLeaseWizardOpen(true) },
                  { label: 'Record Payment', onClick: () => router.push('/dashboard/money?tab=payments') },
                ]}
                moreItems={[
                  { label: 'View Documents', onClick: () => router.push('/dashboard/documents') },
                ]}
              />
            }
          />
          <div className="mt-4">
            <HubTabs
              tabs={[
                { value: 'overview', label: 'Overview' },
                { value: 'lease', label: 'Lease' },
                { value: 'payments', label: 'Payments' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'documents', label: 'Documents' },
                { value: 'activity', label: 'Activity' },
              ]}
              value={activeTab}
              onChange={setActiveTab}
            />
          </div>
        </div>
        <PageContent>
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <CompactKpiCard label="Status" value={tenant.status} />
                <CompactKpiCard label="Leases" value={leases.length} />
                <CompactKpiCard
                  label="Monthly Rent"
                  value={activeLease ? `₹${Number(activeLease.rent_amount).toLocaleString()}` : '—'}
                />
                <CompactKpiCard label="Unit" value={activeLease?.unit?.name || '—'} />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <SectionPanel title="Contact Details">
                  <div className="space-y-1 text-[13px]">
                    <p><span className="text-admin-muted">Email:</span> {tenant.email}</p>
                    <p><span className="text-admin-muted">Phone:</span> {tenant.phone || '—'}</p>
                    {tenant.notes && <p><span className="text-admin-muted">Notes:</span> {tenant.notes}</p>}
                  </div>
                </SectionPanel>
                <SectionPanel title="Active Lease">
                  {activeLease ? (
                    <div className="space-y-1 text-[13px]">
                      <p>{activeLease.start_date} → {activeLease.end_date}</p>
                      <Button variant="soft" size="sm" onClick={() => router.push(`/dashboard/leases/${activeLease.id}`)}>
                        View lease
                      </Button>
                    </div>
                  ) : (
                    <p className="text-[13px] text-admin-muted">No active lease.</p>
                  )}
                </SectionPanel>
              </div>
            </>
          )}
          {activeTab === 'lease' && (
            <SectionPanel title="Leases">
              <ul className="space-y-2">
                {leases.map((lease) => lease && (
                  <li key={lease.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-md border border-admin-border px-3 py-2 text-left text-[13px] hover:bg-admin-surface-subtle"
                      onClick={() => router.push(`/dashboard/leases/${lease.id}`)}
                    >
                      <span>
                        {lease.unit?.name} · Unit {lease.unit?.unit_number}
                        <span className="block text-[12px] text-admin-muted">
                          {lease.start_date} → {lease.end_date} · ₹{lease.rent_amount}/mo
                        </span>
                      </span>
                      <StatusBadge domain="lease" status={lease.status} />
                    </button>
                  </li>
                ))}
                {leases.length === 0 && (
                  <p className="text-[13px] text-admin-muted">No leases yet.</p>
                )}
              </ul>
            </SectionPanel>
          )}
          {['payments', 'maintenance', 'documents', 'activity'].includes(activeTab) && (
            <SectionPanel title={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}>
              <p className="text-[13px] text-admin-muted">
                View {activeTab} for this tenant in{' '}
                <Link
                  href={`/dashboard/${activeTab === 'payments' ? 'money?tab=payments' : activeTab}`}
                  className="text-admin-primary hover:underline"
                >
                  {activeTab === 'payments' ? 'Finances' : activeTab}
                </Link>
                .
              </p>
            </SectionPanel>
          )}
        </PageContent>

        <CreateLeaseWizard
          isOpen={leaseWizardOpen}
          onClose={() => setLeaseWizardOpen(false)}
          preselectedTenantId={tenantId}
        />
      </PageLayout>
    </PropertyRequired>
  );
}
