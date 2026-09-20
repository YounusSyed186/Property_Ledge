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
  Link2,
  Unlink2,
  User,
} from 'lucide-react';
import { Button, Drawer } from '@/components/admin/ui';
import { ExpenseDTO, ExpenseTransactionDTO } from '@/modules/finance/domain/types';
import { formatCurrency } from '@/lib/format/currency';
import { formatAuDisplayDate } from '@/lib/format/australian-time';
import { cn } from '@/lib/utils';

interface ExpenseDetailModalProps {
  expense: ExpenseDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (expense: ExpenseDTO) => void;
  onDelete?: (expense: ExpenseDTO) => void;
  onOpenLinkModal?: (expense: ExpenseDTO) => void;
  onUnlinkAllocation?: (allocationId: string) => void;
}

export function ExpenseDetailModal({
  expense,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onOpenLinkModal,
  onUnlinkAllocation,
}: ExpenseDetailModalProps) {
  if (!isOpen || !expense) return null;

  const totalAllocated = expense.total_allocated ?? 0;
  const remaining = expense.remaining_amount ?? Math.max(0, expense.amount - totalAllocated);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
          </span>
        );
      case 'partially_paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Clock className="w-3.5 h-3.5" /> Partially Paid
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Pending Bill
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
        onClick={() => onDelete?.(expense)}
        className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
        Delete Expense
      </button>

      <div className="flex items-center gap-2">
        {remaining > 0 && (
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenLinkModal?.(expense)}
            className="bg-[#008F83] hover:bg-[#007A70] text-white font-bold gap-1.5"
            leftIcon={<DollarSign className="h-4 w-4" />}
          >
            Process
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant={remaining > 0 ? 'outline' : 'primary'}
          onClick={() => onEdit?.(expense)}
          leftIcon={<Pencil className="h-4 w-4" />}
          className={remaining > 0 ? '' : 'bg-[#008F83] hover:bg-[#007A70] text-white font-bold'}
        >
          Edit
        </Button>
      </div>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Expense Details"
      description={`Reference: ${expense.reference || expense.id.slice(0, 8)}`}
      width="lg"
      footer={footer}
    >
      <div className="space-y-5 py-2">
        {/* Status & Amount Overview Banner */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Settlement Status</span>
            {getStatusBadge(expense.status)}
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Total Expense</span>
              <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                {formatCurrency(expense.amount)}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">
                Paid / Allocated
              </span>
              <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalAllocated)}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 block">
                Remaining Unpaid
              </span>
              <span className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
                {formatCurrency(remaining)}
              </span>
            </div>
          </div>
        </div>

        {/* Key Attributes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <Tag className="w-3.5 h-3.5" /> Category
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {expense.category?.name || 'General Expense'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <Calendar className="w-3.5 h-3.5" /> Expense Date
            </span>
            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
              {expense.expense_date}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <Building className="w-3.5 h-3.5" /> Property
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {expense.property?.name || '—'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <FileText className="w-3.5 h-3.5" /> Associated Lease
            </span>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {expense.lease_id ? `Lease #${expense.lease_id.slice(0, 8)}` : 'No Lease / Vacant'}
            </span>
          </div>
        </div>

        {/* Payee / Vendor & Description */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block">Payee / Vendor</span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
              {expense.vendor_name || '—'}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block">Description / Purpose</span>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
              {expense.description || '—'}
            </p>
          </div>
          {expense.notes && (
            <div>
              <span className="text-[11px] text-slate-400 font-semibold block">Notes & Memo</span>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 italic">
                {expense.notes}
              </p>
            </div>
          )}
        </div>

        {/* Linked Financial Ledger Transactions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#008F83]" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Linked Ledger Transactions ({expense.allocations?.length || 0})
              </h4>
            </div>
          </div>

          {expense.allocations && expense.allocations.length > 0 ? (
            <div className="space-y-2">
              {expense.allocations.map((alloc) => (
                <div
                  key={alloc.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                        {formatCurrency(alloc.allocated_amount)}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {alloc.transaction?.transaction_date || 'Ledger'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {alloc.transaction?.description || alloc.transaction?.reference || 'Direct Ledger Allocation'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onUnlinkAllocation?.(alloc.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
                    title="Unlink this transaction"
                  >
                    <Unlink2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
              No financial ledger transactions currently mapped to this expense.
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
