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
import { Button } from '@/components/admin/ui';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-admin-surface border border-admin-border text-admin-foreground rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-admin-border flex items-center justify-between bg-admin-surface-subtle/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-admin-primary/10 text-admin-primary rounded-2xl border border-admin-primary/20">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-bold text-admin-foreground">Run Template Now</h2>
              <p className="text-xs text-admin-muted">Trigger immediate invoice generation and delivery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-admin-muted hover:text-admin-foreground p-2 rounded-xl hover:bg-admin-surface-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          {!result ? (
            <>
              <div className="p-4 bg-admin-surface-subtle border border-admin-border rounded-2xl space-y-2">
                <div className="text-admin-muted text-[11px]">Template Definition:</div>
                <div className="font-bold text-admin-foreground text-sm">{template.name}</div>
                <div className="text-admin-muted text-[11px]">
                  Layout: <span className="text-admin-foreground capitalize">{template.layoutStyle}</span> • Currency:{' '}
                  <span className="text-admin-foreground">{template.currency}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-admin-muted mb-1">Recipient Name (Optional Override)</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. John Doe / Customer Name"
                  className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-xs focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-admin-muted mb-1">Recipient Email (For Resend Delivery)</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. tenant@example.com"
                  className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-xs focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-admin-foreground text-sm">Execution Completed Successfully</h3>
                <p className="text-[11px] text-admin-muted">
                  Invoice <span className="text-admin-foreground font-mono font-bold">{result.invoiceNumber}</span> was created.
                </p>
              </div>

              <div className="p-4 bg-admin-surface-subtle border border-admin-border rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-admin-muted">Invoice Created:</span>
                  <span className="font-mono text-admin-foreground font-bold">{result.invoiceNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-admin-muted">Total Invoiced:</span>
                  <span className="text-admin-foreground font-bold">
                    {result.currency} ${result.totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-admin-muted">PDF Generated:</span>
                  <span className="text-emerald-500 font-bold">✓ Ready</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-admin-muted">Email Delivery:</span>
                  <span className={result.emailSent ? 'text-emerald-500 font-bold' : 'text-admin-muted'}>
                    {result.emailSent ? '✓ Sent via Resend' : result.emailError || 'Skipped (No recipient email)'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-admin-border flex items-center justify-end gap-3 bg-admin-surface-subtle/50">
          {!result ? (
            <>
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRun}
                disabled={running}
                variant="primary"
                className="font-bold text-xs gap-1.5"
              >
                {running ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing Pipeline...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Run Pipeline Now
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={onClose}
              variant="primary"
              className="font-bold text-xs"
            >
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
