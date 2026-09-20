'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  X,
  DollarSign,
  CheckSquare,
  Square,
  AlertCircle,
  Info,
  CheckCircle2,
  Search,
  CheckCheck,
  RotateCcw,
  Building,
} from 'lucide-react';
import { Button, useToast, Drawer } from '@/components/admin/ui';
import {
  fetchAvailableExpenseTransactionsAction,
  allocateMultiExpenseTransactionsAction,
  fetchExpensesAction,
} from '@/app/actions/expenses';
import { ExpenseDTO, TransactionDTO } from '@/modules/finance/domain/types';
import { formatCurrency } from '@/lib/format/currency';
import { cn } from '@/lib/utils';

const EMPTY_EXPENSES: ExpenseDTO[] = [];

interface MultiExpenseAllocationModalProps {
  isOpen: boolean;
  expenses?: ExpenseDTO[];
  initialTransactionId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function MultiExpenseAllocationModal({
  isOpen,
  expenses = EMPTY_EXPENSES,
  initialTransactionId,
  onClose,
  onSuccess,
}: MultiExpenseAllocationModalProps) {
  const { toast } = useToast();

  const [availableTransactions, setAvailableTransactions] = useState<
    Array<TransactionDTO & { available_to_allocate: number }>
  >([]);
  const [selectedTxId, setSelectedTxId] = useState<string>('');
  const [isLoadingTx, setIsLoadingTx] = useState(false);
  const [loadedExpenses, setLoadedExpenses] = useState<ExpenseDTO[]>([]);

  // Allocated amounts per expense: { [expenseId]: number }
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load available transactions and pending expenses when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setIsLoadingTx(true);
    setAllocations({});
    setSearchQuery('');

    // Fetch available expense ledger transactions
    fetchAvailableExpenseTransactionsAction()
      .then((res) => {
        if (res.success && res.data) {
          setAvailableTransactions(res.data);
          if (initialTransactionId) {
            setSelectedTxId(initialTransactionId);
          } else if (res.data.length > 0) {
            setSelectedTxId(res.data[0].id);
          }
        } else {
          setAvailableTransactions([]);
        }
      })
      .finally(() => setIsLoadingTx(false));

    // Fetch expenses if not passed in
    if (!expenses || expenses.length === 0) {
      fetchExpensesAction({ status: 'pending' }).then((res) => {
        if (res.success && res.data) {
          setLoadedExpenses(res.data);
        }
      });
    } else {
      setLoadedExpenses(expenses);
    }
  }, [isOpen, initialTransactionId]);

  // Selected transaction object
  const selectedTx = useMemo(
    () => availableTransactions.find((t) => t.id === selectedTxId) || null,
    [availableTransactions, selectedTxId]
  );
  const totalAvailableTxAmount = selectedTx ? selectedTx.available_to_allocate : 0;

  // Active pending expenses
  const activeExpenses = expenses.length > 0 ? expenses : loadedExpenses;
  const pendingExpenses = useMemo(
    () => activeExpenses.filter((e) => e.status !== 'paid' && e.status !== 'cancelled'),
    [activeExpenses]
  );

  // Auto-distribute allocations across pending expenses
  const handleAutoDistribute = () => {
    if (!selectedTx || pendingExpenses.length === 0) return;
    let available = totalAvailableTxAmount;
    const nextAlloc: Record<string, number> = {};

    for (const exp of pendingExpenses) {
      if (available <= 0) break;
      const rem = exp.remaining_amount ?? Math.max(0, exp.amount - (exp.total_allocated || 0));
      const alloc = Math.min(available, rem);
      if (alloc > 0) {
        nextAlloc[exp.id] = Math.round(alloc * 100) / 100;
        available -= alloc;
      }
    }
    setAllocations(nextAlloc);
  };

  useEffect(() => {
    if (!isOpen || !selectedTx || pendingExpenses.length === 0) return;
    handleAutoDistribute();
  }, [isOpen, selectedTxId, totalAvailableTxAmount]);

  // Total allocated & remaining calculation
  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0);
  const remainingTxBalance = Math.max(0, totalAvailableTxAmount - totalAllocated);

  // Filtered expenses list
  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return pendingExpenses;
    const q = searchQuery.toLowerCase().trim();
    return pendingExpenses.filter((exp) => {
      const matchDesc = exp.description?.toLowerCase().includes(q);
      const matchVendor = exp.vendor_name?.toLowerCase().includes(q);
      const matchProp = exp.property?.name.toLowerCase().includes(q);
      const matchCat = exp.category?.name.toLowerCase().includes(q);
      return matchDesc || matchVendor || matchProp || matchCat;
    });
  }, [pendingExpenses, searchQuery]);

  // Toggle allocation for single expense
  const handleToggleExpense = (exp: ExpenseDTO) => {
    const current = allocations[exp.id];
    if (current !== undefined) {
      const next = { ...allocations };
      delete next[exp.id];
      setAllocations(next);
    } else {
      const rem = exp.remaining_amount ?? Math.max(0, exp.amount - (exp.total_allocated || 0));
      const defaultAlloc = Math.min(remainingTxBalance, rem);
      if (defaultAlloc > 0) {
        setAllocations((prev) => ({ ...prev, [exp.id]: Math.round(defaultAlloc * 100) / 100 }));
      } else {
        toast({
          title: 'Transaction Balance Exhausted',
          description: 'No remaining transaction capacity to allocate to this expense.',
          variant: 'destructive',
        });
      }
    }
  };

  // Change custom allocation amount for expense
  const handleAmountChange = (expId: string, valStr: string, maxRem: number) => {
    const val = parseFloat(valStr);
    if (isNaN(val) || val <= 0) {
      const next = { ...allocations };
      delete next[expId];
      setAllocations(next);
      return;
    }

    const currentOtherTotal = Object.entries(allocations)
      .filter(([id]) => id !== expId)
      .reduce((sum, [, a]) => sum + a, 0);

    const txCapacityLeft = totalAvailableTxAmount - currentOtherTotal;
    const maxAllowed = Math.min(maxRem, txCapacityLeft);

    if (val > maxAllowed + 0.001) {
      toast({
        title: 'Limit Exceeded',
        description: `Allocation cannot exceed ${formatCurrency(maxAllowed)} (remaining bill balance & available transaction capacity).`,
        variant: 'destructive',
      });
      setAllocations((prev) => ({ ...prev, [expId]: Math.round(maxAllowed * 100) / 100 }));
      return;
    }

    setAllocations((prev) => ({ ...prev, [expId]: Math.round(val * 100) / 100 }));
  };

  const handleSubmit = async () => {
    if (!selectedTxId) {
      toast({ title: 'Validation Error', description: 'Please select a ledger transaction.', variant: 'destructive' });
      return;
    }

    const allocList = Object.entries(allocations)
      .filter(([, amt]) => amt > 0)
      .map(([expense_id, allocated_amount]) => ({ expense_id, allocated_amount }));

    if (allocList.length === 0) {
      toast({ title: 'No Allocations Specified', description: 'Please specify an allocation amount for at least one expense.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await allocateMultiExpenseTransactionsAction(selectedTxId, allocList);
      if (!res.success) {
        throw new Error(res.error || 'Failed to process batch allocations');
      }

      toast({
        title: 'Batch Allocations Processed',
        description: `Successfully allocated ${formatCurrency(totalAllocated)} across ${res.count} expense record(s).`,
        variant: 'success',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Batch allocation error:', err);
      toast({
        title: 'Allocation Error',
        description: err.message || 'Failed to process expense allocations.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-between w-full">
      <Button type="button" variant="ghost" onClick={() => setAllocations({})} disabled={isSubmitting}>
        <RotateCcw className="h-4 w-4 mr-1.5" /> Clear Selection
      </Button>

      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedTxId || Object.keys(allocations).length === 0}
          className="bg-[#008F83] hover:bg-[#007A70] text-white font-bold"
        >
          {isSubmitting ? 'Processing...' : `Process Allocations (${Object.keys(allocations).length})`}
        </Button>
      </div>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Multi-Expense Batch Allocation"
      description="Allocate a single bulk bank payout or ledger transaction across multiple operating expenses"
      width="xl"
      footer={footer}
    >
      <div className="space-y-5 py-2">
        {/* Ledger Transaction Selector */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Step 1: Select Expense Ledger Transaction
            </span>
            {selectedTx && (
              <span className="text-xs font-mono font-bold text-[#008F83]">
                Available: {formatCurrency(totalAvailableTxAmount)}
              </span>
            )}
          </div>

          {isLoadingTx ? (
            <div className="p-3 text-xs text-slate-400 text-center">Loading transactions...</div>
          ) : availableTransactions.length === 0 ? (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
              No unallocated expense transactions found in general ledger.
            </div>
          ) : (
            <select
              value={selectedTxId}
              onChange={(e) => setSelectedTxId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008F83]"
            >
              {availableTransactions.map((tx) => (
                <option key={tx.id} value={tx.id}>
                  {tx.transaction_date} — {tx.description || tx.vendor_name || 'Expense'} (${formatCurrency(tx.amount)} total, ${formatCurrency(tx.available_to_allocate)} available)
                </option>
              ))}
            </select>
          )}

          {/* Allocation Progress Meter */}
          {selectedTx && (
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-500">Allocation Progress:</span>
                <span className="font-mono text-slate-900 dark:text-white font-bold">
                  {formatCurrency(totalAllocated)} of {formatCurrency(totalAvailableTxAmount)} allocated ({formatCurrency(remainingTxBalance)} remaining)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-[#008F83] transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (totalAllocated / (totalAvailableTxAmount || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Select & Distribute Expenses */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Step 2: Select & Allocate Operating Expenses ({filteredExpenses.length})
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoDistribute}
                leftIcon={<CheckCheck className="h-3.5 w-3.5 text-[#008F83]" />}
                className="text-xs"
              >
                Auto Distribute
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by payee, property, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#008F83] text-slate-900 dark:text-white"
            />
          </div>

          {/* Expense Allocation List */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {filteredExpenses.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                No pending or partially paid expenses found.
              </div>
            ) : (
              filteredExpenses.map((exp) => {
                const rem = exp.remaining_amount ?? Math.max(0, exp.amount - (exp.total_allocated || 0));
                const currentAlloc = allocations[exp.id];
                const isSelected = currentAlloc !== undefined;

                return (
                  <div
                    key={exp.id}
                    className={cn(
                      'p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                      isSelected
                        ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    )}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleExpense(exp)}
                        className="mt-0.5 text-slate-400 hover:text-[#008F83] transition-colors shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-[#008F83]" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {exp.description || exp.category?.name || 'Expense'}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">{exp.expense_date}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {exp.vendor_name && <span>Payee: {exp.vendor_name}</span>}
                          {exp.property && (
                            <span className="flex items-center gap-1">
                              <Building className="w-3 h-3 text-[#008F83]" /> {exp.property.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">Remaining Due</span>
                        <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
                          {formatCurrency(rem)}
                        </span>
                      </div>

                      <div className="w-32">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          disabled={!isSelected}
                          value={currentAlloc !== undefined ? currentAlloc : ''}
                          onChange={(e) => handleAmountChange(exp.id, e.target.value, rem)}
                          className={cn(
                            'w-full px-2.5 py-1 text-xs font-mono font-bold rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#008F83]',
                            isSelected
                              ? 'border-[#008F83] bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-400 cursor-not-allowed'
                          )}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
