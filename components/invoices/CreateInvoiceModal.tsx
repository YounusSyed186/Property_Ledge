'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/admin/ui';
import { CreateInvoiceDTO, UpdateInvoiceDTO, InvoiceDTO } from '@/modules/invoices';
import {
  PREDEFINED_INVOICE_TEMPLATES,
  PredefinedInvoiceTemplate,
  getPredefinedTemplateById,
} from '@/modules/invoices/domain/constants/predefined-templates';
import { formatCurrency, SUPPORTED_CURRENCIES } from '@/modules/invoices/domain/value-objects/currency';
import { fetchDashboardProperties, fetchAllWorkspaceLeases } from '@/app/actions/dashboard';
import { getInvoiceDownloadUrlAction, generateInvoiceDocumentAction, sendInvoiceEmailAction } from '@/app/actions/invoices';
import { LiveInvoiceRenderer } from './LiveInvoiceRenderer';
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

export function CreateInvoiceModal({
  isOpen,
  onClose,
  onSubmit,
  invoiceToEdit,
  onUpdate,
  initialTemplateId,
}: CreateInvoiceModalProps) {
  const isEditMode = Boolean(invoiceToEdit);

  // 3-Step Wizard: 0 = Choose Template, 1 = Invoice Details, 2 = Live Preview & Send
  const [step, setStep] = useState<number>(isEditMode ? 1 : 0);
  const [selectedTemplate, setSelectedTemplate] = useState<PredefinedInvoiceTemplate>(() => {
    return getPredefinedTemplateById(initialTemplateId || 'template_classic');
  });

  // Live Australian Time state
  const [auCurrentTimeStr, setAuCurrentTimeStr] = useState<string>(() =>
    formatAuDisplayDateTime(new Date(), true)
  );

  useEffect(() => {
    if (!isOpen) return;
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

  // Issuer (Issued By) Details - Defaults from workspace / business identity
  const [isEditingIssuer, setIsEditingIssuer] = useState(false);
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
      setStep(isEditMode ? 1 : 0);
      setError(null);
      setActionSuccessMessage(null);

      fetchDashboardProperties().then((res: any) => {
        if (Array.isArray(res)) setProperties(res);
        else if (res?.success && res?.data) setProperties(res.data);
      });
      fetchAllWorkspaceLeases().then((res: any) => {
        if (Array.isArray(res)) setLeases(res);
        else if (res?.success && res?.data) setLeases(res.data);
      });

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="bg-admin-surface border border-admin-border text-admin-foreground rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Top Header & Wizard Stepper */}
        <div className="px-6 py-4 border-b border-admin-border bg-admin-surface-subtle/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-admin-primary/10 text-admin-primary border border-admin-primary/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-admin-foreground flex items-center gap-2">
                {isEditMode ? `Edit Invoice ${invoiceToEdit?.invoiceNumber}` : 'Create New Invoice'}
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-admin-primary/10 text-admin-primary border border-admin-primary/20">
                  Fixed 5-Template System
                </span>
              </h2>
              <p className="text-xs text-admin-muted mt-0.5">
                Simple 3-Step Process: Select Template → Fill Details → Preview & Send
              </p>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold">
            {[
              { idx: 0, label: '1. Select Template' },
              { idx: 1, label: '2. Invoice Info' },
              { idx: 2, label: '3. Preview & Issue' },
            ].map((s) => (
              <button
                key={s.idx}
                type="button"
                onClick={() => {
                  if (s.idx === 2 && !validateStep2()) return;
                  setStep(s.idx);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 border',
                  step === s.idx
                    ? 'bg-admin-primary text-white border-admin-primary shadow-xs'
                    : step > s.idx
                    ? 'bg-admin-surface-subtle text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-admin-surface text-admin-muted border-admin-border opacity-60'
                )}
              >
                {step > s.idx && <Check className="w-3.5 h-3.5" />}
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="text-admin-muted hover:text-admin-foreground p-1.5 rounded-lg hover:bg-admin-surface-subtle transition-colors"
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
              STEP 1: SELECT 1 OF 5 FIXED PREDEFINED TEMPLATES
             ═══════════════════════════════════════════════════════ */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-admin-foreground">Step 1 — Select Fixed Invoice Template</h3>
                  <p className="text-xs text-admin-muted mt-0.5">
                    Choose one of the 5 canonical, application-managed templates. Design and styles are strictly standardized.
                  </p>
                </div>
                <span className="text-xs font-semibold text-admin-muted">5 Predefined Templates</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {PREDEFINED_INVOICE_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplate.id === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedTemplate(tmpl)}
                      className={cn(
                        'cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between relative group hover:shadow-lg',
                        isSelected
                          ? 'border-admin-primary bg-admin-primary/5 ring-2 ring-admin-primary/30 shadow-md'
                          : 'border-admin-border bg-admin-surface-subtle/50 hover:border-admin-border/80 hover:bg-admin-surface-subtle'
                      )}
                    >
                      <div className="space-y-3">
                        {/* Header Badge */}
                        <div className="flex items-center justify-between">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
                            style={{ backgroundColor: tmpl.brandColor }}
                          />
                          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-admin-surface border border-admin-border text-admin-muted">
                            {tmpl.badge}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 className="font-bold text-sm text-admin-foreground group-hover:text-admin-primary transition-colors">
                            {tmpl.name}
                          </h4>
                          <p className="text-xs text-admin-muted mt-1 leading-relaxed">
                            {tmpl.description}
                          </p>
                        </div>

                        {/* Style Swatches Preview */}
                        <div className="flex items-center gap-2 pt-2 border-t border-admin-border/50 text-[11px] text-admin-muted font-mono">
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tmpl.brandColor }} />
                            <span>Brand</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tmpl.accentColor }} />
                            <span>Accent</span>
                          </div>
                          <span className="ml-auto text-[10px] text-admin-muted capitalize">
                            {tmpl.layoutStyle}
                          </span>
                        </div>
                      </div>

                      {/* Selected indicator */}
                      <div className="mt-4 pt-3 flex items-center justify-between border-t border-admin-border/50">
                        <span className={cn('text-xs font-bold', isSelected ? 'text-admin-primary' : 'text-admin-muted')}>
                          {isSelected ? '✓ Selected Template' : 'Click to select'}
                        </span>
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center border transition-colors',
                            isSelected
                              ? 'bg-admin-primary text-white border-admin-primary'
                              : 'border-admin-border bg-admin-surface text-transparent'
                          )}
                        >
                          <Check className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STEP 2: INVOICE INFORMATION & LINE ITEMS
             ═══════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-6">
              
              {/* Type Switcher */}
              <div className="flex bg-admin-surface-subtle p-1 rounded-xl border border-admin-border">
                <button
                  type="button"
                  onClick={() => setInvoiceType('standalone')}
                  className={cn(
                    'flex-1 py-2 px-4 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2',
                    invoiceType === 'standalone'
                      ? 'bg-admin-surface text-admin-foreground shadow-xs border border-admin-border'
                      : 'text-admin-muted hover:text-admin-foreground'
                  )}
                >
                  <User className="w-3.5 h-3.5" />
                  Independent Customer Invoice (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceType('lease')}
                  className={cn(
                    'flex-1 py-2 px-4 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2',
                    invoiceType === 'lease'
                      ? 'bg-admin-surface text-admin-foreground shadow-xs border border-admin-border'
                      : 'text-admin-muted hover:text-admin-foreground'
                  )}
                >
                  <Building className="w-3.5 h-3.5" />
                  Property Lease Rent Invoice
                </button>
              </div>

              {/* Lease Picker if in lease mode */}
              {invoiceType === 'lease' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-admin-surface-subtle border border-admin-border rounded-xl">
                  <div>
                    <label className="block text-xs font-bold text-admin-foreground mb-1.5">Select Active Lease</label>
                    <select
                      value={selectedLeaseId}
                      onChange={(e) => handleLeaseSelect(e.target.value)}
                      className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary"
                    >
                      <option value="">-- Choose active lease --</option>
                      {leases.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.property?.name || 'Property'} • Rent: ${l.rent_amount} ({l.rent_frequency})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-admin-foreground mb-1.5">Linked Property</label>
                    <select
                      value={selectedPropertyId}
                      onChange={(e) => setSelectedPropertyId(e.target.value)}
                      className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary"
                    >
                      <option value="">-- None (Standalone) --</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* ─── ISSUED BY SECTION (Pre-filled Reusable Business Info) ─── */}
              <div className="bg-admin-surface-subtle/50 border border-admin-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-admin-primary" />
                    <h4 className="font-bold text-xs text-admin-foreground">Issued By (Business Identity)</h4>
                    <span className="text-[10.5px] text-admin-muted font-medium">• Saved Profile Data</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingIssuer(!isEditingIssuer)}
                    className="text-xs font-bold text-admin-primary hover:underline flex items-center gap-1"
                  >
                    {isEditingIssuer ? 'Done Editing' : 'Edit Issuer Details'}
                    {isEditingIssuer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {isEditingIssuer ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-admin-border/50 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-bold text-admin-muted mb-1">Business Name</label>
                      <input
                        type="text"
                        value={issuerName}
                        onChange={(e) => setIssuerName(e.target.value)}
                        className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-admin-muted mb-1">Business Email</label>
                      <input
                        type="email"
                        value={issuerEmail}
                        onChange={(e) => setIssuerEmail(e.target.value)}
                        className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-admin-muted mb-1">Phone</label>
                      <input
                        type="text"
                        value={issuerPhone}
                        onChange={(e) => setIssuerPhone(e.target.value)}
                        className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-admin-muted mb-1">Registered Address</label>
                      <input
                        type="text"
                        value={issuerAddress}
                        onChange={(e) => setIssuerAddress(e.target.value)}
                        className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-admin-muted mb-1">ABN / Tax ID</label>
                      <input
                        type="text"
                        value={issuerTaxId}
                        onChange={(e) => setIssuerTaxId(e.target.value)}
                        className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs text-admin-foreground"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-admin-muted flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="font-bold text-admin-foreground">{issuerName}</span>
                    <span>• {issuerEmail}</span>
                    <span>• {issuerPhone}</span>
                    {issuerTaxId && <span>• {issuerTaxId}</span>}
                  </div>
                )}
              </div>

              {/* ─── ISSUED TO SECTION (Recipient Info) ─── */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-admin-foreground flex items-center gap-1.5">
                  <User className="w-4 h-4 text-admin-primary" /> Issued To (Recipient Information)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-admin-muted mb-1">Recipient Name *</label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. John Smith / Acme Corp"
                      className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-admin-muted mb-1">Recipient Email</label>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="john.smith@tenant.com"
                      className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-admin-muted mb-1">Recipient Phone</label>
                    <input
                      type="text"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="+61 400 000 000"
                      className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-admin-muted mb-1">Billing Address</label>
                    <input
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="Unit 12, 45 Oxford Street, Bondi Junction NSW 2022"
                      className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary"
                    />
                  </div>
                </div>
              </div>

              {/* ─── INVOICE DATES, TERMS & CURRENCY ─── */}
              <div className="space-y-3">
                {/* Live AU Eastern Time Indicator Banner */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span>Live AU Time (Sydney / AEST/AEDT):</span>
                    <span className="font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 text-[11.5px]">
                      {auCurrentTimeStr}
                    </span>
                  </div>
                  <div className="text-[11px] text-admin-muted font-medium">
                    Issue date defaults to Australian business date ({formatAuDisplayDate(getAuTodayString(), 'short')})
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-admin-muted mb-1">Invoice Number</label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm font-mono focus:outline-none focus:border-admin-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-admin-muted mb-1">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary"
                    >
                      {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} — {c.name} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-admin-muted mb-1">Issue Date (AU)</label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => {
                        const newIssueDate = e.target.value;
                        setIssueDate(newIssueDate);
                        if (dueDate && newIssueDate > dueDate) {
                          setDueDate(newIssueDate);
                        }
                      }}
                      className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-admin-muted mb-1">Due Date (AU)</label>
                    <input
                      type="date"
                      min={issueDate}
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary"
                    />
                  </div>
                </div>

                {/* Quick Due Date Presets */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-admin-muted font-medium">Quick Terms:</span>
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
                        'px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors',
                        paymentTermsDays === term.days
                          ? 'bg-admin-primary/10 text-admin-primary border-admin-primary/30'
                          : 'bg-admin-surface text-admin-muted border-admin-border hover:text-admin-foreground'
                      )}
                    >
                      {term.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── LINE ITEMS TABLE ─── */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-admin-foreground text-xs flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-admin-primary" /> Invoice Line Items
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    className="font-bold border-admin-border hover:bg-admin-surface-subtle text-admin-foreground text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1 text-admin-primary" /> Add Line Item
                  </Button>
                </div>

                <div className="border border-admin-border rounded-xl overflow-hidden bg-admin-surface shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-admin-surface-subtle border-b border-admin-border text-admin-muted text-[11px] uppercase font-bold">
                        <th className="p-3">Description</th>
                        <th className="p-3 w-20 text-center">Qty</th>
                        <th className="p-3 w-28 text-right">Unit Rate</th>
                        <th className="p-3 w-24 text-center">Tax %</th>
                        <th className="p-3 w-28 text-right">Total</th>
                        <th className="p-3 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-admin-border text-xs">
                      {items.map((item, idx) => {
                        const lineBase = Math.max(0, (item.quantity || 0) * (item.unitPrice || 0) - (item.discount || 0));
                        const lineTotal = lineBase * (1 + (item.taxRate || 0) / 100);
                        return (
                          <tr key={idx} className="hover:bg-admin-surface-subtle/50 transition-colors">
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                placeholder="Service description or item description"
                                className="w-full bg-transparent border border-transparent hover:border-admin-border focus:border-admin-primary text-admin-foreground rounded-lg px-2 py-1 text-xs focus:outline-none"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                                className="w-full bg-transparent border border-transparent hover:border-admin-border focus:border-admin-primary text-admin-foreground text-center rounded-lg px-1 py-1 text-xs focus:outline-none font-mono"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                                className="w-full bg-transparent border border-transparent hover:border-admin-border focus:border-admin-primary text-admin-foreground text-right rounded-lg px-2 py-1 text-xs focus:outline-none font-mono"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="100"
                                value={item.taxRate}
                                onChange={(e) => handleItemChange(idx, 'taxRate', Number(e.target.value))}
                                className="w-full bg-transparent border border-transparent hover:border-admin-border focus:border-admin-primary text-admin-foreground text-center rounded-lg px-1 py-1 text-xs focus:outline-none font-mono"
                              />
                            </td>
                            <td className="p-2.5 text-right font-bold text-admin-foreground font-mono">
                              {formatCurrency(lineTotal, currency)}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                disabled={items.length <= 1}
                                className="text-admin-muted hover:text-rose-500 disabled:opacity-20 transition-colors p-1 rounded hover:bg-rose-500/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Calculation Summary Box */}
                <div className="flex justify-end pt-1">
                  <div className="w-full md:w-80 bg-admin-surface-subtle border border-admin-border rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between text-admin-muted">
                      <span>Subtotal:</span>
                      <span className="text-admin-foreground font-mono font-semibold">{formatCurrency(subtotal, currency)}</span>
                    </div>
                    <div className="flex justify-between text-admin-muted">
                      <span>Estimated Tax (GST/VAT):</span>
                      <span className="text-admin-foreground font-mono font-semibold">{formatCurrency(taxTotal, currency)}</span>
                    </div>
                    <div className="border-t border-admin-border pt-2 flex justify-between text-sm font-bold">
                      <span className="text-admin-foreground">Invoice Total:</span>
                      <span className="text-admin-primary font-mono">{formatCurrency(grandTotal, currency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes & Payment Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-admin-muted mb-1">Notes / Terms</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-admin-surface border border-admin-border rounded-xl p-3 text-admin-foreground text-xs focus:outline-none focus:border-admin-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-admin-muted mb-1">Payment Instructions</label>
                  <textarea
                    rows={2}
                    value={paymentInstructions}
                    onChange={(e) => setPaymentInstructions(e.target.value)}
                    className="w-full bg-admin-surface border border-admin-border rounded-xl p-3 text-admin-foreground text-xs focus:outline-none focus:border-admin-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STEP 3: LIVE PREVIEW & DOWNLOAD / SEND
             ═══════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-admin-foreground">Step 3 — Review Live Invoice Preview</h3>
                  <p className="text-xs text-admin-muted">
                    Rendered using template <span className="font-bold text-admin-primary">{selectedTemplate.name}</span>. Template design is fixed.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-admin-muted">Change Template:</span>
                  <select
                    value={selectedTemplate.id}
                    onChange={(e) => setSelectedTemplate(getPredefinedTemplateById(e.target.value))}
                    className="bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1 text-xs font-bold text-admin-foreground"
                  >
                    {PREDEFINED_INVOICE_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.badge})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
        <div className="px-6 py-4 border-t border-admin-border bg-admin-surface-subtle/70 flex items-center justify-between">
          <div>
            {step > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => s - 1)}
                disabled={loading}
                className="font-bold border-admin-border hover:bg-admin-surface text-admin-foreground text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={onClose} disabled={loading} className="text-admin-muted text-xs">
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
                className="font-bold shadow-xs text-xs gap-1.5"
              >
                Continue to Invoice Info <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}

            {step === 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={loading}
                  className="font-bold border-admin-border hover:bg-admin-surface text-admin-foreground text-xs"
                >
                  Save as Draft
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (validateStep2()) setStep(2);
                  }}
                  className="font-bold shadow-xs text-xs gap-1.5"
                >
                  Preview Document <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={loading}
                  className="font-bold border-admin-border hover:bg-admin-surface text-admin-foreground text-xs"
                >
                  Save Draft
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleIssueAndDownload}
                  disabled={loading}
                  className="font-bold shadow-xs text-xs gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Issue & Download PDF
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
