'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Mail,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Send,
  Building,
  DollarSign,
  Palette,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { Button } from '@/components/admin/ui';
import { cn } from '@/lib/utils';
import {
  InvoiceLayoutStyle,
  InvoiceTemplateDTO,
  InvoiceTemplateItem,
  InvoiceTemplateStatus,
} from '@/modules/invoices';
import { LiveInvoiceRenderer } from './LiveInvoiceRenderer';
import {
  createInvoiceTemplateAction,
  updateInvoiceTemplateAction,
  checkResendStatusAction,
  sendInvoiceTemplateTestEmailAction,
} from '@/app/actions/invoices';

interface InvoiceTemplateWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (template: InvoiceTemplateDTO) => void;
  initialTemplate?: InvoiceTemplateDTO | null;
}

export function InvoiceTemplateWizard({
  isOpen,
  onClose,
  onSuccess,
  initialTemplate,
}: InvoiceTemplateWizardProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ connected: boolean; statusText: string }>({
    connected: false,
    statusText: 'Checking connection...',
  });
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success?: boolean; message?: string } | null>(null);

  // Step 1: Basics
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('AUD');
  const [invoiceType, setInvoiceType] = useState('rent');
  const [status, setStatus] = useState<InvoiceTemplateStatus>('active');

  // Step 2: Content & Pricing
  const [items, setItems] = useState<InvoiceTemplateItem[]>([
    { description: 'Monthly Property Rent', quantity: 1, unitPrice: 2500, taxRate: 10, discount: 0 },
  ]);
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(14);
  const [lateFeeAmount, setLateFeeAmount] = useState<number>(50);
  const [lateFeeDays, setLateFeeDays] = useState<number>(7);
  const [notes, setNotes] = useState('Payment due within terms. Thank you for your residency.');
  const [paymentInstructions, setPaymentInstructions] = useState(
    'Bank: Commonwealth Bank of Australia\nBSB: 062-000\nAccount: 1234 5678\nReference: INV-[ID]'
  );

  // Visual Styling
  const [layoutStyle, setLayoutStyle] = useState<InvoiceLayoutStyle>('classic');
  const [brandColor, setBrandColor] = useState('#22333b');
  const [accentColor, setAccentColor] = useState('#a9927d');
  const [headerText, setHeaderText] = useState('PROPERTY LEDGE');
  const [footerText, setFooterText] = useState('Property Ledge Management Pty Ltd • ABN 12 345 678 901');

  // Step 3: Automation & Schedule
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'fortnightly' | 'quarterly' | 'on_demand'>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [conditionOnlyActiveLeases, setConditionOnlyActiveLeases] = useState(true);

  // Step 4: Email & Resend
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [recipientRule, setRecipientRule] = useState<'tenant_email' | 'custom_email' | 'prompt_on_run'>('tenant_email');
  const [customEmail, setCustomEmail] = useState('');
  const [subjectTemplate, setSubjectTemplate] = useState('Monthly Rent Invoice {{invoice.number}} - Property Ledge');
  const [bodyTemplate, setBodyTemplate] = useState(
    'Hi {{customer_name}},\n\nYour rent invoice for this period is attached.\n\nAmount Due: {{invoice.total}}\nDue Date: {{invoice.due_date}}\n\nPlease let us know if you have any questions.'
  );
  const [attachPdf, setAttachPdf] = useState(true);

  useEffect(() => {
    if (isOpen) {
      checkResend();
      if (initialTemplate) {
        setName(initialTemplate.name || '');
        setDescription(initialTemplate.description || '');
        setCurrency(initialTemplate.currency || 'AUD');
        setInvoiceType(initialTemplate.invoiceType || 'rent');
        setStatus(initialTemplate.status || 'active');
        if (initialTemplate.items && initialTemplate.items.length > 0) {
          setItems(initialTemplate.items);
        }
        setPaymentTermsDays(initialTemplate.paymentTermsDays || 14);
        setLateFeeAmount(initialTemplate.lateFeeAmount || 0);
        setLateFeeDays(initialTemplate.lateFeeDays || 0);
        setNotes(initialTemplate.notes || '');
        setPaymentInstructions(initialTemplate.paymentInstructions || '');
        setLayoutStyle(initialTemplate.layoutStyle || 'classic');
        setBrandColor(initialTemplate.brandColor || '#22333b');
        setAccentColor(initialTemplate.accentColor || '#a9927d');
        setHeaderText(initialTemplate.headerText || 'PROPERTY LEDGE');
        setFooterText(initialTemplate.footerText || '');
        if (initialTemplate.automationConfig) {
          setFrequency((initialTemplate.automationConfig.frequency as any) || 'monthly');
          setDayOfMonth(initialTemplate.automationConfig.dayOfMonth || 1);
          setConditionOnlyActiveLeases(!!initialTemplate.automationConfig.conditionOnlyActiveLeases);
        }
        if (initialTemplate.emailConfig) {
          setEmailEnabled(initialTemplate.emailConfig.enabled ?? true);
          setRecipientRule(initialTemplate.emailConfig.recipientRule || 'tenant_email');
          setCustomEmail(initialTemplate.emailConfig.customEmail || '');
          setSubjectTemplate(initialTemplate.emailConfig.subjectTemplate || 'Invoice {{invoice.number}}');
          setBodyTemplate(initialTemplate.emailConfig.bodyTemplate || '');
          setAttachPdf(initialTemplate.emailConfig.attachPdf ?? true);
        }
      } else {
        setCurrentStep(1);
      }
    }
  }, [isOpen, initialTemplate]);

  const checkResend = async () => {
    try {
      const status = await checkResendStatusAction();
      setResendStatus(status);
    } catch {
      setResendStatus({ connected: false, statusText: 'Status unavailable' });
    }
  };

  if (!isOpen) return null;

  // Live calculations
  const subtotal = items.reduce((acc, item) => {
    const q = Number(item.quantity) || 0;
    const p = Number(item.unitPrice) || 0;
    const d = Number(item.discount) || 0;
    return acc + Math.max(0, q * p - d);
  }, 0);

  const taxAmount = items.reduce((acc, item) => {
    const q = Number(item.quantity) || 0;
    const p = Number(item.unitPrice) || 0;
    const d = Number(item.discount) || 0;
    const lineBase = Math.max(0, q * p - d);
    const rate = Number(item.taxRate) || 0;
    return acc + (lineBase * rate) / 100;
  }, 0);

  const totalAmount = subtotal + taxAmount;

  const handleAddItem = () => {
    setItems([
      ...items,
      { description: 'Additional Item', quantity: 1, unitPrice: 100, taxRate: 10, discount: 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceTemplateItem, value: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  };

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient) {
      setTestEmailResult({ success: false, message: 'Please enter a test recipient email.' });
      return;
    }
    setTestEmailSending(true);
    setTestEmailResult(null);
    try {
      if (initialTemplate?.id) {
        const res = await sendInvoiceTemplateTestEmailAction(initialTemplate.id, testEmailRecipient);
        if (res.success) {
          setTestEmailResult({ success: true, message: `✓ Test email sent successfully to ${testEmailRecipient}` });
        } else {
          setTestEmailResult({ success: false, message: res.error || 'Failed to send test email.' });
        }
      } else {
        setTestEmailResult({
          success: true,
          message: `✓ Test simulated for ${testEmailRecipient} (Save template first for full Resend dispatch)`,
        });
      }
    } finally {
      setTestEmailSending(false);
    }
  };

  const handleSaveAndActivate = async (targetStatus: InvoiceTemplateStatus = status) => {
    if (!name.trim()) {
      alert('Please provide a template name.');
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        status: targetStatus,
        currency,
        invoiceType,
        items,
        paymentTermsDays,
        lateFeeAmount,
        lateFeeDays,
        notes: notes.trim() || undefined,
        paymentInstructions: paymentInstructions.trim() || undefined,
        layoutStyle,
        brandColor,
        accentColor,
        headerText: headerText.trim() || undefined,
        footerText: footerText.trim() || undefined,
        automationConfig: {
          frequency,
          dayOfMonth,
          conditionOnlyActiveLeases,
          autoApprove: true,
          autoSendEmail: emailEnabled,
        },
        emailConfig: {
          enabled: emailEnabled,
          recipientRule,
          customEmail: customEmail.trim() || undefined,
          subjectTemplate: subjectTemplate.trim() || undefined,
          bodyTemplate: bodyTemplate.trim() || undefined,
          attachPdf,
        },
      };

      if (initialTemplate?.id) {
        const res = await updateInvoiceTemplateAction(initialTemplate.id, payload);
        if (res.success && res.template) {
          onSuccess(res.template);
          onClose();
        } else {
          alert(res.error || 'Failed to update template');
        }
      } else {
        const res = await createInvoiceTemplateAction(payload);
        if (res.success && res.template) {
          onSuccess(res.template);
          onClose();
        } else {
          alert(res.error || 'Failed to create template');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, title: 'Basics' },
    { num: 2, title: 'Content & Pricing' },
    { num: 3, title: 'Schedule & Automation' },
    { num: 4, title: 'Email & Resend' },
    { num: 5, title: 'Live Preview' },
    { num: 6, title: 'Review & Activate' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-admin-surface border border-admin-border text-admin-foreground rounded-2xl w-full max-w-6xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* ─── HEADER ─── */}
        <div className="px-6 py-5 border-b border-admin-border flex items-center justify-between bg-admin-surface-subtle/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-admin-primary/10 text-admin-primary rounded-xl border border-admin-primary/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-admin-foreground">
                {initialTemplate ? 'Edit Invoice Template' : 'Create Recurring Invoice Blueprint'}
              </h2>
              <p className="text-xs text-admin-muted">
                Define reusable billing rules, automatic schedules, and Resend delivery
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

        {/* ─── STEPPER BAR ─── */}
        <div className="px-6 py-3 bg-admin-surface-subtle border-b border-admin-border flex items-center justify-between overflow-x-auto gap-2">
          {steps.map((s) => (
            <button
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                currentStep === s.num
                  ? 'bg-admin-surface border border-admin-primary text-admin-foreground shadow-xs ring-1 ring-admin-primary font-bold'
                  : currentStep > s.num
                  ? 'bg-admin-surface text-admin-primary border border-admin-border'
                  : 'text-admin-muted hover:text-admin-foreground'
              )}
            >
              <span
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                  currentStep === s.num
                    ? 'bg-admin-primary text-white'
                    : currentStep > s.num
                    ? 'bg-admin-primary/15 text-admin-primary'
                    : 'bg-admin-surface border border-admin-border text-admin-muted'
                )}
              >
                {currentStep > s.num ? <Check className="w-3 h-3" /> : s.num}
              </span>
              <span>{s.title}</span>
            </button>
          ))}
        </div>

        {/* ─── BODY CONTAINER ─── */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6 text-sm">
          {/* STEP 1: BASICS */}
          {currentStep === 1 && (
            <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in">
              <div className="border-b border-admin-border pb-4">
                <h3 className="text-base font-bold text-admin-foreground">Step 1 — Basic Information</h3>
                <p className="text-xs text-admin-muted mt-1">
                  Name your template and specify the default invoice category and currency.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-admin-muted mb-1.5">
                  Template Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Monthly Residential Rent (Standard)"
                  className="w-full bg-admin-surface border border-admin-border rounded-xl px-4 py-2.5 text-admin-foreground text-sm placeholder:text-admin-muted/60 focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-admin-muted mb-1.5">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Automatic monthly rent invoicing for fixed-term lease agreements with 10% GST."
                  className="w-full bg-admin-surface border border-admin-border rounded-xl p-3 text-admin-foreground text-sm placeholder:text-admin-muted/60 focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-admin-muted mb-1.5">Invoice Type</label>
                  <select
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value)}
                    className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2.5 text-admin-foreground text-sm focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                  >
                    <option value="rent">Monthly / Periodic Rent</option>
                    <option value="maintenance">Maintenance & Repairs</option>
                    <option value="utilities">Utilities & Outgoings</option>
                    <option value="management_fee">Management Service Fee</option>
                    <option value="custom">Custom Billing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-admin-muted mb-1.5">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2.5 text-admin-foreground text-sm focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                  >
                    <option value="AUD">AUD ($ Australian Dollar)</option>
                    <option value="USD">USD ($ US Dollar)</option>
                    <option value="INR">INR (₹ Indian Rupee)</option>
                    <option value="EUR">EUR (€ Euro)</option>
                    <option value="GBP">GBP (£ British Pound)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-admin-muted mb-1.5">Initial Status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2.5 text-admin-foreground text-sm focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                  >
                    <option value="active">Active (Ready for Schedule)</option>
                    <option value="draft">Draft (Inactive)</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CONTENT & PRICING */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-admin-border pb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-admin-foreground">Step 2 — Line Items & Pricing Blueprint</h3>
                  <p className="text-xs text-admin-muted mt-0.5">
                    Configure default line items, tax rate, payment instructions, and visual layout.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-admin-muted">Total Blueprint Amount:</div>
                  <div className="text-lg font-black text-admin-primary">
                    {currency === 'INR' ? '₹' : '$'}
                    {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Line Items Builder */}
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-admin-surface-subtle rounded-xl text-xs font-bold text-admin-muted">
                  <div className="col-span-5">Description</div>
                  <div className="col-span-2">Qty</div>
                  <div className="col-span-2">Rate ({currency})</div>
                  <div className="col-span-2">Tax (%)</div>
                  <div className="col-span-1 text-center">Action</div>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-admin-surface p-3 rounded-xl border border-admin-border">
                    <div className="col-span-5">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="e.g. Rent for unit"
                        className="w-full bg-admin-surface border border-admin-border rounded-lg px-3 py-1.5 text-xs text-admin-foreground focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        className="w-full bg-admin-surface border border-admin-border rounded-lg px-3 py-1.5 text-xs text-admin-foreground text-center focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                        className="w-full bg-admin-surface border border-admin-border rounded-lg px-3 py-1.5 text-xs text-admin-foreground text-right focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.taxRate ?? 10}
                        onChange={(e) => handleItemChange(idx, 'taxRate', Number(e.target.value))}
                        className="w-full bg-admin-surface border border-admin-border rounded-lg px-3 py-1.5 text-xs text-admin-foreground text-right focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length === 1}
                        className="p-1 text-admin-muted hover:text-rose-400 disabled:opacity-30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <Button variant="outline" size="sm" onClick={handleAddItem} className="gap-2 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Add Line Item
                </Button>
              </div>

              {/* Payment Terms & Late Fees */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-admin-border">
                <div>
                  <label className="block text-xs font-bold text-admin-muted mb-1">Due Date Rule (Days after issue)</label>
                  <input
                    type="number"
                    min="0"
                    value={paymentTermsDays}
                    onChange={(e) => setPaymentTermsDays(Number(e.target.value))}
                    className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-xs focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                  />
                  <span className="text-[10px] text-admin-muted">e.g. 14 days (Net 14)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-admin-muted mb-1">Late Fee Amount ({currency})</label>
                  <input
                    type="number"
                    min="0"
                    value={lateFeeAmount}
                    onChange={(e) => setLateFeeAmount(Number(e.target.value))}
                    className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-xs focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                  />
                  <span className="text-[10px] text-admin-muted">Applied automatically if overdue</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-admin-muted mb-1">Late Fee Grace Period (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={lateFeeDays}
                    onChange={(e) => setLateFeeDays(Number(e.target.value))}
                    className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-xs focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                  />
                  <span className="text-[10px] text-admin-muted">Days after due date before fee</span>
                </div>
              </div>

              {/* Layout Theme & Branding */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-admin-border">
                <div>
                  <label className="block text-xs font-bold text-admin-muted mb-1">Visual Theme Layout</label>
                  <select
                    value={layoutStyle}
                    onChange={(e: any) => setLayoutStyle(e.target.value)}
                    className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-xs focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                  >
                    <option value="classic">Classic Editorial</option>
                    <option value="modern">Modern Sleek</option>
                    <option value="minimalist">Minimalist Clean</option>
                    <option value="corporate">Corporate Navy</option>
                    <option value="elegant">Elegant Executive</option>
                    <option value="creative">Creative Dynamic</option>
                    <option value="monochrome">Monochrome High-Contrast</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-admin-muted mb-1">Brand Main Color</label>
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-full h-9 bg-admin-surface border border-admin-border rounded-xl p-1 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-admin-muted mb-1">Brand Accent Color</label>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-full h-9 bg-admin-surface border border-admin-border rounded-xl p-1 cursor-pointer"
                  />
                </div>
              </div>

              {/* Payment Instructions & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-admin-border">
                <div>
                  <label className="block text-xs font-bold text-admin-muted mb-1">Payment Instructions</label>
                  <textarea
                    rows={3}
                    value={paymentInstructions}
                    onChange={(e) => setPaymentInstructions(e.target.value)}
                    placeholder="Bank details, BSB, Account number, payment reference..."
                    className="w-full bg-admin-surface border border-admin-border rounded-xl p-2.5 text-xs text-admin-foreground focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-admin-muted mb-1">Default Notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes visible on the bottom of the invoice..."
                    className="w-full bg-admin-surface border border-admin-border rounded-xl p-2.5 text-xs text-admin-foreground focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SCHEDULE & AUTOMATION */}
          {currentStep === 3 && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
              <div className="border-b border-admin-border pb-4">
                <h3 className="text-base font-bold text-admin-foreground">Step 3 — Automation Trigger & Schedule</h3>
                <p className="text-xs text-admin-muted mt-1">
                  Define when the generic Automation Engine should generate invoices from this template.
                </p>
              </div>

              <div className="p-4 bg-admin-surface-subtle border border-admin-border rounded-2xl space-y-4">
                <div className="flex items-center gap-2 font-bold text-admin-foreground text-sm">
                  <Clock className="w-4 h-4 text-admin-primary" /> Schedule Trigger
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-admin-muted mb-1">Frequency</label>
                    <select
                      value={frequency}
                      onChange={(e: any) => setFrequency(e.target.value)}
                      className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-xs focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="on_demand">On-Demand / Manual Only</option>
                    </select>
                  </div>

                  {frequency === 'monthly' && (
                    <div>
                      <label className="block text-xs text-admin-muted mb-1">Day of Month</label>
                      <select
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(Number(e.target.value))}
                        className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-xs focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      >
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>
                            {d}st / {d}th of every month
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-admin-surface-subtle border border-admin-border rounded-2xl space-y-3">
                <div className="flex items-center gap-2 font-bold text-admin-foreground text-sm">
                  <ShieldAlert className="w-4 h-4 text-emerald-500" /> Automation Conditions
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="condActiveLease"
                    checked={conditionOnlyActiveLeases}
                    onChange={(e) => setConditionOnlyActiveLeases(e.target.checked)}
                    className="mt-0.5 rounded border-admin-border text-admin-primary focus:ring-admin-primary"
                  />
                  <div>
                    <label htmlFor="condActiveLease" className="text-xs font-bold text-admin-foreground cursor-pointer">
                      Only generate for Active Leases
                    </label>
                    <p className="text-[11px] text-admin-muted">
                      Invoices will not be generated for expired, cancelled, or terminated lease agreements.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: EMAIL & RESEND */}
          {currentStep === 4 && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
              <div className="border-b border-admin-border pb-4">
                <h3 className="text-base font-bold text-admin-foreground">Step 4 — Email Delivery & Resend Setup</h3>
                <p className="text-xs text-admin-muted mt-1">
                  Configure automatic invoice email delivery through Resend with PDF attachments.
                </p>
              </div>

              {/* Resend Status Card */}
              <div className="p-4 bg-admin-surface-subtle border border-admin-border rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      resendStatus.connected ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' : 'bg-amber-400'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-admin-foreground">Email Provider: Resend</div>
                    <div className="text-[11px] text-admin-muted">{resendStatus.statusText}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={checkResend} className="text-xs">
                  Re-check
                </Button>
              </div>

              <div className="flex items-center gap-3 p-3 bg-admin-surface rounded-xl border border-admin-border">
                <input
                  type="checkbox"
                  id="enableEmail"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="rounded border-admin-border text-admin-primary focus:ring-admin-primary"
                />
                <label htmlFor="enableEmail" className="text-xs font-bold text-admin-foreground cursor-pointer">
                  Enable automatic email delivery when invoice is created
                </label>
              </div>

              {emailEnabled && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-admin-muted mb-1">Email Subject Line</label>
                    <input
                      type="text"
                      value={subjectTemplate}
                      onChange={(e) => setSubjectTemplate(e.target.value)}
                      placeholder="e.g. Monthly Rent Invoice {{invoice.number}} - Property Ledge"
                      className="w-full bg-admin-surface border border-admin-border rounded-xl px-4 py-2.5 text-admin-foreground text-xs focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                    />
                    <span className="text-[10px] text-admin-muted">
                      Supported tokens: <code>{'{{invoice.number}}'}</code>, <code>{'{{customer_name}}'}</code>
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-admin-muted mb-1">Email Body Message</label>
                    <textarea
                      rows={4}
                      value={bodyTemplate}
                      onChange={(e) => setBodyTemplate(e.target.value)}
                      className="w-full bg-admin-surface border border-admin-border rounded-xl p-3 text-admin-foreground text-xs font-sans focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="attachPdf"
                      checked={attachPdf}
                      onChange={(e) => setAttachPdf(e.target.checked)}
                      className="rounded border-admin-border text-admin-primary focus:ring-admin-primary"
                    />
                    <label htmlFor="attachPdf" className="text-xs text-admin-muted cursor-pointer">
                      Attach generated invoice PDF document to email
                    </label>
                  </div>

                  {/* Send Test Email Box */}
                  <div className="p-4 bg-admin-surface-subtle border border-admin-primary/30 rounded-2xl space-y-3 mt-6">
                    <div className="flex items-center gap-2 text-xs font-bold text-admin-primary">
                      <Send className="w-4 h-4" /> Send Test Email
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={testEmailRecipient}
                        onChange={(e) => setTestEmailRecipient(e.target.value)}
                        placeholder="your-email@example.com"
                        className="flex-1 bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-xs focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      />
                      <Button
                        size="sm"
                        onClick={handleSendTestEmail}
                        disabled={testEmailSending || !testEmailRecipient}
                        variant="primary"
                        className="font-bold text-xs"
                      >
                        {testEmailSending ? 'Sending...' : 'Send Test'}
                      </Button>
                    </div>

                    {testEmailResult && (
                      <div
                        className={`p-2.5 rounded-xl text-xs ${
                          testEmailResult.success
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        }`}
                      >
                        {testEmailResult.message}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: LIVE PREVIEW */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border-b border-admin-border pb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-admin-foreground">Step 5 — Live Invoice Document Preview</h3>
                  <p className="text-xs text-admin-muted mt-0.5">
                    This is an exact preview of the PDF invoice that will be generated for your recipients.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-admin-muted">Theme:</span>
                  <span className="text-xs font-bold text-admin-foreground capitalize">{layoutStyle}</span>
                </div>
              </div>

              <div className="max-w-3xl mx-auto">
                <LiveInvoiceRenderer
                  data={{
                    invoiceNumber: 'INV-2026-00042',
                    issueDate: new Date().toISOString().split('T')[0],
                    dueDate: new Date(Date.now() + paymentTermsDays * 86400000).toISOString().split('T')[0],
                    currency,
                    customerName: 'Sample Tenant / Customer',
                    customerEmail: 'tenant@example.com',
                    customerAddress: 'Unit 4B, 100 George St, Sydney NSW 2000',
                    issuerName: 'Property Ledge Management',
                    issuerEmail: 'manager@propertyledge.com.au',
                    items,
                    notes,
                    paymentInstructions,
                    headerText,
                    footerText,
                    brandColor,
                    accentColor,
                    layoutStyle,
                  }}
                />
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW & ACTIVATE */}
          {currentStep === 6 && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
              <div className="border-b border-admin-border pb-4">
                <h3 className="text-base font-bold text-admin-foreground">Step 6 — Ready to Activate Blueprint</h3>
                <p className="text-xs text-admin-muted mt-1">
                  Review your recurring invoice definition and schedule before activating.
                </p>
              </div>

              <div className="p-6 bg-admin-surface-subtle border border-admin-border rounded-3xl space-y-5">
                <div className="flex items-center justify-between border-b border-admin-border pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-admin-primary">Template</span>
                    <h4 className="text-lg font-black text-admin-foreground">{name || 'Untitled Template'}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-admin-muted">Billing Total</span>
                    <div className="text-base font-black text-admin-primary">
                      {currency === 'INR' ? '₹' : '$'}
                      {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-admin-muted block">Recurrence:</span>
                    <span className="font-bold text-admin-foreground capitalize">
                      {frequency} {frequency === 'monthly' ? `(Day ${dayOfMonth})` : ''}
                    </span>
                  </div>

                  <div>
                    <span className="text-admin-muted block">Payment Terms:</span>
                    <span className="font-bold text-admin-foreground">{paymentTermsDays} Days (Net {paymentTermsDays})</span>
                  </div>

                  <div>
                    <span className="text-admin-muted block">Email Delivery:</span>
                    <span className="font-bold text-admin-foreground">
                      {emailEnabled ? 'Enabled (via Resend)' : 'Disabled (Manual)'}
                    </span>
                  </div>

                  <div>
                    <span className="text-admin-muted block">PDF Generation:</span>
                    <span className="font-bold text-admin-foreground">Automatic</span>
                  </div>
                </div>

                {/* Workflow Summary Arrow Flow */}
                <div className="p-4 bg-admin-surface rounded-2xl border border-admin-border space-y-2">
                  <div className="text-[10px] font-bold uppercase text-admin-muted">Automation Workflow Summary</div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-admin-muted flex-wrap">
                    <span className="px-2 py-1 bg-admin-surface-subtle text-admin-foreground rounded-lg border border-admin-border">
                      Trigger: {frequency}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-admin-primary" />
                    <span className="px-2 py-1 bg-admin-surface-subtle text-admin-foreground rounded-lg border border-admin-border">
                      Validate Active Lease
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-admin-primary" />
                    <span className="px-2 py-1 bg-admin-surface-subtle text-admin-foreground rounded-lg border border-admin-border">
                      Generate Invoice
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-admin-primary" />
                    <span className="px-2 py-1 bg-admin-surface-subtle text-admin-foreground rounded-lg border border-admin-border">
                      Render PDF
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-admin-primary" />
                    <span className="px-2 py-1 bg-admin-surface-subtle text-admin-foreground rounded-lg border border-admin-border">
                      Resend Email
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── FOOTER ACTIONS ─── */}
        <div className="px-6 py-4 border-t border-admin-border flex items-center justify-between bg-admin-surface-subtle/50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (currentStep > 1) setCurrentStep(currentStep - 1);
              else onClose();
            }}
            className="text-xs"
          >
            {currentStep === 1 ? 'Cancel' : 'Previous Step'}
          </Button>

          <div className="flex items-center gap-3">
            {currentStep < 6 ? (
              <Button
                size="sm"
                onClick={() => setCurrentStep(currentStep + 1)}
                variant="primary"
                className="font-bold text-xs gap-1.5"
              >
                Next Step <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => handleSaveAndActivate('active')}
                disabled={loading}
                variant="primary"
                className="font-bold text-xs gap-1.5 shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4" />
                {loading ? 'Saving...' : 'Activate Template'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
