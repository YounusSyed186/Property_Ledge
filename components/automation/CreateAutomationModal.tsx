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
import { Button, Input, Select, Textarea } from '@/components/admin/ui';
import { fetchAllWorkspaceLeases } from '@/app/actions/dashboard';
import { fetchInvoiceTemplatesAction } from '@/app/actions/invoices';
import { InvoiceTemplateDTO } from '@/modules/invoices';
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
  const [customTemplates, setCustomTemplates] = useState<InvoiceTemplateDTO[]>([]);
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

      // Load custom workspace blueprints
      fetchInvoiceTemplatesAction().then((data) => {
        if (Array.isArray(data)) setCustomTemplates(data);
      }).catch(err => console.error('Error fetching custom templates:', err));
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
  const resolvedRent = selectedLease?.rent_amount ? `$${Number(selectedLease.rent_amount).toLocaleString()} / ${selectedLease?.rent_frequency || 'monthly'}` : 'N/A';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#008F83]/10 text-[#008F83] border border-[#008F83]/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {currentStep === 0
                  ? 'Create New Automation'
                  : currentStep === 1
                  ? automationType === 'lease'
                    ? 'Configure Lease Automation'
                    : 'Configure Invoice Automation'
                  : 'Review & Confirm Automation'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Circular Progress Stepper Navigation Workflow */}
        <nav aria-label="Automation Setup Progress" className="py-2.5 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50">
          <div className="flex items-center justify-center max-w-sm mx-auto relative">
            {/* Connecting line track */}
            <div className="absolute top-3 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />
            <div
              className="absolute top-3 left-6 h-0.5 bg-[#008F83] -z-0 transition-all duration-300"
              style={{
                width:
                  currentStep === 0
                    ? '0%'
                    : currentStep === 1
                    ? '50%'
                    : 'calc(100% - 48px)',
              }}
            />

            <div className="w-full flex items-center justify-between z-10 px-1">
              {[
                { id: 1, name: 'Category' },
                { id: 2, name: 'Configure' },
                { id: 3, name: 'Review' },
              ].map((s, idx) => {
                const isCurrent = idx === currentStep;
                const isCompleted = idx < currentStep;

                return (
                  <div key={s.id} className="flex flex-col items-center group">
                    <button
                      type="button"
                      onClick={() => {
                        if (isCompleted || (idx === 1 && currentStep === 0)) {
                          setCurrentStep(idx);
                        }
                      }}
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200 cursor-pointer focus:outline-none',
                        isCurrent
                          ? 'bg-[#008F83] text-white shadow-xs ring-3 ring-[#008F83]/20 scale-105'
                          : isCompleted
                          ? 'bg-[#008F83] text-white shadow-2xs hover:bg-[#008F83]/90'
                          : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                      )}
                      title={`Go to ${s.name}`}
                    >
                      {isCompleted ? <Check className="w-3 h-3 stroke-[2.5]" /> : s.id}
                    </button>
                    <span
                      className={cn(
                        'mt-1 text-[10px] font-medium transition-colors text-center',
                        isCurrent
                          ? 'text-[#008F83] font-bold'
                          : isCompleted
                          ? 'text-slate-700 dark:text-slate-300'
                          : 'text-slate-400 dark:text-slate-500'
                      )}
                    >
                      {s.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </nav>

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
            <div className="space-y-6 py-2">
              <div className="text-center max-w-xl mx-auto mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#008F83]/10 text-[#008F83] text-xs font-bold border border-[#008F83]/20 mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Step 1 of 3 · Automation Category
                </span>
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Select Automation Category
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Choose how you want to automate recurring billing or document deliveries.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
                {/* Lease Option */}
                <div
                  onClick={() => {
                    setAutomationType('lease');
                    setCurrentStep(1);
                  }}
                  className={cn(
                    'cursor-pointer rounded-3xl p-6 border-2 transition-all flex flex-col justify-between relative group hover:shadow-xl',
                    automationType === 'lease'
                      ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 shadow-lg ring-4 ring-[#008F83]/15'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                  )}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
                        automationType === 'lease'
                          ? 'bg-[#008F83] text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-[#008F83]/10 group-hover:text-[#008F83]'
                      )}>
                        <Building className="w-6 h-6" />
                      </div>
                      <span className={cn(
                        'text-[10.5px] font-bold px-2.5 py-1 rounded-full border',
                        automationType === 'lease'
                          ? 'bg-[#008F83]/15 text-[#008F83] border-[#008F83]/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      )}>
                        Tenancy Linked
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#008F83] transition-colors">
                        Lease Automation
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                        Auto-binds tenant recipient details (email, phone, address, rent amount) directly from the lease for recurring rent invoices or agreement deliveries.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className={cn(
                      'text-xs font-bold transition-colors',
                      automationType === 'lease' ? 'text-[#008F83]' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    )}>
                      {automationType === 'lease' ? '✓ Selected Category' : 'Click to select'}
                    </span>
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-all',
                      automationType === 'lease'
                        ? 'bg-[#008F83] text-white shadow-xs'
                        : 'border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-transparent'
                    )}>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </div>
                </div>

                {/* Standalone Invoice Option */}
                <div
                  onClick={() => {
                    setAutomationType('invoice');
                    setCurrentStep(1);
                  }}
                  className={cn(
                    'cursor-pointer rounded-3xl p-6 border-2 transition-all flex flex-col justify-between relative group hover:shadow-xl',
                    automationType === 'invoice'
                      ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 shadow-lg ring-4 ring-[#008F83]/15'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                  )}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
                        automationType === 'invoice'
                          ? 'bg-[#008F83] text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-[#008F83]/10 group-hover:text-[#008F83]'
                      )}>
                        <Receipt className="w-6 h-6" />
                      </div>
                      <span className={cn(
                        'text-[10.5px] font-bold px-2.5 py-1 rounded-full border',
                        automationType === 'invoice'
                          ? 'bg-[#008F83]/15 text-[#008F83] border-[#008F83]/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      )}>
                        Standard Direct
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#008F83] transition-colors">
                        Standalone Invoice Automation
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                        Automate recurring billing for commercial clients, contractors, or consulting fees with custom templates and client details (no lease required).
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className={cn(
                      'text-xs font-bold transition-colors',
                      automationType === 'invoice' ? 'text-[#008F83]' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    )}>
                      {automationType === 'invoice' ? '✓ Selected Category' : 'Click to select'}
                    </span>
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-all',
                      automationType === 'invoice'
                        ? 'bg-[#008F83] text-white shadow-xs'
                        : 'border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-transparent'
                    )}>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 1: CONFIGURATION FORM (LEASE AUTOMATION)            */}
          {/* ======================================================== */}
          {currentStep === 1 && automationType === 'lease' && (
            <div className="space-y-5">
              {/* 1. Select Lease */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <Building className="w-4 h-4 text-[#008F83]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    1. Target Tenancy Lease Linkage
                  </span>
                </div>

                <Select
                  label="Select Target Lease *"
                  value={selectedLeaseId}
                  onChange={(e) => setSelectedLeaseId(e.target.value)}
                  disabled={Boolean(preselectedLeaseId)}
                >
                  <option value="">-- Choose target tenancy lease ({leases.length} available) --</option>
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
                </Select>

                {/* Resolved / Editable Recipient Information Card */}
                {selectedLease && (
                  <div className="mt-3 p-4 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700 pb-2.5">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[#008F83]" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {hasCustomOverrides ? 'Customized Recipient & Billing Context' : 'Resolved Recipient & Lease Context'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasCustomOverrides ? (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            Customized
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Auto-Detected
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsEditingRecipient(!isEditingRecipient)}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-xl text-[#008F83] bg-[#008F83]/10 hover:bg-[#008F83]/20 transition-colors inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          {isEditingRecipient ? 'Done' : 'Edit Details'}
                        </button>
                      </div>
                    </div>

                    {isEditingRecipient ? (
                      <div className="space-y-3 pt-1 animate-in fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            label="Recipient / Tenant Name"
                            type="text"
                            value={customTenantName}
                            onChange={(e) => setCustomTenantName(e.target.value)}
                            placeholder="e.g. John Smith"
                          />
                          <Input
                            label="Recipient Email Address *"
                            type="email"
                            value={customTenantEmail}
                            onChange={(e) => setCustomTenantEmail(e.target.value)}
                            placeholder="e.g. tenant@example.com"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            label="Contact Phone (Optional)"
                            type="tel"
                            value={customTenantPhone}
                            onChange={(e) => setCustomTenantPhone(e.target.value)}
                            placeholder="e.g. +61 400 000 000"
                          />
                          <Input
                            label="Rent Amount ($)"
                            type="number"
                            min={0}
                            value={customRentAmount}
                            onChange={(e) => setCustomRentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Rent Amount"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
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
                            className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline"
                          >
                            Reset to Lease Defaults
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingRecipient(false)}
                            className="text-xs font-bold px-3 py-1 bg-[#008F83] text-white rounded-lg hover:bg-[#008F83]/90 transition-colors"
                          >
                            Done Editing
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Tenant:</span>
                          <strong className="text-slate-900 dark:text-white">{effectiveTenantName}</strong>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {effectiveTenantEmail ? (
                            <span className="font-mono text-[#008F83] font-medium truncate" title={effectiveTenantEmail}>
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
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-900 dark:text-white font-mono">{effectiveTenantPhone || 'Not provided'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-[#008F83] shrink-0" />
                          <span className="text-slate-900 dark:text-white font-semibold">{effectiveRent}</span>
                        </div>
                        <div className="col-span-2 flex items-start gap-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate" title={`${resolvedPropertyName} — ${resolvedPropertyAddress}`}>
                            <strong className="text-slate-900 dark:text-white">{resolvedPropertyName}</strong> • {resolvedPropertyAddress}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Action Type Selection */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <Send className="w-4 h-4 text-[#008F83]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    2. Automated Action Type
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLeaseActionType('generate_and_send_invoice')}
                    className={cn(
                      'p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-1.5 cursor-pointer',
                      leaseActionType === 'generate_and_send_invoice'
                        ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                    )}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                      <Receipt className="w-4 h-4 text-[#008F83]" />
                      Generate & Send Invoice
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                      Creates a fresh invoice for each billing period and sends PDF directly to tenant
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeaseActionType('send_lease')}
                    className={cn(
                      'p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-1.5 cursor-pointer',
                      leaseActionType === 'send_lease'
                        ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                    )}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                      <Send className="w-4 h-4 text-[#008F83]" />
                      Send Lease Document
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                      Emails official Lease Summary PDF agreement to tenant
                    </span>
                  </button>
                </div>
              </div>

              {/* 3. Invoice Reference Template & Issued By Details (if invoice action) */}
              {leaseActionType === 'generate_and_send_invoice' && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <FileCode className="w-4 h-4 text-[#008F83]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      3. Fixed Invoice Template & Issued By Profile
                    </span>
                  </div>

                  <Select
                    label="Fixed Invoice Template *"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                  >
                    {customTemplates.length > 0 && (
                      <optgroup label="Custom Workspace Blueprints">
                        {customTemplates.map((ct) => (
                          <option key={ct.id} value={ct.id}>
                            ★ {ct.name} ({ct.isDefault ? 'Workspace Default' : 'Custom Blueprint'})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Canonical Preset Designs">
                      {PREDEFINED_INVOICE_TEMPLATES.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name} ({tpl.badge})
                        </option>
                      ))}
                    </optgroup>
                  </Select>

                  {/* Issued By Profile Card */}
                  <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-[#008F83]" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Issued By Details (Sender & Landlord Profile)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasCustomIssuer ? (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            Custom Issuer
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-full">
                            Default Profile
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsEditingIssuer(!isEditingIssuer)}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-xl text-[#008F83] bg-[#008F83]/10 hover:bg-[#008F83]/20 transition-colors inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          {isEditingIssuer ? 'Done' : 'Edit Issued By'}
                        </button>
                      </div>
                    </div>

                    {isEditingIssuer ? (
                      <div className="space-y-3 pt-1 animate-in fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            label="Issuer / Company Name"
                            type="text"
                            value={issuerName}
                            onChange={(e) => setIssuerName(e.target.value)}
                            placeholder="e.g. Property Ledge Management"
                          />
                          <Input
                            label="Billing / Issuer Email"
                            type="email"
                            value={issuerEmail}
                            onChange={(e) => setIssuerEmail(e.target.value)}
                            placeholder="billing@propertyledge.com.au"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            label="Issuer Phone (Optional)"
                            type="tel"
                            value={issuerPhone}
                            onChange={(e) => setIssuerPhone(e.target.value)}
                            placeholder="+61 2 9000 0000"
                          />
                          <Select
                            label="Payment Due Terms"
                            value={paymentDueDays}
                            onChange={(e) => setPaymentDueDays(Number(e.target.value))}
                          >
                            <option value={0}>Due on Issue Date (Same Day)</option>
                            <option value={7}>Net 7 Days (Due in 7 days)</option>
                            <option value={14}>Net 14 Days (Default - Due in 14 days)</option>
                            <option value={21}>Net 21 Days (Due in 21 days)</option>
                            <option value={30}>Net 30 Days (Due in 30 days)</option>
                          </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            label="Issuer Address (Optional)"
                            type="text"
                            value={issuerAddress}
                            onChange={(e) => setIssuerAddress(e.target.value)}
                            placeholder="Level 5, 100 George St, Sydney NSW"
                          />
                          <Input
                            label="ABN / Tax ID (Optional)"
                            type="text"
                            value={issuerTaxId}
                            onChange={(e) => setIssuerTaxId(e.target.value)}
                            placeholder="ABN 12 345 678 901"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
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
                            className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline"
                          >
                            Reset to Default Profile
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingIssuer(false)}
                            className="text-xs font-bold px-3 py-1 bg-[#008F83] text-white rounded-lg hover:bg-[#008F83]/90 transition-colors"
                          >
                            Done Editing
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Issued By:</span>
                          <strong className="text-slate-900 dark:text-white">{issuerName || 'Property Ledge Management'}</strong>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-[#008F83] font-medium truncate" title={issuerEmail}>
                            {issuerEmail || 'billing@propertyledge.com.au'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-900 dark:text-white font-mono">{issuerPhone || 'Not provided'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#008F83] shrink-0" />
                          <span className="text-slate-900 dark:text-white">
                            {paymentDueDays === 0 ? 'Due on issue date' : `Due in ${paymentDueDays} days`}
                          </span>
                        </div>
                        {(issuerAddress || issuerTaxId) && (
                          <div className="col-span-2 flex items-start gap-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
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

              {/* 4. EMAIL TEMPLATE & BODY SECTION (LEASE) */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#008F83]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      4. Email Delivery & Message Body
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingEmailTemplate(!isEditingEmailTemplate)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-xl text-[#008F83] bg-[#008F83]/10 hover:bg-[#008F83]/20 transition-colors inline-flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    {isEditingEmailTemplate ? 'Done' : 'Customize Email'}
                  </button>
                </div>

                {isEditingEmailTemplate ? (
                  <div className="space-y-4 pt-1 animate-in fade-in">
                    <Input
                      label="Email Subject"
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Invoice {invoice_number} from {issuer_name}"
                    />

                    <Textarea
                      label="Email Message Body"
                      rows={4}
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      placeholder="Enter email body message..."
                      helpText="Supports placeholder tags listed below"
                    />

                    <Input
                      label="Google Drive Folder Link (Optional)"
                      type="url"
                      value={driveFolderUrl}
                      onChange={(e) => setDriveFolderUrl(e.target.value)}
                      placeholder="https://drive.google.com/drive/folders/..."
                    />

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs space-y-1.5">
                      <span className="font-bold text-slate-900 dark:text-white block text-[11px]">Available Placeholders:</span>
                      <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                        <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{'{first_name}'}</span>
                        <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{'{tenant_name}'}</span>
                        <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{'{invoice_number}'}</span>
                        <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{'{amount}'}</span>
                        <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{'{due_date}'}</span>
                        <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{'{issuer_name}'}</span>
                        <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{'{property_address}'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Subject:</span>
                      <span className="text-slate-900 dark:text-white font-semibold truncate">{emailSubject}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 italic leading-relaxed">
                      &quot;{emailMessage.split('\n')[0]}...&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* 5. Recurring Schedule Options */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#008F83]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      5. Recurring Delivery Schedule
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>AU Time: {auTime}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setScheduleType('monthly')}
                    className={cn(
                      'p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-1 cursor-pointer',
                      scheduleType === 'monthly'
                        ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                      <Calendar className="w-4 h-4 text-[#008F83]" />
                      Monthly Schedule
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">Repeats every month on set day</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScheduleType('after_start')}
                    className={cn(
                      'p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-1 cursor-pointer',
                      scheduleType === 'after_start'
                        ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                      <Clock className="w-4 h-4 text-[#008F83]" />
                      After Lease Start
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">Triggers X months after start</span>
                  </button>
                </div>

                {scheduleType === 'monthly' && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                    <Select
                      label="Billing / Issue Day of Month *"
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(Number(e.target.value))}
                    >
                      {[...Array(28)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Day {i + 1} of each month
                        </option>
                      ))}
                    </Select>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <Clock className="w-3.5 h-3.5 text-[#008F83] shrink-0" />
                      <span>Evaluated & dispatched automatically in the <strong>7:00 AM AU</strong> daily morning queue.</span>
                    </div>
                  </div>
                )}

                {scheduleType === 'after_start' && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                    <Input
                      label="Months After Lease Start *"
                      type="number"
                      min={1}
                      max={60}
                      value={offsetMonths}
                      onChange={(e) => setOffsetMonths(Number(e.target.value))}
                    />
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <Clock className="w-3.5 h-3.5 text-[#008F83] shrink-0" />
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
            <div className="space-y-5">
              {/* 1. Select Template */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <FileCode className="w-4 h-4 text-[#008F83]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    1. Fixed Invoice Template
                  </span>
                </div>

                <Select
                  label="Fixed Invoice Template *"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  {PREDEFINED_INVOICE_TEMPLATES.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.badge})
                    </option>
                  ))}
                </Select>
              </div>

              {/* 2. Customer Information */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <User className="w-4 h-4 text-[#008F83]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    2. Recipient & Billing Information
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Customer / Company Name *"
                    type="text"
                    placeholder="e.g. Acme Corporation"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                  <Input
                    label="Customer Email Address *"
                    type="email"
                    placeholder="billing@acme.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Customer Phone (Optional)"
                    type="tel"
                    placeholder="+61 400 000 000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                  <Input
                    label="Billing Address (Optional)"
                    type="text"
                    placeholder="123 Business Way, Sydney"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      label="Service Description *"
                      type="text"
                      placeholder="e.g. Monthly Maintenance & Retainer"
                      value={invoiceDescription}
                      onChange={(e) => setInvoiceDescription(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      label="Amount ($ AUD) *"
                      type="number"
                      min={1}
                      placeholder="1000"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Issued By Details (Sender Profile) */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#008F83]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      3. Issued By Details (Sender & Business Profile)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasCustomIssuer ? (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        Custom Issuer
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-full">
                        Default Profile
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsEditingIssuer(!isEditingIssuer)}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-xl text-[#008F83] bg-[#008F83]/10 hover:bg-[#008F83]/20 transition-colors inline-flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      {isEditingIssuer ? 'Done' : 'Edit Issued By'}
                    </button>
                  </div>
                </div>

                {isEditingIssuer ? (
                  <div className="space-y-3 pt-1 animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label="Issuer / Company Name"
                        type="text"
                        value={issuerName}
                        onChange={(e) => setIssuerName(e.target.value)}
                        placeholder="e.g. Property Ledge Management"
                      />
                      <Input
                        label="Billing / Issuer Email"
                        type="email"
                        value={issuerEmail}
                        onChange={(e) => setIssuerEmail(e.target.value)}
                        placeholder="billing@propertyledge.com.au"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label="Issuer Phone (Optional)"
                        type="tel"
                        value={issuerPhone}
                        onChange={(e) => setIssuerPhone(e.target.value)}
                        placeholder="+61 2 9000 0000"
                      />
                      <Select
                        label="Payment Due Terms"
                        value={paymentDueDays}
                        onChange={(e) => setPaymentDueDays(Number(e.target.value))}
                      >
                        <option value={0}>Due on Issue Date (Same Day)</option>
                        <option value={7}>Net 7 Days (Due in 7 days)</option>
                        <option value={14}>Net 14 Days (Default - Due in 14 days)</option>
                        <option value={21}>Net 21 Days (Due in 21 days)</option>
                        <option value={30}>Net 30 Days (Due in 30 days)</option>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label="Issuer Address (Optional)"
                        type="text"
                        value={issuerAddress}
                        onChange={(e) => setIssuerAddress(e.target.value)}
                        placeholder="Level 5, 100 George St, Sydney NSW"
                      />
                      <Input
                        label="ABN / Tax ID (Optional)"
                        type="text"
                        value={issuerTaxId}
                        onChange={(e) => setIssuerTaxId(e.target.value)}
                        placeholder="ABN 12 345 678 901"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
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
                        className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline"
                      >
                        Reset to Default Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingIssuer(false)}
                        className="text-xs font-bold px-3 py-1 bg-[#008F83] text-white rounded-lg hover:bg-[#008F83]/90 transition-colors"
                      >
                        Done Editing
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Issued By:</span>
                      <strong className="text-slate-900 dark:text-white">{issuerName || 'Property Ledge Management'}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[#008F83] font-medium truncate" title={issuerEmail}>
                        {issuerEmail || 'billing@propertyledge.com.au'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-900 dark:text-white font-mono">{issuerPhone || 'Not provided'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#008F83] shrink-0" />
                      <span className="text-slate-900 dark:text-white">
                        {paymentDueDays === 0 ? 'Due on issue date' : `Due in ${paymentDueDays} days`}
                      </span>
                    </div>
                    {(issuerAddress || issuerTaxId) && (
                      <div className="col-span-2 flex items-start gap-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>
                          {issuerAddress} {issuerTaxId ? `• ${issuerTaxId}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. EMAIL TEMPLATE & BODY SECTION (STANDALONE) */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#008F83]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      4. Email Delivery & Message Body
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingEmailTemplate(!isEditingEmailTemplate)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-xl text-[#008F83] bg-[#008F83]/10 hover:bg-[#008F83]/20 transition-colors inline-flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    {isEditingEmailTemplate ? 'Done' : 'Customize Email'}
                  </button>
                </div>

                {isEditingEmailTemplate ? (
                  <div className="space-y-4 pt-1 animate-in fade-in">
                    <Input
                      label="Email Subject"
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Invoice {invoice_number} from {issuer_name}"
                    />

                    <Textarea
                      label="Email Message Body"
                      rows={4}
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      placeholder="Enter email body message..."
                      helpText="Supports placeholder tags listed below"
                    />

                    <Input
                      label="Google Drive Folder Link (Optional)"
                      type="url"
                      value={driveFolderUrl}
                      onChange={(e) => setDriveFolderUrl(e.target.value)}
                      placeholder="https://drive.google.com/drive/folders/..."
                    />

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs space-y-1.5">
                      <span className="font-bold text-slate-900 dark:text-white block text-[11px]">Available Placeholders:</span>
                      <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                        <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{'{first_name}'}</span>
                        <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{'{recipient_name}'}</span>
                        <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{'{invoice_number}'}</span>
                        <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{'{amount}'}</span>
                        <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{'{due_date}'}</span>
                        <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{'{issuer_name}'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Subject:</span>
                      <span className="text-slate-900 dark:text-white font-semibold truncate">{emailSubject}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 italic leading-relaxed">
                      &quot;{emailMessage.split('\n')[0]}...&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* 5. Schedule Options */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <Clock className="w-4 h-4 text-[#008F83]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    5. Recurring Schedule Options
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                  <Select
                    label="Billing / Issue Day of Month *"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                  >
                    {[...Array(28)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Day {i + 1} of each month
                      </option>
                    ))}
                  </Select>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <Clock className="w-3.5 h-3.5 text-[#008F83] shrink-0" />
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
              <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Automation Type</span>
                  <span className={cn(
                    'text-xs font-bold px-3 py-1 rounded-full border',
                    automationType === 'lease'
                      ? 'bg-[#008F83]/10 text-[#008F83] border-[#008F83]/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  )}>
                    {automationType === 'lease' ? 'Lease Automation' : 'Standalone Invoice Automation'}
                  </span>
                </div>

                {automationType === 'lease' ? (
                  <>
                    <div className="space-y-2 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      <div className="font-bold text-[#008F83] flex items-center justify-between mb-2 text-[11px] uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" /> Recipient Details (Bill To)
                        </span>
                        {hasCustomOverrides && (
                          <span className="text-[10px] lowercase font-normal bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                            (customized)
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Recipient Tenant:</span>
                        <strong className="text-slate-900 dark:text-white">{effectiveTenantName}</strong>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Email Address:</span>
                        <span className="font-mono text-[#008F83] font-bold">{effectiveTenantEmail || 'No email provided'}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Phone Number:</span>
                        <span className="font-mono text-slate-900 dark:text-white">{effectiveTenantPhone || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Rent Amount:</span>
                        <span className="font-bold text-[#008F83]">{effectiveRent}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Property & Address:</span>
                        <span className="text-slate-900 dark:text-white text-right">{resolvedPropertyName} ({resolvedPropertyAddress})</span>
                      </div>
                    </div>

                    {/* Issued By Review Card */}
                    {leaseActionType === 'generate_and_send_invoice' && (
                      <div className="space-y-2 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                        <div className="font-bold text-[#008F83] flex items-center justify-between mb-2 text-[11px] uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5" /> Issued By Details (Sender & Landlord)
                          </span>
                          {hasCustomIssuer && (
                            <span className="text-[10px] lowercase font-normal bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                              (customized)
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span className="text-slate-500 dark:text-slate-400">Issuer Name:</span>
                          <strong className="text-slate-900 dark:text-white">{issuerName}</strong>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span className="text-slate-500 dark:text-slate-400">Billing Email:</span>
                          <span className="font-mono text-[#008F83] font-bold">{issuerEmail}</span>
                        </div>
                        {issuerPhone && (
                          <div className="flex justify-between py-0.5">
                            <span className="text-slate-500 dark:text-slate-400">Phone Number:</span>
                            <span className="font-mono text-slate-900 dark:text-white">{issuerPhone}</span>
                          </div>
                        )}
                        {issuerAddress && (
                          <div className="flex justify-between py-0.5">
                            <span className="text-slate-500 dark:text-slate-400">Address:</span>
                            <span className="text-slate-900 dark:text-white">{issuerAddress}</span>
                          </div>
                        )}
                        {issuerTaxId && (
                          <div className="flex justify-between py-0.5">
                            <span className="text-slate-500 dark:text-slate-400">ABN / Tax ID:</span>
                            <span className="font-mono text-slate-900 dark:text-white">{issuerTaxId}</span>
                          </div>
                        )}
                        <div className="flex justify-between py-0.5">
                          <span className="text-slate-500 dark:text-slate-400">Payment Terms:</span>
                          <strong className="text-slate-900 dark:text-white">
                            {paymentDueDays === 0 ? 'Due on issue date' : `Due in ${paymentDueDays} days`}
                          </strong>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Scheduled Action:</span>
                      <strong className="text-slate-900 dark:text-white">
                        {leaseActionType === 'generate_and_send_invoice' ? 'Generate & Send Invoice' : 'Send Lease Document'}
                      </strong>
                    </div>

                    {leaseActionType === 'generate_and_send_invoice' && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Invoice Template:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{selectedTemplate?.name || 'Default Rental Template'}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-2 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      <div className="font-bold text-[#008F83] flex items-center gap-1.5 mb-2 text-[11px] uppercase tracking-wider">
                        <User className="w-3.5 h-3.5" /> Customer & Billing Information (Bill To)
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Customer Name:</span>
                        <strong className="text-slate-900 dark:text-white">{customerName}</strong>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Recipient Email:</span>
                        <span className="font-mono text-[#008F83] font-bold">{customerEmail}</span>
                      </div>
                      {customerPhone && (
                        <div className="flex justify-between py-0.5">
                          <span className="text-slate-500 dark:text-slate-400">Phone Number:</span>
                          <span className="font-mono text-slate-900 dark:text-white">{customerPhone}</span>
                        </div>
                      )}
                      {customerAddress && (
                        <div className="flex justify-between py-0.5">
                          <span className="text-slate-500 dark:text-slate-400">Billing Address:</span>
                          <span className="text-slate-900 dark:text-white">{customerAddress}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Charge Amount:</span>
                        <strong className="text-slate-900 dark:text-white">${Number(invoiceAmount).toLocaleString()} AUD</strong>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Service Description:</span>
                        <span className="text-slate-900 dark:text-white">{invoiceDescription}</span>
                      </div>
                    </div>

                    {/* Standalone Issued By Review Card */}
                    <div className="space-y-2 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      <div className="font-bold text-[#008F83] flex items-center justify-between mb-2 text-[11px] uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5" /> Issued By Details (Sender & Business)
                        </span>
                        {hasCustomIssuer && (
                          <span className="text-[10px] lowercase font-normal bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                            (customized)
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Issuer Name:</span>
                        <strong className="text-slate-900 dark:text-white">{issuerName}</strong>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Billing Email:</span>
                        <span className="font-mono text-[#008F83] font-bold">{issuerEmail}</span>
                      </div>
                      {issuerPhone && (
                        <div className="flex justify-between py-0.5">
                          <span className="text-slate-500 dark:text-slate-400">Phone Number:</span>
                          <span className="font-mono text-slate-900 dark:text-white">{issuerPhone}</span>
                        </div>
                      )}
                      {issuerAddress && (
                        <div className="flex justify-between py-0.5">
                          <span className="text-slate-500 dark:text-slate-400">Address:</span>
                          <span className="text-slate-900 dark:text-white">{issuerAddress}</span>
                        </div>
                      )}
                      {issuerTaxId && (
                        <div className="flex justify-between py-0.5">
                          <span className="text-slate-500 dark:text-slate-400">ABN / Tax ID:</span>
                          <span className="font-mono text-slate-900 dark:text-white">{issuerTaxId}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Payment Terms:</span>
                        <strong className="text-slate-900 dark:text-white">
                          {paymentDueDays === 0 ? 'Due on issue date' : `Due in ${paymentDueDays} days`}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Invoice Template:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{selectedTemplate?.name || 'Default Commercial Template'}</span>
                    </div>
                  </>
                )}

                {/* Email Delivery Review Box */}
                <div className="space-y-2 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="font-bold text-[#008F83] flex items-center justify-between mb-2 text-[11px] uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> Email Delivery & Template
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500 dark:text-slate-400">Subject:</span>
                    <strong className="text-slate-900 dark:text-white truncate max-w-[260px]">{emailSubject}</strong>
                  </div>
                  {driveFolderUrl && (
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500 dark:text-slate-400">Drive Link:</span>
                      <span className="font-mono text-[#008F83] truncate max-w-[260px]">{driveFolderUrl}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 italic">
                    &quot;{emailMessage.split('\n')[0]}...&quot;
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs border-t border-slate-200 dark:border-slate-700 pt-3">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Recurring Schedule:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {scheduleType === 'monthly'
                      ? `Every month on the ${dayOfMonth}${dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th'} (7:00 AM AU Daily Run)`
                      : `${offsetMonths} month${offsetMonths > 1 ? 's' : ''} after lease start (7:00 AM AU Daily Run)`}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Accounting Rule:</strong> Each scheduled execution generates a <em>brand new finalized invoice</em> for the current billing period and emails the recipient directly. Historical invoices remain untouched.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
          {currentStep === 0 ? (
            <div>
              <Button variant="ghost" onClick={onClose} className="text-slate-500 dark:text-slate-400 text-xs">
                Cancel
              </Button>
            </div>
          ) : currentStep === 1 ? (
            <>
              <Button
                variant="ghost"
                onClick={() => (preselectedLeaseId ? onClose() : setCurrentStep(0))}
                className="text-slate-500 dark:text-slate-400 text-xs gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Button>
              <Button
                variant="primary"
                onClick={() => setCurrentStep(2)}
                className="text-xs font-bold gap-1 bg-[#008F83] hover:bg-[#008F83]/90 text-white"
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
                className="text-slate-500 dark:text-slate-400 text-xs gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Button>
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={loading}
                className="gap-1.5 font-bold shadow-xs text-xs bg-[#008F83] hover:bg-[#008F83]/90 text-white"
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
