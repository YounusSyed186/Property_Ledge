'use client';

import React, { useState, useEffect } from 'react';
import {
  Link2,
  PlusCircle,
  X,
  DollarSign,
  Calendar,
  CheckCircle2,
  CreditCard,
  Building,
  User,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Button, useToast } from '@/components/admin/ui';
import {
  getEligibleTransactionsAction,
  linkTransactionAction,
  recordAndLinkTransactionAction,
} from '@/app/actions/schedules';
import { fetchCategoriesAction } from '@/app/actions/finance';
import { getCachedCategories } from '@/lib/cache/optionsCache';
import {
  ExpectedPaymentScheduleDTO,
  TransactionDTO,
  CategoryDTO,
} from '@/modules/finance/domain/types';

interface LinkTransactionModalProps {
  isOpen: boolean;
  expectedPayment: ExpectedPaymentScheduleDTO | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function LinkTransactionModal({
  isOpen,
  expectedPayment,
  onClose,
  onSuccess,
}: LinkTransactionModalProps) {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'link' | 'record'>('link');

  // Eligible Transactions for Link Existing (Journey 4)
  const [eligibleTransactions, setEligibleTransactions] = useState<
    Array<TransactionDTO & { unallocated_amount: number }>
  >([]);
  const [selectedTxId, setSelectedTxId] = useState<string>('');
  const [linkAmount, setLinkAmount] = useState<string>('');
  const [linkNotes, setLinkNotes] = useState<string>('');
  const [isLoadingEligible, setIsLoadingEligible] = useState(false);

  // New Transaction Form State for Record New (Journey 5)
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [recordAmount, setRecordAmount] = useState<string>('');
  const [recordDate, setRecordDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
  const [categoryId, setCategoryId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [recordNotes, setRecordNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load state when modal opens
  useEffect(() => {
    if (!isOpen || !expectedPayment) return;

    setActiveTab('link');
    const remaining = expectedPayment.remaining_amount ?? expectedPayment.amount;
    setLinkAmount(String(remaining));
    setRecordAmount(String(remaining));
    setDescription(`Payment for ${expectedPayment.schedule_name}`);
    setSelectedTxId('');

    // Load categories instantly from cache
    getCachedCategories('income').then((cats) => {
      setCategories(cats || []);
      const match = (cats || []).find(
        (c) => c.id === expectedPayment.transaction_category_id || c.name.toLowerCase().includes('rent')
      );
      if (match) setCategoryId(match.id);
    });

    // Load eligible transactions
    setIsLoadingEligible(true);
    getEligibleTransactionsAction(expectedPayment.id)
      .then((res) => {
        if (res.success && res.data) {
          setEligibleTransactions(res.data);
          if (res.data.length > 0) {
            setSelectedTxId(res.data[0].id);
            const defaultAlloc = Math.min(res.data[0].unallocated_amount, remaining);
            setLinkAmount(String(defaultAlloc));
          }
        }
      })
      .finally(() => setIsLoadingEligible(false));
  }, [isOpen, expectedPayment]);

  const handleTxSelectChange = (txId: string) => {
    setSelectedTxId(txId);
    if (!expectedPayment) return;
    const tx = eligibleTransactions.find((t) => t.id === txId);
    if (tx) {
      const remaining = expectedPayment.remaining_amount ?? expectedPayment.amount;
      const defaultAlloc = Math.min(tx.unallocated_amount, remaining);
      setLinkAmount(String(defaultAlloc));
    }
  };

  // Submit Link Existing Transaction (Journey 4 & 6)
  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expectedPayment || !selectedTxId) {
      toast({ title: 'Validation Error', description: 'Please select an eligible transaction to link.', variant: 'destructive' });
      return;
    }
    const numAmount = parseFloat(linkAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ title: 'Validation Error', description: 'Please enter a valid allocation amount.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await linkTransactionAction({
        transaction_id: selectedTxId,
        expected_payment_id: expectedPayment.id,
        allocated_amount: numAmount,
        notes: linkNotes || undefined,
      });

      if (res.success) {
        toast({
          title: 'Transaction Linked',
          description: `Successfully allocated $${numAmount.toFixed(2)} to ${expectedPayment.schedule_name}!`,
        });
        onSuccess();
        onClose();
      } else {
        toast({ title: 'Error', description: res.error || 'Failed to link transaction', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to link transaction', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Record New Transaction (Journey 5)
  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expectedPayment) return;

    const numAmount = parseFloat(recordAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ title: 'Validation Error', description: 'Please enter a valid transaction amount.', variant: 'destructive' });
      return;
    }
    if (!categoryId) {
      toast({ title: 'Validation Error', description: 'Please select a transaction category.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordAndLinkTransactionAction({
        expected_payment_id: expectedPayment.id,
        amount: numAmount,
        payment_method: paymentMethod,
        transaction_date: recordDate,
        transaction_category_id: categoryId,
        property_id: expectedPayment.property_id || undefined,
        lease_id: expectedPayment.lease_id || undefined,
        tenant_id: expectedPayment.tenant_id || undefined,
        description: description || undefined,
        notes: recordNotes || undefined,
        allocation_amount: numAmount,
      });

      if (res.success) {
        toast({
          title: 'Transaction Recorded',
          description: `Successfully created transaction & allocated $${numAmount.toFixed(2)}!`,
        });
        onSuccess();
        onClose();
      } else {
        toast({ title: 'Error', description: res.error || 'Failed to record transaction', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to record transaction', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !expectedPayment) return null;

  const remaining = expectedPayment.remaining_amount ?? expectedPayment.amount;
  const isPartial = remaining < expectedPayment.amount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl transition-all my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-5 bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              Process Payment: {expectedPayment.schedule_name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Due Date: <span className="font-semibold text-slate-700 dark:text-slate-300">{expectedPayment.due_date}</span> | Expected Amount:{' '}
              <span className="font-bold text-slate-900 dark:text-white">${expectedPayment.amount.toFixed(2)}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Summary Banner */}
        <div className="bg-slate-100/70 dark:bg-slate-800/60 px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                expectedPayment.status === 'paid'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : expectedPayment.status === 'partially_paid'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
              }`}
            >
              {expectedPayment.status.replace('_', ' ')}
            </span>
            {isPartial && (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                (Partial Payment: ${expectedPayment.total_allocated?.toFixed(2)} paid)
              </span>
            )}
          </div>

          <div className="font-bold text-slate-900 dark:text-white">
            Remaining Due: <span className="text-emerald-600 dark:text-emerald-400">${remaining.toFixed(2)}</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition-all ${
              activeTab === 'link'
                ? 'bg-[#008F83] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Link2 className="h-4 w-4" />
            Link Existing Transaction
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('record')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition-all ${
              activeTab === 'record'
                ? 'bg-[#008F83] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            Record New Transaction
          </button>
        </div>

        {/* Tab Content: Link Existing Transaction (Journey 4 & 6) */}
        {activeTab === 'link' && (
          <form onSubmit={handleLinkSubmit} className="p-6 space-y-5">
            {isLoadingEligible ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6 font-medium">
                Loading eligible transactions...
              </p>
            ) : eligibleTransactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-6 text-center space-y-2">
                <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
                <p className="text-xs font-bold text-slate-900 dark:text-white">No Unallocated Transactions Found</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  There are no unallocated income transactions recorded in this workspace. Switch to "Record New
                  Transaction" tab to log a new payment.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Transaction to Link</label>
                  <select
                    value={selectedTxId}
                    onChange={(e) => handleTxSelectChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#008F83] focus:outline-none focus:ring-1 focus:ring-[#008F83]"
                  >
                    {eligibleTransactions.map((tx) => (
                      <option key={tx.id} value={tx.id}>
                        {tx.transaction_date} - {tx.description || tx.category?.name || 'Income'} (${tx.amount.toFixed(2)} total, ${tx.unallocated_amount.toFixed(2)} available)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Allocation Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={eligibleTransactions.find((t) => t.id === selectedTxId)?.unallocated_amount || 0}
                      value={linkAmount}
                      onChange={(e) => {
                        const selectedTx = eligibleTransactions.find((t) => t.id === selectedTxId);
                        const maxAvail = selectedTx ? selectedTx.unallocated_amount : 0;
                        const num = parseFloat(e.target.value);
                        if (!isNaN(num) && num > maxAvail) {
                          setLinkAmount(String(maxAvail));
                        } else {
                          setLinkAmount(e.target.value);
                        }
                      }}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#008F83] focus:outline-none focus:ring-1 focus:ring-[#008F83]"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Max available: ${eligibleTransactions.find((t) => t.id === selectedTxId)?.unallocated_amount.toFixed(2) || '0.00'}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Allocation Notes</label>
                    <input
                      type="text"
                      placeholder="Optional allocation note..."
                      value={linkNotes}
                      onChange={(e) => setLinkNotes(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#008F83] focus:outline-none focus:ring-1 focus:ring-[#008F83]"
                    />
                  </div>
                </div>

                {parseFloat(linkAmount) < remaining && parseFloat(linkAmount) > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Partial payment detection: This allocation of ${parseFloat(linkAmount).toFixed(2)} leaves a remaining
                      balance of ${(remaining - parseFloat(linkAmount)).toFixed(2)}. Entry will be marked as <strong>Partially Paid</strong>.
                    </span>
                  </div>
                )}
              </>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || eligibleTransactions.length === 0 || !selectedTxId}
                className="bg-[#008F83] hover:bg-[#007A70] text-white font-bold"
              >
                {isSubmitting ? 'Linking...' : 'Confirm & Link Allocation'}
              </Button>
            </div>
          </form>
        )}

        {/* Tab Content: Record New Transaction (Journey 5) */}
        {activeTab === 'record' && (
          <form onSubmit={handleRecordSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                  Actual Payment Amount ($) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={recordAmount}
                  onChange={(e) => setRecordAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#008F83] focus:outline-none focus:ring-1 focus:ring-[#008F83]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-[#008F83]" />
                  Transaction Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#008F83] focus:outline-none focus:ring-1 focus:ring-[#008F83]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5 text-[#008F83]" />
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#008F83] focus:outline-none focus:ring-1 focus:ring-[#008F83]"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="direct_debit">Direct Debit</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#008F83] focus:outline-none focus:ring-1 focus:ring-[#008F83]"
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#008F83] focus:outline-none focus:ring-1 focus:ring-[#008F83]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Notes / Reference</label>
              <input
                type="text"
                placeholder="Reference number or transaction notes..."
                value={recordNotes}
                onChange={(e) => setRecordNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#008F83] focus:outline-none focus:ring-1 focus:ring-[#008F83]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-[#008F83] hover:bg-[#007A70] text-white font-bold"
              >
                {isSubmitting ? 'Recording...' : 'Record & Link Payment'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
