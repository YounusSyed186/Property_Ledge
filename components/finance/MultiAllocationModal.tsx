'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  X,
  DollarSign,
  CheckSquare,
  Square,
  AlertCircle,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Button, useToast } from '@/components/admin/ui';
import { allocateMultiTransactionsAction, fetchExpectedSchedulesAction } from '@/app/actions/schedules';
import { fetchTransactionsAction } from '@/app/actions/finance';
import {
  ExpectedPaymentScheduleDTO,
  TransactionDTO,
} from '@/modules/finance/domain/types';

const EMPTY_SCHEDULES: ExpectedPaymentScheduleDTO[] = [];

interface MultiAllocationModalProps {
  isOpen: boolean;
  expectedSchedules?: ExpectedPaymentScheduleDTO[];
  initialTransactionId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function MultiAllocationModal({
  isOpen,
  expectedSchedules = EMPTY_SCHEDULES,
  initialTransactionId,
  onClose,
  onSuccess,
}: MultiAllocationModalProps) {
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<TransactionDTO[]>([]);
  const [selectedTxId, setSelectedTxId] = useState<string>('');
  const [isLoadingTx, setIsLoadingTx] = useState(false);
  const [loadedSchedules, setLoadedSchedules] = useState<ExpectedPaymentScheduleDTO[]>([]);

  // Selected schedule entries & allocation distribution amounts: { [expectedId]: number }
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load available transactions & schedules on modal open
  useEffect(() => {
    if (!isOpen) return;

    setIsLoadingTx(true);
    setAllocations({});

    // Fetch transactions
    fetchTransactionsAction({ transaction_type: 'income', status: 'completed' })
      .then((data) => {
        setTransactions(data || []);
        if (initialTransactionId) {
          setSelectedTxId(initialTransactionId);
        } else if (data && data.length > 0) {
          setSelectedTxId(data[0].id);
        }
      })
      .finally(() => setIsLoadingTx(false));

    // Fetch expected schedules if not passed in
    if (!expectedSchedules || expectedSchedules.length === 0) {
      fetchExpectedSchedulesAction({ status: 'all' }).then((res) => {
        if (res.success && res.data) {
          setLoadedSchedules(res.data);
        }
      });
    } else {
      setLoadedSchedules(expectedSchedules);
    }
  }, [isOpen, initialTransactionId]);

  // Selected transaction object
  const selectedTx = transactions.find((t) => t.id === selectedTxId);
  const totalTxAmount = selectedTx ? Number(selectedTx.amount) : 0;

  // Active schedules to display
  const activeSchedules = expectedSchedules.length > 0 ? expectedSchedules : loadedSchedules;

  // Filter only pending or partially paid expected entries
  const pendingEntries = activeSchedules.filter((s) => s.status !== 'paid' && s.status !== 'cancelled');

  // Toggle selection of an expected entry
  const handleToggleEntry = (entry: ExpectedPaymentScheduleDTO) => {
    if (allocations[entry.id] === undefined) {
      const otherAllocated = Object.entries(allocations)
        .filter(([id]) => id !== entry.id)
        .reduce((sum, [_, amt]) => sum + (amt || 0), 0);
      const availableTx = Math.max(0, totalTxAmount - otherAllocated);

      if (availableTx <= 0) {
        toast({
          title: 'No Balance Available',
          description: 'Cannot select entry because there is no unallocated transaction balance remaining.',
          variant: 'destructive',
        });
        return;
      }

      const rem = entry.remaining_amount ?? entry.amount;
      const allocAmount = Math.min(rem, availableTx);
      setAllocations((prev) => ({
        ...prev,
        [entry.id]: allocAmount,
      }));
    } else {
      setAllocations((prev) => {
        const next = { ...prev };
        delete next[entry.id];
        return next;
      });
    }
  };

  const handleAmountChange = (entryId: string, val: string) => {
    const num = parseFloat(val);
    const validNum = isNaN(num) ? 0 : num;
    const otherAllocated = Object.entries(allocations)
      .filter(([id]) => id !== entryId)
      .reduce((sum, [_, amt]) => sum + (amt || 0), 0);
    const maxAvailable = Math.max(0, totalTxAmount - otherAllocated);
    const clamped = Math.min(validNum, maxAvailable);

    setAllocations((prev) => ({
      ...prev,
      [entryId]: clamped,
    }));
  };

  // Compute total allocated in current distribution
  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0);
  const remainingTxBalance = Math.max(0, totalTxAmount - totalAllocated);

  // Auto-distribute evenly/sequentially across selected entries
  const handleAutoDistribute = () => {
    if (!selectedTx) return;

    let available = totalTxAmount;
    const nextAlloc: Record<string, number> = {};

    for (const entry of pendingEntries) {
      if (available <= 0) break;
      const rem = entry.remaining_amount ?? entry.amount;
      const alloc = Math.min(available, rem);
      nextAlloc[entry.id] = alloc;
      available -= alloc;
    }

    setAllocations(nextAlloc);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTxId) {
      toast({ title: 'Validation Error', description: 'Please select a transaction to allocate.', variant: 'destructive' });
      return;
    }

    const allocList = Object.entries(allocations)
      .filter(([_, amt]) => amt > 0)
      .map(([expected_payment_id, allocated_amount]) => ({
        expected_payment_id,
        allocated_amount,
      }));

    if (allocList.length === 0) {
      toast({ title: 'Validation Error', description: 'Please select at least one expected payment entry.', variant: 'destructive' });
      return;
    }

    if (totalAllocated > totalTxAmount + 0.01) {
      toast({
        title: 'Validation Error',
        description: `Total allocated ($${totalAllocated.toFixed(2)}) exceeds transaction amount ($${totalTxAmount.toFixed(2)}).`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await allocateMultiTransactionsAction(selectedTxId, allocList);
      if (res.success) {
        toast({
          title: 'Multi-Allocation Successful',
          description: `Successfully distributed $${totalAllocated.toFixed(2)} across ${allocList.length} expected entries!`,
        });
        onSuccess();
        onClose();
      } else {
        toast({ title: 'Error', description: res.error || 'Failed to allocate transaction', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to allocate transaction', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl transition-all my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-5 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#008F83]/10 text-[#008F83]">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Allocate 1 Transaction to Multiple Entries</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Distribute lump sum transactions across expected payment schedule entries
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Select Source Transaction */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Select Source Transaction</span>
              {selectedTx && (
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Total Amount: ${totalTxAmount.toFixed(2)}
                </span>
              )}
            </label>
            {isLoadingTx ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-2 font-medium">Loading transactions...</p>
            ) : (
              <select
                value={selectedTxId}
                onChange={(e) => {
                  setSelectedTxId(e.target.value);
                  setAllocations({});
                }}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#008F83] focus:outline-none focus:ring-1 focus:ring-[#008F83]"
              >
                {transactions.length === 0 ? (
                  <option value="">-- No completed income transactions --</option>
                ) : (
                  transactions.map((tx) => (
                    <option key={tx.id} value={tx.id}>
                      {tx.transaction_date} - {tx.description || tx.category?.name || 'Income'} (${tx.amount.toFixed(2)} - Ref: {tx.reference || 'N/A'})
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* Allocation Distribution Summary Bar */}
          {selectedTx && (
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs text-center">
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Transaction Total</span>
                <span className="font-bold text-slate-900 dark:text-white">${totalTxAmount.toFixed(2)}</span>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Distributed Amount</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ${totalAllocated.toFixed(2)}
                </span>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Unallocated Balance</span>
                <span
                  className={`font-bold ${
                    remainingTxBalance < 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  ${remainingTxBalance.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Action to Auto-Distribute */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Target Expected Entries ({pendingEntries.length} pending)
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutoDistribute}
              disabled={!selectedTx || pendingEntries.length === 0}
            >
              Auto-Distribute Lump Sum
            </Button>
          </div>

          {/* Entry Selection List */}
          <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 bg-slate-50/50 dark:bg-slate-950">
            {pendingEntries.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">No pending expected entries available.</p>
            ) : (
              pendingEntries.map((entry) => {
                const isSelected = allocations[entry.id] !== undefined;
                const remaining = entry.remaining_amount ?? entry.amount;
                const isDisabled = !isSelected && remainingTxBalance <= 0;

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all text-xs ${
                      isSelected
                        ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 shadow-xs'
                        : isDisabled
                        ? 'border-slate-200 dark:border-slate-800/60 bg-slate-100/50 dark:bg-slate-900/40 opacity-60 cursor-not-allowed'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-3 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      onClick={() => handleToggleEntry(entry)}
                    >
                      <button type="button" disabled={isDisabled} className="text-[#008F83] disabled:opacity-50">
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className={`h-4 w-4 ${isDisabled ? 'text-slate-300 dark:text-slate-700' : 'text-slate-400'}`} />
                        )}
                      </button>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{entry.schedule_name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Due: {entry.due_date} | Remaining Due: ${remaining.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Allocate $:</span>
                        <input
                          type="number"
                          step="0.01"
                          value={allocations[entry.id] ?? 0}
                          onChange={(e) => handleAmountChange(entry.id, e.target.value)}
                          className="w-24 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-xs text-slate-900 dark:text-white text-right font-bold focus:border-[#008F83] focus:outline-none focus:ring-1 focus:ring-[#008F83]"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !selectedTxId || Object.keys(allocations).length === 0}
              className="bg-[#008F83] hover:bg-[#007A70] text-white font-bold"
            >
              {isSubmitting ? 'Allocating...' : 'Confirm Multi-Allocation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
