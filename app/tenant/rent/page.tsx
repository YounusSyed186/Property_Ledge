import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/queries';
import { getTenantRecordForUser, getTenantInvoices, getTenantPayments } from '@/lib/tenant/queries';
import { PageContainer, Card, CardContent } from '@/components/admin/ui';
import { formatCurrency } from '@/lib/format/currency';

export const revalidate = 0;

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function TenantRentPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const tenant = await getTenantRecordForUser(user.id);
  if (!tenant) redirect('/tenant');

  const propertyId = (tenant as { property_id: string }).property_id;
  const tenantId = (tenant as { id: string }).id;
  const [invoices, payments] = await Promise.all([
    getTenantInvoices(tenantId, propertyId),
    getTenantPayments(tenantId, propertyId),
  ]);

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-admin-foreground">Rent & payments</h2>
          <p className="text-sm text-admin-muted mt-1">Your invoices and payment history.</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-admin-border">
              <h3 className="font-semibold text-admin-foreground">Invoices</h3>
            </div>
            {invoices.length === 0 ? (
              <p className="p-6 text-sm text-admin-muted">No invoices yet.</p>
            ) : (
              <div className="divide-y divide-admin-border">
                {invoices.map((invoice) => {
                  const inv = invoice as { id: string; invoice_number?: string; due_date: string; balance_due: number; status: string };
                  return (
                    <div key={inv.id} className="flex items-center justify-between px-6 py-4 text-sm">
                      <div>
                        <p className="font-medium text-admin-foreground">{inv.invoice_number || inv.id.slice(0, 8)}</p>
                        <p className="text-xs text-admin-muted">Due {formatDate(inv.due_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(inv.balance_due)}</p>
                        <p className="text-xs capitalize text-admin-muted">{inv.status}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-admin-border">
              <h3 className="font-semibold text-admin-foreground">Payments</h3>
            </div>
            {payments.length === 0 ? (
              <p className="p-6 text-sm text-admin-muted">No payments recorded yet.</p>
            ) : (
              <div className="divide-y divide-admin-border">
                {payments.map((payment) => {
                  const pay = payment as { id: string; payment_date: string; amount: number; status: string };
                  return (
                    <div key={pay.id} className="flex items-center justify-between px-6 py-4 text-sm">
                      <div>
                        <p className="font-medium text-admin-foreground">{formatDate(pay.payment_date)}</p>
                        <p className="text-xs capitalize text-admin-muted">{pay.status}</p>
                      </div>
                      <p className="font-medium text-emerald-600">{formatCurrency(pay.amount)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
