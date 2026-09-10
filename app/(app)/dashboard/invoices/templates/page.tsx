'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Play,
  Copy,
  Edit,
  Trash2,
  ArrowRight,
  Clock,
  Mail,
  FileText,
  DollarSign,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  LayoutTemplate,
  Check,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, useToast } from '@/components/admin/ui';
import { ListPage } from '@/components/workspace';
import { HoverCardGrid, HoverEffectCardItem } from '@/components/ui/card-hover-effect';
import {
  PREDEFINED_INVOICE_TEMPLATES,
  PredefinedInvoiceTemplate,
} from '@/modules/invoices/domain/constants/predefined-templates';
import { CreateInvoiceModal } from '@/components/invoices/CreateInvoiceModal';
import { createInvoiceAction, issueInvoiceAction, sendInvoiceEmailAction } from '@/app/actions/invoices';
import { CreateInvoiceDTO } from '@/modules/invoices';
import { cn } from '@/lib/utils';

export default function InvoiceTemplatesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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

  const handleUseTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsCreateOpen(true);
  };

  return (
    <ListPage
      title="Predefined Invoice Templates"
      description="Standardized, professional invoice layouts. Template designs are fixed and managed by the platform to ensure immaculate PDF generation and formatting."
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
              <FileText className="w-3.5 h-3.5 mr-1.5 text-admin-primary" />
              All Invoices
            </Button>
          </Link>
          <Link href="/dashboard/automations">
            <Button
              variant="outline"
              size="sm"
              className="font-bold border-admin-border hover:bg-admin-surface-subtle text-admin-foreground text-xs"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5 text-admin-primary" />
              Automations
            </Button>
          </Link>
          <Button
            onClick={() => handleUseTemplate('template_classic')}
            size="sm"
            className="font-bold shadow-xs bg-admin-primary hover:bg-admin-primary/90 text-white text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Invoice
          </Button>
        </div>
      }
      summary={
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-admin-primary/10 text-admin-primary flex items-center justify-center shrink-0 border border-admin-primary/20">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Fixed Templates</p>
              <h3 className="text-lg font-black text-admin-foreground truncate">
                5 Standard Layouts
              </h3>
            </div>
          </div>

          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">PDF Parity</p>
              <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400 truncate">
                100% Guaranteed
              </h3>
            </div>
          </div>

          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Lock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Design Integrity</p>
              <h3 className="text-lg font-black text-admin-foreground truncate">
                Locked & Standardized
              </h3>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex-1 flex flex-col min-h-0 h-full space-y-4">
        {/* Template Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 overflow-y-auto flex-1 p-1">
          {PREDEFINED_INVOICE_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-admin-surface border border-admin-border rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-admin-primary/50 hover:shadow-lg transition-all group"
            >
              <div className="space-y-4">
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                      style={{ backgroundColor: tmpl.brandColor }}
                    />
                    <span className="text-xs font-mono text-admin-muted uppercase tracking-wider">
                      {tmpl.layoutStyle}
                    </span>
                  </div>
                  <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-admin-surface-subtle border border-admin-border text-admin-primary">
                    {tmpl.badge}
                  </span>
                </div>

                {/* Template Info */}
                <div>
                  <h3 className="text-base font-bold text-admin-foreground group-hover:text-admin-primary transition-colors">
                    {tmpl.name}
                  </h3>
                  <p className="text-xs text-admin-muted mt-1.5 leading-relaxed">
                    {tmpl.description}
                  </p>
                </div>

                {/* Design Specifications & Color Swatches */}
                <div className="p-3 bg-admin-surface-subtle border border-admin-border rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-admin-muted">
                    <span>Brand Primary:</span>
                    <div className="flex items-center gap-1.5 font-mono text-admin-foreground">
                      <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: tmpl.brandColor }} />
                      <span>{tmpl.brandColor}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-admin-muted">
                    <span>Accent Highlight:</span>
                    <div className="flex items-center gap-1.5 font-mono text-admin-foreground">
                      <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: tmpl.accentColor }} />
                      <span>{tmpl.accentColor}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-admin-muted">
                    <span>Typography:</span>
                    <span className="text-admin-foreground font-medium truncate max-w-[140px]">{tmpl.fontFamily.split(',')[0]}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-5 border-t border-admin-border/60 mt-4 flex items-center justify-between gap-2">
                <Link href="/dashboard/automations" className="text-xs font-bold text-admin-muted hover:text-admin-foreground transition-colors">
                  Use in Automation
                </Link>
                <Button
                  onClick={() => handleUseTemplate(tmpl.id)}
                  size="sm"
                  className="font-bold shadow-xs bg-admin-primary hover:bg-admin-primary/90 text-white text-xs gap-1"
                >
                  Create Invoice <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3-Step Create Invoice Modal */}
      {isCreateOpen && (
        <CreateInvoiceModal
          isOpen={isCreateOpen}
          initialTemplateId={selectedTemplateId || 'template_classic'}
          onClose={() => {
            setIsCreateOpen(false);
            setSelectedTemplateId(null);
          }}
          onSubmit={handleCreateSubmit}
        />
      )}
    </ListPage>
  );
}
