'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CalendarRange,
  Layers,
  Building,
  User,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  FileText,
  Mail,
  Send,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Hash,
} from 'lucide-react';
import { Button, Input, Select, Textarea, useToast } from '@/components/admin/ui';
import { BulkInvoiceDTO, InvoiceDTO, InvoiceTemplateDTO } from '@/modules/invoices';
import {
  PREDEFINED_INVOICE_TEMPLATES,
  PredefinedInvoiceTemplate,
  getPredefinedTemplateById,
} from '@/modules/invoices/domain/constants/predefined-templates';
import { formatCurrency } from '@/modules/invoices/domain/value-objects/currency';
import { fetchDashboardProperties, fetchAllWorkspaceLeases, fetchDashboardLeases } from '@/app/actions/dashboard';
import { createBulkInvoicesAction, fetchInvoiceTemplatesAction } from '@/app/actions/invoices';
import { sendAutomationTestEmailAction } from '@/app/actions/automations';
import { getAuTodayString, getAuDateParts, formatAuDisplayDate, createAuDate } from '@/lib/format/australian-time';
import { cn } from '@/lib/utils';

interface BulkInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export function BulkInvoiceModal({ isOpen, onClose, onSuccess }: BulkInvoiceModalProps) {
  const { toast } = useToast();

  // Mode: 'lease' (from existing lease) or 'standalone' (custom client)
  const [targetType, setTargetType] = useState<'lease' | 'standalone'>('lease');

  // Loading and entities
  const [properties, setProperties] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [customTemplates, setCustomTemplates] = useState<InvoiceTemplateDTO[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Selected Entities
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedLeaseId, setSelectedLeaseId] = useState('');

  // Customer / Recipient fields
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Multi-Month Configuration
  const [startMonth, setStartMonth] = useState(() => {
    const today = getAuDateParts(new Date());
    return `${today.year}-${String(today.month).padStart(2, '0')}`;
  });
  const [monthsCount, setMonthsCount] = useState<number>(6);
  const [description, setDescription] = useState('Monthly Rental Billing');
  const [amountPerMonth, setAmountPerMonth] = useState<number>(2500);
  const [taxRate, setTaxRate] = useState<number>(0); // 0% or 0.10 (GST 10%)
  const [dueDays, setDueDays] = useState<number>(7);
  const [autoIssue, setAutoIssue] = useState<boolean>(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('template_classic');

  // Test Email State
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showTestEmailBox, setShowTestEmailBox] = useState(false);

  // Fetch properties, leases, templates on modal open
  useEffect(() => {
    if (!isOpen) return;

    const load = async () => {
      setLoadingData(true);
      try {
        const props = await fetchDashboardProperties();
        if (Array.isArray(props)) setProperties(props);
        else if (props && (props as any).data && Array.isArray((props as any).data)) setProperties((props as any).data);
      } catch (e) {
        console.error('Error loading properties for bulk invoice:', e);
      }

      try {
        let leaseData = await fetchAllWorkspaceLeases();
        if (!Array.isArray(leaseData) || leaseData.length === 0) {
          leaseData = await fetchDashboardLeases();
        }
        if (Array.isArray(leaseData)) setLeases(leaseData);
        else if (leaseData && (leaseData as any).data && Array.isArray((leaseData as any).data)) setLeases((leaseData as any).data);
      } catch (e) {
        console.error('Error loading leases for bulk invoice:', e);
      }

      try {
        const cTemplates = await fetchInvoiceTemplatesAction();
        if (Array.isArray(cTemplates)) setCustomTemplates(cTemplates);
      } catch (e) {
        console.error('Error loading templates:', e);
      } finally {
        setLoadingData(false);
      }
    };

    load();
  }, [isOpen]);

  // Filtered leases by property
  const availableLeases = useMemo(() => {
    if (!selectedPropertyId) return leases;
    return leases.filter((l) => l.property_id === selectedPropertyId || l.propertyId === selectedPropertyId);
  }, [leases, selectedPropertyId]);

  // Auto-fill recipient & rent when lease is selected
  useEffect(() => {
    if (!selectedLeaseId) return;
    const l = leases.find((x) => x.id === selectedLeaseId);
    if (l) {
      if (l.property_id || l.propertyId) {
        setSelectedPropertyId(l.property_id || l.propertyId);
      }
      const tenant = l.tenant || (Array.isArray(l.tenants) && l.tenants[0]) || null;
      const tName = tenant?.name || tenant?.full_name || l.tenant_name || '';
      const tEmail = tenant?.email || l.tenant_email || '';
      const tPhone = tenant?.phone || l.tenant_phone || '';
      const tAddress = l.property_address || l.property?.address || '';

      if (tName) setCustomerName(tName);
      if (tEmail) setCustomerEmail(tEmail);
      if (tPhone) setCustomerPhone(tPhone);
      if (tAddress) setCustomerAddress(tAddress);

      // Rent amount
      const rent = Number(l.rent_amount || l.rentAmount || 0);
      if (rent > 0) {
        const rentFreq = (l.rent_frequency || l.rentFrequency || 'monthly').toLowerCase();
        let monthly = rent;
        if (rentFreq === 'weekly') monthly = (rent * 52) / 12;
        else if (rentFreq === 'fortnightly') monthly = (rent * 26) / 12;
        else if (rentFreq === 'quarterly') monthly = rent / 3;
        else if (rentFreq === 'annually') monthly = rent / 12;
        setAmountPerMonth(Math.round(monthly * 100) / 100);
      }
    }
  }, [selectedLeaseId, leases]);

  // Auto-fill property address when property selected
  useEffect(() => {
    if (!selectedPropertyId) return;
    const p = properties.find((x) => x.id === selectedPropertyId);
    if (p && !customerAddress) {
      setCustomerAddress(p.address || p.name || '');
    }
  }, [selectedPropertyId, properties, customerAddress]);

  // Calculated Schedule Preview Items
  const scheduleItems = useMemo(() => {
    if (!startMonth) return [];
    const [startYear, startMonthNum] = startMonth.split('-').map(Number);
    if (!startYear || !startMonthNum) return [];

    const items: Array<{
      monthIndex: number;
      monthLabel: string;
      issueDate: string;
      dueDate: string;
      periodStart: string;
      periodEnd: string;
      subtotal: number;
      tax: number;
      total: number;
    }> = [];

    const count = Math.min(24, Math.max(1, monthsCount || 1));
    const unitPrice = Math.max(0, amountPerMonth || 0);
    const taxAmt = Math.round(unitPrice * taxRate * 100) / 100;
    const totalLine = unitPrice + taxAmt;

    for (let i = 0; i < count; i++) {
      const cycleDate = new Date(startYear, startMonthNum - 1 + i, 1);
      const cycleYear = cycleDate.getFullYear();
      const cycleMonthStr = String(cycleDate.getMonth() + 1).padStart(2, '0');
      const monthLabel = cycleDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      const issueDate = `${cycleYear}-${cycleMonthStr}-01`;
      const dueDateObj = new Date(cycleDate);
      dueDateObj.setDate(dueDateObj.getDate() + (dueDays || 7));
      const dueDate = dueDateObj.toISOString().split('T')[0];

      const endBillingObj = new Date(cycleYear, cycleDate.getMonth() + 1, 0);
      const periodEnd = endBillingObj.toISOString().split('T')[0];

      items.push({
        monthIndex: i + 1,
        monthLabel,
        issueDate,
        dueDate,
        periodStart: issueDate,
        periodEnd,
        subtotal: unitPrice,
        tax: taxAmt,
        total: totalLine,
      });
    }

    return items;
  }, [startMonth, monthsCount, amountPerMonth, taxRate, dueDays]);

  const totalBatchAmount = useMemo(() => {
    return scheduleItems.reduce((acc, it) => acc + it.total, 0);
  }, [scheduleItems]);

  const handleTestEmail = async () => {
    const targetRecipient = testEmailAddress.trim() || customerEmail.trim();
    if (!targetRecipient) {
      toast({
        title: 'Recipient Required',
        description: 'Please enter a test email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingTest(true);
    try {
      const firstItem = scheduleItems[0];
      const res = await sendAutomationTestEmailAction({
        automationType: 'invoice',
        testRecipient: targetRecipient,
        customerName: customerName.trim() || 'Valued Recipient',
        customerEmail: targetRecipient,
        customerAddress: customerAddress.trim() || undefined,
        description: `${description} — ${firstItem ? firstItem.monthLabel : 'Sample Month'}`,
        amount: firstItem ? firstItem.total : amountPerMonth,
        currency: 'AUD',
        invoiceTemplateId: selectedTemplateId || 'template_classic',
      });

      if (res.success) {
        toast({
          title: 'Test Email Sent',
          description: `Preview invoice delivered to ${targetRecipient}.`,
        });
      } else {
        toast({
          title: 'Test Email Notice',
          description: res.error || 'Failed to dispatch test email.',
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      toast({
        title: 'Test Email Failed',
        description: e.message || 'Error sending test email.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() && !selectedLeaseId) {
      toast({
        title: 'Missing Customer',
        description: 'Please select a lease or enter a customer / recipient name.',
        variant: 'destructive',
      });
      return;
    }

    if (amountPerMonth <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Monthly invoice amount must be greater than $0.',
        variant: 'destructive',
      });
      return;
    }

    if (monthsCount < 1 || monthsCount > 24) {
      toast({
        title: 'Invalid Month Count',
        description: 'Please select between 1 and 24 months to generate.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const dto: BulkInvoiceDTO = {
        propertyId: selectedPropertyId || null,
        leaseId: selectedLeaseId || null,
        customerName: customerName.trim() || 'Client',
        customerEmail: customerEmail.trim() || null,
        customerAddress: customerAddress.trim() || null,
        customerPhone: customerPhone.trim() || null,
        recipientName: customerName.trim() || 'Client',
        recipientEmail: customerEmail.trim() || null,
        recipientAddress: customerAddress.trim() || null,
        recipientPhone: customerPhone.trim() || null,
        currency: 'AUD',
        description: description.trim() || 'Monthly Rent Payment',
        monthsCount,
        startMonth,
        amountPerMonth,
        dueDays,
        taxRate,
        templateId: selectedTemplateId || null,
        autoIssue,
      };

      const res = await createBulkInvoicesAction(dto);

      if (!res.success) {
        toast({
          title: 'Generation Failed',
          description: res.error || 'Failed to create bulk invoices.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Bulk Invoices Generated',
        description: `Successfully created ${res.createdCount} monthly invoices for ${customerName || 'client'}.`,
      });

      onSuccess(res.createdCount || monthsCount);
      onClose();
    } catch (err: any) {
      toast({
        title: 'Error Generating Invoices',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-admin-surface border border-admin-border rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-admin-border flex items-center justify-between bg-admin-surface-subtle/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#008F83]/10 text-[#008F83] border border-[#008F83]/20 flex items-center justify-center shrink-0">
              <CalendarRange className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-admin-foreground flex items-center gap-2">
                Generate Multi-Month Invoices
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#008F83]/15 text-[#008F83] border border-[#008F83]/20">
                  Bulk Batch Engine
                </span>
              </h3>
              <p className="text-xs text-admin-muted font-medium">
                Create scheduled recurring monthly rent invoices in advance (1 to 24 months) with automated dates and Australian GST.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-admin-muted hover:text-admin-foreground p-2 rounded-lg hover:bg-admin-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Target Type Selector */}
          <div className="flex items-center gap-3 p-1.5 bg-admin-surface-subtle border border-admin-border rounded-xl">
            <button
              type="button"
              onClick={() => setTargetType('lease')}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2',
                targetType === 'lease'
                  ? 'bg-admin-surface text-[#008F83] shadow-xs border border-admin-border'
                  : 'text-admin-muted hover:text-admin-foreground'
              )}
            >
              <Building className="w-4 h-4" /> Link to Property & Lease
            </button>
            <button
              type="button"
              onClick={() => setTargetType('standalone')}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2',
                targetType === 'standalone'
                  ? 'bg-admin-surface text-[#008F83] shadow-xs border border-admin-border'
                  : 'text-admin-muted hover:text-admin-foreground'
              )}
            >
              <User className="w-4 h-4" /> Custom Standalone Client
            </button>
          </div>

          {/* Section 1: Property / Lease or Client Info */}
          <div className="bg-admin-surface-subtle/60 border border-admin-border rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-admin-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#008F83]" /> Recipient & Property Association
            </h4>

            {targetType === 'lease' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-admin-muted block mb-1">
                    Select Property <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => {
                      setSelectedPropertyId(e.target.value);
                      setSelectedLeaseId('');
                    }}
                    className="w-full bg-admin-surface border border-admin-border rounded-lg px-3 py-2 text-admin-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-[#008F83]"
                  >
                    <option value="">-- Choose Property --</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.address || 'No address'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-admin-muted block mb-1">
                    Select Active Lease / Tenant <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedLeaseId}
                    onChange={(e) => setSelectedLeaseId(e.target.value)}
                    disabled={!selectedPropertyId || availableLeases.length === 0}
                    className="w-full bg-admin-surface border border-admin-border rounded-lg px-3 py-2 text-admin-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-[#008F83] disabled:opacity-50"
                  >
                    <option value="">
                      {!selectedPropertyId
                        ? '-- Select a property first --'
                        : availableLeases.length === 0
                        ? '-- No leases found for this property --'
                        : '-- Choose Lease --'}
                    </option>
                    {availableLeases.map((l) => {
                      const tName = l.tenant?.name || l.tenant?.full_name || l.tenant_name || 'Tenant';
                      const rent = l.rent_amount || l.rentAmount || 0;
                      return (
                        <option key={l.id} value={l.id}>
                          {tName} — ${rent}/mo
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            ) : null}

            {/* Recipient Details Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-admin-muted block mb-1">Customer / Recipient Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Doe / Acme Corp"
                  className="w-full bg-admin-surface border border-admin-border rounded-lg px-3 py-1.5 text-admin-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-[#008F83]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-admin-muted block mb-1">Recipient Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="billing@client.com.au"
                  className="w-full bg-admin-surface border border-admin-border rounded-lg px-3 py-1.5 text-admin-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-[#008F83]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-admin-muted block mb-1">Recipient Phone</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+61 400 000 000"
                  className="w-full bg-admin-surface border border-admin-border rounded-lg px-3 py-1.5 text-admin-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-[#008F83]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-admin-muted block mb-1">Billing Address</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="123 Collins St, Melbourne VIC"
                  className="w-full bg-admin-surface border border-admin-border rounded-lg px-3 py-1.5 text-admin-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-[#008F83]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Multi-Month Billing Schedule Parameters */}
          <div className="bg-admin-surface-subtle/60 border border-admin-border rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-admin-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#008F83]" /> Schedule & Pricing Configuration
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Start Month */}
              <div>
                <label className="text-xs font-semibold text-admin-muted block mb-1">
                  Start Billing Month <span className="text-rose-500">*</span>
                </label>
                <input
                  type="month"
                  required
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="w-full bg-admin-surface border border-admin-border rounded-lg px-3 py-2 text-admin-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-[#008F83]"
                />
              </div>

              {/* Number of Months with Quick Selectors */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-admin-muted">Number of Months</label>
                  <span className="text-xs font-bold text-[#008F83]">{monthsCount} Months</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={monthsCount}
                    onChange={(e) => setMonthsCount(Math.min(24, Math.max(1, Number(e.target.value))))}
                    className="w-20 bg-admin-surface border border-admin-border rounded-lg px-3 py-2 text-admin-foreground text-xs text-center font-bold focus:outline-hidden focus:ring-1 focus:ring-[#008F83]"
                  />
                  <div className="flex items-center gap-1 flex-1">
                    {[3, 6, 12, 24].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setMonthsCount(num)}
                        className={cn(
                          'flex-1 py-1.5 px-1 rounded-md text-[11px] font-bold transition-all border',
                          monthsCount === num
                            ? 'bg-[#008F83] text-white border-[#008F83]'
                            : 'bg-admin-surface text-admin-muted border-admin-border hover:text-admin-foreground hover:bg-admin-surface-subtle'
                        )}
                      >
                        {num === 12 ? '1 Yr' : num === 24 ? '2 Yrs' : `${num}M`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payment Terms (Due Days) */}
              <div>
                <label className="text-xs font-semibold text-admin-muted block mb-1">Payment Due Terms</label>
                <select
                  value={dueDays}
                  onChange={(e) => setDueDays(Number(e.target.value))}
                  className="w-full bg-admin-surface border border-admin-border rounded-lg px-3 py-2 text-admin-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-[#008F83]"
                >
                  <option value={0}>Due on Issue Date (1st of month)</option>
                  <option value={7}>Net 7 (7 days after 1st)</option>
                  <option value={14}>Net 14 (14 days after 1st)</option>
                  <option value={30}>Net 30 (End of month)</option>
                </select>
              </div>

              {/* Item Description */}
              <div>
                <label className="text-xs font-semibold text-admin-muted block mb-1">Invoice Item Description</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Monthly Rent Payment"
                  className="w-full bg-admin-surface border border-admin-border rounded-lg px-3 py-2 text-admin-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-[#008F83]"
                />
              </div>

              {/* Monthly Rate */}
              <div>
                <label className="text-xs font-semibold text-admin-muted block mb-1">
                  Monthly Rate ($ AUD) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted text-xs font-bold">$</span>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    required
                    value={amountPerMonth}
                    onChange={(e) => setAmountPerMonth(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-admin-surface border border-admin-border rounded-lg pl-7 pr-3 py-2 text-admin-foreground text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-[#008F83]"
                  />
                </div>
              </div>

              {/* GST / Tax Rate */}
              <div>
                <label className="text-xs font-semibold text-admin-muted block mb-1">Australian Tax / GST</label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full bg-admin-surface border border-admin-border rounded-lg px-3 py-2 text-admin-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-[#008F83]"
                >
                  <option value={0}>GST Free (0%) — Standard Residential Rent</option>
                  <option value={0.1}>10% GST Included — Commercial / Services</option>
                </select>
              </div>
            </div>

            {/* Template & Status Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-admin-border/60">
              <div>
                <label className="text-xs font-semibold text-admin-muted block mb-1">Invoice Layout Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-admin-surface border border-admin-border rounded-lg px-3 py-2 text-admin-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-[#008F83]"
                >
                  <optgroup label="Predefined Designs">
                    {PREDEFINED_INVOICE_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.layoutStyle})
                      </option>
                    ))}
                  </optgroup>
                  {customTemplates.length > 0 && (
                    <optgroup label="Custom Blueprints">
                      {customTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-admin-muted block mb-1">Initial Status</label>
                <div className="flex items-center gap-3 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-admin-foreground font-medium">
                    <input
                      type="radio"
                      name="autoIssue"
                      checked={autoIssue}
                      onChange={() => setAutoIssue(true)}
                      className="accent-[#008F83]"
                    />
                    <span>Issue Immediately (Ready for Payment)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-admin-foreground font-medium">
                    <input
                      type="radio"
                      name="autoIssue"
                      checked={!autoIssue}
                      onChange={() => setAutoIssue(false)}
                      className="accent-[#008F83]"
                    />
                    <span>Save as Drafts</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Interactive Schedule Breakdown Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-admin-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#008F83]" /> Schedule Breakdown ({scheduleItems.length} Invoices)
              </h4>
              <button
                type="button"
                onClick={() => setShowTestEmailBox(!showTestEmailBox)}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <Mail className="w-3.5 h-3.5" />
                {showTestEmailBox ? 'Hide Test Email' : 'Send Sample Test Preview'}
              </button>
            </div>

            {/* Test Email Box */}
            {showTestEmailBox && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-150">
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Test Invoice Dispatch
                  </div>
                  <p className="text-admin-muted text-[11px]">
                    Dispatches a sample Month 1 invoice preview to test recipient before bulk generation.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="email"
                    value={testEmailAddress || customerEmail}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="Enter preview email"
                    className="flex-1 sm:w-56 bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-admin-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestEmail}
                    disabled={isSendingTest}
                    className="h-8 text-xs font-bold border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/15 shrink-0"
                  >
                    {isSendingTest ? 'Sending...' : 'Send Preview'}
                  </Button>
                </div>
              </div>
            )}

            {/* Timeline Table */}
            <div className="border border-admin-border rounded-xl overflow-hidden bg-admin-surface shadow-xs max-h-56 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-admin-surface-subtle text-admin-muted font-bold border-b border-admin-border uppercase text-[10.5px]">
                  <tr>
                    <th className="p-2.5 w-12 text-center">#</th>
                    <th className="p-2.5">Billing Month</th>
                    <th className="p-2.5">Issue Date</th>
                    <th className="p-2.5">Due Date</th>
                    <th className="p-2.5">Billing Period</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                    <th className="p-2.5 text-right">GST</th>
                    <th className="p-2.5 text-right">Total ($ AUD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border font-medium">
                  {scheduleItems.map((it) => (
                    <tr key={it.monthIndex} className="hover:bg-admin-surface-subtle/50 transition-colors">
                      <td className="p-2.5 text-center font-mono text-admin-muted">{it.monthIndex}</td>
                      <td className="p-2.5 font-bold text-admin-foreground">{it.monthLabel}</td>
                      <td className="p-2.5 text-admin-muted">{formatAuDisplayDate(it.issueDate)}</td>
                      <td className="p-2.5 text-admin-muted">{formatAuDisplayDate(it.dueDate)}</td>
                      <td className="p-2.5 text-admin-muted text-[11px]">
                        {formatAuDisplayDate(it.periodStart)} – {formatAuDisplayDate(it.periodEnd)}
                      </td>
                      <td className="p-2.5 text-right text-admin-foreground font-mono">
                        {formatCurrency(it.subtotal, 'AUD')}
                      </td>
                      <td className="p-2.5 text-right text-admin-muted font-mono">
                        {it.tax > 0 ? formatCurrency(it.tax, 'AUD') : '—'}
                      </td>
                      <td className="p-2.5 text-right font-black text-[#008F83] font-mono">
                        {formatCurrency(it.total, 'AUD')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Highlights Banner */}
            <div className="p-3.5 bg-admin-surface border border-admin-border rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10.5px] uppercase font-bold text-admin-muted block">Invoices</span>
                  <span className="text-sm font-black text-admin-foreground">{scheduleItems.length} Monthly Invoices</span>
                </div>
                <div>
                  <span className="text-[10.5px] uppercase font-bold text-admin-muted block">Total Batch Sum</span>
                  <span className="text-sm font-black text-[#008F83]">{formatCurrency(totalBatchAmount, 'AUD')}</span>
                </div>
                <div>
                  <span className="text-[10.5px] uppercase font-bold text-admin-muted block">Timespan</span>
                  <span className="text-xs font-semibold text-admin-foreground">
                    {scheduleItems[0]?.monthLabel} – {scheduleItems[scheduleItems.length - 1]?.monthLabel}
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-admin-muted font-medium">
                Status: <strong className="text-admin-foreground font-bold">{autoIssue ? 'Issued' : 'Draft'}</strong> •
                Currency: <strong className="text-admin-foreground font-bold">AUD</strong>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-admin-border flex items-center justify-between gap-3 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="text-admin-muted hover:text-admin-foreground"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting || scheduleItems.length === 0}
                className="bg-[#008F83] hover:bg-[#008F83]/90 text-white font-bold px-5 gap-2 shadow-xs"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating {scheduleItems.length} Invoices...
                  </>
                ) : (
                  <>
                    <CalendarRange className="w-4 h-4" />
                    Generate {scheduleItems.length} Invoices ({formatCurrency(totalBatchAmount, 'AUD')})
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
