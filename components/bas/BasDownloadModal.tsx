'use client';

import React, { useState } from 'react';
import {
  Modal,
  Button,
  Input,
  Select,
} from '@/components/admin/ui';
import type { BasReportCustomDetails } from '@/lib/pdf/pdf-bas-report-adapter';
import {
  FileText,
  Building,
  CreditCard,
  ShieldCheck,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface BasDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDownload: (customDetails: BasReportCustomDetails) => Promise<void>;
  isGenerating: boolean;
  initialTaxpayerName?: string;
  initialAddress?: string;
  periodLabel: string;
  financialYear: number;
}

export function BasDownloadModal({
  isOpen,
  onClose,
  onConfirmDownload,
  isGenerating,
  initialTaxpayerName = '',
  initialAddress = '',
  periodLabel,
  financialYear,
}: BasDownloadModalProps) {
  // Taxpayer details
  const [taxpayerName, setTaxpayerName] = useState(initialTaxpayerName);
  const [address, setAddress] = useState(initialAddress);
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState('NSW');
  const [postcode, setPostcode] = useState('');

  // Lodgement details
  const [abn, setAbn] = useState('');
  const [documentIdNumber, setDocumentIdNumber] = useState('');
  const [gstAccountingMethod, setGstAccountingMethod] = useState<'Cash' | 'Accruals'>('Cash');
  const [simplifiedBas, setSimplifiedBas] = useState(true);

  // Optional Payment / Banking details
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [paymentReferenceNumber, setPaymentReferenceNumber] = useState('');
  const [bpayBillerCode, setBpayBillerCode] = useState('');
  const [directCreditBank, setDirectCreditBank] = useState('');
  const [directCreditBsb, setDirectCreditBsb] = useState('');
  const [directCreditAccount, setDirectCreditAccount] = useState('');
  const [directCreditName, setDirectCreditName] = useState('');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const details: BasReportCustomDetails = {
      taxpayerName: taxpayerName.trim() || undefined,
      address: address.trim() || undefined,
      suburb: suburb.trim() || undefined,
      state: state.trim() || undefined,
      postcode: postcode.trim() || undefined,
      abn: abn.trim() || undefined,
      documentIdNumber: documentIdNumber.trim() || undefined,
      gstAccountingMethod,
      simplifiedBas,
      paymentReferenceNumber: paymentReferenceNumber.trim() || undefined,
      bpayBillerCode: bpayBillerCode.trim() || undefined,
      directCreditBank: directCreditBank.trim() || undefined,
      directCreditBsb: directCreditBsb.trim() || undefined,
      directCreditAccount: directCreditAccount.trim() || undefined,
      directCreditName: directCreditName.trim() || undefined,
    };

    await onConfirmDownload(details);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Activity Statement Lodgement Details"
      description={`Generate official ATO-styled return for ${periodLabel} (FY${financialYear}). Fields left blank will be left empty on the form.`}
      icon={<FileText className="h-5 w-5 text-admin-primary" />}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isGenerating}
            className="text-admin-muted hover:text-admin-foreground"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={() => handleSubmit()}
              disabled={isGenerating}
              className="gap-2 font-bold min-w-[170px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Download Return</span>
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 py-1">
        {/* Taxpayer Information Section */}
        <div className="rounded-xl border border-admin-border bg-admin-surface-subtle/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-body-sm font-semibold text-admin-foreground">
            <Building className="h-4 w-4 text-admin-primary" />
            <span>Taxpayer & Entity Details</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-admin-muted mb-1">
                Taxpayer / Entity Name
              </label>
              <Input
                type="text"
                value={taxpayerName}
                onChange={(e) => setTaxpayerName(e.target.value)}
                placeholder="e.g. Acme Pty Ltd or John Smith"
                className="w-full text-body-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-admin-muted mb-1">
                Postal / Property Address
              </label>
              <Input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 123 George Street"
                className="w-full text-body-sm"
              />
            </div>

            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-6">
                <label className="block text-xs font-medium text-admin-muted mb-1">Suburb</label>
                <Input
                  type="text"
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  placeholder="e.g. Sydney"
                  className="w-full text-body-sm"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-admin-muted mb-1">State</label>
                <Select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full text-body-sm"
                >
                  <option value="NSW">NSW</option>
                  <option value="VIC">VIC</option>
                  <option value="QLD">QLD</option>
                  <option value="WA">WA</option>
                  <option value="SA">SA</option>
                  <option value="TAS">TAS</option>
                  <option value="ACT">ACT</option>
                  <option value="NT">NT</option>
                </Select>
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-admin-muted mb-1">Postcode</label>
                <Input
                  type="text"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="2000"
                  maxLength={4}
                  className="w-full text-body-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ATO Registration & Method Section */}
        <div className="rounded-xl border border-admin-border bg-admin-surface-subtle/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-body-sm font-semibold text-admin-foreground">
            <ShieldCheck className="h-4 w-4 text-admin-teal" />
            <span>ATO Registration & Accounting Method</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-admin-muted mb-1">
                ABN (Australian Business Number)
              </label>
              <Input
                type="text"
                value={abn}
                onChange={(e) => setAbn(e.target.value)}
                placeholder="e.g. 84 123 456 789"
                maxLength={14}
                className="w-full text-body-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-admin-muted mb-1">
                Document Identification No. (DIN)
              </label>
              <Input
                type="text"
                value={documentIdNumber}
                onChange={(e) => setDocumentIdNumber(e.target.value)}
                placeholder="Optional DIN (e.g. 1000 0000 0001)"
                className="w-full text-body-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-admin-muted mb-1">
                GST Accounting Method
              </label>
              <Select
                value={gstAccountingMethod}
                onChange={(e) => setGstAccountingMethod(e.target.value as 'Cash' | 'Accruals')}
                className="w-full text-body-sm"
              >
                <option value="Cash">Cash Basis (Standard for property)</option>
                <option value="Accruals">Accruals / Non-Cash Basis</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-admin-muted mb-1">
                Simplified BAS Option
              </label>
              <Select
                value={simplifiedBas ? 'true' : 'false'}
                onChange={(e) => setSimplifiedBas(e.target.value === 'true')}
                className="w-full text-body-sm"
              >
                <option value="true">Yes (Simplified G1, 1A, 1B)</option>
                <option value="false">No (Full Calculation)</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Payment & Banking Details (Optional Collapsible) */}
        <div className="rounded-xl border border-admin-border bg-admin-surface-subtle/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPaymentDetails(!showPaymentDetails)}
            className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-admin-surface/60"
          >
            <div className="flex items-center gap-2 text-body-sm font-semibold text-admin-foreground">
              <CreditCard className="h-4 w-4 text-admin-indigo" />
              <span>Payment & Banking Options (Optional)</span>
            </div>
            {showPaymentDetails ? (
              <ChevronUp className="h-4 w-4 text-admin-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-admin-muted" />
            )}
          </button>

          {showPaymentDetails && (
            <div className="p-4 pt-1 border-t border-admin-border space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-admin-muted mb-1">
                    Payment Reference Number (PRN)
                  </label>
                  <Input
                    type="text"
                    value={paymentReferenceNumber}
                    onChange={(e) => setPaymentReferenceNumber(e.target.value)}
                    placeholder="Optional PRN"
                    className="w-full text-body-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-admin-muted mb-1">
                    BPAY Biller Code
                  </label>
                  <Input
                    type="text"
                    value={bpayBillerCode}
                    onChange={(e) => setBpayBillerCode(e.target.value)}
                    placeholder="e.g. 75556 (ATO)"
                    className="w-full text-body-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-admin-muted mb-1">
                    Direct Credit Bank Name
                  </label>
                  <Input
                    type="text"
                    value={directCreditBank}
                    onChange={(e) => setDirectCreditBank(e.target.value)}
                    placeholder="e.g. Commonwealth Bank"
                    className="w-full text-body-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-admin-muted mb-1">BSB Number</label>
                  <Input
                    type="text"
                    value={directCreditBsb}
                    onChange={(e) => setDirectCreditBsb(e.target.value)}
                    placeholder="e.g. 062-000"
                    className="w-full text-body-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-admin-muted mb-1">Account Number</label>
                  <Input
                    type="text"
                    value={directCreditAccount}
                    onChange={(e) => setDirectCreditAccount(e.target.value)}
                    placeholder="Account number"
                    className="w-full text-body-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-admin-muted mb-1">Account Name</label>
                  <Input
                    type="text"
                    value={directCreditName}
                    onChange={(e) => setDirectCreditName(e.target.value)}
                    placeholder="Account holder name"
                    className="w-full text-body-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
