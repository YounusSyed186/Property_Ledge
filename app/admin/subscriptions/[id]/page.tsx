import React from 'react';
import { getAdminSubscriptionById, getAdminPlans } from '@/lib/admin/queries';
import { adminUpdateSubscription } from '@/lib/admin/service';
import { getSubscriptionPaymentBySubId, getPaymentProofByPaymentId, approveManualPayment, rejectManualPayment } from '@/lib/billing/service';
import { requireAdmin } from '@/lib/admin/authorization';
import { SubscriptionStatusBadge } from '@/components/subscription/subscription-status';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Shield, CheckCircle, XCircle, FileText, Download } from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
  Select,
} from '@/components/admin/ui';

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminSubscriptionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const sub = await getAdminSubscriptionById(id);

  if (!sub) {
    notFound();
  }

  const plans = await getAdminPlans();
  const profile = sub.account_context?.profiles;

  // Manual payment details
  const payment = await getSubscriptionPaymentBySubId(id);
  const proof = payment ? await getPaymentProofByPaymentId(payment.id) : null;

  async function handleUpdateSubscriptionAction(formData: FormData) {
    'use server';
    const status = formData.get('status') as any;
    const planId = formData.get('planId') as string;
    const cancelAtPeriodEnd = formData.get('cancelAtPeriodEnd') === 'true';

    await adminUpdateSubscription(id, {
      status,
      plan_id: planId,
      cancel_at_period_end: cancelAtPeriodEnd,
    });

    redirect(`/admin/subscriptions/${id}?updated=true`);
  }

  async function handleApprovePaymentAction(formData: FormData) {
    'use server';
    const adminId = await requireAdmin();
    const payId = formData.get('paymentId') as string;
    await approveManualPayment(payId, adminId);
    redirect(`/admin/subscriptions/${id}?approved=true`);
  }

  async function handleRejectPaymentAction(formData: FormData) {
    'use server';
    const adminId = await requireAdmin();
    const payId = formData.get('paymentId') as string;
    await rejectManualPayment(payId, adminId);
    redirect(`/admin/subscriptions/${id}?rejected=true`);
  }

  return (
    <PageContainer>
      <PageHeader
        title="Subscription Details"
        description={sub.id}
        breadcrumb={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-caption text-admin-muted">
            <Link href="/admin/subscriptions" className="hover:text-admin-primary transition-colors">
              Subscriptions
            </Link>
            <span aria-hidden="true" className="text-admin-muted/50">/</span>
            <span className="text-admin-foreground font-medium">Details</span>
          </nav>
        }
        actions={
          <Link href="/admin/subscriptions">
            <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Info Cards */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Account Information"
              description={profile?.full_name || 'No Name Provided'}
              icon={<Shield className="w-5 h-5" />}
              action={<SubscriptionStatusBadge status={sub.status} />}
            />
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-caption text-admin-muted">Account ID</span>
                  <p className="font-mono text-body-sm text-admin-foreground font-medium mt-0.5">{sub.account_id}</p>
                </div>
                <div>
                  <span className="text-caption text-admin-muted">Current Plan</span>
                  <p className="font-bold text-admin-primary mt-0.5">{sub.subscription_plans?.name}</p>
                </div>
                <div>
                  <span className="text-caption text-admin-muted">Provider</span>
                  <p className="font-mono text-body-sm text-admin-foreground uppercase mt-0.5">{sub.provider || 'stripe'}</p>
                </div>
                <div>
                  <span className="text-caption text-admin-muted">Cancel at Period End</span>
                  <p className="font-semibold text-admin-foreground mt-0.5">
                    {sub.cancel_at_period_end ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <span className="text-caption text-admin-muted">Current Period Start</span>
                  <p className="text-body-sm text-admin-foreground mt-0.5">
                    {sub.current_period_start ? new Date(sub.current_period_start).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-caption text-admin-muted">Current Period End</span>
                  <p className="text-body-sm text-admin-foreground mt-0.5">
                    {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Payment Verification Card */}
          {payment && (
            <Card>
              <CardHeader
                title="Bank Transfer Verification"
                description={`Ref: ${payment.reference}`}
                icon={<FileText className="w-5 h-5" />}
              />
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-caption text-admin-muted">Payment Status</span>
                    <p className="font-bold uppercase text-admin-foreground mt-0.5">{payment.status}</p>
                  </div>
                  <div>
                    <span className="text-caption text-admin-muted">Expected / Submitted</span>
                    <p className="font-bold text-admin-foreground mt-0.5">
                      ${payment.expected_amount} / ${payment.submitted_amount || 0} AUD
                    </p>
                  </div>
                  <div>
                    <span className="text-caption text-admin-muted">Transaction ID</span>
                    <p className="font-mono text-body-sm text-admin-foreground mt-0.5">{payment.transaction_id || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-caption text-admin-muted">Payment Date</span>
                    <p className="text-body-sm text-admin-foreground mt-0.5">
                      {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Uploaded Proof */}
                {proof && (
                  <div className="p-4 rounded-lg bg-admin-surface-subtle border border-admin-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-admin-primary" />
                      <div>
                        <p className="text-body-sm font-semibold text-admin-foreground">{proof.file_name}</p>
                        <p className="text-metadata text-admin-muted">{(proof.file_size / 1024).toFixed(1)} KB • {proof.mime_type}</p>
                      </div>
                    </div>

                    {proof.file_preview_url && (
                      <a
                        href={proof.file_preview_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-caption font-semibold text-admin-primary hover:text-admin-primary-hover"
                      >
                        <Download className="w-3.5 h-3.5" /> View Receipt
                      </a>
                    )}
                  </div>
                )}

                {/* Approval Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <form action={handleApprovePaymentAction} className="flex-1">
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <Button type="submit" className="w-full" leftIcon={<CheckCircle className="w-4 h-4" />}>
                      Approve Payment & Activate
                    </Button>
                  </form>

                  <form action={handleRejectPaymentAction} className="flex-1">
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <Button type="submit" variant="destructive" className="w-full" leftIcon={<XCircle className="w-4 h-4" />}>
                      Reject Payment
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions Sidebar Form */}
        <div className="space-y-6">
          <Card className="h-fit">
            <CardHeader
              title="Admin Actions"
              description="Modify subscription state"
              icon={<Shield className="w-5 h-5" />}
            />
            <CardContent>
              <form action={handleUpdateSubscriptionAction} className="space-y-4">
                <Select name="planId" label="Change Plan" defaultValue={sub.plan_id}>
                  {plans.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.slug})
                    </option>
                  ))}
                </Select>

                <Select name="status" label="Change Status" defaultValue={sub.status}>
                  <option value="active">Active</option>
                  <option value="under_review">Under Review</option>
                  <option value="pending_payment">Pending Payment</option>
                  <option value="trialing">Trialing</option>
                  <option value="past_due">Past Due</option>
                  <option value="paused">Paused</option>
                  <option value="canceled">Canceled</option>
                  <option value="expired">Expired</option>
                </Select>

                <Select name="cancelAtPeriodEnd" label="Cancellation Rule" defaultValue={sub.cancel_at_period_end ? 'true' : 'false'}>
                  <option value="false">Immediate / Active</option>
                  <option value="true">Cancel at Period End</option>
                </Select>

                <Button type="submit" className="w-full" size="lg">
                  Update Subscription
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}