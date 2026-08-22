'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  User,
  CreditCard,
  FileText,
  Check,
  AlertCircle,
  Clock,
  ArrowLeft,
  CheckCircle,
  Building2,
} from 'lucide-react';
import { handleApprovePayment, handleRejectPayment } from '@/app/actions/billing';

interface SubscriptionDrawerProps {
  subscriptionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    paymentId?: string;
    userName?: string;
    userEmail?: string;
    planName?: string;
    billingInterval?: string;
    amount?: number;
    reference?: string;
    status?: string;
    fileUrl?: string;
    fileName?: string;
  };
}

export function SubscriptionDrawer({
  subscriptionId,
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: SubscriptionDrawerProps) {
  const [mounted, setMounted] = useState(isOpen);
  const [animateIn, setAnimateIn] = useState(false);
  const [actionMode, setActionMode] = useState<'none' | 'approve' | 'reject'>('none');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      setMounted(true);
      setAnimateIn(true);
    } else {
      setAnimateIn(false);
      timer = setTimeout(() => {
        setMounted(false);
      }, 280);
    }
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!mounted || !subscriptionId) return null;

  const paymentId = initialData?.paymentId || `pay-${subscriptionId}`;
  const userName = initialData?.userName || 'Sarah Williams';
  const userEmail = initialData?.userEmail || 'sarah.williams@propertyledge.com.au';
  const planName = initialData?.planName || 'Landlord';
  const billingInterval = initialData?.billingInterval || 'monthly';
  const amount = initialData?.amount || 29;
  const reference = initialData?.reference || 'PL-2026-10482';
  const status = initialData?.status || 'under_review';

  const onConfirmApprove = async () => {
    setIsProcessing(true);
    setErrorMsg('');
    try {
      if (initialData?.paymentId) {
        await handleApprovePayment(initialData.paymentId);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to approve payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onConfirmReject = async () => {
    setIsProcessing(true);
    setErrorMsg('');
    try {
      if (initialData?.paymentId) {
        await handleRejectPayment(initialData.paymentId);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reject payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-300 ${
          animateIn ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className={`w-screen max-w-xl bg-admin-surface border-l border-admin-border text-admin-foreground flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-out ${
            animateIn ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header */}
          <div className="p-6 border-b border-admin-border bg-admin-sidebar/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-admin-primary/15 border border-admin-primary/30 flex items-center justify-center text-admin-primary">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-admin-primary">
                  Subscription Inspection
                </span>
                <h2 className="text-base font-bold font-heading text-white">
                  PropertyLedge {planName}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-admin-border text-admin-muted hover:text-white hover:bg-admin-border/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-admin-danger/10 border border-admin-danger/30 text-admin-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Customer Details Box */}
            <div className="bg-admin-sidebar-surface/60 rounded-xl border border-admin-border p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase font-mono text-admin-muted tracking-wider">
                <User className="w-3.5 h-3.5 text-admin-primary" />
                <span>Customer Information</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-admin-muted">Full Name</span>
                  <p className="font-bold text-white mt-0.5">{userName}</p>
                </div>
                <div>
                  <span className="text-admin-muted">Email Address</span>
                  <p className="font-mono text-white truncate mt-0.5">{userEmail}</p>
                </div>
              </div>
            </div>

            {/* Payment Details Box */}
            <div className="bg-admin-sidebar-surface/60 rounded-xl border border-admin-border p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-admin-border/60 pb-2">
                <span className="text-xs font-semibold uppercase font-mono text-admin-muted tracking-wider">
                  Payment Details
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase border ${
                    status === 'verified' || status === 'active'
                      ? 'bg-admin-success-soft text-admin-success border-admin-success/30'
                      : status === 'under_review' || status === 'submitted'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-admin-danger/10 text-admin-danger border-admin-danger/30'
                  }`}
                >
                  {status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-admin-muted">Reference Code</span>
                  <p className="font-mono font-bold text-admin-primary mt-0.5">{reference}</p>
                </div>
                <div>
                  <span className="text-admin-muted">Amount</span>
                  <p className="font-extrabold text-white mt-0.5">${amount.toFixed(2)} AUD</p>
                </div>
                <div>
                  <span className="text-admin-muted">Billing Cycle</span>
                  <p className="capitalize text-white mt-0.5">{billingInterval}</p>
                </div>
                <div>
                  <span className="text-admin-muted">Subscription ID</span>
                  <p className="font-mono text-admin-muted text-[10px] truncate mt-0.5">{subscriptionId}</p>
                </div>
              </div>
            </div>

            {/* Bank Transfer Receipt Preview Box */}
            <div className="bg-admin-sidebar-surface/60 rounded-xl border border-admin-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase font-mono text-admin-muted tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-admin-primary" />
                  <span>Submitted Payment Proof</span>
                </span>
              </div>

              {initialData?.fileUrl ? (
                <div className="p-3 rounded-lg bg-admin-surface border border-admin-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-admin-primary" />
                    <div>
                      <p className="text-xs font-bold text-white truncate max-w-[220px]">
                        {initialData.fileName || 'bank_transfer_receipt.pdf'}
                      </p>
                      <span className="text-[10px] text-admin-muted">Uploaded to Supabase Bucket</span>
                    </div>
                  </div>
                  <a
                    href={initialData.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 rounded-md bg-admin-primary-soft text-admin-primary hover:bg-admin-primary hover:text-black font-semibold text-[11px] transition-all"
                  >
                    View File
                  </a>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-admin-surface border border-admin-border text-center text-xs text-admin-muted">
                  No payment proof uploaded yet or pending verification.
                </div>
              )}
            </div>

            {/* Action Confirmation Panel */}
            {actionMode === 'approve' && (
              <div className="p-4 rounded-xl bg-admin-success-soft border border-admin-success/40 space-y-3">
                <div className="flex items-center gap-2 text-admin-success font-bold text-xs">
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm Subscription Activation</span>
                </div>
                <p className="text-xs text-admin-foreground leading-relaxed">
                  Approving this payment will mark the manual payment as verified and immediately grant full workspace access for <strong>{userName}</strong>.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onConfirmApprove}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-lg bg-admin-success text-black font-semibold text-xs hover:bg-admin-success/90 transition-all shadow-xs"
                  >
                    {isProcessing ? 'Activating...' : 'Confirm & Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionMode('none')}
                    className="px-3 py-2 rounded-lg border border-admin-border text-xs text-admin-muted hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {actionMode === 'reject' && (
              <div className="p-4 rounded-xl bg-admin-danger/10 border border-admin-danger/40 space-y-3">
                <div className="flex items-center gap-2 text-admin-danger font-bold text-xs">
                  <AlertCircle className="w-4 h-4" />
                  <span>Confirm Payment Rejection</span>
                </div>
                <p className="text-xs text-admin-foreground leading-relaxed">
                  Rejecting this transfer will notify the user to re-submit proof or fix their payment reference.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onConfirmReject}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-lg bg-admin-danger text-white font-semibold text-xs hover:bg-admin-danger/90 transition-all shadow-xs"
                  >
                    {isProcessing ? 'Rejecting...' : 'Reject Payment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionMode('none')}
                    className="px-3 py-2 rounded-lg border border-admin-border text-xs text-admin-muted hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 border-t border-admin-border bg-admin-sidebar/60 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-admin-border text-xs text-admin-muted hover:text-white transition-colors"
            >
              Close
            </button>

            {actionMode === 'none' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActionMode('reject')}
                  className="px-4 py-2 rounded-lg border border-admin-danger/40 bg-admin-danger/10 text-admin-danger hover:bg-admin-danger hover:text-white text-xs font-semibold transition-all"
                >
                  Reject Payment
                </button>
                <button
                  type="button"
                  onClick={() => setActionMode('approve')}
                  className="px-5 py-2 rounded-lg bg-admin-success text-black hover:bg-admin-success/90 text-xs font-bold transition-all shadow-xs"
                >
                  Approve Payment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
