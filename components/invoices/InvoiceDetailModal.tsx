'use client';

import React, { useState } from 'react';
import {
  X,
  Download,
  FileText,
  Mail,
  DollarSign,
  Ban,
  CheckCircle,
  Clock,
  Printer,
  Calendar,
  User,
  Building,
  AlertTriangle,
  Trash2,
  Edit3,
} from 'lucide-react';
import { Button, ConfirmDialog, Input } from '@/components/admin/ui';
import { InvoiceDTO } from '@/modules/invoices';
import { formatCurrency } from '@/modules/invoices/domain/value-objects/currency';
import { formatAuDisplayDate, formatAuDisplayDateTime } from '@/lib/format/australian-time';
import { sendInvoiceTestEmailAction } from '@/app/actions/invoices';

interface InvoiceDetailModalProps {
  invoice: InvoiceDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onIssue: (id: string) => Promise<void>;
  onRecordPayment: (id: string, amount: number, method: string, reference?: string) => Promise<void>;
  onCancel: (id: string, reason: string) => Promise<void>;
  onDownload: (id: string, format: 'pdf' | 'docx') => Promise<void>;
  onSendEmail: (id: string, customMessage?: string, driveFolderUrl?: string, subject?: string) => Promise<void>;
  onDeleteDraft?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onEdit?: (invoice: InvoiceDTO) => void;
}

export function InvoiceDetailModal({
  invoice,
  isOpen,
  onClose,
  onIssue,
  onRecordPayment,
  onCancel,
  onDownload,
  onSendEmail,
  onDeleteDraft,
  onDelete,
  onEdit,
}: InvoiceDetailModalProps) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentRef, setPaymentRef] = useState('');

  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !invoice) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'partially_paid':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'issued':
      case 'viewed':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'overdue':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'cancelled':
      case 'void':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
      case 'draft':
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
  };

  const handleRecordPaymentSubmit = async () => {
    if (paymentAmount <= 0) return;
    setActionLoading(true);
    try {
      await onRecordPayment(invoice.id, paymentAmount, paymentMethod, paymentRef);
      setShowPaymentForm(false);
      setActionSuccess('Payment recorded successfully!');
      setTimeout(() => setActionSuccess(null), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubmit = async () => {
    setActionLoading(true);
    try {
      await onCancel(invoice.id, cancelReason);
      setShowCancelForm(false);
      setActionSuccess('Invoice cancelled successfully.');
      setTimeout(() => setActionSuccess(null), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendEmailSubmit = async () => {
    setActionLoading(true);
    try {
      await onSendEmail(invoice.id, emailMessage, driveFolderUrl, emailSubject);
      setShowEmailForm(false);
      setActionSuccess('Invoice email dispatched successfully to client.');
      setTimeout(() => setActionSuccess(null), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendTestEmailSubmit = async () => {
    setIsSendingTest(true);
    try {
      const res = await sendInvoiceTestEmailAction(
        invoice.id,
        testRecipient,
        emailMessage,
        driveFolderUrl,
        emailSubject
      );
      if (!res.success) throw new Error(res.error || 'Failed to send test email');
      setActionSuccess(`Test email sent successfully to ${res.recipient || testRecipient || 'your inbox'}!`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-admin-surface border border-admin-border text-admin-foreground rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-admin-border flex items-center justify-between bg-admin-surface-subtle/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-admin-primary/10 text-admin-primary rounded-xl border border-admin-primary/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-extrabold text-admin-foreground tracking-tight">{invoice.invoiceNumber}</h2>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${getStatusBadge(
                    invoice.status
                  )}`}
                >
                  {invoice.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-admin-muted mt-0.5">
                Currency: <strong className="text-admin-foreground">{invoice.currency}</strong> • Created{' '}
                {formatAuDisplayDateTime(invoice.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(invoice.id, 'pdf')}
              disabled={actionLoading}
              className="gap-1.5 text-xs border-admin-border hover:bg-admin-surface-subtle text-admin-foreground"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(invoice.id, 'docx')}
              disabled={actionLoading}
              className="gap-1.5 text-xs border-admin-border hover:bg-admin-surface-subtle text-admin-foreground"
            >
              <Download className="w-3.5 h-3.5" /> Word (.docx)
            </Button>
            <button
              onClick={onClose}
              className="text-admin-muted hover:text-admin-foreground p-1.5 rounded-lg hover:bg-admin-surface-subtle transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Success Toast */}
        {actionSuccess && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-6 py-2.5 text-emerald-500 text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> {actionSuccess}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Top Quick Actions Bar */}
          <div className="flex flex-wrap gap-2.5 p-3 bg-admin-surface-subtle border border-admin-border rounded-xl">
            {onEdit && invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.status !== 'void' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(invoice)}
                disabled={actionLoading}
                className="gap-1.5 font-bold border-admin-border hover:bg-admin-surface text-admin-foreground"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Invoice
              </Button>
            )}

            {invoice.status === 'draft' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onIssue(invoice.id)}
                disabled={actionLoading}
                className="gap-1.5 font-bold shadow-xs"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Issue Invoice
              </Button>
            )}

            {invoice.status !== 'draft' && invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPaymentAmount(invoice.balance);
                  setShowPaymentForm(true);
                }}
                disabled={actionLoading}
                className="gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <DollarSign className="w-3.5 h-3.5" /> Record Payment
              </Button>
            )}

            {invoice.status !== 'cancelled' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEmailForm((prev) => !prev)}
                disabled={actionLoading}
                className="gap-1.5 border-admin-border hover:bg-admin-surface text-admin-foreground font-semibold"
              >
                <Mail className="w-3.5 h-3.5 text-admin-primary" /> Email / Test Invoice
              </Button>
            )}

            {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCancelForm(true)}
                disabled={actionLoading}
                className="gap-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 ml-auto"
              >
                <Ban className="w-3.5 h-3.5" /> Cancel Invoice
              </Button>
            )}

            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={actionLoading}
                className="gap-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            )}

            {invoice.status === 'draft' && onDeleteDraft && !onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteDraft(invoice.id)}
                disabled={actionLoading}
                className="gap-1.5 text-admin-muted hover:text-rose-500 ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Draft
              </Button>
            )}
          </div>

          {/* Record Payment Sub-form */}
          {showPaymentForm && (
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
              <h4 className="font-bold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" /> Record Payment
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-admin-muted block mb-1">Amount ({invoice.currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-admin-muted block mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Credit / Debit Card</option>
                    <option value="direct_debit">Direct Debit</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-admin-muted block mb-1">Reference / Note</label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="e.g. TXN-998234"
                    className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setShowPaymentForm(false)} className="text-admin-muted hover:text-admin-foreground">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRecordPaymentSubmit}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Save Payment
                </Button>
              </div>
            </div>
          )}

          {/* Cancel Invoice Sub-form */}
          {showCancelForm && (
            <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-3">
              <h4 className="font-bold text-rose-500 text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Cancel Invoice
              </h4>
              <div>
                <label className="text-xs font-bold text-admin-muted block mb-1">Reason for Cancellation</label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Billed in error, lease revised"
                  className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setShowCancelForm(false)} className="text-admin-muted hover:text-admin-foreground">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCancelSubmit}
                  disabled={actionLoading}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Confirm Cancellation
                </Button>
              </div>
            </div>
          )}

          {/* Email Dispatch & Test Email Sub-form */}
          {showEmailForm && (
            <div className="p-4 sm:p-5 bg-admin-primary/5 border border-admin-primary/20 rounded-2xl space-y-4 max-w-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-admin-primary/15 pb-2.5">
                <h4 className="font-bold text-admin-primary text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-admin-primary shrink-0" /> Email Invoice & Test Delivery
                </h4>
                <button
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  className="text-xs text-admin-muted hover:text-admin-foreground font-semibold px-2 py-1 rounded-md hover:bg-admin-surface transition-colors"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="text-xs font-semibold text-admin-muted block mb-1 truncate">
                    Custom Email Subject <span className="font-normal opacity-75">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder={`Invoice ${invoice.invoiceNumber} from Property Ledge`}
                    className="w-full bg-admin-surface border border-admin-border rounded-lg px-3 py-1.5 text-admin-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-[#008F83] transition-all"
                  />
                </div>
                <div className="min-w-0">
                  <label className="text-xs font-semibold text-admin-muted block mb-1 truncate">
                    Cloud / Drive URL <span className="font-normal opacity-75">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={driveFolderUrl}
                    onChange={(e) => setDriveFolderUrl(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="w-full bg-admin-surface border border-admin-border rounded-lg px-3 py-1.5 text-admin-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-[#008F83] transition-all"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <label className="text-xs font-semibold text-admin-muted block mb-1">Personalized Cover Message</label>
                <textarea
                  rows={2}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="e.g. Please find attached your tax invoice for the current billing cycle. Kindly remit payment by the due date."
                  className="w-full bg-admin-surface border border-admin-border rounded-lg p-2.5 text-admin-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-[#008F83] resize-none transition-all"
                />
              </div>

              {/* Test Email Section */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                    <span>Send Test Email (Preview)</span>
                  </div>
                  <p className="text-[11px] text-admin-muted leading-tight">
                    Sends a sample preview with PDF to verify layout before emailing client.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 min-w-0">
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="Your test email (e.g. user@domain.com)"
                    className="flex-1 sm:w-60 bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-admin-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-amber-500 transition-all min-w-0"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendTestEmailSubmit}
                    disabled={isSendingTest || actionLoading}
                    className="h-8 text-xs font-bold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 shrink-0 whitespace-nowrap"
                  >
                    {isSendingTest ? 'Sending...' : 'Send Test'}
                  </Button>
                </div>
              </div>

              {/* Live Dispatch Actions Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-admin-primary/15 min-w-0">
                <div className="text-xs text-admin-muted truncate min-w-0">
                  Client Recipient:{' '}
                  <strong className="text-admin-foreground font-semibold">
                    {invoice.recipient.email || invoice.customerEmail || 'No email on file'}
                  </strong>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEmailForm(false)}
                    className="h-8 text-admin-muted hover:text-admin-foreground text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSendEmailSubmit}
                    disabled={actionLoading || (!invoice.recipient.email && !invoice.customerEmail)}
                    className="h-8 bg-[#008F83] hover:bg-[#008F83]/90 text-white font-bold text-xs gap-1.5 shadow-xs"
                  >
                    <Mail className="w-3.5 h-3.5" /> Send to Client
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Party Details & Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sender & Recipient Box */}
            <div className="bg-admin-surface-subtle border border-admin-border rounded-xl p-4 space-y-4">
              <div>
                <div className="text-xs uppercase font-bold text-admin-primary tracking-wider mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Recipient
                </div>
                <div className="text-base font-bold text-admin-foreground">{invoice.recipient.name}</div>
                {invoice.recipient.email && <div className="text-xs text-admin-muted">{invoice.recipient.email}</div>}
                {invoice.recipient.phone && <div className="text-xs text-admin-muted">{invoice.recipient.phone}</div>}
                {invoice.recipient.address && <div className="text-xs text-admin-muted">{invoice.recipient.address}</div>}
              </div>

              <div className="pt-3 border-t border-admin-border">
                <div className="text-xs uppercase font-bold text-admin-muted tracking-wider mb-1 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" /> Issuer
                </div>
                <div className="text-sm font-semibold text-admin-foreground">
                  {invoice.snapshot?.issuer?.name || 'Property Ledge Management'}
                </div>
                {invoice.snapshot?.issuer?.email && (
                  <div className="text-xs text-admin-muted">{invoice.snapshot.issuer.email}</div>
                )}
                {invoice.snapshot?.issuer?.taxId && (
                  <div className="text-xs text-admin-muted">ABN/Tax ID: {invoice.snapshot.issuer.taxId}</div>
                )}
              </div>
            </div>

            {/* Dates & Financial Highlights */}
            <div className="bg-admin-surface-subtle border border-admin-border rounded-xl p-4 flex flex-col justify-between space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-admin-muted block mb-0.5 font-bold">Issue Date:</span>
                  <span className="text-admin-foreground font-semibold">{formatAuDisplayDate(invoice.issueDate)}</span>
                </div>
                <div>
                  <span className="text-admin-muted block mb-0.5 font-bold">Due Date:</span>
                  <span className="text-admin-foreground font-semibold">{formatAuDisplayDate(invoice.dueDate)}</span>
                </div>
                {invoice.paidAt && (
                  <div>
                    <span className="text-emerald-500 block mb-0.5 font-bold">Paid Date:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatAuDisplayDateTime(invoice.paidAt)}</span>
                  </div>
                )}
                {invoice.cancellationReason && (
                  <div>
                    <span className="text-rose-500 block mb-0.5 font-bold">Cancelled:</span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">{invoice.cancellationReason}</span>
                  </div>
                )}
              </div>

              <div className="p-4 bg-admin-surface rounded-xl border border-admin-border shadow-xs">
                <div className="text-xs text-admin-muted uppercase tracking-wider mb-1 font-bold">Balance Due</div>
                <div className="text-2xl font-black text-admin-primary">
                  {formatCurrency(invoice.balanceDue, invoice.currency)}
                </div>
                <div className="text-xs text-admin-muted mt-1">
                  Total: {formatCurrency(invoice.totalAmount, invoice.currency)} • Paid:{' '}
                  {formatCurrency(invoice.totalAmount - invoice.balanceDue, invoice.currency)}
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-admin-border rounded-xl overflow-hidden bg-admin-surface shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-admin-surface-subtle text-admin-muted text-xs uppercase font-bold border-b border-admin-border">
                  <th className="p-3">Description</th>
                  <th className="p-3 w-20 text-center">Qty</th>
                  <th className="p-3 w-28 text-right">Unit Price</th>
                  <th className="p-3 w-24 text-center">Tax</th>
                  <th className="p-3 w-32 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border text-sm">
                {(invoice.items || []).map((it) => (
                  <tr key={it.id} className="hover:bg-admin-surface-subtle/50 transition-colors">
                    <td className="p-3 text-admin-foreground font-medium">{it.description}</td>
                    <td className="p-3 text-center text-admin-foreground">{it.quantity}</td>
                    <td className="p-3 text-right text-admin-foreground">{formatCurrency(it.unitPrice, invoice.currency)}</td>
                    <td className="p-3 text-center text-admin-muted">
                      {it.taxRate > 0 ? `${it.taxRate}%` : '0%'}
                    </td>
                    <td className="p-3 text-right font-bold text-admin-foreground">
                      {formatCurrency(it.lineTotal || it.quantity * it.unitPrice, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotal / Tax / Total breakdown */}
          <div className="flex justify-end">
            <div className="w-full md:w-80 bg-admin-surface-subtle border border-admin-border rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-admin-muted text-xs">
                <span>Subtotal:</span>
                <span className="text-admin-foreground font-semibold">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-admin-muted text-xs">
                <span>Tax Total:</span>
                <span className="text-admin-foreground font-semibold">{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
              </div>
              <div className="border-t border-admin-border pt-2 flex justify-between text-base font-bold">
                <span className="text-admin-foreground">Total:</span>
                <span className="text-admin-foreground">{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-sm text-admin-muted">
                <span>Amount Paid:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {formatCurrency(invoice.totalAmount - invoice.balanceDue, invoice.currency)}
                </span>
              </div>
              <div className="border-t border-admin-border pt-2 flex justify-between text-lg font-black">
                <span className="text-admin-primary">Balance Due:</span>
                <span className="text-admin-primary">{formatCurrency(invoice.balanceDue, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {/* Payment Instructions & Notes */}
          {(invoice.paymentInstructions || invoice.notes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {invoice.paymentInstructions && (
                <div className="p-4 bg-admin-surface-subtle border border-admin-border rounded-xl">
                  <div className="text-xs uppercase font-bold text-admin-primary mb-1.5">Payment Instructions</div>
                  <p className="text-xs text-admin-foreground whitespace-pre-wrap">{invoice.paymentInstructions}</p>
                </div>
              )}
              {invoice.notes && (
                <div className="p-4 bg-admin-surface-subtle border border-admin-border rounded-xl">
                  <div className="text-xs uppercase font-bold text-admin-muted mb-1.5">Terms / Notes</div>
                  <p className="text-xs text-admin-foreground whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-admin-border bg-admin-surface-subtle/50 flex items-center justify-between">
          <Button variant="ghost" onClick={onClose} className="text-admin-muted hover:text-admin-foreground">
            Close
          </Button>
          <div className="text-xs text-admin-muted">
            Immutable Audit ID: <span className="font-mono text-admin-foreground">{invoice.id}</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          if (!onDelete) return;
          setIsDeleting(true);
          try {
            await onDelete(invoice.id);
            setShowDeleteConfirm(false);
            onClose();
          } finally {
            setIsDeleting(false);
          }
        }}
        title="Delete Invoice?"
        description={`Are you sure you want to permanently delete invoice ${invoice.invoiceNumber}? This action cannot be undone.`}
        confirmLabel="Delete Invoice"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
