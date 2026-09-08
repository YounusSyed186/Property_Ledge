'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Play,
  Copy,
  Edit,
  Trash2,
  Pause,
  CheckCircle2,
  Clock,
  Mail,
  FileText,
  DollarSign,
  Send,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  LayoutTemplate,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, useToast } from '@/components/admin/ui';
import { ListPage } from '@/components/workspace';
import { InvoiceTemplateDTO } from '@/modules/invoices';
import { LiveInvoiceRenderer } from './LiveInvoiceRenderer';
import { RunTemplateNowModal } from './RunTemplateNowModal';
import { InvoiceTemplateWizard } from './InvoiceTemplateWizard';
import {
  fetchInvoiceTemplateByIdAction,
  updateInvoiceTemplateStatusAction,
  duplicateInvoiceTemplateAction,
  deleteInvoiceTemplateAction,
  sendInvoiceTemplateTestEmailAction,
  checkResendStatusAction,
} from '@/app/actions/invoices';
import { formatCurrency } from '@/modules/invoices/domain/value-objects/currency';
import { cn } from '@/lib/utils';

interface TemplateDetailHubProps {
  templateId: string;
}

export function TemplateDetailHub({ templateId }: TemplateDetailHubProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [template, setTemplate] = useState<InvoiceTemplateDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'flow' | 'preview' | 'email' | 'history'>('flow');
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailMessage, setTestEmailMessage] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<{ connected: boolean; statusText: string }>({
    connected: false,
    statusText: 'Checking...',
  });

  useEffect(() => {
    loadTemplate();
    checkResendStatusAction().then(setResendStatus).catch(() => {});
  }, [templateId]);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const data = await fetchInvoiceTemplateByIdAction(templateId);
      setTemplate(data);
    } catch (err: any) {
      toast({
        title: 'Error loading template',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!template) return;
    const newStatus = template.status === 'active' ? 'paused' : 'active';
    const res = await updateInvoiceTemplateStatusAction(template.id, newStatus);
    if (res.success && res.template) {
      setTemplate(res.template);
      toast({
        title: `Template ${newStatus === 'active' ? 'Activated' : 'Paused'}`,
        description: `Status updated to ${newStatus}.`,
      });
    }
  };

  const handleDuplicate = async () => {
    if (!template) return;
    const res = await duplicateInvoiceTemplateAction(template.id);
    if (res.success && res.template) {
      toast({ title: 'Template Duplicated', description: 'Redirecting to new blueprint...' });
      router.push(`/dashboard/invoices/templates/${res.template.id}`);
    }
  };

  const handleDelete = async () => {
    if (!template) return;
    if (!confirm('Are you sure you want to delete this invoice blueprint template?')) return;
    const res = await deleteInvoiceTemplateAction(template.id);
    if (res.success) {
      toast({ title: 'Template Deleted' });
      router.push('/dashboard/invoices/templates');
    }
  };

  const handleSendTestEmail = async () => {
    if (!template || !testEmailRecipient) return;
    setTestEmailSending(true);
    setTestEmailMessage(null);
    try {
      const res = await sendInvoiceTemplateTestEmailAction(template.id, testEmailRecipient);
      if (res.success) {
        setTestEmailMessage(`✓ Test email sent successfully${res.messageId ? ` (${res.messageId})` : ''}`);
      } else {
        setTestEmailMessage(`✕ ${res.error || 'Failed to send email'}`);
      }
    } catch (err: any) {
      setTestEmailMessage(`✕ Error: ${err.message}`);
    } finally {
      setTestEmailSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-admin-primary border-t-transparent animate-spin" />
          <p className="text-xs text-admin-muted">Loading blueprint template...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center py-20 bg-admin-surface rounded-2xl border border-admin-border">
        <h2 className="text-xl font-black text-admin-foreground mb-2">Template Not Found</h2>
        <p className="text-xs text-admin-muted mb-6">The requested invoice blueprint could not be loaded.</p>
        <Link href="/dashboard/invoices/templates">
          <Button variant="outline" className="border-admin-border font-bold">
            <ArrowLeft className="w-4 h-4 mr-2" /> Return to Templates
          </Button>
        </Link>
      </div>
    );
  }

  const subtotal = (template.items || []).reduce(
    (acc, it) => acc + (it.quantity * it.unitPrice),
    0
  );
  const tax = subtotal * 0.1;
  const total = subtotal + tax;
  const currency = template.currency || 'AUD';

  return (
    <ListPage
      fill={false}
      title={template.name}
      description={template.description || `${(template.invoiceType || 'rent').toUpperCase()} Billing Blueprint`}
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Invoices', href: '/dashboard/invoices' },
        { label: 'Templates', href: '/dashboard/invoices/templates' },
        { label: template.name },
      ]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setRunModalOpen(true)}
            size="sm"
            className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs text-xs"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Run Now
          </Button>

          <Button
            onClick={() => setEditModalOpen(true)}
            size="sm"
            variant="outline"
            className="font-bold border-admin-border hover:bg-admin-surface-subtle text-admin-foreground text-xs"
          >
            <Edit className="w-3.5 h-3.5 mr-1.5 text-admin-primary" />
            Edit Blueprint
          </Button>

          <Button
            onClick={handleToggleStatus}
            size="sm"
            variant="outline"
            className="font-bold border-admin-border hover:bg-admin-surface-subtle text-admin-foreground text-xs"
          >
            {template.status === 'active' ? (
              <>
                <Pause className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                Activate
              </>
            )}
          </Button>

          <Button
            onClick={handleDuplicate}
            size="sm"
            variant="outline"
            className="font-bold border-admin-border hover:bg-admin-surface-subtle text-admin-foreground text-xs"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Duplicate
          </Button>

          <Button
            onClick={handleDelete}
            size="sm"
            variant="outline"
            className="font-bold border-admin-border hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      }
      summary={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-admin-primary/10 text-admin-primary flex items-center justify-center shrink-0 border border-admin-primary/20">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Schedule Trigger</p>
              <h3 className="text-base font-black text-admin-foreground truncate capitalize">
                {(template.automationConfig as any)?.triggerFrequency || 'Monthly'}
              </h3>
              <p className="text-[10px] text-admin-muted">
                Day {(template.automationConfig as any)?.dayOfMonth || 1} of month
              </p>
            </div>
          </div>

          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Cycle Amount</p>
              <h3 className="text-base font-black text-admin-foreground truncate">
                {formatCurrency(total, currency)}
              </h3>
              <p className="text-[10px] text-admin-muted">{template.items?.length || 0} line items</p>
            </div>
          </div>

          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Email Automation</p>
              <h3 className="text-base font-black text-purple-600 dark:text-purple-400 truncate">
                {template.emailConfig?.enabled ? 'Resend Active' : 'Disabled'}
              </h3>
              <p className="text-[10px] text-admin-muted">PDF Attached</p>
            </div>
          </div>

          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Blueprint Status</p>
              <h3 className="text-base font-black text-emerald-600 dark:text-emerald-400 truncate capitalize">
                {template.status}
              </h3>
              <p className="text-[10px] text-admin-muted">
                {template.lastRunAt ? `Last run: ${template.lastRunAt.slice(0, 10)}` : 'Ready to execute'}
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-6 pb-12">
        {/* Navigation Tabs */}
        <div className="flex border-b border-admin-border">
          <button
            onClick={() => setActiveTab('flow')}
            className={cn(
              'pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2',
              activeTab === 'flow'
                ? 'border-admin-primary text-admin-primary'
                : 'border-transparent text-admin-muted hover:text-admin-foreground'
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Automation Workflow
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={cn(
              'pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2',
              activeTab === 'preview'
                ? 'border-admin-primary text-admin-primary'
                : 'border-transparent text-admin-muted hover:text-admin-foreground'
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            Document Preview
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={cn(
              'pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2',
              activeTab === 'email'
                ? 'border-admin-primary text-admin-primary'
                : 'border-transparent text-admin-muted hover:text-admin-foreground'
            )}
          >
            <Mail className="w-3.5 h-3.5" />
            Resend Email Config
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2',
              activeTab === 'history'
                ? 'border-admin-primary text-admin-primary'
                : 'border-transparent text-admin-muted hover:text-admin-foreground'
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            Execution History
          </button>
        </div>

        {/* Tab 1: Automation Flow */}
        {activeTab === 'flow' && (
          <div className="space-y-6">
            <div className="bg-admin-surface border border-admin-border rounded-2xl p-6 shadow-xs">
              <h3 className="text-base font-bold text-admin-foreground mb-1">
                Visual Automation Pipeline
              </h3>
              <p className="text-xs text-admin-muted mb-6">
                Orchestrated by the Generic Automation Engine upon scheduled event triggers.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                {/* Step 1 */}
                <div className="p-4 bg-admin-surface-subtle border border-admin-border rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-admin-primary uppercase tracking-wider">
                    Step 1 · Trigger
                  </span>
                  <h4 className="font-bold text-sm text-admin-foreground">Schedule Engine</h4>
                  <p className="text-xs text-admin-muted">
                    Triggers every {(template.automationConfig as any)?.triggerFrequency || 'month'} on day{' '}
                    {(template.automationConfig as any)?.dayOfMonth || 1}.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 bg-admin-surface-subtle border border-admin-border rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                    Step 2 · Condition
                  </span>
                  <h4 className="font-bold text-sm text-admin-foreground">Lease Validation</h4>
                  <p className="text-xs text-admin-muted">
                    {(template.automationConfig as any)?.onlyActiveLeases
                      ? 'Only generate when associated lease is Active.'
                      : 'Generate unconditionally.'}
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 bg-admin-surface-subtle border border-admin-border rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                    Step 3 · Action
                  </span>
                  <h4 className="font-bold text-sm text-admin-foreground">Create Invoice & PDF</h4>
                  <p className="text-xs text-admin-muted">
                    Generates official invoice number and produces downloadable document.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-4 bg-admin-surface-subtle border border-admin-border rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">
                    Step 4 · Delivery
                  </span>
                  <h4 className="font-bold text-sm text-admin-foreground">Resend Email</h4>
                  <p className="text-xs text-admin-muted">
                    {template.emailConfig?.enabled
                      ? 'Dispatches formatted email with PDF attached to recipient.'
                      : 'Email delivery disabled.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Test Card */}
            <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  Ready to test this automation pipeline?
                </h4>
                <p className="text-xs text-admin-muted mt-0.5">
                  Execute an on-demand test run right now to verify invoice generation, PDF building, and Resend delivery.
                </p>
              </div>
              <Button
                onClick={() => setRunModalOpen(true)}
                className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 text-xs"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" /> Execute Test Run
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Document Preview */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            <div className="bg-admin-surface border border-admin-border rounded-2xl p-6 shadow-xs">
              <div className="max-w-4xl mx-auto">
                <LiveInvoiceRenderer
                  data={{
                    invoiceNumber: 'INV-SAMPLE-001',
                    currency: currency,
                    currencySymbol: currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$',
                    issueDate: new Date().toISOString().slice(0, 10),
                    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
                    customerName: template.defaultCustomerName || 'Tenant / Customer Name',
                    customerEmail: template.defaultCustomerEmail || 'tenant@example.com',
                    customerAddress: 'Property Address Placeholder',
                    issuerName: 'Property Ledge Management',
                    issuerEmail: 'manager@propertyledge.com.au',
                    issuerPhone: '+61 2 9000 0000',
                    items: (template.items || []).map((it) => ({
                      description: it.description,
                      quantity: it.quantity,
                      unitPrice: it.unitPrice,
                      taxRate: it.taxRate,
                      discount: it.discount,
                    })),
                    notes: template.notes || 'Thank you for your business.',
                    paymentInstructions: template.paymentInstructions || 'Direct Deposit: BSB 000-000 Account 12345678',
                    layoutStyle: template.layoutStyle || 'classic',
                    brandColor: template.brandColor || '#22333b',
                    accentColor: template.accentColor || '#a9927d',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Resend Email Config */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <div className="bg-admin-surface border border-admin-border rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-admin-border">
                <div>
                  <h4 className="font-bold text-sm text-admin-foreground">Resend Email Integration</h4>
                  <p className="text-xs text-admin-muted">
                    Automated transactional delivery for invoice notifications and PDF attachments.
                  </p>
                </div>
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5',
                    resendStatus.connected
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                  )}
                >
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      resendStatus.connected ? 'bg-emerald-500' : 'bg-zinc-400'
                    )}
                  />
                  {resendStatus.statusText}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-admin-foreground block mb-1">
                      Subject Line Template
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={template.emailConfig?.subjectTemplate || 'Invoice {{invoice.number}} from Property Ledge'}
                      className="w-full bg-admin-surface-subtle border border-admin-border rounded-xl px-3 py-2 text-xs text-admin-foreground font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-admin-foreground block mb-1">
                      Email Body Template
                    </label>
                    <textarea
                      rows={5}
                      readOnly
                      value={
                        template.emailConfig?.bodyTemplate ||
                        'Hi {{customer_name}},\n\nPlease find attached your invoice {{invoice.number}} for the period.\n\nTotal Due: {{invoice.total}}\nDue Date: {{invoice.due_date}}\n\nThank you.'
                      }
                      className="w-full bg-admin-surface-subtle border border-admin-border rounded-xl p-3 text-xs text-admin-foreground font-mono resize-none"
                    />
                  </div>
                </div>

                <div className="bg-admin-surface-subtle border border-admin-border rounded-xl p-5 space-y-4">
                  <h5 className="font-bold text-xs text-admin-foreground">Send Live Test Email</h5>
                  <p className="text-xs text-admin-muted">
                    Validate that your Resend credentials deliver rendered invoices properly before scheduled execution.
                  </p>

                  <div className="space-y-3">
                    <input
                      type="email"
                      placeholder="test-recipient@example.com"
                      value={testEmailRecipient}
                      onChange={(e) => setTestEmailRecipient(e.target.value)}
                      className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-xs text-admin-foreground"
                    />

                    <Button
                      onClick={handleSendTestEmail}
                      disabled={testEmailSending || !testEmailRecipient}
                      size="sm"
                      className="w-full font-bold bg-admin-primary hover:bg-admin-primary/90 text-white text-xs"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      {testEmailSending ? 'Sending via Resend...' : 'Send Test Email'}
                    </Button>

                    {testEmailMessage && (
                      <p
                        className={cn(
                          'text-xs font-semibold p-2.5 rounded-lg border',
                          testEmailMessage.startsWith('✓')
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        )}
                      >
                        {testEmailMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: History */}
        {activeTab === 'history' && (
          <div className="bg-admin-surface border border-admin-border rounded-2xl p-6 shadow-xs space-y-4">
            <h4 className="font-bold text-sm text-admin-foreground">Blueprint Execution Audit Log</h4>
            <p className="text-xs text-admin-muted">
              Complete chronological record of all automated and manual runs for this template.
            </p>

            <div className="divide-y divide-admin-border border border-admin-border rounded-xl overflow-hidden">
              <div className="p-4 bg-admin-surface-subtle flex items-center justify-between text-xs font-bold text-admin-muted">
                <span>Execution Event</span>
                <span>Result</span>
                <span>Date & Time</span>
              </div>
              <div className="p-4 bg-admin-surface flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold text-admin-foreground">Template Initialized</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Ready
                </span>
                <span className="text-admin-muted">{template.createdAt?.slice(0, 16) || 'Just now'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {runModalOpen && (
        <RunTemplateNowModal
          isOpen={runModalOpen}
          template={template}
          onClose={() => setRunModalOpen(false)}
          onCompleted={() => loadTemplate()}
        />
      )}

      {editModalOpen && (
        <InvoiceTemplateWizard
          isOpen={editModalOpen}
          initialTemplate={template}
          onClose={() => setEditModalOpen(false)}
          onSuccess={() => loadTemplate()}
        />
      )}
    </ListPage>
  );
}
