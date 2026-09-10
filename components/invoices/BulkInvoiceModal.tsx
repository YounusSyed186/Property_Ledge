'use client';

import React, { useState, useEffect } from 'react';
import { X, Layers, Calendar, Check, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/admin/ui';
import {
  getAuTodayString,
  getAuDateParts,
  createAuDate,
  formatAuDateIso,
  formatAuDisplayDateTime,
  formatAuDisplayDate,
} from '@/lib/format/australian-time';

interface BulkInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (options: { dueDate: string; issueDate: string; autoIssue: boolean }) => Promise<{
    count: number;
    errors?: string[];
  }>;
}

export function BulkInvoiceModal({ isOpen, onClose, onGenerate }: BulkInvoiceModalProps) {
  const [auCurrentTimeStr, setAuCurrentTimeStr] = useState<string>(() =>
    formatAuDisplayDateTime(new Date(), true)
  );

  useEffect(() => {
    if (!isOpen) return;
    const updateTimer = () => {
      setAuCurrentTimeStr(formatAuDisplayDateTime(new Date(), true));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const [issueDate, setIssueDate] = useState(() => getAuTodayString());
  const [dueDate, setDueDate] = useState(() => {
    const p = getAuDateParts(new Date());
    const dueObj = createAuDate(p.year, p.month, p.day + 7);
    return formatAuDateIso(dueObj);
  });
  const [autoIssue, setAutoIssue] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ count: number; errors?: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await onGenerate({ issueDate, dueDate, autoIssue });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to bulk generate rent invoices');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-admin-surface border border-admin-border text-admin-foreground rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-admin-border flex items-center justify-between bg-admin-surface-subtle/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-admin-primary/10 text-admin-primary rounded-xl border border-admin-primary/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-admin-foreground">Bulk Generate Rent Invoices</h2>
              <p className="text-xs text-admin-muted mt-0.5">Generate invoices for all active leases</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-admin-muted hover:text-admin-foreground p-1.5 rounded-lg hover:bg-admin-surface-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-sm">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs flex items-center gap-2.5 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-admin-foreground">Generation Completed!</h3>
              <p className="text-xs text-admin-muted">
                Successfully created <strong className="text-emerald-500 font-bold">{result.count}</strong> rent invoices for
                active leases.
              </p>
              {result.errors && result.errors.length > 0 && (
                <div className="text-left bg-admin-surface p-3 rounded-xl border border-admin-border text-xs text-amber-500 max-h-32 overflow-y-auto">
                  <div className="font-semibold mb-1">Warnings:</div>
                  {result.errors.map((e, idx) => (
                    <div key={idx}>• {e}</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-admin-muted leading-relaxed">
                This batch tool automatically queries all active leases in your current workspace, calculates each
                tenant's scheduled rent amount, and creates formal invoices with proper sequential numbers.
              </p>

              {/* Live AU Eastern Time Indicator Banner */}
              <div className="flex items-center justify-between p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>AU Time (Sydney):</span>
                  <span className="font-mono bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded text-[11px]">
                    {auCurrentTimeStr}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-admin-muted mb-1.5">Issue Date (AU)</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setIssueDate(val);
                      if (dueDate && val > dueDate) setDueDate(val);
                    }}
                    className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-admin-muted mb-1.5">Payment Due Date (AU)</label>
                  <input
                    type="date"
                    min={issueDate}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 bg-admin-surface-subtle border border-admin-border rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  id="autoIssueCheckbox"
                  checked={autoIssue}
                  onChange={(e) => setAutoIssue(e.target.checked)}
                  className="rounded border-admin-border text-admin-primary focus:ring-admin-primary w-4 h-4 cursor-pointer"
                />
                <label htmlFor="autoIssueCheckbox" className="text-xs text-admin-foreground cursor-pointer">
                  <strong className="block font-bold">Auto-Issue Invoices Immediately</strong>
                  <span className="text-admin-muted">Mark generated invoices as &quot;Issued&quot; so they are ready for delivery rather than drafts.</span>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-admin-border bg-admin-surface-subtle/50 flex items-center justify-between">
          <Button variant="ghost" onClick={onClose} className="text-admin-muted hover:text-admin-foreground">
            {result ? 'Done' : 'Cancel'}
          </Button>

          {!result && (
            <Button
              variant="primary"
              onClick={handleStartGenerate}
              disabled={loading}
              className="gap-2 font-bold shadow-xs"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Generating...' : 'Generate Rent Invoices'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
