'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PropertyRequired } from '@/components/dashboard/PropertyRequired';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { fetchDashboardTenant, fetchDashboardTenantTabData } from '@/app/actions/dashboard';
import { CreateLeaseWizard } from '@/components/dashboard/workflows/CreateLeaseWizard';
import { NotFoundState, StatusBadge, Button } from '@/components/admin/ui';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format/currency';
import { humanizeActivityLog, formatActivityTimestamp } from '@/lib/activity/formatActivity';
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

type PaymentRow = {
  id: string;
  amount: number;
  payment_date: string;
  status: string;
  payment_method: string | null;
  reference: string | null;
  invoice?: { invoice_number?: string } | null;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  balance_due: number;
  status: string;
};

type MaintenanceRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
};

type DocumentRow = {
  id: string;
  name: string;
  document_type: string;
  file_url: string | null;
  created_at: string;
  status: string;
};

type ActivityRow = {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  user?: { full_name?: string };
};

function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-[12px] font-medium text-admin-primary hover:underline">
      {label}
    </Link>
  );
}

function EmptyTabMessage({ message }: { message: string }) {
  return <p className="text-[13px] text-admin-muted">{message}</p>;
}

export function TenantDetailHub({ tenantId }: TenantDetailPageProps) {
  const router = useRouter();
  const { selectedProperty } = usePropertyContext();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [leaseWizardOpen, setLeaseWizardOpen] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);

  useEffect(() => {
    if (!selectedProperty) return;
    setIsLoading(true);
    fetchDashboardTenant(selectedProperty.propertyId, tenantId)
      .then((data) => setTenant(data as unknown as TenantDetail | null))
      .finally(() => setIsLoading(false));
  }, [selectedProperty?.propertyId, tenantId]);

  useEffect(() => {
    if (!selectedProperty || !tenant) return;
    if (!['payments', 'maintenance', 'documents', 'activity'].includes(activeTab)) return;

    setTabLoading(true);
    fetchDashboardTenantTabData(
      selectedProperty.propertyId,
      tenantId,
      activeTab as 'payments' | 'maintenance' | 'documents' | 'activity'
    )
      .then((data) => {
        if ('payments' in data) {
          setPayments((data.payments as PaymentRow[]) || []);
          setInvoices((data.invoices as InvoiceRow[]) || []);
        }
        if ('maintenance' in data) setMaintenance((data.maintenance as MaintenanceRow[]) || []);
        if ('documents' in data) setDocuments((data.documents as DocumentRow[]) || []);
        if ('activity' in data) setActivity((data.activity as ActivityRow[]) || []);
      })
      .finally(() => setTabLoading(false));
  }, [activeTab, selectedProperty?.propertyId, tenantId, tenant]);

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

  const outstandingBalance = invoices
    .filter((inv) => ['issued', 'partially_paid', 'overdue'].includes(inv.status))
    .reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);

  const openMaintenanceCount = maintenance.filter((req) =>
    ['open', 'in_progress', 'scheduled'].includes(req.status)
  ).length;

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
                  value={activeLease ? formatCurrency(Number(activeLease.rent_amount)) : '—'}
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
                          {lease.start_date} → {lease.end_date} · {formatCurrency(Number(lease.rent_amount))}/mo
                        </span>
                      </span>
                      <StatusBadge domain="lease" status={lease.status} />
                    </button>
                  </li>
                ))}
                {leases.length === 0 && (
                  <EmptyTabMessage message="No leases yet." />
                )}
              </ul>
            </SectionPanel>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <CompactKpiCard label="Recent Payments" value={payments.length} />
                <CompactKpiCard label="Open Invoices" value={invoices.filter((i) => i.status !== 'paid').length} />
                <CompactKpiCard label="Outstanding" value={formatCurrency(outstandingBalance)} />
              </div>

              <SectionPanel
                title="Recent Payments"
                action={<ViewAllLink href="/dashboard/money?tab=payments" label="View all in Finances →" />}
              >
                {tabLoading ? (
                  <p className="text-[13px] text-admin-muted">Loading payments...</p>
                ) : payments.length === 0 ? (
                  <EmptyTabMessage message="No payments recorded for this tenant yet." />
                ) : (
                  <ul className="divide-y divide-admin-border">
                    {payments.map((payment) => (
                      <li key={payment.id} className="flex items-center justify-between py-2.5 text-[13px]">
                        <div>
                          <p className="font-medium text-admin-foreground">
                            {formatCurrency(Number(payment.amount))}
                            {payment.invoice?.invoice_number && (
                              <span className="ml-2 text-admin-muted">· {payment.invoice.invoice_number}</span>
                            )}
                          </p>
                          <p className="text-[12px] text-admin-muted">
                            {payment.payment_date}
                            {payment.payment_method ? ` · ${payment.payment_method}` : ''}
                          </p>
                        </div>
                        <StatusBadge domain="payment" status={payment.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </SectionPanel>

              <SectionPanel
                title="Invoices"
                action={<ViewAllLink href="/dashboard/money?tab=invoices" label="View all invoices →" />}
              >
                {tabLoading ? (
                  <p className="text-[13px] text-admin-muted">Loading invoices...</p>
                ) : invoices.length === 0 ? (
                  <EmptyTabMessage message="No invoices for this tenant yet." />
                ) : (
                  <ul className="divide-y divide-admin-border">
                    {invoices.map((invoice) => (
                      <li key={invoice.id} className="flex items-center justify-between py-2.5 text-[13px]">
                        <div>
                          <p className="font-medium text-admin-foreground">{invoice.invoice_number}</p>
                          <p className="text-[12px] text-admin-muted">
                            Due {invoice.due_date} · {formatCurrency(Number(invoice.total_amount))}
                          </p>
                        </div>
                        <div className="text-right">
                          <StatusBadge domain="invoice" status={invoice.status} />
                          {Number(invoice.balance_due) > 0 && (
                            <p className="mt-1 text-[12px] text-admin-muted">
                              {formatCurrency(Number(invoice.balance_due))} due
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionPanel>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <SectionPanel
              title="Maintenance Requests"
              action={<ViewAllLink href="/dashboard/maintenance" label="View all maintenance →" />}
            >
              {tabLoading ? (
                <p className="text-[13px] text-admin-muted">Loading maintenance requests...</p>
              ) : maintenance.length === 0 ? (
                <EmptyTabMessage message="No maintenance requests from this tenant yet." />
              ) : (
                <>
                  <p className="mb-3 text-[12px] text-admin-muted">
                    {openMaintenanceCount} open request{openMaintenanceCount === 1 ? '' : 's'}
                  </p>
                  <ul className="space-y-2">
                    {maintenance.map((req) => (
                      <li key={req.id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-md border border-admin-border px-3 py-2 text-left text-[13px] hover:bg-admin-surface-subtle"
                          onClick={() => router.push(`/dashboard/maintenance/${req.id}`)}
                        >
                          <span>
                            {req.title}
                            <span className="block text-[12px] text-admin-muted">
                              {new Date(req.created_at).toLocaleDateString()} · {req.priority} priority
                            </span>
                          </span>
                          <StatusBadge domain="maintenance" status={req.status} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </SectionPanel>
          )}

          {activeTab === 'documents' && (
            <SectionPanel
              title="Documents"
              action={<ViewAllLink href="/dashboard/documents" label="View all documents →" />}
            >
              {tabLoading ? (
                <p className="text-[13px] text-admin-muted">Loading documents...</p>
              ) : documents.length === 0 ? (
                <EmptyTabMessage message="No documents linked to this tenant yet." />
              ) : (
                <ul className="divide-y divide-admin-border">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between py-2.5 text-[13px]">
                      <div>
                        <p className="font-medium text-admin-foreground">{doc.name}</p>
                        <p className="text-[12px] text-admin-muted">
                          {doc.document_type.replace(/_/g, ' ')} · {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {doc.file_url ? (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12px] font-medium text-admin-primary hover:underline"
                        >
                          Open
                        </a>
                      ) : (
                        <StatusBadge domain="document" status={doc.status} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </SectionPanel>
          )}

          {activeTab === 'activity' && (
            <SectionPanel
              title="Activity"
              action={<ViewAllLink href="/dashboard/activity" label="View full activity log →" />}
            >
              {tabLoading ? (
                <p className="text-[13px] text-admin-muted">Loading activity...</p>
              ) : activity.length === 0 ? (
                <EmptyTabMessage message="No activity recorded for this tenant yet." />
              ) : (
                <ul className="space-y-3">
                  {activity.map((entry) => {
                    const humanized = humanizeActivityLog(entry);
                    return (
                      <li key={entry.id} className="flex gap-3 text-[13px]">
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-admin-primary" />
                        <div>
                          <p className="text-admin-foreground">{humanized.message}</p>
                          <p className="text-[12px] text-admin-muted">{formatActivityTimestamp(entry.created_at)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
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
