'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  Plus,
  Trash2,
  Calculator,
  Check,
  AlertCircle,
  Building,
  User,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Download,
  Mail,
  CheckCircle2,
  Calendar,
  DollarSign,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  LayoutTemplate,
  Building2,
} from 'lucide-react';
import { Button, Input, Select, Textarea } from '@/components/admin/ui';
import { CreateInvoiceDTO, UpdateInvoiceDTO, InvoiceDTO, InvoiceTemplateDTO } from '@/modules/invoices';
import {
  PREDEFINED_INVOICE_TEMPLATES,
  PredefinedInvoiceTemplate,
  getPredefinedTemplateById,
} from '@/modules/invoices/domain/constants/predefined-templates';
import { formatCurrency, SUPPORTED_CURRENCIES } from '@/modules/invoices/domain/value-objects/currency';
import { fetchDashboardProperties, fetchAllWorkspaceLeases, fetchDashboardLeases } from '@/app/actions/dashboard';
import { getInvoiceDownloadUrlAction, generateInvoiceDocumentAction, sendInvoiceEmailAction, fetchInvoiceTemplatesAction } from '@/app/actions/invoices';
import { sendAutomationTestEmailAction } from '@/app/actions/automations';
import { LiveInvoiceRenderer } from './LiveInvoiceRenderer';
import { InvoiceTemplateModal } from './InvoiceTemplateModal';
import {
  getAuTodayString,
  getAuDateParts,
  formatAuDateIso,
  formatAuDisplayDateTime,
  formatAuDisplayDate,
  createAuDate,
} from '@/lib/format/australian-time';
import { cn } from '@/lib/utils';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    dto: CreateInvoiceDTO,
    issueImmediately?: boolean,
    emailOptions?: { subject?: string; customMessage?: string; driveFolderUrl?: string }
  ) => Promise<void>;
  invoiceToEdit?: InvoiceDTO | null;
  onUpdate?: (id: string, dto: UpdateInvoiceDTO) => Promise<void>;
  initialTemplateId?: string;
}

const WIZARD_STEPS = [
  { idx: 0, label: '1. Invoice Type' },
  { idx: 1, label: '2. Template' },
  { idx: 2, label: '3. Details' },
  { idx: 3, label: '4. Preview & Issue' },
];

export function CreateInvoiceModal({
  isOpen,
  onClose,
  onSubmit,
  invoiceToEdit,
  onUpdate,
  initialTemplateId,
}: CreateInvoiceModalProps) {
  const isEditMode = Boolean(invoiceToEdit);

  // 4-Step Wizard: 0 = Invoice Type, 1 = Choose Template, 2 = Invoice Details, 3 = Live Preview & Send
  const [step, setStep] = useState<number>(isEditMode ? 2 : 0);
  const [detailSubStep, setDetailSubStep] = useState<number>(0);
  const [selectedTemplate, setSelectedTemplate] = useState<PredefinedInvoiceTemplate>(() => {
    return getPredefinedTemplateById(initialTemplateId || 'template_classic');
  });

  // Live Australian Time state
  const [auCurrentTimeStr, setAuCurrentTimeStr] = useState<string>(() =>
    formatAuDisplayDateTime(new Date(), true)
  );
  // Custom templates / blueprints state
  const [customTemplates, setCustomTemplates] = useState<InvoiceTemplateDTO[]>([]);
  const [templateTab, setTemplateTab] = useState<'presets' | 'custom'>('presets');
  const [isTemplateBuilderOpen, setIsTemplateBuilderOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDetailSubStep(0);
    const updateTimer = () => {
      setAuCurrentTimeStr(formatAuDisplayDateTime(new Date(), true));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Invoice Mode & Core Metadata
  const [invoiceType, setInvoiceType] = useState<'standalone' | 'lease'>('standalone');
  const [status, setStatus] = useState<string>('draft');
  const [currency, setCurrency] = useState('AUD');
  const [invoiceNumber, setInvoiceNumber] = useState(
    `INV-${getAuDateParts(new Date()).year}-${Math.floor(1000 + Math.random() * 9000)}`
  );

  // Test Email State
  const [testRecipient, setTestRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);

  // Issuer (Issued By) Details - Defaults from workspace / business identity
  const [isEditingIssuer, setIsEditingIssuer] = useState(true);
  const [issuerName, setIssuerName] = useState('Property Ledge Management');
  const [issuerEmail, setIssuerEmail] = useState('billing@propertyledge.com.au');
  const [issuerPhone, setIssuerPhone] = useState('+61 2 9000 0000');
  const [issuerAddress, setIssuerAddress] = useState('Suite 400, 100 George Street, Sydney NSW 2000');
  const [issuerTaxId, setIssuerTaxId] = useState('ABN 51 824 753 556');

  // Recipient (Issued To) Details
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');

  // Dates & Payment Terms in Australian Timezone
  const [issueDate, setIssueDate] = useState(() => getAuTodayString());
  const [dueDate, setDueDate] = useState(() => {
    const todayParts = getAuDateParts(new Date());
    const dueObj = createAuDate(todayParts.year, todayParts.month, todayParts.day + 14);
    return formatAuDateIso(dueObj);
  });
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(14);

  // Lease / Property Linkage
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>('');
  const [properties, setProperties] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);

  // Line Items
  const [items, setItems] = useState<Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discount?: number;
  }>>([
    { description: 'Professional Property Management Services', quantity: 1, unitPrice: 450, taxRate: 10, discount: 0 },
  ]);

  // Notes & Payment Instructions
  const [notes, setNotes] = useState('Payment is due within the terms specified on this invoice. Thank you for your business.');
  const [paymentInstructions, setPaymentInstructions] = useState(
    'Bank Transfer: BSB 012-345 | Account 6789 0123 (Property Ledge Trust). Please quote the invoice number as reference.'
  );

  // Email template & message body customization
  const [emailSubject, setEmailSubject] = useState('');
  const [customEmailMessage, setCustomEmailMessage] = useState('');
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [showEmailCustomizer, setShowEmailCustomizer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Load properties & leases on open
  useEffect(() => {
    if (isOpen) {
      setStep(isEditMode ? 2 : 0);
      setError(null);
      setActionSuccessMessage(null);

      const loadData = async () => {
        try {
          const props = await fetchDashboardProperties();
          if (Array.isArray(props)) setProperties(props);
          else if (props && (props as any).data && Array.isArray((props as any).data)) setProperties((props as any).data);
        } catch (e) {
          console.error('Error loading properties:', e);
        }

        try {
          let leaseData = await fetchAllWorkspaceLeases();
          if (!Array.isArray(leaseData) || leaseData.length === 0) {
            leaseData = await fetchDashboardLeases();
          }
          if (Array.isArray(leaseData)) setLeases(leaseData);
          else if (leaseData && (leaseData as any).data && Array.isArray((leaseData as any).data)) setLeases((leaseData as any).data);
        } catch (e) {
          console.error('Error loading leases:', e);
        }

        try {
          const cTemplates = await fetchInvoiceTemplatesAction();
          if (Array.isArray(cTemplates)) {
            setCustomTemplates(cTemplates);
            if (cTemplates.length > 0) {
              setTemplateTab('custom');
            }
          }
        } catch (e) {
          console.error('Error loading custom templates:', e);
        }
      };
      loadData();

      if (invoiceToEdit) {
        setInvoiceType(invoiceToEdit.leaseId ? 'lease' : 'standalone');
        setStatus(invoiceToEdit.status || 'draft');
        setCurrency(invoiceToEdit.currency || 'AUD');
        if (invoiceToEdit.invoiceNumber) setInvoiceNumber(invoiceToEdit.invoiceNumber);
        setRecipientName(invoiceToEdit.customerName || (invoiceToEdit as any).recipientName || '');
        setRecipientEmail(invoiceToEdit.customerEmail || (invoiceToEdit as any).recipientEmail || '');
        setRecipientAddress(invoiceToEdit.customerAddress || (invoiceToEdit as any).recipientAddress || '');
        setRecipientPhone((invoiceToEdit as any).recipientPhone || '');
        setIssueDate(invoiceToEdit.issueDate ? formatAuDateIso(invoiceToEdit.issueDate) : getAuTodayString());
        setDueDate(invoiceToEdit.dueDate ? formatAuDateIso(invoiceToEdit.dueDate) : getAuTodayString());
        setSelectedPropertyId(invoiceToEdit.propertyId || '');
        setSelectedLeaseId(invoiceToEdit.leaseId || '');

        if (invoiceToEdit.items && invoiceToEdit.items.length > 0) {
          setItems(
            invoiceToEdit.items.map((i) => ({
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              taxRate: i.taxRate ?? 10,
              discount: (i as any).discount || 0,
            }))
          );
        }
        setNotes(invoiceToEdit.notes || 'Payment is due within the terms specified on this invoice.');
        setPaymentInstructions(invoiceToEdit.paymentInstructions || 'Bank Transfer: BSB 012-345 | Account 6789 0123');
      } else {
        setInvoiceType('standalone');
        setStatus('draft');
        setCurrency('AUD');
        setInvoiceNumber(`INV-${getAuDateParts(new Date()).year}-${Math.floor(1000 + Math.random() * 9000)}`);
        setRecipientName('');
        setRecipientEmail('');
        setRecipientPhone('');
        setRecipientAddress('');
        const todayStr = getAuTodayString();
        setIssueDate(todayStr);
        const parts = getAuDateParts(new Date());
        const dueD = createAuDate(parts.year, parts.month, parts.day + 14);
        setDueDate(formatAuDateIso(dueD));
        setSelectedPropertyId('');
        setSelectedLeaseId('');
        setItems([{ description: 'Professional Property Management Services', quantity: 1, unitPrice: 450, taxRate: 10, discount: 0 }]);
        setSelectedTemplate(getPredefinedTemplateById(initialTemplateId || 'template_classic'));
      }
    }
  }, [isOpen, invoiceToEdit, initialTemplateId]);


  const handleSelectCustomTemplate = (customTmpl: InvoiceTemplateDTO) => {
    const basePreset = getPredefinedTemplateById(customTmpl.layoutStyle || 'classic');
    const merged: PredefinedInvoiceTemplate = {
      ...basePreset,
      id: customTmpl.id,
      name: customTmpl.name,
      badge: customTmpl.isDefault ? 'Workspace Default' : 'Custom Blueprint',
      description: customTmpl.description || `Custom ${customTmpl.layoutStyle} blueprint configuration.`,
      layoutStyle: customTmpl.layoutStyle || 'classic',
      brandColor: customTmpl.brandColor || basePreset.brandColor,
      accentColor: customTmpl.accentColor || basePreset.accentColor,
    };
    setSelectedTemplate(merged);

    if (customTmpl.notes) setNotes(customTmpl.notes);
    if (customTmpl.paymentInstructions) setPaymentInstructions(customTmpl.paymentInstructions);
    if (customTmpl.paymentTermsDays) setPaymentTermsDays(Number(customTmpl.paymentTermsDays));
    if (customTmpl.items && customTmpl.items.length > 0) {
      setItems(
        customTmpl.items.map((i: any) => ({
          description: i.description || 'Service',
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unitPrice) || 0,
          taxRate: i.taxRate !== undefined ? Number(i.taxRate) : 10,
        }))
      );
    }
  };

  if (!isOpen) return null;

  // Handle Preset Due Terms (Net 7, 14, 30) using Australian timezone
  const handleSetTerms = (days: number) => {
    setPaymentTermsDays(days);
    const baseDateStr = issueDate || getAuTodayString();
    const [y, m, d] = baseDateStr.split('-').map((n) => parseInt(n, 10));
    const dueObj = createAuDate(y, m, d + days);
    setDueDate(formatAuDateIso(dueObj));
  };

  // Handle Lease Auto-fill
  const handleLeaseSelect = (leaseId: string) => {
    setSelectedLeaseId(leaseId);
    const found = leases.find((l) => l.id === leaseId);
    if (found) {
      setSelectedPropertyId(found.property_id || found.propertyId || '');
      const tenantRel = found.lease_tenants?.[0] || found.tenants?.[0];
      const t = tenantRel?.tenant || tenantRel;
      if (t) {
        const name = `${t.first_name || t.firstName || ''} ${t.last_name || t.lastName || ''}`.trim() || t.name || '';
        if (name) setRecipientName(name);
        if (t.email) setRecipientEmail(t.email);
        if (t.phone) setRecipientPhone(t.phone);
      }
      if (found.property) {
        const addr = [
          found.property.address_line_1,
          found.property.city || found.property.suburb,
          found.property.state,
          found.property.postal_code,
        ].filter(Boolean).join(', ');
        if (addr) setRecipientAddress(addr);
      }
      const rentAmt = Number(found.rent_amount || found.rentAmount || 0);
      setItems([
        {
          description: `Rent - ${found.rent_frequency || found.rentFrequency || 'Monthly'} (${dueDate})`,
          quantity: 1,
          unitPrice: rentAmt,
          taxRate: 0,
          discount: 0,
        },
      ]);
    }
  };

  // Line Item Helpers
  const handleAddItem = () => {
    setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0, taxRate: 10, discount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Math Calculations
  const subtotal = items.reduce(
    (sum, item) => sum + Math.max(0, (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) - (Number(item.discount) || 0)),
    0
  );
  const taxTotal = items.reduce((sum, item) => {
    const base = Math.max(0, (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) - (Number(item.discount) || 0));
    return sum + (base * (Number(item.taxRate) || 0)) / 100;
  }, 0);
  const grandTotal = subtotal + taxTotal;

  // Validate Step 2
  const validateStep2 = () => {
    setError(null);
    if (!recipientName.trim()) {
      setError('Recipient name is required.');
      return false;
    }
    if (items.some((i) => !i.description.trim())) {
      setError('All invoice line items must have a description.');
      return false;
    }
    if (items.some((i) => (Number(i.quantity) || 0) <= 0)) {
      setError('Line item quantity must be greater than zero.');
      return false;
    }
    return true;
  };

  // Construct Payload
  const buildDto = (issueImmediately: boolean): CreateInvoiceDTO => {
    return {
      templateId: selectedTemplate.id,
      propertyId: invoiceType === 'lease' && selectedPropertyId ? selectedPropertyId : undefined,
      leaseId: invoiceType === 'lease' && selectedLeaseId ? selectedLeaseId : undefined,
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail.trim() || undefined,
      recipientPhone: recipientPhone.trim() || undefined,
      recipientAddress: recipientAddress.trim() || undefined,
      issueDate,
      dueDate,
      currency,
      issuer: {
        name: issuerName.trim(),
        email: issuerEmail.trim() || undefined,
        phone: issuerPhone.trim() || undefined,
        address: issuerAddress.trim() || undefined,
        taxId: issuerTaxId.trim() || undefined,
      },
      items: items.map((i) => ({
        description: i.description.trim(),
        quantity: Number(i.quantity) || 1,
        unitPrice: Number(i.unitPrice) || 0,
        taxRate: Number(i.taxRate) || 0,
        discount: Number(i.discount) || 0,
      })),
      notes: notes.trim() || undefined,
      paymentInstructions: paymentInstructions.trim() || undefined,
    };
  };

  // Actions
  const handleSaveDraft = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      if (isEditMode && invoiceToEdit && onUpdate) {
        await onUpdate(invoiceToEdit.id, {
          status: status as any,
          customerName: recipientName.trim(),
          customerEmail: recipientEmail.trim() || undefined,
          customerAddress: recipientAddress.trim() || undefined,
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim() || undefined,
          recipientAddress: recipientAddress.trim() || undefined,
          issueDate,
          dueDate,
          currency,
          items: items.map((i) => ({
            description: i.description,
            quantity: Number(i.quantity) || 1,
            unitPrice: Number(i.unitPrice) || 0,
            taxRate: Number(i.taxRate) || 0,
          })),
          notes: notes.trim() || undefined,
          paymentInstructions: paymentInstructions.trim() || undefined,
        });
      } else {
        await onSubmit(buildDto(false), false);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    setTestSuccess(null);
    setError(null);
    try {
      const res = await sendAutomationTestEmailAction({
        automationType: 'invoice',
        testRecipient,
        customerName: recipientName.trim() || 'Valued Recipient',
        customerEmail: recipientEmail.trim() || undefined,
        customerAddress: recipientAddress.trim() || undefined,
        description: items[0]?.description || 'Invoice Services',
        amount: grandTotal,
        currency,
        invoiceTemplateId: selectedTemplate.id,
        issuedByOverride: {
          name: issuerName.trim(),
          email: issuerEmail.trim(),
          phone: issuerPhone.trim(),
          address: issuerAddress.trim(),
          taxId: issuerTaxId.trim(),
        },
      });

      if (!res.success) throw new Error(res.error || 'Failed to send test email');
      setTestSuccess(`Test invoice email sent to ${res.recipient || testRecipient || 'your inbox'}!`);
      setTimeout(() => setTestSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleIssueAndDownload = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      await onSubmit(buildDto(true), true);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to issue invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueAndSendEmail = async () => {
    if (!validateStep2()) return;
    if (!recipientEmail.trim()) {
      setError('A recipient email address is required to send this invoice via email.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit(buildDto(true), true, {
        subject: emailSubject.trim() || undefined,
        customMessage: customEmailMessage.trim() || undefined,
        driveFolderUrl: driveFolderUrl.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to issue and send invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in font-sans">
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Top Header & Wizard Stepper */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#008F83]/10 text-[#008F83] border border-[#008F83]/20 shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {isEditMode ? `Edit Invoice ${invoiceToEdit?.invoiceNumber}` : 'Create New Invoice'}
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#008F83]/10 text-[#008F83] border border-[#008F83]/20">
                  {invoiceType === 'lease' ? 'Lease Linked' : 'Standalone'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {WIZARD_STEPS[step]?.label} · PropertyLedge Invoicing
              </p>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 md:gap-2 text-xs font-bold">
            {WIZARD_STEPS.map((s, i) => (
              <React.Fragment key={s.idx}>
                {i > 0 && (
                  <div
                    className={cn(
                      'h-0.5 w-3 md:w-5 transition-colors',
                      step >= s.idx ? 'bg-[#008F83]' : 'bg-slate-200 dark:bg-slate-800'
                    )}
                  />
                )}
                <button
                  type="button"
                  disabled={s.idx > step && (s.idx > 2 || (s.idx === 3 && !validateStep2()))}
                  onClick={() => {
                    if (s.idx === 3 && !validateStep2()) return;
                    setStep(s.idx);
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold border',
                    step === s.idx
                      ? 'bg-[#008F83] text-white border-[#008F83] shadow-xs'
                      : step > s.idx
                      ? 'bg-[#008F83]/10 text-[#008F83] border-[#008F83]/30 hover:bg-[#008F83]/20'
                      : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-800 opacity-60'
                  )}
                >
                  {step > s.idx ? (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : (
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]">
                      {s.idx + 1}
                    </span>
                  )}
                  <span className="hidden md:inline">{s.label.split('. ')[1]}</span>
                </button>
              </React.Fragment>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Alerts */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-500 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Wizard Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm">
          
          {/* ═══════════════════════════════════════════════════════
              STEP 0: CHOOSE INVOICE TYPE (STANDALONE VS PROPERTY LEASE RENT)
             ═══════════════════════════════════════════════════════ */}
          {step === 0 && (
            <div className="space-y-6 py-2">
              <div className="text-center max-w-xl mx-auto mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#008F83]/10 text-[#008F83] text-xs font-bold border border-[#008F83]/20 mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Step 1 of 4 · Invoice Workflow
                </span>
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Select Invoice Category
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Choose how you want to bill this invoice. You can bill an independent client or link directly to an active property tenancy.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
                {/* Option 1: Independent Customer Invoice */}
                <div
                  onClick={() => setInvoiceType('standalone')}
                  className={cn(
                    'cursor-pointer rounded-3xl p-6 border-2 transition-all flex flex-col justify-between relative group hover:shadow-xl',
                    invoiceType === 'standalone'
                      ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 shadow-lg ring-4 ring-[#008F83]/15'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                  )}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
                        invoiceType === 'standalone'
                          ? 'bg-[#008F83] text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-[#008F83]/10 group-hover:text-[#008F83]'
                      )}>
                        <User className="w-6 h-6" />
                      </div>
                      <span className={cn(
                        'text-[10.5px] font-bold px-2.5 py-1 rounded-full border',
                        invoiceType === 'standalone'
                          ? 'bg-[#008F83]/15 text-[#008F83] border-[#008F83]/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      )}>
                        Standard Direct
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#008F83] transition-colors">
                        Independent Customer Invoice
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                        Bill external clients, contractors, or customers directly for consulting, maintenance services, or custom ad-hoc charges.
                      </p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={cn('w-4 h-4', invoiceType === 'standalone' ? 'text-[#008F83]' : 'text-slate-400')} />
                        <span>No lease or tenancy linkage required</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={cn('w-4 h-4', invoiceType === 'standalone' ? 'text-[#008F83]' : 'text-slate-400')} />
                        <span>Custom client recipient information</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={cn('w-4 h-4', invoiceType === 'standalone' ? 'text-[#008F83]' : 'text-slate-400')} />
                        <span>Itemized line items with custom tax & rates</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className={cn(
                      'text-xs font-bold transition-colors',
                      invoiceType === 'standalone' ? 'text-[#008F83]' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    )}>
                      {invoiceType === 'standalone' ? '✓ Selected Category' : 'Click to select'}
                    </span>
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-all',
                      invoiceType === 'standalone'
                        ? 'bg-[#008F83] text-white shadow-xs'
                        : 'border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-transparent'
                    )}>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </div>
                </div>

                {/* Option 2: Property Lease Rent Invoice */}
                <div
                  onClick={() => setInvoiceType('lease')}
                  className={cn(
                    'cursor-pointer rounded-3xl p-6 border-2 transition-all flex flex-col justify-between relative group hover:shadow-xl',
                    invoiceType === 'lease'
                      ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 shadow-lg ring-4 ring-[#008F83]/15'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                  )}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
                        invoiceType === 'lease'
                          ? 'bg-[#008F83] text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-[#008F83]/10 group-hover:text-[#008F83]'
                      )}>
                        <Building2 className="w-6 h-6" />
                      </div>
                      <span className={cn(
                        'text-[10.5px] font-bold px-2.5 py-1 rounded-full border',
                        invoiceType === 'lease'
                          ? 'bg-[#008F83]/15 text-[#008F83] border-[#008F83]/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      )}>
                        Tenancy Linked
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#008F83] transition-colors">
                        Property Lease Rent Invoice
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                        Formal tenancy billing tied to active leases. Automatically synchronizes tenant details, property address, and recurring rent schedule.
                      </p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={cn('w-4 h-4', invoiceType === 'lease' ? 'text-[#008F83]' : 'text-slate-400')} />
                        <span>Auto-populates tenant & property records</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={cn('w-4 h-4', invoiceType === 'lease' ? 'text-[#008F83]' : 'text-slate-400')} />
                        <span>Pre-loads agreed rent amount & frequency</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={cn('w-4 h-4', invoiceType === 'lease' ? 'text-[#008F83]' : 'text-slate-400')} />
                        <span>Syncs directly to property financial ledger</span>
                      </div>
                    </div>

                    {/* Quick lease selector if lease mode is selected */}
                    {invoiceType === 'lease' && (
                      <div
                        className="mt-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-[#008F83]/30 shadow-xs space-y-1.5 animate-in fade-in"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Select
                          label="Select Active Lease (Optional here or in details)"
                          value={selectedLeaseId}
                          onChange={(e) => handleLeaseSelect(e.target.value)}
                          className="text-xs font-semibold"
                        >
                          <option value="">-- Choose active tenancy lease ({leases.length} available) --</option>
                          {leases.map((l) => {
                            const tenantRel = l.lease_tenants?.[0] || l.tenants?.[0];
                            const t = tenantRel?.tenant || tenantRel;
                            const tenantName = t ? `${t.first_name || ''} ${t.last_name || ''}`.trim() : '';
                            const propTitle = l.property?.name || l.property?.address_line_1 || 'Property';
                            return (
                              <option key={l.id} value={l.id}>
                                {propTitle} {tenantName ? `(${tenantName})` : ''} • ${l.rent_amount} ({l.rent_frequency || 'monthly'})
                              </option>
                            );
                          })}
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className={cn(
                      'text-xs font-bold transition-colors',
                      invoiceType === 'lease' ? 'text-[#008F83]' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    )}>
                      {invoiceType === 'lease' ? '✓ Selected Category' : 'Click to select'}
                    </span>
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-all',
                      invoiceType === 'lease'
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

          {/* ═══════════════════════════════════════════════════════
              STEP 1: SELECT INVOICE TEMPLATE
             ═══════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Step 2 — Select Invoice Template</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Choose from {customTemplates.length} custom saved blueprint{customTemplates.length === 1 ? '' : 's'} or {PREDEFINED_INVOICE_TEMPLATES.length} canonical presets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTemplateBuilderOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-[#008F83]/30 bg-[#008F83]/10 hover:bg-[#008F83]/20 text-[#008F83] flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Templates & Blueprints
                </button>
              </div>

              {/* Category Tabs: Presets vs Custom Blueprints */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => setTemplateTab('custom')}
                  className={cn(
                    'px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer',
                    templateTab === 'custom'
                      ? 'bg-[#008F83] text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Custom Blueprints ({customTemplates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateTab('presets')}
                  className={cn(
                    'px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer',
                    templateTab === 'presets'
                      ? 'bg-[#008F83] text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <LayoutTemplate className="w-3.5 h-3.5" />
                  Canonical Presets ({PREDEFINED_INVOICE_TEMPLATES.length})
                </button>
              </div>

              {/* TAB 1: CUSTOM BLUEPRINTS */}
              {templateTab === 'custom' && (
                <div>
                  {customTemplates.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="w-12 h-12 rounded-2xl bg-[#008F83]/10 text-[#008F83] flex items-center justify-center mx-auto">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Custom Blueprints Configured Yet</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                          You can create custom billing blueprints with pre-set items, payment instructions, and custom branding rules.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsTemplateBuilderOpen(true)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-[#008F83] text-white hover:bg-[#008F83]/90 shadow-xs inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        Create Your First Custom Blueprint
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                      {customTemplates.map((customTmpl) => {
                        const isSelected = selectedTemplate.id === customTmpl.id;
                        return (
                          <div
                            key={customTmpl.id}
                            onClick={() => handleSelectCustomTemplate(customTmpl)}
                            className={cn(
                              'cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between relative group hover:shadow-lg',
                              isSelected
                                ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 ring-2 ring-[#008F83]/30 shadow-md'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                            )}
                          >
                            <div className="space-y-3">
                              {/* Header Badge */}
                              <div className="flex items-center justify-between">
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
                                  style={{ backgroundColor: customTmpl.brandColor || '#008F83' }}
                                />
                                <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-[#008F83]/10 text-[#008F83] border border-[#008F83]/20">
                                  {customTmpl.isDefault ? 'Workspace Default' : 'Custom Blueprint'}
                                </span>
                              </div>

                              {/* Title & Description */}
                              <div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#008F83] transition-colors">
                                  {customTmpl.name}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                                  {customTmpl.description || `Custom ${customTmpl.layoutStyle || 'classic'} invoice template with pre-configured line items.`}
                                </p>
                              </div>

                              {/* Details Summary */}
                              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80 font-mono">
                                <span>{customTmpl.items?.length || 0} line item(s)</span>
                                <span>Net {customTmpl.paymentTermsDays || 14} Days</span>
                              </div>

                              {/* Style Swatches Preview */}
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                <div className="flex items-center gap-1">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: customTmpl.brandColor || '#008F83' }} />
                                  <span>Brand</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: customTmpl.accentColor || '#008F83' }} />
                                  <span>Accent</span>
                                </div>
                                <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 capitalize">
                                  {customTmpl.layoutStyle || 'classic'}
                                </span>
                              </div>
                            </div>

                            {/* Selected indicator */}
                            <div className="mt-4 pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80">
                              <span className={cn('text-xs font-bold', isSelected ? 'text-[#008F83]' : 'text-slate-400')}>
                                {isSelected ? '✓ Selected Blueprint' : 'Click to select'}
                              </span>
                              <div
                                className={cn(
                                  'w-5 h-5 rounded-full flex items-center justify-center border transition-colors',
                                  isSelected
                                    ? 'bg-[#008F83] text-white border-[#008F83]'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-transparent'
                                )}
                              >
                                <Check className="w-3 h-3" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PREDEFINED CANONICAL PRESETS */}
              {templateTab === 'presets' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                  {PREDEFINED_INVOICE_TEMPLATES.map((tmpl) => {
                    const isSelected = selectedTemplate.id === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => setSelectedTemplate(tmpl)}
                        className={cn(
                          'cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between relative group hover:shadow-lg',
                          isSelected
                            ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 ring-2 ring-[#008F83]/30 shadow-md'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                        )}
                      >
                        <div className="space-y-3">
                          {/* Header Badge */}
                          <div className="flex items-center justify-between">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
                              style={{ backgroundColor: tmpl.brandColor }}
                            />
                            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                              {tmpl.badge}
                            </span>
                          </div>

                          {/* Title & Description */}
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#008F83] transition-colors">
                              {tmpl.name}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                              {tmpl.description}
                            </p>
                          </div>

                          {/* Style Swatches Preview */}
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            <div className="flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tmpl.brandColor }} />
                              <span>Brand</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tmpl.accentColor }} />
                              <span>Accent</span>
                            </div>
                            <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 capitalize">
                              {tmpl.layoutStyle}
                            </span>
                          </div>
                        </div>

                        {/* Selected indicator */}
                        <div className="mt-4 pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80">
                          <span className={cn('text-xs font-bold', isSelected ? 'text-[#008F83]' : 'text-slate-400')}>
                            {isSelected ? '✓ Selected Template' : 'Click to select'}
                          </span>
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full flex items-center justify-center border transition-colors',
                              isSelected
                                ? 'bg-[#008F83] text-white border-[#008F83]'
                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-transparent'
                            )}
                          >
                            <Check className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STEP 2: INVOICE INFORMATION & LINE ITEMS
             ═══════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-6">
              
              {/* Type Indicator Banner (Selection choice made at opening, no internal tabs) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#008F83]/10 text-[#008F83] flex items-center justify-center shrink-0">
                    {invoiceType === 'lease' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {invoiceType === 'lease' ? 'Property Lease Rent Invoice' : 'Independent Customer Invoice'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#008F83]/10 text-[#008F83] border border-[#008F83]/20">
                        {invoiceType === 'lease' ? 'Tenancy Linked' : 'Standard Direct'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {invoiceType === 'lease'
                        ? selectedLeaseId
                          ? `Linked to: ${leases.find((l) => l.id === selectedLeaseId)?.property?.name || 'Selected Lease'}`
                          : 'Linked to property lease & tenant records'
                        : 'Independent billing without property tenancy association'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#008F83] hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors self-start sm:self-auto"
                >
                  Change Category
                </button>
              </div>

              {/* Sub-Workflow Circular Progress Stepper Navigation */}
              <nav aria-label="Invoice Details Progress" className="py-1 px-2 my-1">
                <div className="flex items-center justify-center max-w-md mx-auto relative">
                  {/* Connecting line track */}
                  <div className="absolute top-3 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />
                  <div
                    className="absolute top-3 left-6 h-0.5 bg-[#008F83] -z-0 transition-all duration-300"
                    style={{
                      width:
                        detailSubStep === 0
                          ? '0%'
                          : detailSubStep === 1
                          ? '50%'
                          : 'calc(100% - 48px)',
                    }}
                  />

                  <div className="w-full flex items-center justify-between z-10 px-1">
                    {[
                      { id: 1, name: 'Parties & Identity', icon: User },
                      { id: 2, name: 'Schedule & Dates', icon: Calendar },
                      { id: 3, name: 'Line Items & Terms', icon: FileText },
                    ].map((s, idx) => {
                      const isCurrent = idx === detailSubStep;
                      const isCompleted = idx < detailSubStep;

                      return (
                        <div key={s.id} className="flex flex-col items-center group">
                          <button
                            type="button"
                            onClick={() => setDetailSubStep(idx)}
                            className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200 cursor-pointer focus:outline-none',
                              isCurrent
                                ? 'bg-[#008F83] text-white shadow-xs ring-3 ring-[#008F83]/20 scale-105'
                                : isCompleted
                                ? 'bg-[#008F83] text-white shadow-2xs hover:bg-[#008F83]/90'
                                : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                            )}
                            title={`Jump to ${s.name}`}
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

              {/* ──── SUB-STEP 1: PARTIES & IDENTITY ──── */}
              {detailSubStep === 0 && (
                <div className="space-y-4 animate-in fade-in">
                  {/* Lease Picker if in lease mode */}
                  {invoiceType === 'lease' && (
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#008F83]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Active Tenancy & Lease Linkage
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                          label="Select Active Lease *"
                          value={selectedLeaseId}
                          onChange={(e) => handleLeaseSelect(e.target.value)}
                        >
                          <option value="">-- Choose active lease ({leases.length} available) --</option>
                          {leases.map((l) => {
                            const tenantRel = l.lease_tenants?.[0] || l.tenants?.[0];
                            const t = tenantRel?.tenant || tenantRel;
                            const tenantName = t ? `${t.first_name || ''} ${t.last_name || ''}`.trim() : '';
                            return (
                              <option key={l.id} value={l.id}>
                                {l.property?.name || 'Property'} {tenantName ? `(${tenantName})` : ''} • ${l.rent_amount} ({l.rent_frequency || 'monthly'})
                              </option>
                            );
                          })}
                        </Select>
                        <Select
                          label="Linked Property"
                          value={selectedPropertyId}
                          onChange={(e) => setSelectedPropertyId(e.target.value)}
                        >
                          <option value="">-- None (Standalone) --</option>
                          {properties.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name || p.address_line_1}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* ─── ISSUED BY SECTION (Business Identity) ─── */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#008F83]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Issued By (Business Identity)
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">• Saved Profile Data</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingIssuer(!isEditingIssuer)}
                        className="text-xs font-bold text-[#008F83] hover:underline flex items-center gap-1"
                      >
                        {isEditingIssuer ? 'Collapse Details' : 'Edit Issuer Details'}
                        {isEditingIssuer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {isEditingIssuer ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 animate-in fade-in">
                        <Input
                          label="Business Name"
                          type="text"
                          value={issuerName}
                          onChange={(e) => setIssuerName(e.target.value)}
                        />
                        <Input
                          label="Business Email"
                          type="email"
                          value={issuerEmail}
                          onChange={(e) => setIssuerEmail(e.target.value)}
                        />
                        <Input
                          label="Business Phone"
                          type="text"
                          value={issuerPhone}
                          onChange={(e) => setIssuerPhone(e.target.value)}
                        />
                        <div className="md:col-span-2">
                          <Input
                            label="Registered Business Address"
                            type="text"
                            value={issuerAddress}
                            onChange={(e) => setIssuerAddress(e.target.value)}
                          />
                        </div>
                        <div>
                          <Input
                            label="ABN / Tax ID"
                            type="text"
                            value={issuerTaxId}
                            onChange={(e) => setIssuerTaxId(e.target.value)}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="font-bold text-slate-900 dark:text-white">{issuerName}</span>
                        <span>• {issuerEmail}</span>
                        <span>• {issuerPhone}</span>
                        {issuerTaxId && <span>• {issuerTaxId}</span>}
                      </div>
                    )}
                  </div>

                  {/* ─── ISSUED TO SECTION (Recipient Information) ─── */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#008F83]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Issued To (Recipient Information)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                      <Input
                        label="Recipient Name *"
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="e.g. John Smith / Acme Corp"
                      />
                      <Input
                        label="Recipient Email"
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="john.smith@tenant.com"
                      />
                      <Input
                        label="Recipient Phone"
                        type="text"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        placeholder="+61 400 000 000"
                      />
                      <div className="md:col-span-3">
                        <Input
                          label="Billing Address"
                          type="text"
                          value={recipientAddress}
                          onChange={(e) => setRecipientAddress(e.target.value)}
                          placeholder="Unit 12, 45 Oxford Street, Bondi Junction NSW 2022"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ──── SUB-STEP 2: SCHEDULE & DATES ──── */}
              {detailSubStep === 1 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#008F83]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Invoice Schedule & Currency
                        </span>
                      </div>
                      {/* Live AU Eastern Time Indicator Banner */}
                      <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          Live AU Time:
                        </span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-[11px]">
                          {auCurrentTimeStr}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <Input
                        label="Invoice Number *"
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        className="font-mono font-bold"
                      />
                      <Select
                        label="Billing Currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                      >
                        {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} — {c.name} ({c.symbol})
                          </option>
                        ))}
                      </Select>
                      <Input
                        label="Issue Date (AU) *"
                        type="date"
                        value={issueDate}
                        onChange={(e) => {
                          const newIssueDate = e.target.value;
                          setIssueDate(newIssueDate);
                          if (dueDate && newIssueDate > dueDate) {
                            setDueDate(newIssueDate);
                          }
                        }}
                      />
                      <Input
                        label="Due Date (AU) *"
                        type="date"
                        min={issueDate}
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>

                    {/* Quick Due Date Presets */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Quick Terms:</span>
                      {[
                        { label: 'Net 7 Days', days: 7 },
                        { label: 'Net 14 Days', days: 14 },
                        { label: 'Net 30 Days', days: 30 },
                      ].map((term) => (
                        <button
                          key={term.days}
                          type="button"
                          onClick={() => handleSetTerms(term.days)}
                          className={cn(
                            'px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-150',
                            paymentTermsDays === term.days
                              ? 'bg-[#008F83] text-white border-[#008F83] shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#008F83]/40'
                          )}
                        >
                          {term.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ──── SUB-STEP 3: LINE ITEMS & TERMS ──── */}
              {detailSubStep === 2 && (
                <div className="space-y-4 animate-in fade-in">
                  {/* ─── LINE ITEMS TABLE ─── */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#008F83]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Invoice Line Items
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#008F83]" /> Add Line Item
                      </button>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
                            <th className="p-3.5">Description</th>
                            <th className="p-3.5 w-24 text-center">Qty</th>
                            <th className="p-3.5 w-32 text-right">Unit Rate</th>
                            <th className="p-3.5 w-24 text-center">GST / Tax</th>
                            <th className="p-3.5 w-32 text-right">Line Total</th>
                            <th className="p-3.5 w-12 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                          {items.map((item, idx) => {
                            const lineBase = Math.max(0, (item.quantity || 0) * (item.unitPrice || 0) - (item.discount || 0));
                            const lineTotal = lineBase * (1 + (item.taxRate || 0) / 100);
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="p-3">
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                    placeholder="Service description or item details..."
                                    className="w-full h-10 px-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#008F83] focus:bg-white dark:focus:bg-slate-800 transition-colors"
                                  />
                                </td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                                    className="w-full h-10 px-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-medium text-center font-mono focus:outline-none focus:border-[#008F83] focus:bg-white dark:focus:bg-slate-800 transition-colors"
                                  />
                                </td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.unitPrice}
                                    onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                                    className="w-full h-10 px-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-medium text-right font-mono focus:outline-none focus:border-[#008F83] focus:bg-white dark:focus:bg-slate-800 transition-colors"
                                  />
                                </td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="100"
                                    value={item.taxRate}
                                    onChange={(e) => handleItemChange(idx, 'taxRate', Number(e.target.value))}
                                    className="w-full h-10 px-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-medium text-center font-mono focus:outline-none focus:border-[#008F83] focus:bg-white dark:focus:bg-slate-800 transition-colors"
                                  />
                                </td>
                                <td className="p-3 text-right font-bold text-slate-900 dark:text-white font-mono text-sm">
                                  {formatCurrency(lineTotal, currency)}
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(idx)}
                                    disabled={items.length <= 1}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors disabled:opacity-20 disabled:pointer-events-none"
                                    title="Remove line item"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Calculation Summary Box */}
                    <div className="flex justify-end pt-2">
                      <div className="w-full sm:w-80 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-2.5 shadow-xs">
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>Subtotal:</span>
                          <span className="text-slate-900 dark:text-white font-mono font-semibold">{formatCurrency(subtotal, currency)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>Estimated Tax (GST/VAT):</span>
                          <span className="text-slate-900 dark:text-white font-mono font-semibold">{formatCurrency(taxTotal, currency)}</span>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-2.5 flex justify-between items-center text-sm font-bold">
                          <span className="text-slate-900 dark:text-white">Invoice Total:</span>
                          <span className="text-[#008F83] font-mono text-base font-extrabold">{formatCurrency(grandTotal, currency)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ─── NOTES & PAYMENT INSTRUCTIONS ─── */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Terms & Payment Instructions
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <Textarea
                        label="Special Terms / Notes (Publicly visible)"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any special conditions, covenants, or clauses..."
                      />
                      <Textarea
                        label="Payment Remittance Instructions"
                        rows={3}
                        value={paymentInstructions}
                        onChange={(e) => setPaymentInstructions(e.target.value)}
                        placeholder="Bank Transfer: BSB 012-345 | Account 6789 0123 (Property Ledge Trust)..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STEP 3: LIVE PREVIEW & DOWNLOAD / SEND
             ═══════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Step 4 — Review Live Invoice Preview</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Rendered using template <span className="font-bold text-[#008F83]">{selectedTemplate.name}</span>.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Change Template:</span>
                  <select
                    value={selectedTemplate.id}
                    onChange={(e) => setSelectedTemplate(getPredefinedTemplateById(e.target.value))}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {PREDEFINED_INVOICE_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.badge})
                      </option>
                    ))}
                  </select>
                  <Link
                    href="/dashboard/invoices/templates"
                    className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-all"
                    title="View & Edit All Templates"
                  >
                    <LayoutTemplate className="w-3.5 h-3.5 text-[#008F83]" />
                    <span>Templates</span>
                  </Link>
                </div>
              </div>

              {/* Test Email Sandbox Bar */}
              <div className="bg-[#008F83]/5 border border-[#008F83]/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#008F83]/15 text-[#008F83] flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      Send Test Email
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-[#008F83]/15 text-[#008F83] rounded-md">
                        Sandbox Safe
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Deliver a full preview with dynamic calculations to your test inbox before issuing.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="Enter test recipient email..."
                    className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#008F83] w-56"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendTestEmail}
                    disabled={isSendingTest}
                    className="h-8 text-xs font-bold text-[#008F83] border-[#008F83]/30 hover:bg-[#008F83]/10"
                  >
                    {isSendingTest ? 'Sending...' : 'Send Test Email'}
                  </Button>
                </div>
              </div>

              {testSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{testSuccess}</span>
                </div>
              )}

              {/* Live A4 Renderer */}
              <LiveInvoiceRenderer
                data={{
                  invoiceNumber,
                  issueDate,
                  dueDate,
                  currency,
                  customerName: recipientName || 'Valued Recipient',
                  customerEmail: recipientEmail,
                  customerAddress: recipientAddress,
                  issuerName,
                  issuerEmail,
                  issuerPhone,
                  issuerAddress,
                  issuerTaxId,
                  items,
                  notes,
                  paymentInstructions,
                  layoutStyle: selectedTemplate.layoutStyle,
                  brandColor: selectedTemplate.brandColor,
                  accentColor: selectedTemplate.accentColor,
                  status: 'draft',
                }}
              />
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════
            FOOTER ACTIONS
           ═══════════════════════════════════════════════════════ */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between">
          <div>
            {step > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (step === 2 && detailSubStep > 0) {
                    setDetailSubStep((s) => s - 1);
                  } else {
                    setStep((s) => s - 1);
                  }
                }}
                disabled={loading}
                className="font-bold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={onClose} disabled={loading} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 text-xs">
                Cancel
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setStep(1)}
                className="font-bold shadow-xs text-xs gap-1.5 bg-[#008F83] hover:bg-[#008F83]/90 text-white"
              >
                Continue to Select Template <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}

            {step === 1 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setStep(2)}
                className="font-bold shadow-xs text-xs gap-1.5 bg-[#008F83] hover:bg-[#008F83]/90 text-white"
              >
                Continue to Invoice Details <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}

            {step === 2 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={loading}
                  className="font-bold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs"
                >
                  Save Draft
                </Button>
                {detailSubStep < 2 ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setDetailSubStep((s) => s + 1)}
                    className="font-bold shadow-xs text-xs gap-1.5 bg-[#008F83] hover:bg-[#008F83]/90 text-white"
                  >
                    Next Section <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (validateStep2()) setStep(3);
                    }}
                    className="font-bold shadow-xs text-xs gap-1.5 bg-[#008F83] hover:bg-[#008F83]/90 text-white"
                  >
                    Preview Document <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={loading}
                  className="font-bold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs"
                >
                  Save Draft
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleIssueAndDownload}
                  disabled={loading}
                  className="font-bold shadow-xs text-xs gap-1.5 bg-[#008F83] hover:bg-[#008F83]/90 text-white"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Issue & Download PDF
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Custom Template / Blueprint Builder Modal */}
      <InvoiceTemplateModal
        isOpen={isTemplateBuilderOpen}
        onClose={() => setIsTemplateBuilderOpen(false)}
        onSuccess={() => {
          setIsTemplateBuilderOpen(false);
          fetchInvoiceTemplatesAction().then((cTemplates: InvoiceTemplateDTO[]) => {
            if (Array.isArray(cTemplates)) {
              setCustomTemplates(cTemplates);
              if (cTemplates.length > 0) {
                setTemplateTab('custom');
              }
            }
          });
        }}
      />
    </div>
  );
}
