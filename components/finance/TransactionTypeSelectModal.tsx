'use client';

import React, { useState } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  DollarSign,
  Receipt,
  Building,
  User,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { TransactionType } from '@/modules/finance/domain/types';
import { Button } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

interface TransactionTypeSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: TransactionType) => void;
}

export function TransactionTypeSelectModal({
  isOpen,
  onClose,
  onSelectType,
}: TransactionTypeSelectModalProps) {
  const [selectedType, setSelectedType] = useState<TransactionType>('income');

  if (!isOpen) return null;

  const handleContinue = () => {
    onSelectType(selectedType);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 sm:p-8 shadow-2xl z-10 space-y-6">
        {/* Header with Close */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-admin-primary/10 text-admin-primary text-xs font-bold border border-admin-primary/20">
              <Sparkles className="w-3.5 h-3.5" /> Transaction Setup
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title & Subtitle (Invoice Style) */}
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Select Transaction Category
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Choose how you want to record this entry. You can log property revenue inflows or operating expenses.
          </p>
        </div>

        {/* 2-Option Card Grid (Mirroring Invoice Type Selection) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">
          {/* Option 1: Income (Money In) */}
          <div
            onClick={() => setSelectedType('income')}
            onDoubleClick={() => onSelectType('income')}
            className={cn(
              'cursor-pointer rounded-3xl p-6 border-2 transition-all flex flex-col justify-between relative group hover:shadow-xl',
              selectedType === 'income'
                ? 'border-emerald-600 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-lg ring-4 ring-emerald-500/15'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
            )}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
                    selectedType === 'income'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-emerald-500/10 group-hover:text-emerald-600'
                  )}
                >
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span
                  className={cn(
                    'text-[10.5px] font-bold px-2.5 py-1 rounded-full border',
                    selectedType === 'income'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  )}
                >
                  Money In
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Record Income
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Log tenant rental payments, security deposits, owner contributions, and sundry property earnings.
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={cn('w-4 h-4', selectedType === 'income' ? 'text-emerald-600' : 'text-slate-400')}
                  />
                  <span>Rent & recurring tenant payments</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={cn('w-4 h-4', selectedType === 'income' ? 'text-emerald-600' : 'text-slate-400')}
                  />
                  <span>Security bonds & owner contributions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={cn('w-4 h-4', selectedType === 'income' ? 'text-emerald-600' : 'text-slate-400')}
                  />
                  <span>Optional tenant, lease & invoice links</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span
                className={cn(
                  'text-xs font-bold transition-colors',
                  selectedType === 'income'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                )}
              >
                {selectedType === 'income' ? 'Selected' : 'Click to Select'}
              </span>
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center border transition-all',
                  selectedType === 'income'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-slate-300 dark:border-slate-600 text-transparent'
                )}
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Option 2: Expense (Money Out) */}
          <div
            onClick={() => setSelectedType('expense')}
            onDoubleClick={() => onSelectType('expense')}
            className={cn(
              'cursor-pointer rounded-3xl p-6 border-2 transition-all flex flex-col justify-between relative group hover:shadow-xl',
              selectedType === 'expense'
                ? 'border-rose-600 bg-rose-500/5 dark:bg-rose-500/10 shadow-lg ring-4 ring-rose-500/15'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
            )}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
                    selectedType === 'expense'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-rose-500/10 group-hover:text-rose-600'
                  )}
                >
                  <TrendingDown className="w-6 h-6" />
                </div>
                <span
                  className={cn(
                    'text-[10.5px] font-bold px-2.5 py-1 rounded-full border',
                    selectedType === 'expense'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  )}
                >
                  Money Out
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  Record Expense
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Log property repairs, preventative maintenance, council rates, insurance, utilities, and vendor fees.
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={cn('w-4 h-4', selectedType === 'expense' ? 'text-rose-600' : 'text-slate-400')}
                  />
                  <span>Repairs, maintenance & contractor costs</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={cn('w-4 h-4', selectedType === 'expense' ? 'text-rose-600' : 'text-slate-400')}
                  />
                  <span>Council rates, utilities & insurance</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={cn('w-4 h-4', selectedType === 'expense' ? 'text-rose-600' : 'text-slate-400')}
                  />
                  <span>Vendor payee & tax receipt reference tracking</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span
                className={cn(
                  'text-xs font-bold transition-colors',
                  selectedType === 'expense'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                )}
              >
                {selectedType === 'expense' ? 'Selected' : 'Click to Select'}
              </span>
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center border transition-all',
                  selectedType === 'expense'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'border-slate-300 dark:border-slate-600 text-transparent'
                )}
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Continue Button (Matching Invoices Modal Footer) */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleContinue}
            className="font-bold gap-2 text-xs bg-admin-primary hover:bg-admin-primary/90 text-white shadow-xs"
          >
            Continue with {selectedType === 'income' ? 'Income' : 'Expense'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
