'use client';

import React from 'react';
import {
  TrendingDown,
  Building,
  FileText,
  Receipt,
  Calendar,
  CreditCard,
  DollarSign,
  Tag,
  Clock,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Button, Drawer } from '@/components/admin/ui';
import { ExpenseDTO } from '@/modules/finance/domain/types';
import { formatCurrency } from '@/lib/format/currency';
import { formatAuDisplayDate } from '@/lib/format/australian-time';
import { cn } from '@/lib/utils';

interface ExpenseDetailModalProps {
  expense: ExpenseDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (expense: ExpenseDTO) => void;
  onDelete?: (expense: ExpenseDTO) => void;
}

export function ExpenseDetailModal({
  expense,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: ExpenseDetailModalProps) {
  const [cachedExpense, setCachedExpense] = React.useState<ExpenseDTO | null>(expense);

  React.useEffect(() => {
    if (expense) {
      setCachedExpense(expense);
    }
  }, [expense]);

  const currentExpense = expense || cachedExpense;
  if (!currentExpense) return null;

  const displayDate = currentExpense.transaction_date || currentExpense.expense_date || '';
  const gstAmount = Number(currentExpense.gst_amount || 0);
  const isGstInc = Boolean(currentExpense.gst_inclusive);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Settled / Completed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {status}
          </span>
        );
    }
  };

  const footer = (
    <div className="flex items-center justify-between w-full">
      <button
        type="button"
        onClick={() => onDelete?.(currentExpense)}
        className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
        Delete Expense
      </button>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => onEdit?.(currentExpense)}
          leftIcon={<Pencil className="h-4 w-4" />}
          className="bg-[#008F83] hover:bg-[#007A70] text-white font-bold"
        >
          Edit Expense
        </Button>
      </div>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Expense Details"
      description={`Transaction ID: ${currentExpense.id.slice(0, 8)}`}
      width="lg"
      footer={footer}
    >
      <div className="space-y-5 py-2">
        {/* Status & Amount Overview Banner */}
        <div className="p-4 rounded-2xl border border-admin-border bg-admin-surface-subtle space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-admin-muted font-semibold">Ledger Transaction</span>
            {getStatusBadge(currentExpense.status)}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-admin-border">
            <div>
              <span className="text-[11px] font-semibold text-admin-muted block">Total Amount</span>
              <span className="text-xl font-bold font-mono text-admin-foreground">
                {formatCurrency(currentExpense.amount)}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-admin-muted block">GST Component</span>
              <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {gstAmount > 0 ? formatCurrency(gstAmount) : '$0.00'}
              </span>
              <span className="text-[10px] text-admin-muted block">
                {isGstInc ? '(GST Inclusive)' : gstAmount > 0 ? '(GST Exclusive)' : '(GST-Free)'}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-admin-muted block">Net Excl. GST</span>
              <span className="text-lg font-bold font-mono text-admin-foreground">
                {formatCurrency(Math.max(0, currentExpense.amount - (isGstInc ? gstAmount : 0)))}
              </span>
            </div>
          </div>
        </div>

        {/* Key Attributes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl border border-admin-border bg-admin-surface">
            <span className="text-xs text-admin-muted flex items-center gap-1 mb-1 font-medium">
              <Tag className="w-3.5 h-3.5 text-admin-primary" /> Category
            </span>
            <span className="text-xs font-bold text-admin-foreground">
              {currentExpense.category?.name || 'General Expense'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-admin-border bg-admin-surface">
            <span className="text-xs text-admin-muted flex items-center gap-1 mb-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-admin-primary" /> Expense Date
            </span>
            <span className="text-xs font-mono font-bold text-admin-foreground">
              {displayDate ? formatAuDisplayDate(displayDate) : '—'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-admin-border bg-admin-surface">
            <span className="text-xs text-admin-muted flex items-center gap-1 mb-1 font-medium">
              <Building className="w-3.5 h-3.5 text-admin-primary" /> Property
            </span>
            <span className="text-xs font-bold text-admin-foreground">
              {currentExpense.property?.name || '—'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-admin-border bg-admin-surface">
            <span className="text-xs text-admin-muted flex items-center gap-1 mb-1 font-medium">
              <CreditCard className="w-3.5 h-3.5 text-admin-primary" /> Payment Method
            </span>
            <span className="text-xs font-medium text-admin-foreground capitalize">
              {currentExpense.payment_method?.replace(/_/g, ' ') || 'Bank Transfer'}
            </span>
          </div>
        </div>

        {/* Australian BAS Tax Classification */}
        <div className="p-3.5 rounded-xl border border-admin-border bg-admin-surface space-y-1">
          <span className="text-xs text-admin-muted flex items-center gap-1 mb-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-admin-primary" /> BAS Tax Classification
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-admin-foreground">
              {currentExpense.tax_classification?.name || 'Standard Operating Expense'}
            </span>
            {currentExpense.tax_classification?.bas_code && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#008F83]/10 text-[#008F83] border border-[#008F83]/20">
                BAS Code: {currentExpense.tax_classification.bas_code}
              </span>
            )}
          </div>
        </div>

        {/* Payee / Vendor & Description */}
        <div className="p-4 rounded-xl border border-admin-border bg-admin-surface space-y-2">
          <div>
            <span className="text-[11px] text-admin-muted font-semibold block">Payee / Vendor</span>
            <p className="text-xs font-semibold text-admin-foreground mt-0.5">
              {currentExpense.vendor_name || '—'}
            </p>
          </div>
          {currentExpense.reference && (
            <div>
              <span className="text-[11px] text-admin-muted font-semibold block">Invoice # / Reference</span>
              <p className="text-xs font-mono font-medium text-admin-foreground mt-0.5">
                {currentExpense.reference}
              </p>
            </div>
          )}
          <div>
            <span className="text-[11px] text-admin-muted font-semibold block">Description / Purpose</span>
            <p className="text-xs text-admin-foreground mt-0.5">
              {currentExpense.description || '—'}
            </p>
          </div>
          {currentExpense.notes && (
            <div>
              <span className="text-[11px] text-admin-muted font-semibold block">Notes & Memo</span>
              <p className="text-xs text-admin-muted mt-0.5 italic">
                {currentExpense.notes}
              </p>
            </div>
          )}
        </div>

        {/* Receipt Attachments */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#008F83]" />
            <h4 className="text-xs font-bold text-admin-foreground uppercase tracking-wider">
              Receipt & Invoices
            </h4>
          </div>

          {currentExpense.receipt_url || (currentExpense.attachments && currentExpense.attachments.length > 0) ? (
            <div className="space-y-2">
              {currentExpense.receipt_url && (
                <div className="p-3.5 rounded-xl border border-admin-border bg-admin-surface flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-5 h-5 text-[#008F83] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-admin-foreground truncate">
                        {currentExpense.receipt_file_name || 'Receipt Document'}
                      </p>
                      <p className="text-[11px] text-admin-muted">Primary Attached Receipt</p>
                    </div>
                  </div>
                  <a
                    href={currentExpense.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#008F83]/10 text-[#008F83] hover:bg-[#008F83]/20 transition-colors"
                  >
                    View <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {currentExpense.attachments?.map((att) => (
                <div
                  key={att.id}
                  className="p-3.5 rounded-xl border border-admin-border bg-admin-surface flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-admin-foreground truncate">
                        {att.file_name}
                      </p>
                      <p className="text-[11px] text-admin-muted">Additional Attachment</p>
                    </div>
                  </div>
                  <a
                    href={att.blob_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#008F83]/10 text-[#008F83] hover:bg-[#008F83]/20 transition-colors"
                  >
                    View <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-admin-border text-center text-xs text-admin-muted">
              No receipt or invoice attachment attached to this expense.
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
