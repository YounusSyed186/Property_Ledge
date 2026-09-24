'use client';

import React from 'react';
import { Send, AlertCircle, X, Receipt, FileText } from 'lucide-react';
import { Button } from '@/components/admin/ui';
import { AutomationItem } from '@/app/actions/automations';

interface TriggerConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  automation: AutomationItem | null;
  loading?: boolean;
}

export function TriggerConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  automation,
  loading = false,
}: TriggerConfirmationModalProps) {
  if (!isOpen || !automation) return null;

  const isInvoiceAction = automation.actionType === 'generate_and_send_invoice';
  const isLease = automation.automationType === 'lease';

  const recipientName = isLease
    ? automation.lease?.tenantName || automation.metadata?.customerName || automation.metadata?.tenantName || 'Tenant'
    : automation.metadata?.customerName || automation.metadata?.recipientName || 'Customer';

  const recipientEmail = isLease
    ? automation.lease?.tenantEmail || automation.metadata?.customerEmail || automation.metadata?.tenantEmail || automation.metadata?.recipientEmail || 'No email on record'
    : automation.metadata?.customerEmail || automation.metadata?.recipientEmail || 'No email on record';

  const sourceName = isLease
    ? automation.lease?.propertyName || automation.metadata?.propertyName || 'Property'
    : automation.metadata?.description || 'Service Invoice';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-y-auto max-h-[92vh] z-10 p-6 sm:p-8 text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-200">
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
          <div className="w-12 h-12 rounded-2xl bg-[#008F83]/10 text-[#008F83] border border-[#008F83]/20 flex items-center justify-center mx-auto mb-3">
            {isInvoiceAction ? <Receipt className="w-6 h-6" /> : <Send className="w-6 h-6" />}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-slate-900 dark:text-white">
            {isInvoiceAction ? 'Generate & Send Invoice Now?' : 'Send Lease Document Now?'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manual Automation Trigger Confirmation
          </p>
        </div>

        {/* Content */}
        <div className="space-y-4 text-sm">
          <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed text-center">
            {isInvoiceAction ? (
              <>
                This will generate a <strong>fresh invoice with PDF attachment</strong> and immediately email it to:
              </>
            ) : (
              <>
                This will immediately generate and email the official <strong>Lease Agreement Summary PDF</strong> to:
              </>
            )}
          </p>

          <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">{isLease ? 'Tenant:' : 'Customer:'}</span>
              <strong className="text-slate-900 dark:text-white font-bold">{recipientName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Recipient Email:</span>
              <span className="font-mono text-[#008F83] font-bold">{recipientEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">{isLease ? 'Property:' : 'Description:'}</span>
              <strong className="text-slate-900 dark:text-white font-bold">{sourceName}</strong>
            </div>
          </div>

          <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-start gap-2.5 text-amber-700 dark:text-amber-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              This execution will run immediately. <strong>The recurring schedule and next delivery timestamp will remain unchanged.</strong>
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 mt-6 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-12 rounded-xl bg-[#008F83] hover:bg-[#007A70] text-white font-semibold text-sm shadow-md transition-all duration-150 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#008F83]/25 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Executing...' : 'Trigger Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

