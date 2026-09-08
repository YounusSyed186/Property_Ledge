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
    ? automation.lease?.tenantName || 'Tenant'
    : automation.metadata?.customerName || 'Customer';

  const recipientEmail = isLease
    ? automation.lease?.tenantEmail || 'No email on record'
    : automation.metadata?.customerEmail || 'No email on record';

  const sourceName = isLease
    ? automation.lease?.propertyName || 'Property'
    : automation.metadata?.description || 'Service Invoice';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-admin-surface border border-admin-border text-admin-foreground rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-admin-border flex items-center justify-between bg-admin-surface-subtle/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-admin-primary/10 text-admin-primary border border-admin-primary/20">
              {isInvoiceAction ? <Receipt className="w-5 h-5" /> : <Send className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-admin-foreground">
                {isInvoiceAction ? 'Generate & Send Invoice Now?' : 'Send Lease Document Now?'}
              </h2>
              <p className="text-xs text-admin-muted mt-0.5">Manual Automation Trigger</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-admin-muted hover:text-admin-foreground p-1.5 rounded-lg hover:bg-admin-surface-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-sm">
          <p className="text-admin-foreground text-xs leading-relaxed">
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

          <div className="bg-admin-surface-subtle border border-admin-border rounded-xl p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-admin-muted">{isLease ? 'Tenant:' : 'Customer:'}</span>
              <strong className="text-admin-foreground">{recipientName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-admin-muted">Recipient Email:</span>
              <span className="font-mono text-admin-primary font-bold">{recipientEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-admin-muted">{isLease ? 'Property:' : 'Description:'}</span>
              <strong className="text-admin-foreground">{sourceName}</strong>
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-600 dark:text-amber-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              This execution will run immediately. <strong>The recurring schedule and next delivery timestamp will remain unchanged.</strong>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-admin-border bg-admin-surface-subtle/50 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="text-admin-muted text-xs">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={loading}
            className="gap-1.5 font-bold shadow-xs text-xs"
          >
            <Send className="w-3.5 h-3.5" />
            {loading ? 'Executing...' : 'Trigger Now'}
          </Button>
        </div>
      </div>
    </div>
  );
}
