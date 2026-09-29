'use client';

import React from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Building,
  User,
  FileText,
  Receipt,
  Calendar,
  CreditCard,
  Tag,
  Clock,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Link2,
} from 'lucide-react';
import { Button, Badge } from '@/components/admin/ui';
import { TransactionDTO, ReceiptAttachment as ReceiptAttachmentType } from '@/modules/finance/domain/types';
import { formatCurrency } from '@/lib/format/currency';
import { formatAuDisplayDate, formatAuDisplayDateTime } from '@/lib/format/australian-time';
import { cn } from '@/lib/utils';
import { ReceiptAttachment } from './ReceiptAttachment';

interface TransactionDetailModalProps {
  transaction: TransactionDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (tx: TransactionDTO) => void;
  onDelete?: (tx: TransactionDTO) => void;
  onLinkSchedule?: (tx: TransactionDTO) => void;
  onLinkExpense?: (tx: TransactionDTO) => void;
  onReceiptUpdated?: (tx: TransactionDTO) => void;
}

export function TransactionDetailModal({
  transaction,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onLinkSchedule,
  onLinkExpense,
  onReceiptUpdated,
}: TransactionDetailModalProps) {
  if (!isOpen || !transaction) return null;

  const isIncome = transaction.transaction_type === 'income';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
      case 'failed':
      case 'reversed':
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" /> {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-admin-surface-subtle text-admin-muted border border-admin-border">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-admin-surface border border-admin-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-admin-border bg-admin-surface-subtle">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl',
                isIncome
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              )}
            >
              {isIncome ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-admin-muted">
                  {isIncome ? 'Income' : 'Expense'}
                </span>
                {getStatusBadge(transaction.status)}
              </div>
              <h2 className="text-2xl font-bold text-admin-foreground mt-0.5 inline-flex items-baseline">
                <span>{formatCurrency(transaction.amount)}</span>
                {transaction.tax_classification?.bas_code && (
                  <sup className="ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded bg-[#008F83]/10 text-[#008F83] border border-[#008F83]/20">
                    {transaction.tax_classification.bas_code}
                  </sup>
                )}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-highlight transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Main Info Card */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-admin-border bg-admin-surface-subtle">
            <div>
              <p className="text-xs text-admin-muted font-medium">Category</p>
              <p className="text-sm font-semibold text-admin-foreground mt-0.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-admin-primary" />
                {transaction.category?.name || 'Uncategorized'}
              </p>
            </div>

            <div>
              <p className="text-xs text-admin-muted font-medium">Date</p>
              <p className="text-sm font-semibold text-admin-foreground mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-admin-primary" />
                {formatAuDisplayDate(transaction.transaction_date)}
              </p>
            </div>

            <div>
              <p className="text-xs text-admin-muted font-medium">Payment Method</p>
              <p className="text-sm font-semibold text-admin-foreground mt-0.5 flex items-center gap-1.5 capitalize">
                <CreditCard className="w-3.5 h-3.5 text-admin-primary" />
                {transaction.payment_method?.replace(/_/g, ' ') || 'Direct'}
              </p>
            </div>

            <div>
              <p className="text-xs text-admin-muted font-medium">Reference</p>
              <p className="text-sm font-semibold text-admin-foreground mt-0.5">
                {transaction.reference || '—'}
              </p>
            </div>
          </div>

          {/* Tax & GST Breakdown Card */}
          <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/40 dark:bg-sky-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                <span>🇦🇺</span> Tax & GST Classification
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {transaction.gst_inclusive
                  ? 'GST Inclusive (10%)'
                  : Number(transaction.gst_amount || 0) > 0
                  ? 'GST Exclusive (+10%)'
                  : 'GST-Free / No Tax'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Tax Classification</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {transaction.tax_classification?.name || (isIncome ? 'GST on Sales' : 'GST on Purchases')}
                </p>
              </div>

              <div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">GST Portion</p>
                <p className="font-mono font-bold text-sky-700 dark:text-sky-400 mt-0.5">
                  {formatCurrency(Number(transaction.gst_amount || 0))}
                </p>
              </div>

              <div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Net Amount (Ex-GST)</p>
                <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {formatCurrency(Math.max(0, Number(transaction.amount || 0) - Number(transaction.gst_amount || 0)))}
                </p>
              </div>
            </div>

            {/* BAS Impact */}
            <div className="pt-2 border-t border-sky-200/60 dark:border-sky-900/40 text-[11px] text-sky-800 dark:text-sky-300 flex items-center justify-between">
              <span>
                <strong>BAS Reporting:</strong>{' '}
                {isIncome
                  ? (Number(transaction.gst_amount || 0) > 0 ? 'Taxable Sales [1A / G1]' : 'GST-free Income [G3]')
                  : (Number(transaction.gst_amount || 0) > 0 ? 'Taxable Purchases [1B / G11]' : 'GST-free Purchases [G14]')}
              </span>
              <span className="font-medium">
                {transaction.status === 'completed' ? '✓ Eligible for BAS' : 'Pending Payment (Cash Basis)'}
              </span>
            </div>
          </div>

          {/* Receipt / Tax Invoice Section (Expense Only) */}
          {!isIncome && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-admin-muted uppercase tracking-wider">
                Receipt / Tax Invoice
              </h3>
              <ReceiptAttachment
                receipt={
                  transaction.receipt_url
                    ? {
                        url: transaction.receipt_url,
                        blobPath: transaction.receipt_blob_path || '',
                        fileName: transaction.receipt_file_name || 'receipt',
                        fileSize: transaction.receipt_file_size || 0,
                        mimeType: transaction.receipt_mime_type || '',
                        uploadedAt: transaction.receipt_uploaded_at || transaction.created_at,
                      }
                    : null
                }
                transactionId={transaction.id}
                editable={true}
                onReceiptUploaded={(uploaded) => {
                  onReceiptUpdated?.({
                    ...transaction,
                    receipt_url: uploaded.url,
                    receipt_blob_path: uploaded.blobPath,
                    receipt_file_name: uploaded.fileName,
                    receipt_file_size: uploaded.fileSize,
                    receipt_mime_type: uploaded.mimeType,
                    receipt_uploaded_at: uploaded.uploadedAt,
                  });
                }}
                onReceiptRemoved={() => {
                  onReceiptUpdated?.({
                    ...transaction,
                    receipt_url: null,
                    receipt_blob_path: null,
                    receipt_file_name: null,
                    receipt_file_size: null,
                    receipt_mime_type: null,
                    receipt_uploaded_at: null,
                  });
                }}
              />
            </div>
          )}

          {/* Description & Memo */}
          {transaction.description && (
            <div>
              <h3 className="text-xs font-bold text-admin-muted uppercase tracking-wider mb-1">
                Description / Memo
              </h3>
              <p className="text-sm text-admin-foreground p-3 rounded-lg border border-admin-border bg-admin-surface">
                {transaction.description}
              </p>
            </div>
          )}

          {/* Context Relations */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-admin-muted uppercase tracking-wider">
              Linked Entity Context
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg border border-admin-border bg-admin-surface">
                <div className="flex items-center gap-2.5">
                  <Building className="w-4 h-4 text-admin-primary" />
                  <div>
                    <p className="text-xs text-admin-muted">Property</p>
                    <p className="text-sm font-medium text-admin-foreground">
                      {transaction.property?.name || 'Associated Property'}
                    </p>
                  </div>
                </div>
              </div>

              {transaction.tenant && (
                <div className="flex items-center justify-between p-3 rounded-lg border border-admin-border bg-admin-surface">
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-emerald-500" />
                    <div>
                      <p className="text-xs text-admin-muted">Tenant</p>
                      <p className="text-sm font-medium text-admin-foreground">
                        {transaction.tenant.first_name} {transaction.tenant.last_name}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {transaction.lease && (
                <div className="flex items-center justify-between p-3 rounded-lg border border-admin-border bg-admin-surface">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-sky-500" />
                    <div>
                      <p className="text-xs text-admin-muted">Lease</p>
                      <p className="text-sm font-medium text-admin-foreground">
                        Lease #{transaction.lease.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {transaction.invoice && (
                <div className="flex items-center justify-between p-3 rounded-lg border border-admin-border bg-admin-surface">
                  <div className="flex items-center gap-2.5">
                    <Receipt className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-xs text-admin-muted">Invoice</p>
                      <p className="text-sm font-medium text-admin-foreground">
                        Invoice {transaction.invoice.invoice_number}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {transaction.vendor_name && (
                <div className="flex items-center justify-between p-3 rounded-lg border border-admin-border bg-admin-surface">
                  <div className="flex items-center gap-2.5">
                    <Building className="w-4 h-4 text-rose-500" />
                    <div>
                      <p className="text-xs text-admin-muted">Vendor / Payee</p>
                      <p className="text-sm font-medium text-admin-foreground">
                        {transaction.vendor_name}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {transaction.notes && (
            <div>
              <h3 className="text-xs font-bold text-admin-muted uppercase tracking-wider mb-1">
                Internal Notes
              </h3>
              <p className="text-xs text-admin-muted p-3 rounded-lg border border-admin-border bg-admin-surface-subtle whitespace-pre-wrap">
                {transaction.notes}
              </p>
            </div>
          )}

          {/* Audit Timestamps */}
          <div className="pt-3 border-t border-admin-border text-[11px] text-admin-muted flex justify-between">
            <span>Recorded: {formatAuDisplayDateTime(transaction.created_at)}</span>
            <span>ID: {transaction.id.slice(0, 8)}...</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-admin-border bg-admin-surface-subtle">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onDelete?.(transaction);
              onClose();
            }}
            className="flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </Button>

          <div className="flex items-center gap-2">
            {isIncome && onLinkSchedule && (
              <Button
                size="sm"
                onClick={() => {
                  onLinkSchedule(transaction);
                  onClose();
                }}
                className="bg-[#008F83] hover:bg-[#007A70] text-white flex items-center gap-1.5 font-bold"
              >
                <Link2 className="w-4 h-4" /> Link Schedule
              </Button>
            )}

            {!isIncome && onLinkExpense && (
              <Button
                size="sm"
                onClick={() => {
                  onLinkExpense(transaction);
                  onClose();
                }}
                className="bg-[#008F83] hover:bg-[#007A70] text-white flex items-center gap-1.5 font-bold"
              >
                <Link2 className="w-4 h-4" /> Link Expense
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onEdit?.(transaction);
                onClose();
              }}
              className="flex items-center gap-1.5"
            >
              <Edit3 className="w-4 h-4" /> Edit Transaction
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
