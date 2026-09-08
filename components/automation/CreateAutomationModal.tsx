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
} from 'lucide-react';
import { Button } from '@/components/admin/ui';
import { fetchAllWorkspaceLeases } from '@/app/actions/dashboard';
import {
  createLeaseAutomationAction,
  createStandaloneInvoiceAutomationAction,
  fetchInvoiceTemplatesAction,
} from '@/app/actions/automations';
import { AutomationScheduleType, AutomationType } from '@/modules/automation';
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
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Lease Automation Fields
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>(preselectedLeaseId || '');
  const [leaseActionType, setLeaseActionType] = useState<string>('generate_and_send_invoice');

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
  const [timeOfDay, setTimeOfDay] = useState<string>('09:00');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(preselectedLeaseId ? 1 : 0);
      setError(null);

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

      // Load invoice templates
      fetchInvoiceTemplatesAction().then((tpls: any[]) => {
        setTemplates(tpls || []);
        const defaultTpl = tpls.find((t) => t.is_default);
        if (defaultTpl) setSelectedTemplateId(defaultTpl.id);
      });
    }
  }, [isOpen, preselectedLeaseId]);

  if (!isOpen) return null;

  const selectedLease = leases.find((l) => l.id === selectedLeaseId);
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

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

  const handleCreate = async () => {
    setError(null);
    setLoading(true);

    try {
      let scheduleConfig: any = {};
      if (scheduleType === 'monthly') {
        scheduleConfig = {
          dayOfMonth: Number(dayOfMonth) || 1,
          timeOfDay,
        };
      } else if (scheduleType === 'after_start') {
        scheduleConfig = {
          offsetMonths: Number(offsetMonths) || 12,
          timeOfDay,
        };
      }

      if (automationType === 'lease') {
        if (!selectedLeaseId) {
          throw new Error('Please select a target lease.');
        }

        const res = await createLeaseAutomationAction({
          leaseId: selectedLeaseId,
          actionType: leaseActionType,
          invoiceTemplateId: leaseActionType === 'generate_and_send_invoice' ? selectedTemplateId || undefined : undefined,
          scheduleType,
          scheduleConfig,
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

                {/* Resolved Recipient Information Card */}
                {selectedLease && (
                  <div className="mt-2.5 p-3.5 bg-admin-surface-subtle/80 border border-admin-border rounded-xl space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-admin-border pb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-admin-primary" />
                        <span className="text-xs font-bold text-admin-foreground">Resolved Recipient & Lease Context</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Auto-Detected
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-admin-muted font-medium">Tenant:</span>
                        <strong className="text-admin-foreground">{resolvedTenantName}</strong>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-admin-muted shrink-0" />
                        <span className="font-mono text-admin-primary font-medium truncate" title={resolvedTenantEmail}>
                          {resolvedTenantEmail}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-admin-muted shrink-0" />
                        <span className="text-admin-foreground font-mono">{resolvedTenantPhone}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-admin-foreground font-semibold">{resolvedRent}</span>
                      </div>
                      <div className="col-span-2 flex items-start gap-1.5 pt-0.5 border-t border-admin-border/50">
                        <MapPin className="w-3.5 h-3.5 text-admin-muted shrink-0 mt-0.5" />
                        <span className="text-[11px] text-admin-muted truncate" title={`${resolvedPropertyName} — ${resolvedPropertyAddress}`}>
                          <strong className="text-admin-foreground">{resolvedPropertyName}</strong> • {resolvedPropertyAddress}
                        </span>
                      </div>
                    </div>
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

              {/* 3. Invoice Reference Template (if invoice action) */}
              {leaseActionType === 'generate_and_send_invoice' && (
                <div>
                  <label className="block text-xs font-bold text-admin-foreground mb-1.5">
                    3. Invoice Template / Reference
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary"
                  >
                    <option value="">Default Rental Invoice Template</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} {tpl.is_default ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 4. Schedule Options */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-admin-foreground">
                  4. Schedule Options
                </label>
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
                  <div className="grid grid-cols-2 gap-3 p-3 bg-admin-surface-subtle border border-admin-border rounded-xl">
                    <div>
                      <label className="block text-xs font-bold text-admin-muted mb-1">Day of Month</label>
                      <select
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(Number(e.target.value))}
                        className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-admin-foreground"
                      >
                        {[...Array(28)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-admin-muted mb-1">Delivery Time</label>
                      <input
                        type="time"
                        value={timeOfDay}
                        onChange={(e) => setTimeOfDay(e.target.value)}
                        className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-admin-foreground"
                      />
                    </div>
                  </div>
                )}

                {scheduleType === 'after_start' && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-admin-surface-subtle border border-admin-border rounded-xl">
                    <div>
                      <label className="block text-xs font-bold text-admin-muted mb-1">Months After Start</label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={offsetMonths}
                        onChange={(e) => setOffsetMonths(Number(e.target.value))}
                        className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-admin-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-admin-muted mb-1">Delivery Time</label>
                      <input
                        type="time"
                        value={timeOfDay}
                        onChange={(e) => setTimeOfDay(e.target.value)}
                        className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-admin-foreground"
                      />
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
                  1. Select Invoice Template / Reference
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary"
                >
                  <option value="">Default Commercial Template</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} {tpl.is_default ? '(Default)' : ''}
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

              {/* 3. Schedule Options */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-admin-foreground">
                  3. Schedule Options
                </label>
                <div className="grid grid-cols-2 gap-3 p-3 bg-admin-surface-subtle border border-admin-border rounded-xl">
                  <div>
                    <label className="block text-xs font-bold text-admin-muted mb-1">Day of Month</label>
                    <select
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(Number(e.target.value))}
                      className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-admin-foreground"
                    >
                      {[...Array(28)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-admin-muted mb-1">Delivery Time</label>
                    <input
                      type="time"
                      value={timeOfDay}
                      onChange={(e) => setTimeOfDay(e.target.value)}
                      className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-admin-foreground"
                    />
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
                      <div className="font-bold text-admin-foreground flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider text-admin-primary">
                        <User className="w-3.5 h-3.5" /> Recipient Details (From Lease)
                      </div>
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Recipient Tenant:</span>
                        <strong className="text-admin-foreground">{resolvedTenantName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Email Address:</span>
                        <span className="font-mono text-admin-primary font-bold">{resolvedTenantEmail}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Phone Number:</span>
                        <span className="font-mono text-admin-foreground">{resolvedTenantPhone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Property & Address:</span>
                        <span className="text-admin-foreground text-right">{resolvedPropertyName} ({resolvedPropertyAddress})</span>
                      </div>
                    </div>

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
                        <User className="w-3.5 h-3.5" /> Customer & Billing Information
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

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-admin-muted font-medium">Invoice Template:</span>
                      <span className="font-bold text-admin-foreground">{selectedTemplate?.name || 'Default Commercial Template'}</span>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between text-xs border-t border-admin-border pt-2.5">
                  <span className="text-admin-muted font-medium">Recurring Schedule:</span>
                  <span className="font-bold text-admin-foreground">
                    {scheduleType === 'monthly'
                      ? `Every month on the ${dayOfMonth} at ${timeOfDay}`
                      : `${offsetMonths} months after lease start at ${timeOfDay}`}
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
