import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertCircle, CreditCard, Wrench, FileText } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/queries';
import { getTenantPortalSummary } from '@/lib/tenant/queries';
import { PageContainer, Card, CardContent, StatCard } from '@/components/admin/ui';

export const revalidate = 0;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
}

export default async function TenantHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const summary = await getTenantPortalSummary(user.id);
  if (!summary) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="p-8 text-center text-sm text-admin-muted">
            No active tenancy found for your account. Contact your property manager.
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const { tenant, lease, outstandingInvoices, openMaintenance, unreadNotifications } = summary;
  const property = (tenant as { property?: { name?: string; address_line_1?: string; city?: string } }).property;
  const leaseData = (lease as { lease?: { rent_amount?: number; rent_frequency?: string; unit?: { name?: string } } } | null)?.lease;

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-admin-foreground">
            Welcome, {(tenant as { first_name?: string }).first_name}
          </h2>
          <p className="text-sm text-admin-muted mt-1">
            {property?.name}
            {property?.address_line_1 ? ` · ${property.address_line_1}, ${property.city}` : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Rent due"
            value={outstandingInvoices.length > 0 ? formatCurrency((outstandingInvoices[0] as { balance_due?: number }).balance_due || 0) : '—'}
            icon={<CreditCard className="h-4 w-4" />}
          />
          <StatCard label="Open requests" value={String(openMaintenance.length)} icon={<Wrench className="h-4 w-4" />} />
          <StatCard label="Unread alerts" value={String(unreadNotifications)} icon={<AlertCircle className="h-4 w-4" />} />
          <StatCard
            label="Unit"
            value={leaseData?.unit?.name || '—'}
            icon={<FileText className="h-4 w-4" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6 space-y-3">
              <h3 className="font-semibold text-admin-foreground">Quick links</h3>
              <div className="flex flex-wrap gap-2">
                <Link href="/tenant/rent" className="text-sm text-admin-primary hover:underline">View rent</Link>
                <Link href="/tenant/maintenance" className="text-sm text-admin-primary hover:underline">Maintenance</Link>
                <Link href="/tenant/documents" className="text-sm text-admin-primary hover:underline">Documents</Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-3">
              <h3 className="font-semibold text-admin-foreground">Lease summary</h3>
              {leaseData ? (
                <dl className="text-sm space-y-1 text-admin-muted">
                  <div className="flex justify-between">
                    <dt>Rent</dt>
                    <dd className="text-admin-foreground font-medium">
                      {formatCurrency(leaseData.rent_amount || 0)} / {leaseData.rent_frequency}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-admin-muted">No active lease on file.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
