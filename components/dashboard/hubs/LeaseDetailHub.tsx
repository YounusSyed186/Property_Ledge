'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NotFoundState, StatusBadge, Button } from '@/components/admin/ui';
import { fetchDashboardLease, fetchLeaseRenewalHistory } from '@/app/actions/dashboard';
import { LeaseEditDrawer } from '@/components/dashboard/leases/LeaseEditDrawer';
import { RenewLeaseModal } from '@/components/dashboard/leases/RenewLeaseModal';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format/currency';
import { History, RefreshCw, Sparkles, ArrowRight } from 'lucide-react';
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
  property_id?: string;
  status: string;
  start_date: string;
  end_date: string | null;
  rent_amount: number;
  rent_frequency: string;
  security_deposit?: number;
  payment_due_day?: number;
  notes?: string | null;
  renewed_from_lease_id?: string | null;
  unit?: { id: string; name: string; unit_number: string };
  property?: { id: string; name: string; address_line_1: string; city?: string };
  lease_tenants?: Array<{
    role?: string;
    is_primary?: boolean;
    tenant_id?: string;
    tenant?: { id: string; first_name: string; last_name: string; email?: string; phone?: string | null };
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
  const [renewalHistory, setRenewalHistory] = useState<any[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);

  const loadLease = () => {
    setIsLoading(true);
    setLoadError(null);
    Promise.all([
      fetchDashboardLease(propertyId, leaseId),
      fetchLeaseRenewalHistory(leaseId),
    ])
      .then(([data, history]) => {
        setLease(data as LeaseDetail | null);
        setRenewalHistory(history || []);
      })
      .catch((err) => {
        console.error('Error fetching lease:', err);
        setLoadError(err?.message || 'Failed to load lease details.');
      })
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
  const propertyLabel = lease.property?.name || lease.property?.address_line_1 || '';
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
          subtitle={`${tenantName}${propertyLabel ? ` · ${propertyLabel}` : ''}`}
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
                { label: 'Renew Lease', onClick: () => setIsRenewModalOpen(true) },
              ]}
              moreItems={[
                { label: 'Renew Lease', onClick: () => setIsRenewModalOpen(true) },
                { label: 'Delete', onClick: () => {}, destructive: true, separator: true },
              ]}
            />
          }
        />
        {showExpiryBanner && (
          <div className="mt-4 rounded-lg border border-[#FED7AA] bg-[#FFF7ED] px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-body-sm font-semibold text-[#D97706]">
                Lease expires in {daysLeft} days
              </p>
              <p className="mt-0.5 text-caption text-[#D97706]/80">
                Consider reviewing terms and initiating the renewal process now.
              </p>
            </div>
            <Button
              size="sm"
              className="gap-1.5 font-bold"
              onClick={() => setIsRenewModalOpen(true)}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Renew Lease
            </Button>
          </div>
        )}
        <div className="mt-4">
          <HubTabs
            tabs={[
              { value: 'overview', label: 'Overview' },
              { value: 'history', label: `Lease History (${renewalHistory.length || 1})` },
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
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <CompactKpiCard label="Status" value={lease.status} />
              <CompactKpiCard label="Tenant" value={tenantName} />
              <CompactKpiCard label="Monthly Rent" value={formatCurrency(Number(lease.rent_amount))} />
              <CompactKpiCard
                label="Term"
                value={lease.end_date ? `${lease.start_date} → ${lease.end_date}` : `${lease.start_date} (Periodic)`}
              />
            </div>

            {/* Renewal Lineage Overview Badge */}
            {lease.renewed_from_lease_id && (
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                    Renewed from previous lease contract #{lease.renewed_from_lease_id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <Link
                  href={routes.leases.detail(lease.renewed_from_lease_id)}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  View Predecessor <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <SectionPanel title="Lease Renewal Lineage & History">
            <p className="text-xs text-admin-muted mb-4">
              Chronological lifecycle of all renewed contracts for this tenancy sequence:
            </p>
            <div className="space-y-3">
              {(renewalHistory.length > 0 ? renewalHistory : [lease]).map((item: any) => {
                const isCurrent = item.id === lease.id;
                const itemTenants = item.tenants || item.lease_tenants || [];
                const itemTenantNames = itemTenants
                  .map((t: any) => t.tenantName || `${t.tenant?.first_name || ''} ${t.tenant?.last_name || ''}`.trim())
                  .filter(Boolean)
                  .join(', ') || 'Unassigned';

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-4 rounded-xl border flex items-center justify-between transition-colors',
                      isCurrent
                        ? 'bg-admin-primary/5 border-admin-primary/40 shadow-xs'
                        : 'bg-admin-surface border-admin-border hover:bg-admin-surface-elevated'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs',
                        isCurrent
                          ? 'bg-admin-primary text-white'
                          : 'bg-admin-surface-elevated text-admin-muted border border-admin-border'
                      )}>
                        LS
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-admin-foreground">
                            Lease #{item.id.slice(0, 8).toUpperCase()}
                          </span>
                          <StatusBadge domain="lease" status={item.status} />
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-admin-primary/10 text-admin-primary">
                              Viewing
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-admin-muted mt-0.5">
                          {item.startDate || item.start_date} → {item.endDate || item.end_date || 'Periodic'} · {formatCurrency(item.rentAmount || item.rent_amount)} / {item.rentFrequency || item.rent_frequency} · Tenants: {itemTenantNames}
                        </p>
                      </div>
                    </div>

                    {!isCurrent && (
                      <Link
                        href={routes.leases.detail(item.id)}
                        className="text-xs font-semibold text-admin-primary hover:underline flex items-center gap-1"
                      >
                        Open <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionPanel>
        )}

        {activeTab !== 'overview' && activeTab !== 'history' && (
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

      {/* Dedicated Renew Lease Modal */}
      {isRenewModalOpen && lease && (
        <RenewLeaseModal
          isOpen={true}
          previousLease={{
            id: lease.id,
            property_id: propertyId,
            unit_id: lease.unit?.id,
            start_date: lease.start_date,
            end_date: lease.end_date,
            rent_amount: lease.rent_amount,
            security_deposit: lease.security_deposit ?? 0,
            payment_due_day: lease.payment_due_day ?? 1,
            rent_frequency: lease.rent_frequency,
            status: lease.status,
            notes: lease.notes,
            property: lease.property,
            unit: lease.unit,
            lease_tenants: lease.lease_tenants as any,
          }}
          onClose={() => setIsRenewModalOpen(false)}
          onSuccess={() => {
            loadLease();
          }}
        />
      )}

      {isEditDrawerOpen && lease && (
        <LeaseEditDrawer
          isOpen={true}
          lease={{
            id: lease.id,
            start_date: lease.start_date,
            end_date: lease.end_date,
            rent_amount: lease.rent_amount,
            rent_frequency: lease.rent_frequency,
            security_deposit: lease.security_deposit ?? 0,
            payment_due_day: lease.payment_due_day ?? 1,
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
