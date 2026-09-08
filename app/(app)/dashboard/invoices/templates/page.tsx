'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Play,
  Copy,
  Edit,
  Trash2,
  Pause,
  ArrowRight,
  Clock,
  Mail,
  FileText,
  DollarSign,
  ArrowLeft,
  Star,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertCircle,
  LayoutTemplate,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ColDef } from 'ag-grid-community';
import { Button, useToast, ConfirmDialog } from '@/components/admin/ui';
import { AdminDataGrid, QuickFilterBar, QuickFilterOption } from '@/components/admin/data-grid';
import { ListPage, ListPageGrid } from '@/components/workspace';
import { HoverCardGrid, HoverEffectCardItem } from '@/components/ui/card-hover-effect';
import { InvoiceTemplateDTO } from '@/modules/invoices';
import { InvoiceTemplateWizard } from '@/components/invoices/InvoiceTemplateWizard';
import { RunTemplateNowModal } from '@/components/invoices/RunTemplateNowModal';
import {
  fetchInvoiceTemplatesAction,
  updateInvoiceTemplateStatusAction,
  duplicateInvoiceTemplateAction,
  deleteInvoiceTemplateAction,
} from '@/app/actions/invoices';
import { formatCurrency } from '@/modules/invoices/domain/value-objects/currency';
import { cn } from '@/lib/utils';

export default function InvoiceTemplatesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<InvoiceTemplateDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals & Wizards
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplateDTO | null>(null);
  const [runningTemplate, setRunningTemplate] = useState<InvoiceTemplateDTO | null>(null);

  const filterOptions = useMemo<QuickFilterOption[]>(
    () => [
      { label: 'All', value: 'all' },
      { label: 'Active', value: 'active' },
      { label: 'Draft', value: 'draft' },
      { label: 'Paused', value: 'paused' },
    ],
    []
  );

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await fetchInvoiceTemplatesAction();
      setTemplates(data);
    } catch (err: any) {
      toast({
        title: 'Error loading templates',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    if (statusFilter === 'all') return templates;
    return templates.filter((t) => t.status === statusFilter);
  }, [templates, statusFilter]);

  const stats = useMemo(() => {
    const activeCount = templates.filter((t) => t.status === 'active').length;
    const totalEstValue = templates.reduce((acc, t) => {
      const subtotal = (t.items || []).reduce((s, it) => s + (it.quantity * it.unitPrice), 0);
      return acc + subtotal;
    }, 0);
    const emailEnabledCount = templates.filter((t) => t.emailConfig?.enabled).length;

    return { activeCount, totalCount: templates.length, totalEstValue, emailEnabledCount };
  }, [templates]);

  const handleToggleStatus = async (e: React.MouseEvent, t: InvoiceTemplateDTO) => {
    e.stopPropagation();
    const newStatus = t.status === 'active' ? 'paused' : 'active';
    const res = await updateInvoiceTemplateStatusAction(t.id, newStatus);
    if (res.success) {
      toast({
        title: `Template ${newStatus === 'active' ? 'Activated' : 'Paused'}`,
        description: `Template "${t.name}" status updated.`,
      });
      loadTemplates();
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, t: InvoiceTemplateDTO) => {
    e.stopPropagation();
    const res = await duplicateInvoiceTemplateAction(t.id);
    if (res.success) {
      toast({
        title: 'Template Duplicated',
        description: `Created copy of "${t.name}".`,
      });
      loadTemplates();
    }
  };

  const handleDelete = async (e: React.MouseEvent, t: InvoiceTemplateDTO) => {
    e.stopPropagation();
    if (!confirm(`Delete template "${t.name}"?`)) return;
    const res = await deleteInvoiceTemplateAction(t.id);
    if (res.success) {
      toast({
        title: 'Template Deleted',
        description: `Template "${t.name}" has been removed.`,
      });
      loadTemplates();
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'paused':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20';
    }
  };

  const agGridColumns: ColDef[] = useMemo(
    () => [
      {
        headerName: 'Template Name',
        field: 'name',
        flex: 1.5,
        minWidth: 200,
        cellRenderer: (params: any) => {
          const t = params.data as InvoiceTemplateDTO;
          if (!t) return null;
          return (
            <div className="flex items-center gap-2 py-1">
              <div className="w-7 h-7 rounded-lg bg-admin-primary/10 text-admin-primary flex items-center justify-center shrink-0 border border-admin-primary/20">
                <LayoutTemplate className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="font-bold text-admin-foreground text-xs truncate">{t.name}</span>
                <span className="text-[10.5px] text-admin-muted truncate">{t.description || 'No description'}</span>
              </div>
            </div>
          );
        },
      },
      {
        headerName: 'Type',
        field: 'invoiceType',
        width: 120,
        valueGetter: (p) => (p.data?.invoiceType ? p.data.invoiceType.toUpperCase() : 'RENT'),
      },
      {
        headerName: 'Frequency',
        width: 130,
        valueGetter: (p) => {
          const freq = (p.data?.automationConfig as any)?.triggerFrequency || 'Monthly';
          return freq.charAt(0).toUpperCase() + freq.slice(1);
        },
      },
      {
        headerName: 'Items Value',
        width: 130,
        cellRenderer: (params: any) => {
          const t = params.data as InvoiceTemplateDTO;
          if (!t) return null;
          const subtotal = (t.items || []).reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0);
          return (
            <span className="font-bold text-admin-foreground text-xs">
              {formatCurrency(subtotal, t.currency || 'AUD')}
            </span>
          );
        },
      },
      {
        headerName: 'Email Delivery',
        width: 140,
        cellRenderer: (params: any) => {
          const enabled = params.data?.emailConfig?.enabled;
          return (
            <span className={cn('text-xs font-semibold flex items-center gap-1', enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-admin-muted')}>
              <Mail className="w-3 h-3" /> {enabled ? 'Resend (Auto)' : 'Manual'}
            </span>
          );
        },
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 120,
        cellRenderer: (params: any) => {
          const status = params.data?.status || 'draft';
          return (
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border capitalize', getStatusBadge(status))}>
              {status}
            </span>
          );
        },
      },
      {
        headerName: 'Actions',
        colId: 'actions',
        width: 180,
        pinned: 'right',
        sortable: false,
        filter: false,
        cellRenderer: (params: any) => {
          const t = params.data as InvoiceTemplateDTO;
          if (!t) return null;
          return (
            <div className="flex items-center gap-1.5 py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRunningTemplate(t);
                }}
                className="px-2 py-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors inline-flex items-center gap-1 font-bold text-xs"
                title="Run Now"
              >
                <Play className="w-3 h-3" /> Run
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTemplate(t);
                  setWizardOpen(true);
                }}
                className="px-2 py-1 text-admin-primary hover:bg-admin-primary/10 rounded transition-colors inline-flex items-center gap-1 font-bold text-xs"
                title="Edit Blueprint"
              >
                <Edit className="w-3 h-3" /> Edit
              </button>
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <ListPage
      title="Recurring Templates"
      description="Define recurring invoice blueprints, billing rules, and automated Resend delivery schedules."
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Invoices', href: '/dashboard/invoices' },
        { label: 'Templates' },
      ]}
      actions={
        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-admin-surface-subtle border border-admin-border p-0.5 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5',
                viewMode === 'grid'
                  ? 'bg-admin-surface text-admin-foreground shadow-xs'
                  : 'text-admin-muted hover:text-admin-foreground'
              )}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5',
                viewMode === 'table'
                  ? 'bg-admin-surface text-admin-foreground shadow-xs'
                  : 'text-admin-muted hover:text-admin-foreground'
              )}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

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

          <Button
            onClick={() => {
              setEditingTemplate(null);
              setWizardOpen(true);
            }}
            size="sm"
            className="font-bold shadow-xs bg-admin-primary hover:bg-admin-primary/90 text-white text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Template
          </Button>
        </div>
      }
      summary={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Active Blueprints</p>
              <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400 truncate">
                {loading ? <span className="inline-block h-5 w-12 rounded skeleton-shimmer align-middle" /> : stats.activeCount}
              </h3>
            </div>
          </div>

          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-admin-primary/10 text-admin-primary flex items-center justify-center shrink-0 border border-admin-primary/20">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Total Templates</p>
              <h3 className="text-lg font-black text-admin-foreground truncate">
                {loading ? <span className="inline-block h-5 w-12 rounded skeleton-shimmer align-middle" /> : stats.totalCount}
              </h3>
            </div>
          </div>

          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Recurring Est. Cycle</p>
              <h3 className="text-lg font-black text-admin-foreground truncate">
                {loading ? (
                  <span className="inline-block h-5 w-20 rounded skeleton-shimmer align-middle" />
                ) : (
                  formatCurrency(stats.totalEstValue, 'AUD')
                )}
              </h3>
            </div>
          </div>

          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Resend Delivery</p>
              <h3 className="text-lg font-black text-purple-600 dark:text-purple-400 truncate">
                {loading ? <span className="inline-block h-5 w-12 rounded skeleton-shimmer align-middle" /> : `${stats.emailEnabledCount} Enabled`}
              </h3>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex-1 flex flex-col min-h-0 h-full space-y-4">
        {!loading && templates.length === 0 ? (
          <div className="py-20 px-6 text-center bg-admin-surface rounded-2xl border border-admin-border shadow-xs flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-14 h-14 bg-admin-surface-subtle rounded-full flex items-center justify-center mx-auto mb-4 text-admin-muted border border-admin-border">
              <LayoutTemplate className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-admin-foreground mb-1">No templates yet</h3>
            <p className="text-xs text-admin-muted max-w-sm mx-auto mb-5 font-medium">
              Create a blueprint template to configure recurring rent definitions, active lease conditions, and automated Resend emails.
            </p>
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setWizardOpen(true);
              }}
              className="font-bold bg-admin-primary hover:bg-admin-primary/90 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create First Template
            </Button>
          </div>
        ) : viewMode === 'table' ? (
          <ListPageGrid>
            <AdminDataGrid
              rowData={filteredTemplates}
              columnDefs={agGridColumns}
              loading={loading}
              labelSingular="template"
              labelPlural="templates"
              onRowClick={(row) => router.push(`/dashboard/invoices/templates/${row.id}`)}
              getRowId={(p) => p.data.id}
              enableColumnChooser
              enableExport
              exportFilename="invoice-templates-export"
              searchPlaceholder="Search templates by name..."
              leftToolbarContent={
                <QuickFilterBar
                  options={filterOptions}
                  activeValue={statusFilter}
                  onChange={(val) => setStatusFilter(val as string)}
                />
              }
              disablePagination={true}
            />
          </ListPageGrid>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto flex-1 p-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-admin-surface border border-admin-border rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4 skeleton-shimmer"
              >
                <div className="space-y-2">
                  <div className="h-4 rounded skeleton-shimmer w-32" />
                  <div className="h-3 rounded skeleton-shimmer w-48" />
                </div>
                <div className="h-px w-full bg-admin-border/60" />
                <div className="h-10 rounded skeleton-shimmer w-full" />
              </div>
            ))}
          </div>
        ) : (
          <HoverCardGrid className="overflow-y-auto flex-1 p-1">
            {filteredTemplates.map((t) => {
              const subtotal = (t.items || []).reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0);
              const freq = (t.automationConfig as any)?.triggerFrequency || 'Monthly';
              const emailEnabled = t.emailConfig?.enabled;

              return (
                <HoverEffectCardItem
                  key={t.id}
                  onClick={() => router.push(`/dashboard/invoices/templates/${t.id}`)}
                  className="group/card cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-admin-primary/10 text-admin-primary flex items-center justify-center shrink-0 border border-admin-primary/20">
                        <LayoutTemplate className="w-5 h-5 text-admin-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-admin-foreground line-clamp-1 group-hover/card:text-admin-primary transition-colors">
                          {t.name}
                        </h4>
                        <p className="text-xs text-admin-muted truncate font-sans">
                          {t.description || `${(t.invoiceType || 'rent').toUpperCase()} Billing Blueprint`}
                        </p>
                      </div>
                    </div>

                    <span className={cn('px-2 py-0.5 rounded-md text-[10.5px] font-bold border capitalize shrink-0', getStatusBadge(t.status))}>
                      {t.status}
                    </span>
                  </div>

                  <div className="h-px w-full bg-admin-border/60 my-3" />

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[10.5px] text-admin-muted font-medium">Template Total</p>
                      <p className="font-bold text-admin-foreground mt-0.5">
                        {formatCurrency(subtotal, t.currency || 'AUD')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10.5px] text-admin-muted font-medium">Schedule</p>
                      <p className="font-bold text-admin-foreground mt-0.5 capitalize">
                        {freq} {(t.automationConfig as any)?.dayOfMonth ? `(Day ${(t.automationConfig as any).dayOfMonth})` : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10.5px] text-admin-muted font-medium">Line Items</p>
                      <p className="text-admin-foreground mt-0.5">
                        {t.items?.length || 0} item{(t.items?.length || 0) === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10.5px] text-admin-muted font-medium">Email Delivery</p>
                      <p className={cn('mt-0.5 font-medium flex items-center gap-1', emailEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-admin-muted')}>
                        <Mail className="w-3 h-3" /> {emailEnabled ? 'Resend' : 'Manual'}
                      </p>
                    </div>
                  </div>

                  <div className="h-px w-full bg-admin-border/60 my-3" />

                  <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleToggleStatus(e, t)}
                        className={cn(
                          'px-2 py-1 text-xs font-bold rounded-md transition-colors',
                          t.status === 'active'
                            ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                            : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                        )}
                        title={t.status === 'active' ? 'Pause Automation' : 'Activate Automation'}
                      >
                        {t.status === 'active' ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        onClick={(e) => handleDuplicate(e, t)}
                        className="p-1 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded-md transition-colors"
                        title="Duplicate Template"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, t)}
                        className="p-1 text-admin-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                        title="Delete Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setRunningTemplate(t)}
                        className="px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md transition-colors inline-flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" /> Run Now
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/invoices/templates/${t.id}`)}
                        className="px-2.5 py-1 text-xs font-bold text-admin-primary hover:bg-admin-primary/10 rounded-md transition-colors inline-flex items-center gap-1"
                      >
                        Details <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </HoverEffectCardItem>
              );
            })}
          </HoverCardGrid>
        )}
      </div>

      {/* 6-Step Template Creation Wizard */}
      <InvoiceTemplateWizard
        isOpen={wizardOpen}
        initialTemplate={editingTemplate}
        onClose={() => {
          setWizardOpen(false);
          setEditingTemplate(null);
        }}
        onSuccess={() => {
          loadTemplates();
        }}
      />

      {/* Run Template Now Modal */}
      {runningTemplate && (
        <RunTemplateNowModal
          isOpen={!!runningTemplate}
          template={runningTemplate}
          onClose={() => setRunningTemplate(null)}
          onCompleted={() => loadTemplates()}
        />
      )}
    </ListPage>
  );
}
