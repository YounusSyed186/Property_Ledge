'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NotFoundState, StatusBadge, Button } from '@/components/admin/ui';
import { fetchDashboardLease } from '@/app/actions/dashboard';
import { LeaseEditDrawer } from '@/components/dashboard/leases/LeaseEditDrawer';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format/currency';
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

interface LeaseDetailHubProps {
  propertyId: string;
  leaseId: string;
}

type LeaseDetail = {
  id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  rent_amount: number;
  rent_frequency: string;
  unit?: { id: string; name: string; unit_number: string };
  lease_tenants?: Array<{
    is_primary?: boolean;
    tenant?: { id: string; first_name: string; last_name: string; email?: string };
  }>;
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function LeaseDetailHub({ propertyId, leaseId }: LeaseDetailHubProps) {
  const router = useRouter();
  const [lease, setLease] = useState<LeaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  const loadLease = () => {
    setIsLoading(true);
    fetchDashboardLease(propertyId, leaseId)
      .then((data) => setLease(data as LeaseDetail | null))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadLease();
  }, [propertyId, leaseId]);

  if (isLoading) {
    return (
      <PageLayout>
        <PageContent>
          <PageSkeleton />
        </PageContent>
      </PageLayout>
    );
  }

  if (!lease) {
    return (
      <PageLayout>
        <PageContent>
          <NotFoundState
            title="Lease not found"
            action={
              <Link href="/dashboard/leases" className="text-admin-primary hover:underline text-sm">
                Back to Leases
              </Link>
            }
          />
        </PageContent>
      </PageLayout>
    );
  }

  const primaryTenant = lease.lease_tenants?.find((lt) => lt.is_primary)?.tenant
    ?? lease.lease_tenants?.[0]?.tenant;
  const tenantName = primaryTenant
    ? `${primaryTenant.first_name} ${primaryTenant.last_name}`.trim()
    : 'No tenant';
  const unitLabel = lease.unit
    ? `${lease.unit.name}${lease.unit.unit_number ? ` (${lease.unit.unit_number})` : ''}`
    : '—';
  const daysLeft = daysUntil(lease.end_date);
  const showExpiryBanner = daysLeft !== null && daysLeft > 0 && daysLeft <= 60 && lease.status === 'active';

  return (
    <PageLayout>
      <div className={cn('shrink-0', WORKSPACE_PAGE_HEADER)}>
        <EntityDetailHeader
          breadcrumb={[
            { label: 'Leases', href: '/dashboard/leases' },
            { label: `Lease #${leaseId.slice(0, 8)}` },
          ]}
          title={`Lease #${leaseId.slice(0, 8).toUpperCase()}`}
          subtitle={`${tenantName} · ${unitLabel}`}
          status={<StatusBadge domain="lease" status={lease.status} />}
          meta={
            <p className="text-[13px] font-medium text-admin-foreground">
              {formatCurrency(Number(lease.rent_amount))} / {lease.rent_frequency}
            </p>
          }
          actions={
            <EntityActions
              onEdit={() => setIsEditDrawerOpen(true)}
              addItems={[
                { label: 'Record Payment', onClick: () => router.push('/dashboard/money?tab=payments') },
              ]}
              moreItems={[
                { label: 'Renew', onClick: () => router.push('/dashboard/leases') },
                { label: 'Delete', onClick: () => {}, destructive: true, separator: true },
              ]}
            />
          }
        />
        {showExpiryBanner && (
          <div className="mt-4 rounded-lg border border-[#FED7AA] bg-[#FFF7ED] px-4 py-3">
            <p className="text-body-sm font-semibold text-[#D97706]">
              Lease expires in {daysLeft} days
            </p>
            <p className="mt-1 text-caption text-[#D97706]/80">
              Consider starting the renewal process now.
            </p>
            <Button
              size="sm"
              className="mt-3"
              onClick={() => router.push('/dashboard/leases')}
            >
              Start Renewal
            </Button>
          </div>
        )}
        <div className="mt-4">
          <HubTabs
            tabs={[
              { value: 'overview', label: 'Overview' },
              { value: 'payments', label: 'Payments' },
              { value: 'invoices', label: 'Invoices' },
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <CompactKpiCard label="Status" value={lease.status} />
            <CompactKpiCard label="Tenant" value={tenantName} />
            <CompactKpiCard label="Monthly Rent" value={formatCurrency(Number(lease.rent_amount))} />
            <CompactKpiCard
              label="Term"
              value={lease.end_date ? `${lease.start_date} → ${lease.end_date}` : lease.start_date}
            />
          </div>
        )}
        {activeTab !== 'overview' && (
          <SectionPanel title={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}>
            <p className="text-[13px] text-admin-muted">
              View full {activeTab} in{' '}
              <Link href={`/dashboard/money?tab=${activeTab === 'payments' ? 'payments' : 'invoices'}`} className="text-admin-primary hover:underline">
                Finances
              </Link>
              .
            </p>
          </SectionPanel>
        )}
      </PageContent>

      {isEditDrawerOpen && lease && (
        <LeaseEditDrawer
          isOpen={true}
          lease={{
            id: lease.id,
            start_date: lease.start_date,
            end_date: lease.end_date,
            rent_amount: lease.rent_amount,
            rent_frequency: lease.rent_frequency,
            security_deposit: 0,
            payment_due_day: 1,
            status: lease.status,
          }}
          propertyId={propertyId}
          onClose={() => setIsEditDrawerOpen(false)}
          onSuccess={() => {
            loadLease();
          }}
        />
      )}
    </PageLayout>
  );
}
