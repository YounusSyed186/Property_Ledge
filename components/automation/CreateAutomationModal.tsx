'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Check,
  Building,
  FileText,
  Send,
  Receipt,
  FileCode,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  User,
  Mail,
  Phone,
  MapPin,
  HelpCircle,
  Sparkles,
  Pencil,
  RotateCcw,
  Briefcase,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/admin/ui';
import { fetchAllWorkspaceLeases } from '@/app/actions/dashboard';
import {
  createLeaseAutomationAction,
  createStandaloneInvoiceAutomationAction,
} from '@/app/actions/automations';
import { PREDEFINED_INVOICE_TEMPLATES, getPredefinedTemplateById } from '@/modules/invoices/domain/constants/predefined-templates';
import { AutomationScheduleType, AutomationType } from '@/modules/automation';
import { formatAuDisplayDateTime } from '@/lib/format/australian-time';
import { cn } from '@/lib/utils';

interface CreateAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedLeaseId?: string;
}

export function CreateAutomationModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedLeaseId,
}: CreateAutomationModalProps) {
  // Step navigation: 0 = Choose Type, 1 = Config, 2 = Review
  const [currentStep, setCurrentStep] = useState<number>(preselectedLeaseId ? 1 : 0);
  const [automationType, setAutomationType] = useState<AutomationType>('lease');

  // Shared Data
  const [leases, setLeases] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('template_classic');

  // Lease Automation Fields
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>(preselectedLeaseId || '');
  const [leaseActionType, setLeaseActionType] = useState<string>('generate_and_send_invoice');

  // Custom Recipient Overrides for Lease Automation
  const [isEditingRecipient, setIsEditingRecipient] = useState<boolean>(false);
  const [customTenantName, setCustomTenantName] = useState<string>('');
  const [customTenantEmail, setCustomTenantEmail] = useState<string>('');
  const [customTenantPhone, setCustomTenantPhone] = useState<string>('');
  const [customRentAmount, setCustomRentAmount] = useState<number | ''>('');

  // Standalone Invoice Automation Fields
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [invoiceDescription, setInvoiceDescription] = useState<string>('Monthly Maintenance & Services');
  const [invoiceAmount, setInvoiceAmount] = useState<number | ''>(1000);
  const [currency, setCurrency] = useState<string>('AUD');

  // Schedule Fields
  const [scheduleType, setScheduleType] = useState<AutomationScheduleType>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [offsetMonths, setOffsetMonths] = useState<number>(12);

  // Issued By / Issuer Profile Fields
  const [isEditingIssuer, setIsEditingIssuer] = useState<boolean>(false);
  const [issuerName, setIssuerName] = useState<string>('Property Ledge Management');
  const [issuerEmail, setIssuerEmail] = useState<string>('billing@propertyledge.com.au');
  const [issuerPhone, setIssuerPhone] = useState<string>('+61 2 9000 0000');
  const [issuerAddress, setIssuerAddress] = useState<string>('');
  const [issuerTaxId, setIssuerTaxId] = useState<string>('');
  const [paymentDueDays, setPaymentDueDays] = useState<number>(14);

  // Email Template & Body Customization Fields
  const [isEditingEmailTemplate, setIsEditingEmailTemplate] = useState<boolean>(false);
  const [emailSubject, setEmailSubject] = useState<string>('Invoice {invoice_number} from {issuer_name}');
  const [emailMessage, setEmailMessage] = useState<string>(
    'Hi {first_name},\n\nHope everything is going smoothly.\n\nPlease find attached invoice {invoice_number} for {amount} (due {due_date}).\n\nCould you please review the invoice and confirm that all details are correct on your end?\n\nPlease let me know if you have any questions.\n\nKind regards,\n{issuer_name}'
  );
  const [driveFolderUrl, setDriveFolderUrl] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live Australian Time Clock
  const [auTime, setAuTime] = useState(() => formatAuDisplayDateTime(new Date(), true));
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setAuTime(formatAuDisplayDateTime(new Date(), true));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(preselectedLeaseId ? 1 : 0);
      setError(null);
      setIsEditingRecipient(false);
      setIsEditingIssuer(false);

      // Load leases
      fetchAllWorkspaceLeases().then((res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) list = res;
        else if (res?.success && res?.data) list = res.data;
        setLeases(list);
        if (preselectedLeaseId) {
          setSelectedLeaseId(preselectedLeaseId);
        } else if (list.length > 0 && !selectedLeaseId) {
          setSelectedLeaseId(list[0].id);
        }
      });
    }
  }, [isOpen, preselectedLeaseId]);

  const selectedLease = leases.find((l) => l.id === selectedLeaseId);
  const selectedTemplate = getPredefinedTemplateById(selectedTemplateId);

  // Sync lease defaults when selected lease changes
  useEffect(() => {
    if (selectedLease) {
      const tRel = selectedLease.lease_tenants?.[0]?.tenant || selectedLease.tenants?.[0]?.tenant || selectedLease.tenants?.[0];
      const tName = tRel ? `${tRel.first_name || ''} ${tRel.last_name || ''}`.trim() : '';
      setCustomTenantName(tName);
      setCustomTenantEmail(tRel?.email || '');
      setCustomTenantPhone(tRel?.phone || '');
      setCustomRentAmount(selectedLease.rent_amount ? Number(selectedLease.rent_amount) : '');
    }
  }, [selectedLeaseId, leases]);

  if (!isOpen) return null;

  // Resolved Lease Tenant / Recipient Details
  const resolvedTenant = selectedLease?.lease_tenants?.[0]?.tenant || selectedLease?.tenants?.[0]?.tenant || selectedLease?.tenants?.[0];
  const resolvedTenantName = resolvedTenant
    ? `${resolvedTenant.first_name || ''} ${resolvedTenant.last_name || ''}`.trim()
    : 'Tenant';
  const resolvedTenantEmail = resolvedTenant?.email || 'No email on record';
  const resolvedTenantPhone = resolvedTenant?.phone || 'Not provided';
  const resolvedPropertyName = selectedLease?.property?.name || 'Property';
  const resolvedPropertyAddress =
    selectedLease?.property?.address_line_1 ||
    selectedLease?.property?.address ||
    [selectedLease?.property?.city, selectedLease?.property?.state, selectedLease?.property?.postal_code].filter(Boolean).join(', ') ||
    'Address on file';
  const resolvedRent = selectedLease?.rent_amount ? `$${Number(selectedLease.rent_amount).toLocaleString()} / ${selectedLease.rent_frequency || 'monthly'}` : 'N/A';
  const resolvedDates = selectedLease?.start_date
    ? `${new Date(selectedLease.start_date).toLocaleDateString()} – ${selectedLease.end_date ? new Date(selectedLease.end_date).toLocaleDateString() : 'Periodic'}`
    : 'N/A';

  // Effective recipient values (considering custom overrides)
  const effectiveTenantName = customTenantName.trim() || resolvedTenantName;
  const effectiveTenantEmail = customTenantEmail.trim();
  const effectiveTenantPhone = customTenantPhone.trim() || (resolvedTenant?.phone || '');
  const effectiveRent = customRentAmount !== '' ? `$${Number(customRentAmount).toLocaleString()} / ${selectedLease?.rent_frequency || 'monthly'}` : resolvedRent;
  const hasCustomOverrides = Boolean(
    (customTenantEmail && customTenantEmail !== resolvedTenant?.email) ||
    (customTenantName && customTenantName !== resolvedTenantName) ||
    (customTenantPhone && customTenantPhone !== resolvedTenant?.phone) ||
    (customRentAmount !== '' && Number(customRentAmount) !== Number(selectedLease?.rent_amount))
  );

  const hasCustomIssuer = Boolean(
    (issuerName && issuerName !== 'Property Ledge Management') ||
    (issuerEmail && issuerEmail !== 'billing@propertyledge.com.au') ||
    (issuerPhone && issuerPhone !== '+61 2 9000 0000') ||
    issuerAddress.trim() ||
    issuerTaxId.trim() ||
    paymentDueDays !== 14
  );

  const handleCreate = async () => {
    setError(null);
    setLoading(true);

    try {
      let scheduleConfig: any = {};
      if (scheduleType === 'monthly') {
        scheduleConfig = {
          dayOfMonth: Number(dayOfMonth) || 1,
        };
      } else if (scheduleType === 'after_start') {
        scheduleConfig = {
          offsetMonths: Number(offsetMonths) || 12,
        };
      }

      const issuedByPayload = {
        name: issuerName.trim() || 'Property Ledge Management',
        email: issuerEmail.trim() || 'billing@propertyledge.com.au',
        phone: issuerPhone.trim() || undefined,
        address: issuerAddress.trim() || undefined,
        taxId: issuerTaxId.trim() || undefined,
        issuerName: issuerName.trim() || 'Property Ledge Management',
        issuerEmail: issuerEmail.trim() || 'billing@propertyledge.com.au',
        issuerPhone: issuerPhone.trim() || undefined,
        issuerAddress: issuerAddress.trim() || undefined,
        issuerTaxId: issuerTaxId.trim() || undefined,
      };

      if (automationType === 'lease') {
        if (!selectedLeaseId) {
          throw new Error('Please select a target lease.');
        }
        if (!effectiveTenantEmail) {
          throw new Error('Please provide a recipient email address for lease automation.');
        }

        const res = await createLeaseAutomationAction({
          leaseId: selectedLeaseId,
          actionType: leaseActionType,
          invoiceTemplateId: leaseActionType === 'generate_and_send_invoice' ? selectedTemplateId || undefined : undefined,
          scheduleType,
          scheduleConfig,
          recipientOverride: hasCustomOverrides
            ? {
                tenantName: effectiveTenantName,
                tenantEmail: effectiveTenantEmail,
                tenantPhone: effectiveTenantPhone || undefined,
                rentAmount: customRentAmount !== '' ? Number(customRentAmount) : undefined,
              }
            : undefined,
          issuedByOverride: issuedByPayload,
          paymentDueDays: Number(paymentDueDays) || 14,
          emailSubject: emailSubject.trim() || undefined,
          customMessage: emailMessage.trim() || undefined,
          driveFolderUrl: driveFolderUrl.trim() || undefined,
        });

        if (!res.success) throw new Error(res.error || 'Failed to create lease automation');
      } else {
        if (!customerName.trim() || !customerEmail.trim()) {
          throw new Error('Please enter customer name and email address.');
        }
        if (!invoiceAmount || Number(invoiceAmount) <= 0) {
          throw new Error('Please enter a valid invoice amount greater than 0.');
        }

        const res = await createStandaloneInvoiceAutomationAction({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerAddress: customerAddress.trim() || undefined,
          description: invoiceDescription.trim() || 'Monthly Service',
          amount: Number(invoiceAmount),
          currency,
          invoiceTemplateId: selectedTemplateId || undefined,
          scheduleType,
          scheduleConfig,
          issuedByOverride: issuedByPayload,
          paymentDueDays: Number(paymentDueDays) || 14,
          emailSubject: emailSubject.trim() || undefined,
          customMessage: emailMessage.trim() || undefined,
          driveFolderUrl: driveFolderUrl.trim() || undefined,
        });

        if (!res.success) throw new Error(res.error || 'Failed to create invoice automation');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create automation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-admin-surface border border-admin-border text-admin-foreground rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-admin-border flex items-center justify-between bg-admin-surface-subtle/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-admin-primary/10 text-admin-primary border border-admin-primary/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-admin-foreground">
                {currentStep === 0
                  ? 'Create New Automation'
                  : currentStep === 1
                  ? automationType === 'lease'
                    ? 'Configure Lease Automation'
                    : 'Configure Invoice Automation'
                  : 'Review & Confirm Automation'}
              </h2>
              <p className="text-xs text-admin-muted mt-0.5">
                {currentStep === 0
                  ? 'Choose what source you would like to automate'
                  : currentStep === 1
                  ? 'Set up recipient details, action, and recurring delivery'
                  : 'Review recipient and automation parameters before scheduling'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-admin-muted hover:text-admin-foreground p-1.5 rounded-lg hover:bg-admin-surface-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs font-medium">
              {error}
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 0: TYPE SELECTION                                   */}
          {/* ======================================================== */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="text-xs font-bold text-admin-foreground uppercase tracking-wider">
                What would you like to automate?
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {/* Lease Option */}
                <div
                  onClick={() => {
                    setAutomationType('lease');
                    setCurrentStep(1);
                  }}
                  className="p-4 rounded-xl border-2 border-admin-border hover:border-admin-primary bg-admin-surface-subtle/60 hover:bg-admin-primary/5 cursor-pointer transition-all flex items-start gap-4 group"
                >
                  <div className="p-3 rounded-xl bg-admin-primary/10 text-admin-primary border border-admin-primary/20 group-hover:bg-admin-primary group-hover:text-white transition-colors">
                    <Building className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-admin-foreground">Lease Automation</h3>
                      <span className="text-[11px] font-semibold text-admin-primary bg-admin-primary/10 px-2 py-0.5 rounded-full">
                        Recommended for Tenancies
                      </span>
                    </div>
                    <p className="text-xs text-admin-muted mt-1 leading-relaxed">
                      Auto-binds tenant recipient details (email, phone, address, rent amount) directly from the lease for recurring rent invoices or agreement deliveries.
                    </p>
                  </div>
                </div>

                {/* Standalone Invoice Option */}
                <div
                  onClick={() => {
                    setAutomationType('invoice');
                    setCurrentStep(1);
                  }}
                  className="p-4 rounded-xl border-2 border-admin-border hover:border-admin-primary bg-admin-surface-subtle/60 hover:bg-admin-primary/5 cursor-pointer transition-all flex items-start gap-4 group"
                >
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-admin-foreground">Standalone Invoice Automation</h3>
                      <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Clients & Services
                      </span>
                    </div>
                    <p className="text-xs text-admin-muted mt-1 leading-relaxed">
                      Automate recurring billing for commercial clients, contractors, or consulting fees with a custom template and customer details (no lease required).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 1: CONFIGURATION FORM (LEASE OR INVOICE)           */}
          {/* ======================================================== */}
          {currentStep === 1 && automationType === 'lease' && (
            <div className="space-y-4">
              {/* 1. Select Lease */}
              <div>
                <label className="block text-xs font-bold text-admin-foreground mb-1.5">
                  1. Select Target Lease
                </label>
                <select
                  value={selectedLeaseId}
                  onChange={(e) => setSelectedLeaseId(e.target.value)}
                  disabled={Boolean(preselectedLeaseId)}
                  className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2.5 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary disabled:opacity-70"
                >
                  <option value="">-- Select Lease --</option>
                  {leases.map((l) => {
                    const tRel = l.lease_tenants?.[0] || l.tenants?.[0];
                    const t = tRel?.tenant || tRel;
                    const tenantName = t ? `${t.first_name || ''} ${t.last_name || ''}`.trim() : 'Tenant';
                    const propName = l.property?.name || 'Property';
                    return (
                      <option key={l.id} value={l.id}>
                        {propName} • {tenantName} (Rent: ${l.rent_amount})
                      </option>
                    );
                  })}
                </select>

                {/* Resolved / Editable Recipient Information Card */}
                {selectedLease && (
                  <div className="mt-2.5 p-3.5 bg-admin-surface-subtle/80 border border-admin-border rounded-xl space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-admin-border pb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-admin-primary" />
                        <span className="text-xs font-bold text-admin-foreground">
                          {hasCustomOverrides ? 'Customized Recipient & Billing Context' : 'Resolved Recipient & Lease Context'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasCustomOverrides ? (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            Customized
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            Auto-Detected
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsEditingRecipient(!isEditingRecipient)}
                          className="text-[11px] font-bold px-2 py-0.5 rounded-lg text-admin-primary bg-admin-primary/10 hover:bg-admin-primary/20 transition-colors inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          {isEditingRecipient ? 'Done' : 'Edit Details'}
                        </button>
                      </div>
                    </div>

                    {isEditingRecipient ? (
                      <div className="space-y-3 pt-1 animate-in fade-in text-xs">
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-admin-muted mb-1">
                              Recipient / Tenant Name
                            </label>
                            <input
                              type="text"
                              value={customTenantName}
                              onChange={(e) => setCustomTenantName(e.target.value)}
                              placeholder="e.g. John Smith"
                              className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground focus:border-admin-primary focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-admin-muted mb-1">
                              Recipient Email Address <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="email"
                              value={customTenantEmail}
                              onChange={(e) => setCustomTenantEmail(e.target.value)}
                              placeholder="e.g. tenant@example.com"
                              className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground focus:border-admin-primary focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-admin-muted mb-1">
                              Contact Phone (Optional)
                            </label>
                            <input
                              type="tel"
                              value={customTenantPhone}
                              onChange={(e) => setCustomTenantPhone(e.target.value)}
                              placeholder="e.g. +61 400 000 000"
                              className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground focus:border-admin-primary focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-admin-muted mb-1">
                              Rent Amount ($)
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={customRentAmount}
                              onChange={(e) => setCustomRentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="Rent Amount"
                              className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground focus:border-admin-primary focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-admin-border/50">
                          <button
                            type="button"
                            onClick={() => {
                              const tRel = selectedLease.lease_tenants?.[0]?.tenant || selectedLease.tenants?.[0]?.tenant || selectedLease.tenants?.[0];
                              const tName = tRel ? `${tRel.first_name || ''} ${tRel.last_name || ''}`.trim() : '';
                              setCustomTenantName(tName);
                              setCustomTenantEmail(tRel?.email || '');
                              setCustomTenantPhone(tRel?.phone || '');
                              setCustomRentAmount(selectedLease.rent_amount ? Number(selectedLease.rent_amount) : '');
                            }}
                            className="text-[11px] text-admin-muted hover:text-admin-foreground underline"
                          >
                            Reset to Lease Defaults
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingRecipient(false)}
                            className="text-xs font-bold px-3 py-1 bg-admin-primary text-white rounded-lg hover:bg-admin-primary-hover"
                          >
                            Done Editing
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-admin-muted font-medium">Tenant:</span>
                          <strong className="text-admin-foreground">{effectiveTenantName}</strong>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-admin-muted shrink-0" />
                          {effectiveTenantEmail ? (
                            <span className="font-mono text-admin-primary font-medium truncate" title={effectiveTenantEmail}>
                              {effectiveTenantEmail}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setIsEditingRecipient(true)}
                              className="text-amber-500 font-bold hover:underline flex items-center gap-1 text-[11px]"
                            >
                              No email on record · Click to edit
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-admin-muted shrink-0" />
                          <span className="text-admin-foreground font-mono">{effectiveTenantPhone || 'Not provided'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="text-admin-foreground font-semibold">{effectiveRent}</span>
                        </div>
                        <div className="col-span-2 flex items-start gap-1.5 pt-0.5 border-t border-admin-border/50">
                          <MapPin className="w-3.5 h-3.5 text-admin-muted shrink-0 mt-0.5" />
                          <span className="text-[11px] text-admin-muted truncate" title={`${resolvedPropertyName} — ${resolvedPropertyAddress}`}>
                            <strong className="text-admin-foreground">{resolvedPropertyName}</strong> • {resolvedPropertyAddress}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. What do you want to do? */}
              <div>
                <label className="block text-xs font-bold text-admin-foreground mb-1.5">
                  2. What do you want to do?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLeaseActionType('generate_and_send_invoice')}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all flex flex-col gap-1',
                      leaseActionType === 'generate_and_send_invoice'
                        ? 'border-admin-primary bg-admin-primary/5 text-admin-foreground font-bold'
                        : 'border-admin-border bg-admin-surface text-admin-muted hover:text-admin-foreground'
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <Receipt className="w-4 h-4 text-admin-primary" />
                      Generate & Send Invoice
                    </div>
                    <span className="text-[11px] opacity-80 font-normal">Creates a fresh invoice for each billing period</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeaseActionType('send_lease')}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all flex flex-col gap-1',
                      leaseActionType === 'send_lease'
                        ? 'border-admin-primary bg-admin-primary/5 text-admin-foreground font-bold'
                        : 'border-admin-border bg-admin-surface text-admin-muted hover:text-admin-foreground'
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <Send className="w-4 h-4 text-admin-primary" />
                      Send Lease Document
                    </div>
                    <span className="text-[11px] opacity-80 font-normal">Emails official Lease Summary PDF</span>
                  </button>
                </div>
              </div>

              {/* 3. Invoice Reference Template & Issued By Details (if invoice action) */}
              {leaseActionType === 'generate_and_send_invoice' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-admin-foreground mb-1.5">
                      3. Fixed Invoice Template
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary font-medium"
                    >
                      {PREDEFINED_INVOICE_TEMPLATES.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name} ({tpl.badge})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Issued By Card */}
                  <div className="p-3.5 bg-admin-surface-subtle/80 border border-admin-border rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between border-b border-admin-border pb-2">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-admin-primary" />
                        <span className="text-xs font-bold text-admin-foreground">
                          Issued By Details (Sender & Landlord Profile)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasCustomIssuer ? (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            Custom Issuer
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-admin-muted bg-admin-surface px-2 py-0.5 rounded-full border border-admin-border">
                            Default Profile
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsEditingIssuer(!isEditingIssuer)}
                          className="text-[11px] font-bold px-2 py-0.5 rounded-lg text-admin-primary bg-admin-primary/10 hover:bg-admin-primary/20 transition-colors inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          {isEditingIssuer ? 'Done' : 'Edit Issued By'}
                        </button>
                      </div>
                    </div>

                    {isEditingIssuer ? (
                      <div className="space-y-3 pt-1 animate-in fade-in text-xs">
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-admin-muted mb-1">
                              Issuer / Company Name
                            </label>
                            <input
                              type="text"
                              value={issuerName}
                              onChange={(e) => setIssuerName(e.target.value)}
                              placeholder="e.g. Property Ledge Management"
                              className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground focus:border-admin-primary focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-admin-muted mb-1">
                              Billing / Issuer Email
                            </label>
                            <input
                              type="email"
                              value={issuerEmail}
                              onChange={(e) => setIssuerEmail(e.target.value)}
                              placeholder="billing@propertyledge.com.au"
                              className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground focus:border-admin-primary focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-admin-muted mb-1">
                              Issuer Phone (Optional)
                            </label>
                            <input
                              type="tel"
                              value={issuerPhone}
                              onChange={(e) => setIssuerPhone(e.target.value)}
                              placeholder="+61 2 9000 0000"
                              className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground focus:border-admin-primary focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-admin-muted mb-1">
                              Payment Due Terms
                            </label>
                            <select
                              value={paymentDueDays}
                              onChange={(e) => setPaymentDueDays(Number(e.target.value))}
                              className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground focus:border-admin-primary focus:outline-none"
                            >
                              <option value={0}>Due on Issue Date (Same Day)</option>
                              <option value={7}>Net 7 Days (Due in 7 days)</option>
                              <option value={14}>Net 14 Days (Default - Due in 14 days)</option>
                              <option value={21}>Net 21 Days (Due in 21 days)</option>
                              <option value={30}>Net 30 Days (Due in 30 days)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-admin-muted mb-1">
                              Issuer Address (Optional)
                            </label>
                            <input
                              type="text"
                              value={issuerAddress}
                              onChange={(e) => setIssuerAddress(e.target.value)}
                              placeholder="Level 5, 100 George St, Sydney NSW"
                              className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground focus:border-admin-primary focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-admin-muted mb-1">
                              ABN / Tax ID (Optional)
                            </label>
                            <input
                              type="text"
                              value={issuerTaxId}
                              onChange={(e) => setIssuerTaxId(e.target.value)}
                              placeholder="ABN 12 345 678 901"
                              className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground focus:border-admin-primary focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-admin-border/50">
                          <button
                            type="button"
                            onClick={() => {
                              setIssuerName('Property Ledge Management');
                              setIssuerEmail('billing@propertyledge.com.au');
                              setIssuerPhone('+61 2 9000 0000');
                              setIssuerAddress('');
                              setIssuerTaxId('');
                              setPaymentDueDays(14);
                            }}
                            className="text-[11px] text-admin-muted hover:text-admin-foreground underline"
                          >
                            Reset to Default Profile
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingIssuer(false)}
                            className="text-xs font-bold px-3 py-1 bg-admin-primary text-white rounded-lg hover:bg-admin-primary-hover"
                          >
                            Done Editing
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-admin-muted font-medium">Issued By:</span>
                          <strong className="text-admin-foreground">{issuerName || 'Property Ledge Management'}</strong>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-admin-muted shrink-0" />
                          <span className="font-mono text-admin-primary font-medium truncate" title={issuerEmail}>
                            {issuerEmail || 'billing@propertyledge.com.au'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-admin-muted shrink-0" />
                          <span className="text-admin-foreground font-mono">{issuerPhone || 'Not provided'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-admin-primary shrink-0" />
                          <span className="text-admin-foreground">
                            {paymentDueDays === 0 ? 'Due on issue date' : `Due in ${paymentDueDays} days`}
                          </span>
                        </div>
                        {(issuerAddress || issuerTaxId) && (
                          <div className="col-span-2 flex items-start gap-1.5 pt-0.5 border-t border-admin-border/50 text-[11px] text-admin-muted truncate">
                            <Building className="w-3.5 h-3.5 text-admin-muted shrink-0 mt-0.5" />
                            <span>
                              {issuerAddress} {issuerTaxId ? `• ${issuerTaxId}` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── EMAIL TEMPLATE & BODY SECTION (LEASE) ─── */}
              <div className="p-3.5 bg-admin-surface-subtle/80 border border-admin-border rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-admin-border pb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-admin-primary" />
                    <span className="text-xs font-bold text-admin-foreground">
                      Email Template & Message Body
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingEmailTemplate(!isEditingEmailTemplate)}
                    className="text-[11px] font-bold px-2 py-0.5 rounded-lg text-admin-primary bg-admin-primary/10 hover:bg-admin-primary/20 transition-colors inline-flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    {isEditingEmailTemplate ? 'Done' : 'Customize Email'}
                  </button>
                </div>

                {isEditingEmailTemplate ? (
                  <div className="space-y-3 pt-1 animate-in fade-in text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-admin-muted mb-1">
                        Email Subject
                      </label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Invoice {invoice_number} from {issuer_name}"
                        className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground focus:border-admin-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-admin-muted">
                          Email Message Body
                        </label>
                        <span className="text-[10px] text-admin-muted font-mono">Placeholders supported</span>
                      </div>
                      <textarea
                        rows={4}
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        placeholder="Enter email body message..."
                        className="w-full bg-admin-surface border border-admin-border rounded-lg p-2.5 text-xs text-admin-foreground focus:border-admin-primary focus:outline-none leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-admin-muted mb-1">
                        Google Drive Folder Link (Optional)
                      </label>
                      <input
                        type="url"
                        value={driveFolderUrl}
                        onChange={(e) => setDriveFolderUrl(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground focus:border-admin-primary focus:outline-none"
                      />
                    </div>

                    <div className="p-2 bg-admin-surface border border-admin-border rounded-lg text-[10.5px] text-admin-muted space-y-1">
                      <span className="font-bold text-admin-foreground block">Available Placeholders:</span>
                      <div className="flex flex-wrap gap-1 font-mono text-[9.5px]">
                        <span className="bg-admin-surface-subtle px-1 py-0.5 rounded border border-admin-border">{'{first_name}'}</span>
                        <span className="bg-admin-surface-subtle px-1 py-0.5 rounded border border-admin-border">{'{tenant_name}'}</span>
                        <span className="bg-admin-surface-subtle px-1 py-0.5 rounded border border-admin-border">{'{invoice_number}'}</span>
                        <span className="bg-admin-surface-subtle px-1 py-0.5 rounded border border-admin-border">{'{amount}'}</span>
                        <span className="bg-admin-surface-subtle px-1 py-0.5 rounded border border-admin-border">{'{due_date}'}</span>
                        <span className="bg-admin-surface-subtle px-1 py-0.5 rounded border border-admin-border">{'{issuer_name}'}</span>
                        <span className="bg-admin-surface-subtle px-1 py-0.5 rounded border border-admin-border">{'{property_address}'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-admin-muted font-medium">Subject:</span>
                      <span className="text-admin-foreground font-semibold truncate">{emailSubject}</span>
                    </div>
                    <p className="text-[11px] text-admin-muted line-clamp-2 bg-admin-surface p-2 rounded-lg border border-admin-border italic">
                      &quot;{emailMessage.split('\n')[0]}...&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* 4. Schedule Options */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-admin-foreground">
                    4. Schedule Options (Australian Timezone)
                  </label>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Sydney: {auTime}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setScheduleType('monthly')}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all flex flex-col gap-0.5',
                      scheduleType === 'monthly'
                        ? 'border-admin-primary bg-admin-primary/5 text-admin-foreground font-bold'
                        : 'border-admin-border bg-admin-surface text-admin-muted hover:text-admin-foreground'
                    )}
                  >
                    <div className="flex items-center gap-1 text-xs font-bold">
                      <Calendar className="w-3.5 h-3.5 text-admin-primary" />
                      Monthly Schedule
                    </div>
                    <span className="text-[10px] opacity-80 font-normal">Repeats every month on set day</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScheduleType('after_start')}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all flex flex-col gap-0.5',
                      scheduleType === 'after_start'
                        ? 'border-admin-primary bg-admin-primary/5 text-admin-foreground font-bold'
                        : 'border-admin-border bg-admin-surface text-admin-muted hover:text-admin-foreground'
                    )}
                  >
                    <div className="flex items-center gap-1 text-xs font-bold">
                      <Clock className="w-3.5 h-3.5 text-admin-primary" />
                      After Lease Start
                    </div>
                    <span className="text-[10px] opacity-80 font-normal">Triggers X months after start</span>
                  </button>
                </div>

                {scheduleType === 'monthly' && (
                  <div className="p-3 bg-admin-surface-subtle border border-admin-border rounded-xl space-y-2">
                    <div>
                      <label className="block text-xs font-bold text-admin-muted mb-1">Billing / Issue Day of Month</label>
                      <select
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(Number(e.target.value))}
                        className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-admin-foreground"
                      >
                        {[...Array(28)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            Day {i + 1} of each month
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-[11px] text-admin-muted flex items-center gap-1.5 pt-1 border-t border-admin-border/50">
                      <Clock className="w-3.5 h-3.5 text-admin-primary shrink-0" />
                      <span>Evaluated & dispatched automatically in the <strong>7:00 AM AU</strong> daily morning queue.</span>
                    </div>
                  </div>
                )}

                {scheduleType === 'after_start' && (
                  <div className="p-3 bg-admin-surface-subtle border border-admin-border rounded-xl space-y-2">
                    <div>
                      <label className="block text-xs font-bold text-admin-muted mb-1">Months After Lease Start</label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={offsetMonths}
                        onChange={(e) => setOffsetMonths(Number(e.target.value))}
                        className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-admin-foreground"
                      />
                    </div>
                    <div className="text-[11px] text-admin-muted flex items-center gap-1.5 pt-1 border-t border-admin-border/50">
                      <Clock className="w-3.5 h-3.5 text-admin-primary shrink-0" />
                      <span>Evaluated & dispatched automatically in the <strong>7:00 AM AU</strong> daily morning queue.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 1: CONFIGURATION FORM (STANDALONE INVOICE)          */}
          {/* ======================================================== */}
          {currentStep === 1 && automationType === 'invoice' && (
            <div className="space-y-4">
              {/* 1. Select Template */}
              <div>
                <label className="block text-xs font-bold text-admin-foreground mb-1.5">
                  1. Fixed Invoice Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary font-medium"
                >
                  {PREDEFINED_INVOICE_TEMPLATES.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.badge})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Customer Information */}
              <div className="p-3.5 bg-admin-surface-subtle border border-admin-border rounded-xl space-y-3">
                <label className="block text-xs font-bold text-admin-foreground">
                  2. Recipient & Billing Information
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-admin-muted mb-1">Customer / Company Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Corporation"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-admin-muted mb-1">Customer Email Address</label>
                    <input
                      type="email"
                      placeholder="billing@acme.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-admin-muted mb-1">Customer Phone (Optional)</label>
                    <input
                      type="tel"
                      placeholder="+61 400 000 000"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-admin-muted mb-1">Billing Address (Optional)</label>
                    <input
                      type="text"
                      placeholder="123 Business Way, Sydney"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-admin-muted mb-1">Service Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Monthly Maintenance & Retainer"
                      value={invoiceDescription}
                      onChange={(e) => setInvoiceDescription(e.target.value)}
                      className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-admin-muted mb-1">Amount ($ AUD)</label>
                    <input
                      type="number"
                      min={1}
                      placeholder="1000"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Issued By Details (Sender Profile) */}
              <div className="p-3.5 bg-admin-surface-subtle/80 border border-admin-border rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-admin-border pb-2">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-admin-foreground">
                      3. Issued By Details (Sender & Business Profile)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasCustomIssuer ? (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        Custom Issuer
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-admin-muted bg-admin-surface px-2 py-0.5 rounded-full border border-admin-border">
                        Default Profile
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsEditingIssuer(!isEditingIssuer)}
                      className="text-[11px] font-bold px-2 py-0.5 rounded-lg text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors inline-flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      {isEditingIssuer ? 'Done' : 'Edit Issued By'}
                    </button>
                  </div>
                </div>

                {isEditingIssuer ? (
                  <div className="space-y-3 pt-1 animate-in fade-in text-xs">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-admin-muted mb-1">
                          Issuer / Company Name
                        </label>
                        <input
                          type="text"
                          value={issuerName}
                          onChange={(e) => setIssuerName(e.target.value)}
                          placeholder="e.g. Property Ledge Management"
                          className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-admin-muted mb-1">
                          Billing / Issuer Email
                        </label>
                        <input
                          type="email"
                          value={issuerEmail}
                          onChange={(e) => setIssuerEmail(e.target.value)}
                          placeholder="billing@propertyledge.com.au"
                          className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-admin-muted mb-1">
                          Issuer Phone (Optional)
                        </label>
                        <input
                          type="tel"
                          value={issuerPhone}
                          onChange={(e) => setIssuerPhone(e.target.value)}
                          placeholder="+61 2 9000 0000"
                          className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-admin-muted mb-1">
                          Payment Due Terms
                        </label>
                        <select
                          value={paymentDueDays}
                          onChange={(e) => setPaymentDueDays(Number(e.target.value))}
                          className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground focus:border-emerald-500 focus:outline-none"
                        >
                          <option value={0}>Due on Issue Date (Same Day)</option>
                          <option value={7}>Net 7 Days (Due in 7 days)</option>
                          <option value={14}>Net 14 Days (Default - Due in 14 days)</option>
                          <option value={21}>Net 21 Days (Due in 21 days)</option>
                          <option value={30}>Net 30 Days (Due in 30 days)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-admin-muted mb-1">
                          Issuer Address (Optional)
                        </label>
                        <input
                          type="text"
                          value={issuerAddress}
                          onChange={(e) => setIssuerAddress(e.target.value)}
                          placeholder="Level 5, 100 George St, Sydney NSW"
                          className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-admin-muted mb-1">
                          ABN / Tax ID (Optional)
                        </label>
                        <input
                          type="text"
                          value={issuerTaxId}
                          onChange={(e) => setIssuerTaxId(e.target.value)}
                          placeholder="ABN 12 345 678 901"
                          className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-admin-border/50">
                      <button
                        type="button"
                        onClick={() => {
                          setIssuerName('Property Ledge Management');
                          setIssuerEmail('billing@propertyledge.com.au');
                          setIssuerPhone('+61 2 9000 0000');
                          setIssuerAddress('');
                          setIssuerTaxId('');
                          setPaymentDueDays(14);
                        }}
                        className="text-[11px] text-admin-muted hover:text-admin-foreground underline"
                      >
                        Reset to Default Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingIssuer(false)}
                        className="text-xs font-bold px-3 py-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                      >
                        Done Editing
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-admin-muted font-medium">Issued By:</span>
                      <strong className="text-admin-foreground">{issuerName || 'Property Ledge Management'}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-admin-muted shrink-0" />
                      <span className="font-mono text-emerald-500 font-medium truncate" title={issuerEmail}>
                        {issuerEmail || 'billing@propertyledge.com.au'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-admin-muted shrink-0" />
                      <span className="text-admin-foreground font-mono">{issuerPhone || 'Not provided'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-admin-foreground">
                        {paymentDueDays === 0 ? 'Due on issue date' : `Due in ${paymentDueDays} days`}
                      </span>
                    </div>
                    {(issuerAddress || issuerTaxId) && (
                      <div className="col-span-2 flex items-start gap-1.5 pt-0.5 border-t border-admin-border/50 text-[11px] text-admin-muted truncate">
                        <Building className="w-3.5 h-3.5 text-admin-muted shrink-0 mt-0.5" />
                        <span>
                          {issuerAddress} {issuerTaxId ? `• ${issuerTaxId}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ─── EMAIL TEMPLATE & BODY SECTION (STANDALONE) ─── */}
              <div className="p-3.5 bg-admin-surface-subtle border border-admin-border rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-admin-border pb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-admin-foreground">
                      Email Template & Message Body
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingEmailTemplate(!isEditingEmailTemplate)}
                    className="text-[11px] font-bold px-2 py-0.5 rounded-lg text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors inline-flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    {isEditingEmailTemplate ? 'Done' : 'Customize Email'}
                  </button>
                </div>

                {isEditingEmailTemplate ? (
                  <div className="space-y-3 pt-1 animate-in fade-in text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-admin-muted mb-1">
                        Email Subject
                      </label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Invoice {invoice_number} from {issuer_name}"
                        className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-admin-muted">
                          Email Message Body
                        </label>
                        <span className="text-[10px] text-admin-muted font-mono">Placeholders supported</span>
                      </div>
                      <textarea
                        rows={4}
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        placeholder="Enter email body message..."
                        className="w-full bg-admin-surface border border-admin-border rounded-lg p-2.5 text-xs text-admin-foreground focus:border-emerald-500 focus:outline-none leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-admin-muted mb-1">
                        Google Drive Folder Link (Optional)
                      </label>
                      <input
                        type="url"
                        value={driveFolderUrl}
                        onChange={(e) => setDriveFolderUrl(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="p-2 bg-admin-surface border border-admin-border rounded-lg text-[10.5px] text-admin-muted space-y-1">
                      <span className="font-bold text-admin-foreground block">Available Placeholders:</span>
                      <div className="flex flex-wrap gap-1 font-mono text-[9.5px]">
                        <span className="bg-admin-surface-subtle px-1 py-0.5 rounded border border-admin-border">{'{first_name}'}</span>
                        <span className="bg-admin-surface-subtle px-1 py-0.5 rounded border border-admin-border">{'{recipient_name}'}</span>
                        <span className="bg-admin-surface-subtle px-1 py-0.5 rounded border border-admin-border">{'{invoice_number}'}</span>
                        <span className="bg-admin-surface-subtle px-1 py-0.5 rounded border border-admin-border">{'{amount}'}</span>
                        <span className="bg-admin-surface-subtle px-1 py-0.5 rounded border border-admin-border">{'{due_date}'}</span>
                        <span className="bg-admin-surface-subtle px-1 py-0.5 rounded border border-admin-border">{'{issuer_name}'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-admin-muted font-medium">Subject:</span>
                      <span className="text-admin-foreground font-semibold truncate">{emailSubject}</span>
                    </div>
                    <p className="text-[11px] text-admin-muted line-clamp-2 bg-admin-surface p-2 rounded-lg border border-admin-border italic">
                      &quot;{emailMessage.split('\n')[0]}...&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* 4. Schedule Options */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-admin-foreground">
                  4. Schedule Options
                </label>
                <div className="p-3 bg-admin-surface-subtle border border-admin-border rounded-xl space-y-2">
                  <div>
                    <label className="block text-xs font-bold text-admin-muted mb-1">Billing / Issue Day of Month</label>
                    <select
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(Number(e.target.value))}
                      className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-admin-foreground"
                    >
                      {[...Array(28)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Day {i + 1} of each month
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-[11px] text-admin-muted flex items-center gap-1.5 pt-1 border-t border-admin-border/50">
                    <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Evaluated & dispatched automatically in the <strong>7:00 AM AU</strong> daily morning queue.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: REVIEW & CONFIRM SCREEN                          */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="p-4 bg-admin-surface-subtle border border-admin-border rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-admin-border pb-2.5">
                  <span className="text-xs font-bold text-admin-muted uppercase">Automation Type</span>
                  <span className={cn(
                    'text-xs font-bold px-2.5 py-0.5 rounded-full',
                    automationType === 'lease'
                      ? 'bg-admin-primary/10 text-admin-primary border border-admin-primary/20'
                      : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  )}>
                    {automationType === 'lease' ? 'Lease Automation' : 'Standalone Invoice Automation'}
                  </span>
                </div>

                {automationType === 'lease' ? (
                  <>
                    <div className="space-y-1.5 bg-admin-surface p-3 rounded-lg border border-admin-border text-xs">
                      <div className="font-bold text-admin-foreground flex items-center justify-between mb-1 text-[11px] uppercase tracking-wider text-admin-primary">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" /> Recipient Details (Bill To)
                        </span>
                        {hasCustomOverrides && (
                          <span className="text-[10px] lowercase font-normal bg-amber-500/10 text-amber-500 px-1.5 py-0.2 rounded border border-amber-500/20">
                            (customized)
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Recipient Tenant:</span>
                        <strong className="text-admin-foreground">{effectiveTenantName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Email Address:</span>
                        <span className="font-mono text-admin-primary font-bold">{effectiveTenantEmail || 'No email provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Phone Number:</span>
                        <span className="font-mono text-admin-foreground">{effectiveTenantPhone || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Rent Amount:</span>
                        <span className="font-bold text-emerald-500">{effectiveRent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Property & Address:</span>
                        <span className="text-admin-foreground text-right">{resolvedPropertyName} ({resolvedPropertyAddress})</span>
                      </div>
                    </div>

                    {/* Issued By Review Card */}
                    {leaseActionType === 'generate_and_send_invoice' && (
                      <div className="space-y-1.5 bg-admin-surface p-3 rounded-lg border border-admin-border text-xs">
                        <div className="font-bold text-admin-foreground flex items-center justify-between mb-1 text-[11px] uppercase tracking-wider text-admin-primary">
                          <span className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5" /> Issued By Details (Sender & Landlord)
                          </span>
                          {hasCustomIssuer && (
                            <span className="text-[10px] lowercase font-normal bg-amber-500/10 text-amber-500 px-1.5 py-0.2 rounded border border-amber-500/20">
                              (customized)
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-admin-muted">Issuer Name:</span>
                          <strong className="text-admin-foreground">{issuerName}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-admin-muted">Billing Email:</span>
                          <span className="font-mono text-admin-primary font-bold">{issuerEmail}</span>
                        </div>
                        {issuerPhone && (
                          <div className="flex justify-between">
                            <span className="text-admin-muted">Phone Number:</span>
                            <span className="font-mono text-admin-foreground">{issuerPhone}</span>
                          </div>
                        )}
                        {issuerAddress && (
                          <div className="flex justify-between">
                            <span className="text-admin-muted">Address:</span>
                            <span className="text-admin-foreground">{issuerAddress}</span>
                          </div>
                        )}
                        {issuerTaxId && (
                          <div className="flex justify-between">
                            <span className="text-admin-muted">ABN / Tax ID:</span>
                            <span className="font-mono text-admin-foreground">{issuerTaxId}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-admin-muted">Payment Terms:</span>
                          <strong className="text-admin-foreground">
                            {paymentDueDays === 0 ? 'Due on issue date' : `Due in ${paymentDueDays} days`}
                          </strong>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-admin-muted font-medium">Scheduled Action:</span>
                      <strong className="text-admin-foreground">
                        {leaseActionType === 'generate_and_send_invoice' ? 'Generate & Send Invoice' : 'Send Lease Document'}
                      </strong>
                    </div>

                    {leaseActionType === 'generate_and_send_invoice' && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-admin-muted font-medium">Invoice Template:</span>
                        <span className="font-bold text-admin-foreground">{selectedTemplate?.name || 'Default Rental Template'}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5 bg-admin-surface p-3 rounded-lg border border-admin-border text-xs">
                      <div className="font-bold text-admin-foreground flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider text-emerald-500">
                        <User className="w-3.5 h-3.5" /> Customer & Billing Information (Bill To)
                      </div>
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Customer Name:</span>
                        <strong className="text-admin-foreground">{customerName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Recipient Email:</span>
                        <span className="font-mono text-emerald-500 font-bold">{customerEmail}</span>
                      </div>
                      {customerPhone && (
                        <div className="flex justify-between">
                          <span className="text-admin-muted">Phone Number:</span>
                          <span className="font-mono text-admin-foreground">{customerPhone}</span>
                        </div>
                      )}
                      {customerAddress && (
                        <div className="flex justify-between">
                          <span className="text-admin-muted">Billing Address:</span>
                          <span className="text-admin-foreground">{customerAddress}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Charge Amount:</span>
                        <strong className="text-admin-foreground">${Number(invoiceAmount).toLocaleString()} AUD</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Service Description:</span>
                        <span className="text-admin-foreground">{invoiceDescription}</span>
                      </div>
                    </div>

                    {/* Standalone Issued By Review Card */}
                    <div className="space-y-1.5 bg-admin-surface p-3 rounded-lg border border-admin-border text-xs">
                      <div className="font-bold text-admin-foreground flex items-center justify-between mb-1 text-[11px] uppercase tracking-wider text-emerald-500">
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5" /> Issued By Details (Sender & Business)
                        </span>
                        {hasCustomIssuer && (
                          <span className="text-[10px] lowercase font-normal bg-amber-500/10 text-amber-500 px-1.5 py-0.2 rounded border border-amber-500/20">
                            (customized)
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Issuer Name:</span>
                        <strong className="text-admin-foreground">{issuerName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Billing Email:</span>
                        <span className="font-mono text-emerald-500 font-bold">{issuerEmail}</span>
                      </div>
                      {issuerPhone && (
                        <div className="flex justify-between">
                          <span className="text-admin-muted">Phone Number:</span>
                          <span className="font-mono text-admin-foreground">{issuerPhone}</span>
                        </div>
                      )}
                      {issuerAddress && (
                        <div className="flex justify-between">
                          <span className="text-admin-muted">Address:</span>
                          <span className="text-admin-foreground">{issuerAddress}</span>
                        </div>
                      )}
                      {issuerTaxId && (
                        <div className="flex justify-between">
                          <span className="text-admin-muted">ABN / Tax ID:</span>
                          <span className="font-mono text-admin-foreground">{issuerTaxId}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Payment Terms:</span>
                        <strong className="text-admin-foreground">
                          {paymentDueDays === 0 ? 'Due on issue date' : `Due in ${paymentDueDays} days`}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-admin-muted font-medium">Invoice Template:</span>
                      <span className="font-bold text-admin-foreground">{selectedTemplate?.name || 'Default Commercial Template'}</span>
                    </div>
                  </>
                )}

                {/* Email Delivery Review Box */}
                <div className="space-y-1.5 bg-admin-surface p-3 rounded-lg border border-admin-border text-xs">
                  <div className="font-bold text-admin-foreground flex items-center justify-between mb-1 text-[11px] uppercase tracking-wider text-admin-primary">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> Email Delivery & Template
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-admin-muted">Subject:</span>
                    <strong className="text-admin-foreground truncate max-w-[260px]">{emailSubject}</strong>
                  </div>
                  {driveFolderUrl && (
                    <div className="flex justify-between">
                      <span className="text-admin-muted">Drive Link:</span>
                      <span className="font-mono text-admin-primary truncate max-w-[260px]">{driveFolderUrl}</span>
                    </div>
                  )}
                  <div className="pt-1 border-t border-admin-border/50 text-[11px] text-admin-muted line-clamp-2 italic">
                    &quot;{emailMessage.split('\n')[0]}...&quot;
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs border-t border-admin-border pt-2.5">
                  <span className="text-admin-muted font-medium">Recurring Schedule:</span>
                  <span className="font-bold text-admin-foreground">
                    {scheduleType === 'monthly'
                      ? `Every month on the ${dayOfMonth}${dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th'} (7:00 AM AU Daily Run)`
                      : `${offsetMonths} month${offsetMonths > 1 ? 's' : ''} after lease start (7:00 AM AU Daily Run)`}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-[11px] leading-relaxed flex items-start gap-2">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Accounting Rule:</strong> Each scheduled execution generates a <em>brand new finalized invoice</em> for the current billing period and emails the recipient directly. Historical invoices remain untouched.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-admin-border bg-admin-surface-subtle/50 flex items-center justify-between">
          {currentStep === 0 ? (
            <div>
              <Button variant="ghost" onClick={onClose} className="text-admin-muted text-xs">
                Cancel
              </Button>
            </div>
          ) : currentStep === 1 ? (
            <>
              <Button
                variant="ghost"
                onClick={() => (preselectedLeaseId ? onClose() : setCurrentStep(0))}
                className="text-admin-muted text-xs gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Button>
              <Button
                variant="primary"
                onClick={() => setCurrentStep(2)}
                className="text-xs font-bold gap-1"
              >
                Continue to Review <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(1)}
                disabled={loading}
                className="text-admin-muted text-xs gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Button>
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={loading}
                className="gap-1.5 font-bold shadow-xs text-xs"
              >
                <Check className="w-4 h-4" />
                {loading ? 'Scheduling...' : 'Confirm & Create Automation'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
