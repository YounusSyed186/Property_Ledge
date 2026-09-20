'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Link2,
  DollarSign,
  Receipt,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Building,
  Info,
  Layers,
} from 'lucide-react';
import { Button, Input, Select, Textarea, useToast, Drawer } from '@/components/admin/ui';
import { ExpenseDTO, TransactionDTO } from '@/modules/finance/domain/types';
import { formatCurrency } from '@/lib/format/currency';
import {
  fetchAvailableExpenseTransactionsAction,
  linkExpenseTransactionAction,
} from '@/app/actions/expenses';
import { validateExpenseAllocation } from '@/modules/finance/domain/expenseCalculations';
import { cn } from '@/lib/utils';

interface LinkExpenseTransactionModalProps {
  expense: ExpenseDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedExpense: ExpenseDTO) => void;
}

export function LinkExpenseTransactionModal({
  expense,
  isOpen,
  onClose,
  onSuccess,
}: LinkExpenseTransactionModalProps) {
  const { toast } = useToast();

  const [availableTransactions, setAvailableTransactions] = useState<
    Array<TransactionDTO & { available_to_allocate: number }>
  >([]);
  const [selectedTxId, setSelectedTxId] = useState('');
  const [allocatedAmount, setAllocatedAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const remainingBalance = expense?.remaining_amount ?? (expense ? expense.amount - (expense.total_allocated || 0) : 0);

  // Load available transactions
  useEffect(() => {
    if (!isOpen || !expense) return;

    setIsLoading(true);
    setSelectedTxId('');
    setAllocatedAmount('');
    setNotes('');
    setFormError('');

    fetchAvailableExpenseTransactionsAction(expense.property_id)
      .then((res) => {
        if (res.success && res.data) {
          setAvailableTransactions(res.data);
          if (res.data.length > 0) {
            setSelectedTxId(res.data[0].id);
            const defaultAlloc = Math.min(remainingBalance, res.data[0].available_to_allocate);
            setAllocatedAmount(defaultAlloc > 0 ? defaultAlloc.toFixed(2) : '');
          }
        } else {
          setAvailableTransactions([]);
        }
      })
      .catch((err) => {
        console.error('Error fetching available transactions:', err);
        setAvailableTransactions([]);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, expense, remainingBalance]);

  // Selected Transaction Object
  const selectedTx = useMemo(() => {
    return availableTransactions.find((t) => t.id === selectedTxId) || null;
  }, [availableTransactions, selectedTxId]);

  // Auto-fill proposed allocation amount when transaction is selected
  const handleSelectTransaction = (txId: string) => {
    setSelectedTxId(txId);
    setFormError('');
    const tx = availableTransactions.find((t) => t.id === txId);
    if (tx) {
      const defaultAlloc = Math.min(remainingBalance, tx.available_to_allocate);
      setAllocatedAmount(defaultAlloc > 0 ? defaultAlloc.toFixed(2) : '');
    } else {
      setAllocatedAmount('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expense) return;

    const parsedAmount = parseFloat(allocatedAmount);
    if (!selectedTxId) {
      setFormError('Please select a financial ledger transaction.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid allocation amount greater than $0.');
      return;
    }

    if (selectedTx) {
      const val = validateExpenseAllocation(
        { amount: expense.amount, allocations: expense.allocations },
        { amount: selectedTx.amount, allocations: (selectedTx as any).allocations },
        parsedAmount
      );
      if (!val.valid) {
        setFormError(val.error || 'Invalid allocation amount.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await linkExpenseTransactionAction({
        expense_id: expense.id,
        transaction_id: selectedTxId,
        allocated_amount: parsedAmount,
        notes: notes.trim() || undefined,
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to link transaction to expense');
      }

      toast({
        title: 'Transaction Linked',
        description: `Successfully allocated ${formatCurrency(parsedAmount)} to this expense.`,
        variant: 'success',
      });

      onSuccess?.(res.data);
      onClose();
    } catch (err: any) {
      console.error('Link transaction error:', err);
      setFormError(err.message || 'Could not link transaction.');
      toast({
        title: 'Allocation Failed',
        description: err.message || 'Could not link transaction to expense.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-end gap-3 w-full">
      <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button
        type="button"
        onClick={handleSubmit as any}
        disabled={isSubmitting || availableTransactions.length === 0}
        className="bg-[#008F83] hover:bg-[#007A70] text-white font-bold"
      >
        {isSubmitting ? 'Processing...' : 'Confirm Allocation'}
      </Button>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Process Expense"
      description="Map an unallocated financial ledger payment to process and allocate this operating expense"
      width="lg"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-5 py-2">
        {/* Expense Summary Header */}
        {expense && (
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {expense.description || expense.category?.name || 'Expense'}
              </span>
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                Total: {formatCurrency(expense.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
              <span className="text-slate-500">Unpaid Balance to Settle:</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(remainingBalance)}
              </span>
            </div>
          </div>
        )}

        {/* Transaction Select */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            Select Available Ledger Transaction *
          </label>

          {isLoading ? (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
              Loading available expense transactions...
            </div>
          ) : availableTransactions.length === 0 ? (
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600" /> No Available Transactions Found
              </div>
              <p>
                There are no unallocated expense transactions for this property in the general ledger.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {availableTransactions.map((tx) => {
                const isSelected = selectedTxId === tx.id;
                return (
                  <div
                    key={tx.id}
                    onClick={() => handleSelectTransaction(tx.id)}
                    className={cn(
                      'p-3.5 rounded-xl border transition-all cursor-pointer space-y-1',
                      isSelected
                        ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                          {formatCurrency(tx.amount)}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {tx.transaction_date}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Available: {formatCurrency(tx.available_to_allocate)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {tx.description || tx.reference || 'Bank Transaction'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Allocation Amount */}
        {availableTransactions.length > 0 && (
          <div className="space-y-4">
            <Input
              label="Allocated Amount ($) *"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={allocatedAmount}
              onChange={(e) => {
                setAllocatedAmount(e.target.value);
                setFormError('');
              }}
              leftIcon={<DollarSign className="h-4 w-4 text-emerald-500" />}
            />

            <Textarea
              label="Allocation Notes (Optional)"
              placeholder="Optional notes regarding this settlement..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        )}

        {/* Error Alert */}
        {formError && (
          <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
      </form>
    </Drawer>
  );
}
