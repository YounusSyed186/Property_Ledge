'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Calendar,
  CreditCard,
  CheckCircle2,
  Building,
  User,
  FileText,
  AlertCircle,
  Receipt,
  Zap,
  X,
} from 'lucide-react';
import { Button, Input, Select, Textarea, useToast } from '@/components/admin/ui';
import {
  ExpenseDTO,
  PaymentMethod,
  ProcessExpensePaymentInput,
} from '@/modules/finance/domain/types';
import { processExpensePaymentAction } from '@/app/actions/expenses';
import { formatCurrency } from '@/lib/format/currency';
import { formatAuDisplayDate } from '@/lib/format/australian-time';

interface ProcessExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ExpenseDTO | null;
  onSuccess?: (expense: ExpenseDTO) => void;
}

export function ProcessExpenseModal({
  isOpen,
  onClose,
  expense,
  onSuccess,
}: ProcessExpenseModalProps) {
  const { toast } = useToast();

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const remainingBalance = expense
    ? expense.remaining_amount ?? Math.max(0, expense.amount - (expense.total_allocated || 0))
    : 0;

  useEffect(() => {
    if (isOpen && expense) {
      const rem = expense.remaining_amount ?? Math.max(0, expense.amount - (expense.total_allocated || 0));
      setPaymentAmount(rem > 0 ? rem.toFixed(2) : String(expense.amount));
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('bank_transfer');
      setReference(expense.reference || '');
      setNotes('');
      setFormErrors({});
    }
  }, [isOpen, expense]);

  if (!expense) return null;

  const validate = () => {
    const errors: Record<string, string> = {};
    const parsed = parseFloat(paymentAmount);

    if (!paymentAmount || isNaN(parsed) || parsed <= 0) {
      errors.paymentAmount = 'Please enter a valid payment amount greater than $0';
    } else if (parsed > remainingBalance + 0.01) {
      errors.paymentAmount = `Amount cannot exceed remaining balance of ${formatCurrency(remainingBalance)}`;
    }

    if (!paymentDate) {
      errors.paymentDate = 'Payment date is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload: ProcessExpensePaymentInput = {
        expense_id: expense.id,
        amount: Math.round(parseFloat(paymentAmount) * 100) / 100,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      };

      const res = await processExpensePaymentAction(payload);
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to process expense payment');
      }

      toast({
        title: 'Bill Processed & Settled',
        description: `Successfully settled payment of ${formatCurrency(payload.amount)} for ${expense.vendor_name || 'expense'}.`,
        variant: 'success',
      });

      onSuccess?.(res.data);
      onClose();
    } catch (err: any) {
      console.error('Error processing expense payment:', err);
      toast({
        title: 'Payment Processing Failed',
        description: err.message || 'Could not process payment for this bill.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!expense || !isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans text-slate-900 dark:text-slate-100"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl z-10 p-6 sm:p-8">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#008F83]/30"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Centered Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-slate-900 dark:text-white">
            Process & Settle Bill
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Record a payment against this operating expense bill.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 px-0.5 py-1">
          {/* Bill Summary Banner */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Building className="h-4 w-4 text-[#008F83]" />
                <span>{expense.property?.name || 'Property'}</span>
              </div>
              {expense.category && (
                <span className="inline-flex items-center rounded-full bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {expense.category.name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-500 font-medium">Vendor / Payee:</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {expense.vendor_name || 'Not specified'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Bill Date / Ref:</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {formatAuDisplayDate(expense.expense_date)} {expense.reference ? `(${expense.reference})` : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Bill</span>
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {formatCurrency(expense.amount)}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Paid to Date</span>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(expense.total_allocated || 0)}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold">Balance Due</span>
                <p className="text-sm font-black text-amber-600 dark:text-amber-400">
                  {formatCurrency(remainingBalance)}
                </p>
              </div>
            </div>
          </div>

          {/* Settlement Form Inputs */}
          <div className="space-y-4">
            <div className="relative">
              <Input
                label="Settlement Amount ($) *"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => {
                  setPaymentAmount(e.target.value);
                  if (formErrors.paymentAmount) setFormErrors((p) => ({ ...p, paymentAmount: '' }));
                }}
                error={formErrors.paymentAmount}
                leftIcon={<DollarSign className="h-4 w-4 text-[#008F83]" />}
              />
              {remainingBalance > 0 && parseFloat(paymentAmount) !== remainingBalance && (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentAmount(remainingBalance.toFixed(2));
                    if (formErrors.paymentAmount) setFormErrors((p) => ({ ...p, paymentAmount: '' }));
                  }}
                  className="absolute right-3 top-3 text-[11px] font-bold text-[#008F83] hover:underline bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-md"
                >
                  Pay Full ({formatCurrency(remainingBalance)})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Payment / Settlement Date *"
                type="date"
                value={paymentDate}
                onChange={(e) => {
                  setPaymentDate(e.target.value);
                  if (formErrors.paymentDate) setFormErrors((p) => ({ ...p, paymentDate: '' }));
                }}
                error={formErrors.paymentDate}
              />

              <Select
                label="Payment Method *"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                options={[
                  { value: 'bank_transfer', label: 'Direct Bank Transfer / EFT' },
                  { value: 'credit_card', label: 'Credit Card' },
                  { value: 'debit_card', label: 'Debit Card' },
                  { value: 'bpay', label: 'BPAY' },
                  { value: 'direct_debit', label: 'Direct Debit' },
                  { value: 'cheque', label: 'Cheque' },
                  { value: 'cash', label: 'Cash' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </div>

            <Input
              label="Payment Reference / Receipt #"
              placeholder="e.g. EFT-2026-9481, receipt #, or bank transfer reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />

            <Textarea
              label="Payment Notes / Memo"
              placeholder="Optional settlement notes (e.g. Paid from main operating account)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Dual Full-Width Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-[#008F83] hover:bg-[#008F83]/90 text-white font-bold text-sm shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[#008F83]/50 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4" />
              {isSubmitting ? 'Processing...' : 'Settle Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
