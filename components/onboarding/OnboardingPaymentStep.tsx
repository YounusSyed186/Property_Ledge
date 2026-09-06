'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Copy,
  Check,
  UploadCloud,
  FileText,
  X,
  ShieldCheck,
  Clock,
  AlertCircle,
  Building,
} from 'lucide-react';
import { useOnboardingNav } from '@/components/onboarding/OnboardingNavContext';
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter';
import { submitOnboardingPaymentProof } from '@/app/actions/onboarding';
import { BANK_DETAILS } from '@/lib/billing/types';

export interface OnboardingPaymentData {
  plan: {
    id: string;
    name: string;
    slug: string;
    priceCents: number;
    billingInterval: string;
    description?: string | null;
  };
  session: {
    subscriptionId: string;
    paymentId: string;
    reference: string;
    expectedAmount: number;
  } | null;
  subscriptionStatus?: string | null;
  paymentStatus?: string | null;
  hasSubmittedProof?: boolean;
}

interface OnboardingPaymentStepProps {
  initialData: OnboardingPaymentData;
}

export function OnboardingPaymentStep({ initialData }: OnboardingPaymentStepProps) {
  const { navigate } = useOnboardingNav();
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [transactionId, setTransactionId] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    type: string;
    dataUrl: string;
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const plan = initialData.plan;
  const session = initialData.session;
  const isUnderReview =
    initialData.hasSubmittedProof ||
    initialData.subscriptionStatus === 'under_review' ||
    initialData.paymentStatus === 'under_review' ||
    initialData.paymentStatus === 'verified';

  const expectedAmount =
    session?.expectedAmount ?? (plan.priceCents > 0 ? plan.priceCents / 100 : 29);
  const reference = session?.reference || 'PL-2026-PENDING';

  const handleCopyReference = () => {
    if (!reference) return;
    navigator.clipboard.writeText(reference);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setFileError('Invalid format. Please upload a PDF, PNG, or JPG receipt.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size exceeds 5MB limit. Please upload a smaller file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFileError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isUnderReview) {
      navigate('/onboarding/property');
      return;
    }

    if (!session?.paymentId) {
      setError('No active payment session found. Please return to plans and select again.');
      return;
    }

    if (!uploadedFile) {
      setFileError('Please attach your payment receipt or screenshot to continue.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitOnboardingPaymentProof({
        paymentId: session.paymentId,
        submittedAmount: expectedAmount,
        paymentDate,
        transactionId: transactionId.trim() || undefined,
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        mimeType: uploadedFile.type,
        storagePath: `${session.paymentId}/${uploadedFile.name}`,
        filePreviewUrl: uploadedFile.dataUrl,
      });

      navigate('/onboarding/property');
    } catch (err) {
      console.error('Failed to submit payment receipt:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit payment receipt. Please check your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Plan Summary Card */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-admin-border/60 bg-admin-surface-subtle/20">
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-admin-primary">
            Selected Plan
          </span>
          <h3 className="text-sm font-bold text-admin-foreground">{plan.name}</h3>
          <p className="text-xs text-admin-muted">
            {plan.billingInterval === 'yearly' ? 'Annual subscription' : 'Monthly subscription'}
          </p>
        </div>

        <div className="text-right">
          <span className="text-lg font-extrabold text-admin-foreground">
            ${expectedAmount.toFixed(2)}
          </span>
          <span className="text-[11px] font-medium text-admin-muted block">AUD</span>
        </div>
      </div>

      {isUnderReview ? (
        /* Status Banner when already under review */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3"
        >
          <div className="flex items-center gap-2.5 text-amber-500">
            <Clock className="h-5 w-5 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Payment Receipt Under Review
            </span>
          </div>

          <p className="text-xs text-admin-foreground/80 leading-relaxed">
            Thank you! Your payment receipt has been submitted and is currently being verified by our team for reference{' '}
            <strong className="font-mono text-admin-foreground">{reference}</strong>.
          </p>

          <p className="text-xs text-admin-muted">
            You can proceed to set up your properties now. Your workspace is ready!
          </p>
        </motion.div>
      ) : (
        <>
          {/* Bank Transfer Details Card */}
          <div className="rounded-2xl border border-admin-border/70 bg-admin-surface p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-admin-border/30 pb-3">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-admin-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-admin-foreground">
                  Direct Bank Deposit Details
                </h4>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-admin-primary/10 text-admin-primary">
                AUD Transfer
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-admin-muted text-[11px]">Account Name</span>
                <p className="font-semibold text-admin-foreground truncate">{BANK_DETAILS.accountName}</p>
              </div>
              <div>
                <span className="text-admin-muted text-[11px]">Bank</span>
                <p className="font-semibold text-admin-foreground">{BANK_DETAILS.bankName}</p>
              </div>
              <div>
                <span className="text-admin-muted text-[11px]">BSB</span>
                <p className="font-mono font-bold text-admin-foreground tracking-wider">{BANK_DETAILS.bsb}</p>
              </div>
              <div>
                <span className="text-admin-muted text-[11px]">Account Number</span>
                <p className="font-mono font-bold text-admin-foreground tracking-wider">{BANK_DETAILS.accountNumber}</p>
              </div>
            </div>

            {/* Reference Box */}
            <div className="p-3.5 rounded-xl bg-admin-surface-subtle/40 border border-admin-border/50 flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-admin-muted tracking-wider block">
                  Required Payment Reference
                </span>
                <span className="font-mono font-extrabold text-sm text-admin-foreground tracking-wider">
                  {reference}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyReference}
                className="px-2.5 py-1.5 rounded-lg border border-admin-border bg-admin-surface hover:border-admin-primary/50 text-xs font-medium text-admin-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copySuccess ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-admin-success" />
                    <span className="text-admin-success text-[11px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-admin-primary" />
                    <span className="text-[11px]">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Receipt Upload Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-admin-foreground/90">
              Upload Transfer Receipt
            </h4>

            {fileError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-admin-foreground">Transfer Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-admin-border bg-admin-surface text-admin-foreground focus:outline-none focus:ring-1 focus:ring-admin-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-admin-foreground">
                  Bank Reference <span className="text-admin-muted font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. Receipt #12345"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-admin-border bg-admin-surface text-admin-foreground focus:outline-none focus:ring-1 focus:ring-admin-primary"
                />
              </div>
            </div>

            {/* Drop Zone */}
            {!uploadedFile ? (
              <label className="border-2 border-dashed border-admin-border/70 hover:border-admin-primary/60 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer bg-admin-surface-subtle/10 hover:bg-admin-surface-subtle/30 transition-all">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="h-9 w-9 rounded-full bg-admin-primary/10 text-admin-primary flex items-center justify-center">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-admin-foreground">
                    Click to upload receipt <span className="font-normal text-admin-muted">or drag & drop</span>
                  </p>
                  <p className="text-[10px] text-admin-muted mt-0.5">PDF, PNG, JPG (max 5MB)</p>
                </div>
              </label>
            ) : (
              <div className="p-3.5 rounded-xl border border-admin-border bg-admin-surface flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-admin-primary/10 text-admin-primary flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-admin-foreground truncate">{uploadedFile.name}</p>
                    <p className="text-[10px] text-admin-muted">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1 rounded-md text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Security Note */}
      <div className="flex items-center gap-2 text-[11px] text-admin-muted pt-1">
        <ShieldCheck className="h-3.5 w-3.5 text-admin-primary shrink-0" />
        <span>Bank transfer verified by PropertyLedge Pty Ltd. Tax invoice will be generated.</span>
      </div>

      {/* Footer Navigation */}
      <OnboardingFooter
        onBack={() => navigate('/onboarding/plans')}
        onContinue={handleSubmit}
        continueType="button"
        continueLoading={isSubmitting}
        continueLabel={
          isSubmitting
            ? 'Submitting receipt…'
            : isUnderReview
            ? 'Continue to property setup'
            : 'Submit receipt & continue'
        }
        error={error}
      />
    </div>
  );
}
