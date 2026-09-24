'use client';

import React, { useState } from 'react';
import {
  X,
  FileText,
  Layers,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Building,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { ScheduleType } from '@/modules/finance/domain/types';
import { Button } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

interface ScheduleTypeSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: ScheduleType) => void;
}

export function ScheduleTypeSelectModal({
  isOpen,
  onClose,
  onSelectType,
}: ScheduleTypeSelectModalProps) {
  const [selectedType, setSelectedType] = useState<ScheduleType>('lease');

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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#008F83]/10 text-[#008F83] text-xs font-bold border border-[#008F83]/20">
              <Sparkles className="w-3.5 h-3.5" /> Schedule Setup
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

        {/* Title & Subtitle */}
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Select Schedule Type
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Choose whether to setup a recurring rent schedule linked to a lease, or an independent payment obligation.
          </p>
        </div>

        {/* 2-Option Card Grid (Matching Transaction Setup Modal) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">
          {/* Option 1: Lease-Based Schedule */}
          <div
            onClick={() => setSelectedType('lease')}
            onDoubleClick={() => onSelectType('lease')}
            className={cn(
              'cursor-pointer rounded-3xl p-6 border-2 transition-all flex flex-col justify-between relative group hover:shadow-xl',
              selectedType === 'lease'
                ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 shadow-lg ring-4 ring-[#008F83]/15'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
            )}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
                    selectedType === 'lease'
                      ? 'bg-[#008F83] text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-[#008F83]/10 group-hover:text-[#008F83]'
                  )}
                >
                  <FileText className="w-6 h-6" />
                </div>
                <span
                  className={cn(
                    'text-[10.5px] font-bold px-2.5 py-1 rounded-full border',
                    selectedType === 'lease'
                      ? 'bg-[#008F83]/15 text-[#008F83] dark:text-teal-400 border-[#008F83]/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  )}
                >
                  Rent & Leases
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#008F83] dark:group-hover:text-teal-400 transition-colors">
                  Lease-Based Schedule
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Setup recurring rent collections tied directly to an active tenancy, property, and lease agreement.
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={cn('w-4 h-4', selectedType === 'lease' ? 'text-[#008F83]' : 'text-slate-400')}
                  />
                  <span>Auto-syncs rent amount & frequency</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={cn('w-4 h-4', selectedType === 'lease' ? 'text-[#008F83]' : 'text-slate-400')}
                  />
                  <span>Direct link to tenant & active lease</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={cn('w-4 h-4', selectedType === 'lease' ? 'text-[#008F83]' : 'text-slate-400')}
                  />
                  <span>Rent due date & payment matching</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span
                className={cn(
                  'text-xs font-bold transition-colors',
                  selectedType === 'lease'
                    ? 'text-[#008F83] dark:text-teal-400'
                    : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                )}
              >
                {selectedType === 'lease' ? 'Selected' : 'Click to Select'}
              </span>
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center border transition-all',
                  selectedType === 'lease'
                    ? 'bg-[#008F83] text-white border-[#008F83]'
                    : 'border-slate-300 dark:border-slate-600 text-transparent'
                )}
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Option 2: Independent Schedule */}
          <div
            onClick={() => setSelectedType('independent')}
            onDoubleClick={() => onSelectType('independent')}
            className={cn(
              'cursor-pointer rounded-3xl p-6 border-2 transition-all flex flex-col justify-between relative group hover:shadow-xl',
              selectedType === 'independent'
                ? 'border-indigo-600 bg-indigo-500/5 dark:bg-indigo-500/10 shadow-lg ring-4 ring-indigo-500/15'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
            )}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
                    selectedType === 'independent'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-500/10 group-hover:text-indigo-600'
                  )}
                >
                  <Layers className="w-6 h-6" />
                </div>
                <span
                  className={cn(
                    'text-[10.5px] font-bold px-2.5 py-1 rounded-full border',
                    selectedType === 'independent'
                      ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  )}
                >
                  Custom Obligations
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Independent Schedule
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Setup recurring expenses, maintenance contracts, body corporate/strata fees, or custom obligations.
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={cn('w-4 h-4', selectedType === 'independent' ? 'text-indigo-600' : 'text-slate-400')}
                  />
                  <span>No active lease or tenancy required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={cn('w-4 h-4', selectedType === 'independent' ? 'text-indigo-600' : 'text-slate-400')}
                  />
                  <span>Custom frequency, amounts & categories</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={cn('w-4 h-4', selectedType === 'independent' ? 'text-indigo-600' : 'text-slate-400')}
                  />
                  <span>Full Australian GST & BAS classification</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span
                className={cn(
                  'text-xs font-bold transition-colors',
                  selectedType === 'independent'
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                )}
              >
                {selectedType === 'independent' ? 'Selected' : 'Click to Select'}
              </span>
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center border transition-all',
                  selectedType === 'independent'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-slate-300 dark:border-slate-600 text-transparent'
                )}
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Continue Button (Matching Transaction Setup Modal) */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleContinue}
            className="font-bold gap-2 text-xs bg-[#008F83] hover:bg-[#007A70] text-white shadow-xs rounded-xl"
          >
            Continue with {selectedType === 'lease' ? 'Lease Schedule' : 'Independent Schedule'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
