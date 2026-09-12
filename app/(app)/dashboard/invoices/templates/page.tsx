'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Plus,
  Copy,
  Edit,
  Trash2,
  ArrowRight,
  Clock,
  FileText,
  DollarSign,
  LayoutTemplate,
  Check,
  ShieldCheck,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Layers,
  Building,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, useToast } from '@/components/admin/ui';
import { ListPage } from '@/components/workspace';
import {
  PREDEFINED_INVOICE_TEMPLATES,
  PredefinedInvoiceTemplate,
} from '@/modules/invoices/domain/constants/predefined-templates';
import { CreateInvoiceModal } from '@/components/invoices/CreateInvoiceModal';
import { InvoiceTemplateModal } from '@/components/invoices/InvoiceTemplateModal';
import {
  fetchInvoiceTemplatesAction,
  createInvoiceAction,
  issueInvoiceAction,
  sendInvoiceEmailAction,
  duplicateInvoiceTemplateAction,
  updateInvoiceTemplateStatusAction,
} from '@/app/actions/invoices';
import { CreateInvoiceDTO, InvoiceTemplateDTO } from '@/modules/invoices';
import { cn } from '@/lib/utils';

export default function InvoiceTemplatesPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Active view tab: 'presets' (Predefined Templates) | 'custom' (My Blueprints)
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');

  // Custom templates state
  const [customTemplates, setCustomTemplates] = useState<InvoiceTemplateDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<InvoiceTemplateDTO | null>(null);
  const [initialPreset, setInitialPreset] = useState<{
    name?: string;
    layoutStyle?: string;
    brandColor?: string;
    accentColor?: string;
  } | null>(null);

  // Create Invoice Modal state
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchInvoiceTemplatesAction();
      const list = data || [];
      setCustomTemplates(list);
      if (list.length > 0) {
        setActiveTab('custom');
      }
    } catch (err) {
      console.error('Error fetching invoice templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Handle invoice creation submit
  const handleCreateSubmit = async (
    dto: CreateInvoiceDTO,
    issueImmediately = false,
    emailOptions?: { subject?: string; customMessage?: string; driveFolderUrl?: string }
  ) => {
    const res = await createInvoiceAction(dto);
    if (!res.success || !res.invoice) {
      throw new Error(res.error || 'Failed to create invoice');
    }
    if (issueImmediately) {
      const issueRes = await issueInvoiceAction(res.invoice.id);
      if (!issueRes.success) {
        throw new Error(issueRes.error || 'Failed to issue invoice');
      }

      if (emailOptions && (emailOptions.subject || emailOptions.customMessage || emailOptions.driveFolderUrl || dto.recipientEmail)) {
        try {
          await sendInvoiceEmailAction(
            res.invoice.id,
            emailOptions.customMessage,
            emailOptions.driveFolderUrl,
            emailOptions.subject
          );
        } catch (emailErr: any) {
          console.warn('[TemplatesPage] Email send warning:', emailErr);
        }
      }
    }
    toast({
      title: 'Invoice Created',
      description: `Invoice ${res.invoice.invoiceNumber} created ${issueImmediately ? 'and issued ' : ''}successfully.`,
    });
    router.push('/dashboard/invoices');
  };

  const handleOpenCreateModal = () => {
    setTemplateToEdit(null);
    setInitialPreset(null);
    setIsTemplateModalOpen(true);
  };

  const handleEditTemplate = (tmpl: InvoiceTemplateDTO) => {
    setTemplateToEdit(tmpl);
    setInitialPreset(null);
    setIsTemplateModalOpen(true);
  };

  const handleClonePreset = (preset: PredefinedInvoiceTemplate) => {
    setTemplateToEdit(null);
    setInitialPreset({
      name: preset.name,
      layoutStyle: preset.layoutStyle,
      brandColor: preset.brandColor,
      accentColor: preset.accentColor,
    });
    setIsTemplateModalOpen(true);
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await duplicateInvoiceTemplateAction(id);
      if (!res.success) throw new Error(res.error || 'Failed to duplicate');
      toast({
        title: 'Template Duplicated',
        description: 'A draft copy of the template has been created.',
      });
      loadTemplates();
    } catch (err: any) {
      toast({
        title: 'Duplicate Failed',
        description: err.message || 'Could not duplicate template.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const res = await updateInvoiceTemplateStatusAction(id, nextStatus as any);
      if (!res.success) throw new Error(res.error || 'Failed to update status');
      toast({
        title: 'Status Updated',
        description: `Template status changed to ${nextStatus}.`,
      });
      loadTemplates();
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.message || 'Could not change status.',
        variant: 'destructive',
      });
    }
  };

  const handleUseCustomTemplate = (tmpl: InvoiceTemplateDTO) => {
    setSelectedTemplateId(tmpl.id);
    setIsCreateInvoiceOpen(true);
  };

  const handleUsePreset = (presetId: string) => {
    setSelectedTemplateId(presetId);
    setIsCreateInvoiceOpen(true);
  };

  return (
    <ListPage
      title="Invoice Templates & Blueprints"
      description="Create reusable billing blueprints for automated recurring rent, outgoings, and management fee invoices."
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Invoices', href: '/dashboard/invoices' },
        { label: 'Templates' },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Link href="/dashboard/invoices">
            <Button
              variant="outline"
              size="sm"
              className="font-bold border-admin-border hover:bg-admin-surface-subtle text-admin-foreground text-xs"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5 text-[#008F83]" />
              All Invoices
            </Button>
          </Link>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="h-9 px-4 rounded-xl font-semibold text-xs bg-[#008F83] hover:bg-[#007A70] text-white shadow-xs hover:shadow transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create Blueprint
          </button>
        </div>
      }
      summary={
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-admin-surface border border-admin-border rounded-2xl p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Predefined Templates</p>
              <h3 className="text-lg font-black text-admin-foreground truncate">
                {PREDEFINED_INVOICE_TEMPLATES.length} Standard Designs
              </h3>
            </div>
          </div>

          <div className="bg-admin-surface border border-admin-border rounded-2xl p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#008F83]/10 text-[#008F83] flex items-center justify-center shrink-0 border border-[#008F83]/20">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Custom Blueprints</p>
              <h3 className="text-lg font-black text-admin-foreground truncate">
                {customTemplates.length} Configured
              </h3>
            </div>
          </div>

          <div className="bg-admin-surface border border-admin-border rounded-2xl p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">PDF Compliance</p>
              <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400 truncate">
                100% Tax Compliant
              </h3>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex-1 flex flex-col min-h-0 h-full space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-admin-border pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={cn(
              'px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5',
              activeTab === 'presets'
                ? 'bg-[#008F83] text-white shadow-xs'
                : 'text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle'
            )}
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            Predefined Templates ({PREDEFINED_INVOICE_TEMPLATES.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={cn(
              'px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5',
              activeTab === 'custom'
                ? 'bg-[#008F83] text-white shadow-xs'
                : 'text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            My Custom Blueprints ({customTemplates.length})
          </button>
        </div>

        {/* TAB 1: CUSTOM BLUEPRINTS */}
        {activeTab === 'custom' && (
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-3 border-[#008F83] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : customTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-1">
                {customTemplates.map((tmpl) => {
                  const itemsCount = tmpl.items?.length || 0;
                  const totalDefault = (tmpl.items || []).reduce(
                    (acc, it) => acc + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
                    0
                  );
                  const isPaused = tmpl.status === 'paused';
                  const isDraft = tmpl.status === 'draft';

                  return (
                    <div
                      key={tmpl.id}
                      className="bg-admin-surface border border-admin-border rounded-3xl p-6 shadow-xs flex flex-col justify-between hover:border-[#008F83]/50 hover:shadow-md transition-all group"
                    >
                      <div className="space-y-4">
                        {/* Header Badge & Color */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
                              style={{ backgroundColor: tmpl.brandColor || '#008F83' }}
                            />
                            <span className="text-[11px] font-mono text-admin-muted uppercase tracking-wider">
                              {tmpl.invoiceType || 'Rent'}
                            </span>
                          </div>
                          <span
                            className={cn(
                              'text-[10px] font-bold px-2 py-0.5 rounded-full capitalize',
                              tmpl.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : isPaused
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            )}
                          >
                            {tmpl.status}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h3 className="text-base font-bold text-admin-foreground group-hover:text-[#008F83] transition-colors truncate">
                            {tmpl.name}
                          </h3>
                          <p className="text-xs text-admin-muted mt-1 truncate">
                            {tmpl.description || `${tmpl.invoiceType} billing specification`}
                          </p>
                        </div>

                        {/* Summary Metrics */}
                        <div className="p-3.5 bg-admin-surface-subtle border border-admin-border rounded-2xl space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-admin-muted">Recurring Amount:</span>
                            <span className="font-bold text-slate-900 dark:text-white font-mono">
                              ${totalDefault.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {tmpl.currency}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-admin-muted">Line Items:</span>
                            <span className="font-medium text-admin-foreground">{itemsCount} items</span>
                          </div>
                          {tmpl.linkedPropertyIds && tmpl.linkedPropertyIds.length > 0 && (
                            <div className="flex items-center justify-between text-admin-muted pt-1 border-t border-admin-border/60">
                              <span>Linked Properties:</span>
                              <span className="font-medium text-admin-foreground">
                                {tmpl.linkedPropertyIds.length} property(s)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="pt-4 border-t border-admin-border/60 mt-4 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditTemplate(tmpl)}
                            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            title="Edit Blueprint"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(tmpl.id)}
                            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            title="Duplicate Blueprint"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(tmpl.id, tmpl.status)}
                            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            title={isPaused ? 'Resume Blueprint' : 'Pause Blueprint'}
                          >
                            {isPaused ? <PlayCircle className="w-4 h-4 text-emerald-500" /> : <PauseCircle className="w-4 h-4" />}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleUseCustomTemplate(tmpl)}
                          className="h-8 px-3 rounded-xl font-semibold text-xs bg-[#008F83] hover:bg-[#007A70] text-white transition-all flex items-center gap-1"
                        >
                          Use <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center border border-dashed border-admin-border rounded-3xl bg-admin-surface-subtle/40 space-y-4 max-w-xl mx-auto my-6">
                <div className="w-14 h-14 rounded-2xl bg-[#008F83]/10 text-[#008F83] flex items-center justify-center mx-auto">
                  <Layers className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">No Custom Blueprints Yet</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    Create your first billing blueprint to specify recurring rent, outgoings, late fees, and automate invoicing.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="h-10 px-5 rounded-xl font-semibold text-xs bg-[#008F83] hover:bg-[#007A70] text-white shadow-xs transition-all"
                  >
                    + Create First Blueprint
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('presets')}
                    className="h-10 px-5 rounded-xl font-semibold text-xs border border-admin-border hover:bg-admin-surface text-admin-foreground transition-all"
                  >
                    Explore System Presets
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SYSTEM PRESETS */}
        {activeTab === 'presets' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 overflow-y-auto flex-1 p-1">
            {PREDEFINED_INVOICE_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                className="bg-admin-surface border border-admin-border rounded-3xl p-6 shadow-xs flex flex-col justify-between hover:border-[#008F83]/50 hover:shadow-md transition-all group"
              >
                <div className="space-y-4">
                  {/* Header Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
                        style={{ backgroundColor: tmpl.brandColor }}
                      />
                      <span className="text-[11px] font-mono text-admin-muted uppercase tracking-wider">
                        {tmpl.layoutStyle}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-admin-surface-subtle border border-admin-border text-admin-primary">
                      {tmpl.badge}
                    </span>
                  </div>

                  {/* Template Info */}
                  <div>
                    <h3 className="text-base font-bold text-admin-foreground group-hover:text-[#008F83] transition-colors">
                      {tmpl.name}
                    </h3>
                    <p className="text-xs text-admin-muted mt-1.5 leading-relaxed">
                      {tmpl.description}
                    </p>
                  </div>

                  {/* Design Specs */}
                  <div className="p-3.5 bg-admin-surface-subtle border border-admin-border rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-admin-muted">
                      <span>Brand Primary:</span>
                      <div className="flex items-center gap-1.5 font-mono text-admin-foreground">
                        <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: tmpl.brandColor }} />
                        <span>{tmpl.brandColor}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-admin-muted">
                      <span>Typography:</span>
                      <span className="text-admin-foreground font-medium truncate max-w-[140px]">
                        {tmpl.fontFamily.split(',')[0]}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-admin-border/60 mt-4 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleClonePreset(tmpl)}
                    className="h-9 px-3.5 rounded-xl font-bold text-xs bg-[#008F83] hover:bg-[#007A70] text-white transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Customize & Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUsePreset(tmpl.id)}
                    className="h-9 px-3 rounded-xl font-semibold text-xs border border-admin-border hover:bg-admin-surface text-admin-foreground transition-all flex items-center gap-1"
                  >
                    Use Template <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoice Template Builder / Editor Modal */}
      {isTemplateModalOpen && (
        <InvoiceTemplateModal
          isOpen={isTemplateModalOpen}
          onClose={() => {
            setIsTemplateModalOpen(false);
            setTemplateToEdit(null);
            setInitialPreset(null);
          }}
          onSuccess={() => {
            loadTemplates();
          }}
          templateToEdit={templateToEdit}
          initialPreset={initialPreset}
        />
      )}

      {/* 3-Step Create Invoice Modal */}
      {isCreateInvoiceOpen && (
        <CreateInvoiceModal
          isOpen={isCreateInvoiceOpen}
          initialTemplateId={selectedTemplateId || 'template_classic'}
          onClose={() => {
            setIsCreateInvoiceOpen(false);
            setSelectedTemplateId(null);
          }}
          onSubmit={handleCreateSubmit}
        />
      )}
    </ListPage>
  );
}
