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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto font-sans animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh] z-10 p-6 sm:p-8 my-auto">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close dialog"
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#008F83]/30"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Centered Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-slate-900 dark:text-white">
            Generate Multi-Month Invoices
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create scheduled recurring monthly rent invoices in advance (1 to 24 months) with automated Australian GST.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Target Type Selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTargetType('lease')}
              className={cn(
                'py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border',
                targetType === 'lease'
                  ? 'bg-[#008F83] text-white border-[#008F83] shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#008F83]/40'
              )}
            >
              <Building className="w-4 h-4" /> Link Property & Lease
            </button>
            <button
              type="button"
              onClick={() => setTargetType('standalone')}
              className={cn(
                'py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border',
                targetType === 'standalone'
                  ? 'bg-[#008F83] text-white border-[#008F83] shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#008F83]/40'
              )}
            >
              <User className="w-4 h-4" /> Custom Direct Client
            </button>
          </div>

          {/* Recipient & Property Section */}
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#008F83]" /> Recipient & Property Association
            </span>

            {targetType === 'lease' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Select Property *"
                  value={selectedPropertyId}
                  onChange={(e) => {
                    setSelectedPropertyId(e.target.value);
                    setSelectedLeaseId('');
                  }}
                >
                  <option value="">-- Choose Property --</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.address || 'No address'})
                    </option>
                  ))}
                </Select>

                <Select
                  label="Select Active Lease / Tenant *"
                  value={selectedLeaseId}
                  onChange={(e) => setSelectedLeaseId(e.target.value)}
                  disabled={!selectedPropertyId || availableLeases.length === 0}
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
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Customer / Recipient Name *"
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. John Doe / Acme Corp"
              />
              <Input
                label="Recipient Email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="billing@client.com.au"
              />
              <Input
                label="Recipient Phone"
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+61 400 000 000"
              />
              <Input
                label="Billing Address"
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="123 Collins St, Melbourne VIC"
              />
            </div>
          </div>

          {/* Schedule & Pricing Section */}
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#008F83]" /> Schedule & Pricing Configuration
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Start Billing Month *"
                type="month"
                required
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Number of Months:</span>
                  <span className="font-bold text-[#008F83]">{monthsCount} Months</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={monthsCount}
                    onChange={(e) => setMonthsCount(Math.min(24, Math.max(1, Number(e.target.value))))}
                    className="w-16 h-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 text-center text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#008F83]"
                  />
                  {[3, 6, 12, 24].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMonthsCount(num)}
                      className={cn(
                        'flex-1 h-10 rounded-xl text-xs font-bold transition-all border',
                        monthsCount === num
                          ? 'bg-[#008F83] text-white border-[#008F83]'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#008F83]/40'
                      )}
                    >
                      {num === 12 ? '1 Yr' : num === 24 ? '2 Yrs' : `${num}M`}
                    </button>
                  ))}
                </div>
              </div>

              <Select
                label="Payment Due Terms"
                value={dueDays}
                onChange={(e) => setDueDays(Number(e.target.value))}
              >
                <option value={0}>Due on Issue Date (1st of month)</option>
                <option value={7}>Net 7 (7 days after 1st)</option>
                <option value={14}>Net 14 (14 days after 1st)</option>
                <option value={30}>Net 30 (End of month)</option>
              </Select>

              <Input
                label="Monthly Rate ($ AUD) *"
                type="number"
                min={0.01}
                step={0.01}
                required
                value={amountPerMonth}
                onChange={(e) => setAmountPerMonth(Math.max(0, Number(e.target.value)))}
                className="font-mono font-bold"
              />

              <div className="md:col-span-2">
                <Input
                  label="Invoice Item Description *"
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Monthly Rent Payment"
                />
              </div>

              <Select
                label="Australian Tax / GST"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
              >
                <option value={0}>GST Free (0%) — Standard Residential Rent</option>
                <option value={0.1}>10% GST Included — Commercial / Services</option>
              </Select>

              <Select
                label="Invoice Layout Template"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
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
              </Select>
            </div>
          </div>

          {/* Schedule Breakdown Table & Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#008F83]" /> Schedule Breakdown ({scheduleItems.length} Invoices)
              </span>
              <button
                type="button"
                onClick={() => setShowTestEmailBox(!showTestEmailBox)}
                className="text-xs font-bold text-[#008F83] hover:underline flex items-center gap-1"
              >
                <Mail className="w-3.5 h-3.5" />
                {showTestEmailBox ? 'Hide Preview' : 'Send Test Preview'}
              </button>
            </div>

            {showTestEmailBox && (
              <div className="p-3 bg-[#008F83]/5 border border-[#008F83]/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
                <div className="text-xs">
                  <div className="font-bold text-slate-900 dark:text-white">Sample Email Dispatch</div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">Deliver Month 1 preview to your inbox.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="email"
                    value={testEmailAddress || customerEmail}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="Enter email..."
                    className="flex-1 sm:w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#008F83]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestEmail}
                    disabled={isSendingTest}
                    className="h-8 text-xs font-bold border-[#008F83]/30 text-[#008F83] hover:bg-[#008F83]/10 shrink-0"
                  >
                    {isSendingTest ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </div>
            )}

            {/* Timeline Breakdown Mini Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5 w-10 text-center">#</th>
                    <th className="p-2.5">Billing Month</th>
                    <th className="p-2.5">Due Date</th>
                    <th className="p-2.5 text-right">Total ($ AUD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {scheduleItems.map((it) => (
                    <tr key={it.monthIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-2.5 text-center font-mono text-slate-400">{it.monthIndex}</td>
                      <td className="p-2.5 font-bold text-slate-900 dark:text-white">{it.monthLabel}</td>
                      <td className="p-2.5 text-slate-500 dark:text-slate-400">{formatAuDisplayDate(it.dueDate)}</td>
                      <td className="p-2.5 text-right font-black text-[#008F83] font-mono">
                        {formatCurrency(it.total, 'AUD')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Summary */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Batch ({scheduleItems.length} Invoices)</span>
                <span className="text-base font-black text-[#008F83]">{formatCurrency(totalBatchAmount, 'AUD')}</span>
              </div>
              <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                <span>{scheduleItems[0]?.monthLabel} – {scheduleItems[scheduleItems.length - 1]?.monthLabel}</span>
              </div>
            </div>
          </div>

          {/* Dual Full-Width Action Buttons */}
          <div className="pt-2 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || scheduleItems.length === 0}
              className="w-full py-3 px-4 rounded-xl bg-[#008F83] hover:bg-[#008F83]/90 text-white font-bold text-sm shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[#008F83]/50 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                `Generate ${scheduleItems.length} Invoices`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
