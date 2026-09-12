'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Building,
  Calendar,
  DollarSign,
  Clock,
  Check,
  AlertCircle,
  Eye,
  Settings2,
  ShieldCheck,
} from 'lucide-react';
import { Input, Select, Textarea, useToast, ConfirmDialog } from '@/components/admin/ui';
import { fetchDashboardProperties } from '@/app/actions/dashboard';
import {
  createInvoiceTemplateAction,
  updateInvoiceTemplateAction,
  deleteInvoiceTemplateAction,
} from '@/app/actions/invoices';
import { InvoiceTemplateDTO } from '@/modules/invoices';
import { LiveInvoiceRenderer, LiveInvoiceData } from './LiveInvoiceRenderer';
import { cn } from '@/lib/utils';

export interface InvoiceTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  templateToEdit?: InvoiceTemplateDTO | null;
  initialPreset?: {
    name?: string;
    layoutStyle?: string;
    brandColor?: string;
    accentColor?: string;
  } | null;
}

interface TemplateLineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

const LAYOUT_STYLES = [
  { id: 'classic', label: 'Classic Clean' },
  { id: 'modern', label: 'Modern Slate' },
  { id: 'minimalist', label: 'Minimalist Line' },
  { id: 'corporate', label: 'Corporate Blue' },
  { id: 'creative', label: 'Creative Studio' },
  { id: 'elegant', label: 'Elegant Serif' },
  { id: 'google', label: 'Google Material' },
  { id: 'monochrome', label: 'Monochrome Dark' },
];

const COLOR_PRESETS = [
  '#008F83', // Brand Teal
  '#0284C7', // Sky Blue
  '#2563EB', // Royal Blue
  '#7C3AED', // Violet
  '#059669', // Emerald
  '#D97706', // Amber
  '#DC2626', // Crimson
  '#1E293B', // Slate
];

export function InvoiceTemplateModal({
  isOpen,
  onClose,
  onSuccess,
  templateToEdit,
  initialPreset,
}: InvoiceTemplateModalProps) {
  const { toast } = useToast();
  const isEditMode = Boolean(templateToEdit);

  // Tab: 'general' | 'issuer' | 'items' | 'terms'
  const [activeTab, setActiveTab] = useState<'general' | 'issuer' | 'items' | 'terms'>('general');
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');
  const [desktopView, setDesktopView] = useState<'split' | 'form' | 'preview'>('split');

  // Form State
  const [name, setName] = useState('');
  const [invoiceType, setInvoiceType] = useState('rent');
  const [layoutStyle, setLayoutStyle] = useState('classic');
  const [brandColor, setBrandColor] = useState('#008F83');
  const [accentColor, setAccentColor] = useState('#0F766E');
  const [currency, setCurrency] = useState('AUD');
  const [status, setStatus] = useState<'active' | 'draft' | 'paused'>('active');

  // Issuer / From Business Details
  const [issuerName, setIssuerName] = useState('Property Ledge Management');
  const [issuerEmail, setIssuerEmail] = useState('accounts@propertyledge.com.au');
  const [issuerPhone, setIssuerPhone] = useState('+61 2 9000 0000');
  const [issuerAddress, setIssuerAddress] = useState('Level 12, 100 Miller St, North Sydney NSW 2060');
  const [issuerTaxId, setIssuerTaxId] = useState('ABN 51 824 753 556');
  const [paymentInstructions, setPaymentInstructions] = useState(
    'Direct Deposit / PayID / BPAY accepted.\nBSB: 082-000  Account: 1234 5678\nReference: INV-SAMPLE-001'
  );
  const [headerText, setHeaderText] = useState('');

  // Line items
  const [items, setItems] = useState<TemplateLineItem[]>([
    { description: 'Residential Rent', quantity: 1, unitPrice: 650, taxRate: 0 },
  ]);

  // Terms & Covenants
  const [paymentTermsDays, setPaymentTermsDays] = useState('14');
  const [lateFeeAmount, setLateFeeAmount] = useState('');
  const [lateFeeDays, setLateFeeDays] = useState('');
  const [linkedPropertyIds, setLinkedPropertyIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('Payment is due within the terms specified on this invoice. Thank you for your business.');

  // Automation
  const [automationFrequency, setAutomationFrequency] = useState<'monthly' | 'weekly' | 'fortnightly' | 'on_demand'>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [autoApprove, setAutoApprove] = useState(false);
  const [autoSendEmail, setAutoSendEmail] = useState(false);

  // Properties list
  const [properties, setProperties] = useState<Array<{ id: string; name: string; address_line_1: string; city: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(isOpen);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let animFrame: number;
    if (isOpen) {
      setMounted(true);
      setAnimateIn(false);
      animFrame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
      fetchDashboardProperties()
        .then((data: any) => setProperties(data || []))
        .catch((err) => console.error('Error fetching properties:', err));
    } else {
      setAnimateIn(false);
      timer = setTimeout(() => setMounted(false), 280);
    }
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animFrame);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load existing or preset data on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab('general');
      setFormErrors({});

      if (templateToEdit) {
        setName(templateToEdit.name || '');
        setInvoiceType(templateToEdit.invoiceType || 'rent');
        setLayoutStyle(templateToEdit.layoutStyle || 'classic');
        setBrandColor(templateToEdit.brandColor || '#008F83');
        setAccentColor(templateToEdit.accentColor || '#0F766E');
        setCurrency(templateToEdit.currency || 'AUD');
        setStatus((templateToEdit.status as any) || 'active');
        setItems(
          templateToEdit.items && templateToEdit.items.length > 0
            ? templateToEdit.items.map((it) => ({
                id: it.id,
                description: it.description,
                quantity: it.quantity || 1,
                unitPrice: it.unitPrice || 0,
                taxRate: it.taxRate || 0,
              }))
            : [{ description: 'Residential Rent', quantity: 1, unitPrice: 650, taxRate: 0 }]
        );
        setPaymentTermsDays(templateToEdit.paymentTermsDays ? String(templateToEdit.paymentTermsDays) : '14');
        setLateFeeAmount(templateToEdit.lateFeeAmount ? String(templateToEdit.lateFeeAmount) : '');
        setLateFeeDays(templateToEdit.lateFeeDays ? String(templateToEdit.lateFeeDays) : '');
        setLinkedPropertyIds(templateToEdit.linkedPropertyIds || []);
        setNotes(templateToEdit.notes || '');
        if (templateToEdit.automationConfig) {
          setAutomationFrequency((templateToEdit.automationConfig.frequency as any) || 'monthly');
          setDayOfMonth(templateToEdit.automationConfig.dayOfMonth ? String(templateToEdit.automationConfig.dayOfMonth) : '1');
          setAutoApprove(Boolean(templateToEdit.automationConfig.autoApprove));
          setAutoSendEmail(Boolean(templateToEdit.automationConfig.autoSendEmail));
        }
      } else if (initialPreset) {
        setName(initialPreset.name ? `${initialPreset.name} Blueprint` : '');
        setInvoiceType('rent');
        setLayoutStyle(initialPreset.layoutStyle || 'classic');
        setBrandColor(initialPreset.brandColor || '#008F83');
        setAccentColor(initialPreset.accentColor || '#0F766E');
        setCurrency('AUD');
        setStatus('active');
        setItems([{ description: 'Rental Charge', quantity: 1, unitPrice: 650, taxRate: 0 }]);
        setPaymentTermsDays('14');
        setLateFeeAmount('');
        setLateFeeDays('');
        setLinkedPropertyIds([]);
        setNotes('Payment is due within the terms specified on this invoice. Thank you for your business.');
        setAutomationFrequency('monthly');
        setDayOfMonth('1');
        setAutoApprove(false);
        setAutoSendEmail(false);
      } else {
        setName('');
        setInvoiceType('rent');
        setLayoutStyle('classic');
        setBrandColor('#008F83');
        setAccentColor('#0F766E');
        setCurrency('AUD');
        setStatus('active');
        setItems([{ description: 'Residential Rent', quantity: 1, unitPrice: 650, taxRate: 0 }]);
        setPaymentTermsDays('14');
        setLateFeeAmount('');
        setLateFeeDays('');
        setLinkedPropertyIds([]);
        setNotes('Payment is due within the terms specified on this invoice. Thank you for your business.');
        setAutomationFrequency('monthly');
        setDayOfMonth('1');
        setAutoApprove(false);
        setAutoSendEmail(false);
      }
    }
  }, [isOpen, templateToEdit, initialPreset]);

  // Calculations
  const subtotal = items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const totalTax = items.reduce((acc, it) => {
    const lineSub = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
    return acc + lineSub * ((Number(it.taxRate) || 0) / 100);
  }, 0);
  const grandTotal = subtotal + totalTax;

  // Computed live invoice preview data matching current form state
  const livePreviewData = useMemo<LiveInvoiceData>(() => {
    const selectedProperty = properties.find((p) => linkedPropertyIds.includes(p.id));
    const propertyLabel = selectedProperty
      ? `${selectedProperty.name || selectedProperty.address_line_1}${selectedProperty.city ? `, ${selectedProperty.city}` : ''}`
      : 'All Assigned Properties / General';

    const termDays = parseInt(paymentTermsDays, 10) || 14;
    const now = new Date();
    const issueDateStr = now.toISOString().split('T')[0];
    const dueDateStr = new Date(now.getTime() + termDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const notesWithLateFee =
      lateFeeAmount && Number(lateFeeAmount) > 0
        ? `${notes ? `${notes}\n\n` : ''}Late Notice: A late administration fee of $${Number(lateFeeAmount).toFixed(2)} applies if payment is not received within ${lateFeeDays || '7'} days of the due date.`
        : notes;

    return {
      invoiceNumber: 'INV-SAMPLE-001',
      issueDate: issueDateStr,
      dueDate: dueDateStr,
      currency,
      customerName: 'Sample Resident / Tenant',
      customerEmail: 'tenant@propertyledge.com.au',
      customerAddress: selectedProperty ? selectedProperty.address_line_1 : 'Unit 4B, 100 George Street, Sydney NSW 2000',
      issuerName: issuerName || 'Property Ledge Management',
      issuerEmail: issuerEmail || 'accounts@propertyledge.com.au',
      issuerAddress: issuerAddress || 'Level 12, 100 Miller St, North Sydney NSW 2060',
      issuerPhone: issuerPhone || '+61 2 9000 0000',
      issuerTaxId: issuerTaxId || 'ABN 51 824 753 556',
      propertyAddress: propertyLabel,
      items:
        items.length > 0
          ? items.map((it) => ({
              description: it.description || 'Residential Rent & Tenancy Services',
              quantity: Number(it.quantity) || 1,
              unitPrice: Number(it.unitPrice) || 0,
              taxRate: Number(it.taxRate) || 0,
            }))
          : [{ description: 'Residential Rent', quantity: 1, unitPrice: 650, taxRate: 0 }],
      notes: notesWithLateFee,
      paymentInstructions:
        paymentInstructions ||
        'Direct Deposit / PayID / BPAY accepted.\nBSB: 082-000  Account: 1234 5678\nReference: INV-SAMPLE-001',
      headerText: headerText.trim() ? headerText.trim().toUpperCase() : name.trim() ? name.toUpperCase() : 'TAX INVOICE',
      brandColor,
      accentColor,
      layoutStyle: layoutStyle as any,
      status: status || 'draft',
    };
  }, [
    properties,
    linkedPropertyIds,
    paymentTermsDays,
    lateFeeAmount,
    lateFeeDays,
    notes,
    currency,
    items,
    name,
    issuerName,
    issuerEmail,
    issuerAddress,
    issuerPhone,
    issuerTaxId,
    paymentInstructions,
    headerText,
    brandColor,
    accentColor,
    layoutStyle,
    status,
  ]);

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, taxRate: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof TemplateLineItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleToggleProperty = (propId: string) => {
    setLinkedPropertyIds((prev) =>
      prev.includes(propId) ? prev.filter((id) => id !== propId) : [...prev, propId]
    );
  };

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Template name is required.';
    if (items.some((it) => !it.description.trim())) {
      errors.items = 'All line items must have a description.';
    }
    if (items.some((it) => Number(it.unitPrice) < 0)) {
      errors.items = 'Line item prices must be zero or positive.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      if (errors.name) setActiveTab('general');
      else if (errors.items) setActiveTab('items');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: `${invoiceType.toUpperCase()} Billing Blueprint`,
        status,
        currency,
        invoiceType,
        items: items.map((it) => ({
          description: it.description.trim(),
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          taxRate: Number(it.taxRate) || 0,
          amount: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
        })),
        paymentTermsDays: parseInt(paymentTermsDays, 10) || 14,
        lateFeeAmount: lateFeeAmount ? parseFloat(lateFeeAmount) : null,
        lateFeeDays: lateFeeDays ? parseInt(lateFeeDays, 10) : null,
        linkedPropertyIds,
        automationConfig: {
          frequency: automationFrequency,
          dayOfMonth: parseInt(dayOfMonth, 10) || 1,
          autoApprove,
          autoSendEmail,
        },
        emailConfig: {
          enabled: autoSendEmail,
          recipientRule: 'tenant_email' as const,
          subjectTemplate: `Invoice {{invoice_number}} for ${name.trim()}`,
          bodyTemplate: 'Hi {{customer_name}},\n\nPlease find attached your invoice.\n\nThank you,\nProperty Management',
          attachPdf: true,
        },
        layoutStyle,
        brandColor,
        accentColor,
        taxName: 'GST',
        notes: notes.trim() || null,
        isDefault: false,
      };

      if (isEditMode && templateToEdit) {
        const res = await updateInvoiceTemplateAction(templateToEdit.id, payload);
        if (!res.success) throw new Error(res.error || 'Failed to update template.');
        toast({
          title: 'Template Updated',
          description: `Blueprint "${name}" has been updated.`,
        });
      } else {
        const res = await createInvoiceTemplateAction(payload);
        if (!res.success) throw new Error(res.error || 'Failed to create template.');
        toast({
          title: 'Template Created',
          description: `Blueprint "${name}" has been created.`,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving template:', err);
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not save blueprint.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!templateToEdit) return;
    setIsSaving(true);
    try {
      const res = await deleteInvoiceTemplateAction(templateToEdit.id);
      if (!res.success) throw new Error(res.error || 'Failed to delete template.');
      toast({
        title: 'Template Deleted',
        description: 'The template has been deleted.',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Delete Failed',
        description: err.message || 'Could not delete template.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out',
          animateIn ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className={cn(
          'relative flex max-h-[94vh] w-full max-w-6xl 2xl:max-w-7xl flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl transition-all duration-200 ease-out z-10 p-5 sm:p-7 overflow-hidden',
          animateIn ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-2'
        )}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none z-20"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Title and Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200/80 dark:border-slate-800 pr-10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-slate-900 dark:text-white">
                {isEditMode ? 'Edit Billing Blueprint' : 'Create Billing Blueprint'}
              </h2>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#008F83]/10 text-[#008F83] border border-[#008F83]/20">
                Live Preview
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Configure recurring line items, payment covenants, and preview the generated A4 document.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start sm:self-center">
            <button
              type="button"
              onClick={() => {
                setMobileView('form');
                setDesktopView('form');
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                mobileView === 'form' && desktopView === 'form'
                  ? 'bg-white dark:bg-slate-900 text-[#008F83] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
              title="Focus on configuration form"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Form</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileView('preview');
                setDesktopView('preview');
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                mobileView === 'preview' || desktopView === 'preview'
                  ? 'bg-white dark:bg-slate-900 text-[#008F83] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
              title="Full A4 document preview"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDesktopView('split');
                setMobileView('form');
              }}
              className={cn(
                'hidden lg:flex px-3 py-1.5 rounded-lg text-xs font-bold transition-all items-center gap-1.5',
                desktopView === 'split' && mobileView !== 'preview'
                  ? 'bg-white dark:bg-slate-900 text-[#008F83] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
              title="Side-by-side editing and preview"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>
          </div>
        </div>

        {/* 2-Column / Split / Full Grid Area */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
          {/* Left Column: Form Editor */}
          <div
            className={cn(
              'min-h-0 overflow-hidden',
              // Mobile visibility
              mobileView === 'form' ? 'flex flex-col' : 'hidden',
              // Desktop visibility & grid spans
              desktopView === 'split'
                ? 'lg:col-span-6 lg:flex lg:flex-col'
                : desktopView === 'form'
                ? 'lg:col-span-12 lg:flex lg:flex-col'
                : 'lg:hidden'
            )}
          >
            {/* Section Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-2xl mb-3 text-xs font-semibold shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={cn(
                  'flex-1 py-2 px-2.5 rounded-xl transition-all text-center whitespace-nowrap',
                  activeTab === 'general'
                    ? 'bg-white dark:bg-slate-900 text-[#008F83] font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                General
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('issuer')}
                className={cn(
                  'flex-1 py-2 px-2.5 rounded-xl transition-all text-center whitespace-nowrap',
                  activeTab === 'issuer'
                    ? 'bg-white dark:bg-slate-900 text-[#008F83] font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                Issuer (FROM)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('items')}
                className={cn(
                  'flex-1 py-2 px-2.5 rounded-xl transition-all text-center whitespace-nowrap',
                  activeTab === 'items'
                    ? 'bg-white dark:bg-slate-900 text-[#008F83] font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                Line Items ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('terms')}
                className={cn(
                  'flex-1 py-2 px-2.5 rounded-xl transition-all text-center whitespace-nowrap',
                  activeTab === 'terms'
                    ? 'bg-white dark:bg-slate-900 text-[#008F83] font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                Terms & Payment
              </button>
            </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 px-0.5 py-1">
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <Input
                  label="Blueprint Name *"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                  }}
                  placeholder="e.g. Monthly Commercial Rent - Suite 4B"
                  className="bg-white dark:bg-slate-800"
                />
                {formErrors.name && (
                  <p className="text-[11px] text-[#DC2626] mt-1 px-1 font-medium">{formErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Category / Invoice Type"
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value)}
                  className="bg-white dark:bg-slate-800"
                  options={[
                    { value: 'rent', label: 'Rent' },
                    { value: 'commercial', label: 'Commercial Outgoings' },
                    { value: 'maintenance', label: 'Maintenance & Repairs' },
                    { value: 'utilities', label: 'Utilities / Water' },
                    { value: 'management_fee', label: 'Management Fee' },
                    { value: 'custom', label: 'General / Custom' },
                  ]}
                />

                <Select
                  label="Blueprint Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="bg-white dark:bg-slate-800"
                  options={[
                    { value: 'active', label: 'Active (Enabled)' },
                    { value: 'draft', label: 'Draft (In Review)' },
                    { value: 'paused', label: 'Paused (Suspended)' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Layout Style"
                  value={layoutStyle}
                  onChange={(e) => setLayoutStyle(e.target.value)}
                  className="bg-white dark:bg-slate-800"
                  options={LAYOUT_STYLES.map((ls) => ({ value: ls.id, label: ls.label }))}
                />

                <Select
                  label="Currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-white dark:bg-slate-800"
                  options={[
                    { value: 'AUD', label: 'AUD ($) - Australian Dollar' },
                    { value: 'USD', label: 'USD ($) - US Dollar' },
                    { value: 'EUR', label: 'EUR (€) - Euro' },
                    { value: 'GBP', label: 'GBP (£) - British Pound' },
                  ]}
                />
              </div>

              {/* Brand & Accent Color Customization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Primary Brand Color */}
                <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Primary Brand Color
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">{brandColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center justify-center w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden shadow-xs shrink-0 cursor-pointer">
                      <input
                        type="color"
                        value={brandColor.startsWith('#') && brandColor.length === 7 ? brandColor : '#008F83'}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        title="Pick custom brand color"
                      />
                      <div className="w-full h-full rounded-xl" style={{ backgroundColor: brandColor }} />
                    </div>
                    <input
                      type="text"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      placeholder="#008F83"
                      className="flex-1 h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-1 focus:ring-[#008F83]"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setBrandColor(c)}
                        className={cn(
                          'w-5 h-5 rounded-full border transition-all',
                          brandColor.toLowerCase() === c.toLowerCase()
                            ? 'border-white ring-2 ring-[#008F83] scale-110'
                            : 'border-black/10 hover:scale-110'
                        )}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                {/* Accent / Highlight Color */}
                <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Brand Accent / Highlight
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">{accentColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center justify-center w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden shadow-xs shrink-0 cursor-pointer">
                      <input
                        type="color"
                        value={accentColor.startsWith('#') && accentColor.length === 7 ? accentColor : '#0F766E'}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        title="Pick custom accent color"
                      />
                      <div className="w-full h-full rounded-xl" style={{ backgroundColor: accentColor }} />
                    </div>
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      placeholder="#0F766E"
                      className="flex-1 h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-1 focus:ring-[#008F83]"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setAccentColor(c)}
                        className={cn(
                          'w-5 h-5 rounded-full border transition-all',
                          accentColor.toLowerCase() === c.toLowerCase()
                            ? 'border-white ring-2 ring-[#008F83] scale-110'
                            : 'border-black/10 hover:scale-110'
                        )}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ISSUER / FROM */}
          {activeTab === 'issuer' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#008F83]/5 border border-[#008F83]/20 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#008F83] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Issuer & Business Information (FROM Section)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Customize the business name, address, phone, and ABN rendered in the top-left 'FROM' section of invoices.
                  </p>
                </div>
              </div>

              <div>
                <Input
                  label="Issuer / Business Name *"
                  value={issuerName}
                  onChange={(e) => setIssuerName(e.target.value)}
                  placeholder="e.g. Property Ledge Management"
                  className="bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Issuer Email"
                  type="email"
                  value={issuerEmail}
                  onChange={(e) => setIssuerEmail(e.target.value)}
                  placeholder="e.g. accounts@propertyledge.com.au"
                  className="bg-white dark:bg-slate-800"
                />
                <Input
                  label="Issuer Phone"
                  type="tel"
                  value={issuerPhone}
                  onChange={(e) => setIssuerPhone(e.target.value)}
                  placeholder="e.g. +61 2 9000 0000"
                  className="bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <Input
                  label="Issuer Registered Address"
                  value={issuerAddress}
                  onChange={(e) => setIssuerAddress(e.target.value)}
                  placeholder="e.g. Level 12, 100 Miller St, North Sydney NSW 2060"
                  className="bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Tax ID / ABN"
                  value={issuerTaxId}
                  onChange={(e) => setIssuerTaxId(e.target.value)}
                  placeholder="e.g. ABN 51 824 753 556"
                  className="bg-white dark:bg-slate-800"
                />
                <Input
                  label="Invoice Document Header Title"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="e.g. TAX INVOICE (Leave empty to use Blueprint name)"
                  className="bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          )}

          {/* TAB 2: LINE ITEMS */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Default Line Items ({items.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="h-8 px-3 rounded-xl font-semibold text-xs text-[#008F83] hover:bg-[#008F83]/10 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>

              {formErrors.items && (
                <p className="text-[11px] text-[#DC2626] font-medium">{formErrors.items}</p>
              )}

              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          label={idx === 0 ? 'Description *' : undefined}
                          value={it.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="e.g. Monthly Base Rent"
                          className="bg-white dark:bg-slate-800"
                        />
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors shrink-0 mt-auto"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        label={idx === 0 ? 'Qty' : undefined}
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="bg-white dark:bg-slate-800 text-center"
                      />
                      <Input
                        label={idx === 0 ? 'Unit Price ($)' : undefined}
                        type="number"
                        min="0"
                        step="0.01"
                        value={it.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        className="bg-white dark:bg-slate-800"
                      />
                      <Input
                        label={idx === 0 ? 'Tax / GST (%)' : undefined}
                        type="number"
                        min="0"
                        value={it.taxRate}
                        onChange={(e) => handleItemChange(idx, 'taxRate', e.target.value)}
                        className="bg-white dark:bg-slate-800 text-center"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Running Totals Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium">${subtotal.toFixed(2)}</span>
                </div>
                {totalTax > 0 && (
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>GST (Tax)</span>
                    <span className="font-mono font-medium">${totalTax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700 text-sm">
                  <span>Total Recurring Amount</span>
                  <span className="font-mono text-[#008F83]">${grandTotal.toFixed(2)} {currency}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TERMS & PROPERTIES */}
          {activeTab === 'terms' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Payment Terms (Days)"
                  type="number"
                  min="0"
                  value={paymentTermsDays}
                  onChange={(e) => setPaymentTermsDays(e.target.value)}
                  placeholder="e.g. 14"
                  className="bg-white dark:bg-slate-800 text-center"
                />
                <Input
                  label="Late Fee ($)"
                  type="number"
                  min="0"
                  value={lateFeeAmount}
                  onChange={(e) => setLateFeeAmount(e.target.value)}
                  placeholder="e.g. 50"
                  className="bg-white dark:bg-slate-800"
                />
                <Input
                  label="Grace Period (Days)"
                  type="number"
                  min="0"
                  value={lateFeeDays}
                  onChange={(e) => setLateFeeDays(e.target.value)}
                  placeholder="e.g. 5"
                  className="bg-white dark:bg-slate-800 text-center"
                />
              </div>

              {/* Linked Properties Multi-Select */}
              <div className="space-y-2 pt-1">
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Linked Properties (Optional)
                </label>
                {properties.length > 0 ? (
                  <div className="max-h-44 overflow-y-auto space-y-1.5 p-1 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    {properties.map((p) => {
                      const isSelected = linkedPropertyIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleToggleProperty(p.id)}
                          className={cn(
                            'p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs',
                            isSelected
                              ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 font-bold'
                              : 'border-slate-200 dark:border-slate-800 hover:border-[#008F83]/40'
                          )}
                        >
                          <div className="truncate pr-2">
                            <span className="text-slate-900 dark:text-white block truncate">{p.name || p.address_line_1}</span>
                            <span className="text-[10px] text-slate-400 block truncate">{p.city || p.address_line_1}</span>
                          </div>
                          <div
                            className={cn(
                              'w-4 h-4 rounded-md border flex items-center justify-center shrink-0',
                              isSelected
                                ? 'bg-[#008F83] border-[#008F83] text-white'
                                : 'border-slate-300 dark:border-slate-700'
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No properties registered yet.</p>
                )}
              </div>

              {/* Payment Instructions & Notes */}
              <div>
                <Textarea
                  label="Payment Instructions (BSB, Account, BPAY, PayID)"
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  placeholder="Direct Deposit / PayID / BPAY accepted.\nBSB: 082-000  Account: 1234 5678\nReference: INV-SAMPLE-001"
                  rows={3}
                  className="bg-white dark:bg-slate-800 font-mono text-xs"
                />
              </div>

              <div>
                <Textarea
                  label="Default Terms & Invoice Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instructions and notes included on generated invoices..."
                  rows={2}
                  className="bg-white dark:bg-slate-800 text-xs"
                />
              </div>
            </div>
          )}
        </div>
          </div>

          {/* Right Column: Live Document Preview */}
          <div
            className={cn(
              'min-h-0 overflow-hidden',
              // Mobile visibility
              mobileView === 'preview' ? 'flex flex-col' : 'hidden',
              // Desktop visibility & grid spans
              desktopView === 'split'
                ? 'lg:col-span-6 lg:flex lg:flex-col border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6'
                : desktopView === 'preview'
                ? 'lg:col-span-12 lg:flex lg:flex-col pt-0 border-0 pl-0'
                : 'lg:hidden'
            )}
          >
            <div className="flex-1 overflow-y-auto pr-1">
              <LiveInvoiceRenderer
                data={livePreviewData}
                autoFit={true}
                minZoom={0.35}
                maxZoom={1.4}
                className="w-full"
                canvasClassName="h-[calc(90vh-220px)] min-h-[480px]"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            {isEditMode && templateToEdit ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving}
                className="h-11 px-3.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold text-xs transition-colors flex items-center gap-1.5 focus:outline-none"
                title="Delete Blueprint"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            ) : null}

            {/* Mobile switch button */}
            <button
              type="button"
              onClick={() => {
                const next = mobileView === 'preview' ? 'form' : 'preview';
                setMobileView(next);
                setDesktopView(next === 'preview' ? 'preview' : 'split');
              }}
              className="lg:hidden h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Eye className="w-3.5 h-3.5 text-[#008F83]" />
              <span>{mobileView === 'preview' ? 'Edit Form' : 'Show Preview'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-11 px-6 rounded-xl bg-[#008F83] hover:bg-[#007A70] text-white font-semibold text-sm shadow-md transition-all duration-150 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#008F83]/25 active:scale-[0.99]"
            >
              {isSaving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save Blueprint'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Billing Blueprint"
        description="Are you sure you want to delete this template? Existing invoices created from this template will not be affected."
        confirmLabel="Delete Blueprint"
        variant="danger"
      />
    </div>,
    document.body
  );
}
