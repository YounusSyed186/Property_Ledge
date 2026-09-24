'use client';

import React, { useState } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  FileText,
  Mail,
  Loader2,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { Button, Input } from '@/components/admin/ui';
import { InvoiceTemplateDTO, RunTemplateResultDTO } from '@/modules/invoices';
import { runInvoiceTemplateNowAction } from '@/app/actions/invoices';
import Link from 'next/link';

interface RunTemplateNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: InvoiceTemplateDTO;
  onCompleted?: (result: RunTemplateResultDTO) => void;
}

export function RunTemplateNowModal({
  isOpen,
  onClose,
  template,
  onCompleted,
}: RunTemplateNowModalProps) {
  const [running, setRunning] = useState(false);
  const [recipientName, setRecipientName] = useState(template.defaultCustomerName || '');
  const [recipientEmail, setRecipientEmail] = useState(template.defaultCustomerEmail || '');
  const [result, setResult] = useState<RunTemplateResultDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await runInvoiceTemplateNowAction(template.id, {
        recipientName: recipientName.trim() || undefined,
        recipientEmail: recipientEmail.trim() || undefined,
      });

      if (res.success && res.result) {
        setResult(res.result);
        if (onCompleted) onCompleted(res.result);
      } else {
        setError(res.error || 'Failed to execute template');
      }
    } catch (err: any) {
      setError(err.message || 'Unexpected execution error');
    } finally {
      setRunning(false);
    }
  };

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
            Run Template Now
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Trigger immediate invoice generation and automated email delivery.
          </p>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto space-y-4 px-0.5 py-1">
          {!result ? (
            <>
              <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1.5">
                <div className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  Template Definition:
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">{template.name}</div>
                <div className="text-slate-500 dark:text-slate-400 text-xs">
                  Layout: <span className="text-slate-800 dark:text-slate-200 font-semibold capitalize">{template.layoutStyle}</span> • Currency:{' '}
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">{template.currency}</span>
                </div>
              </div>

              <div>
                <Input
                  label="Recipient Name (Optional Override)"
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. John Doe / Customer Name"
                  className="bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <Input
                  label="Recipient Email (For Resend Delivery)"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. tenant@example.com"
                  className="bg-white dark:bg-slate-800"
                />
              </div>

              {error && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 flex items-start gap-2 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Execution Completed Successfully</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Invoice <span className="text-slate-900 dark:text-white font-mono font-bold">{result.invoiceNumber}</span> was created.
                </p>
              </div>

              <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Invoice Created:</span>
                  <span className="font-mono text-slate-900 dark:text-white font-bold">{result.invoiceNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Total Invoiced:</span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    {result.currency} ${result.totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">PDF Generated:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Ready</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Email Delivery:</span>
                  <span className={result.emailSent ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500'}>
                    {result.emailSent ? '✓ Sent via Resend' : result.emailError || 'Skipped (No recipient email)'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 mt-6 pt-2">
          {!result ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={running}
                className="flex-1 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRun}
                disabled={running}
                className="flex-1 h-12 rounded-xl bg-[#008F83] hover:bg-[#007A70] text-white font-semibold text-sm shadow-md transition-all duration-150 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#008F83]/25 active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {running ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing Pipeline...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Run Pipeline Now
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full h-12 rounded-xl bg-[#008F83] hover:bg-[#007A70] text-white font-semibold text-sm shadow-md transition-all duration-150 focus:outline-none"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


