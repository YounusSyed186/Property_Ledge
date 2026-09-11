'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Mail,
  DollarSign,
  RefreshCw,
  ArrowUpDown,
  AlertCircle,
  Eye,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  Building,
  User,
  ArrowUpRight,
  MoreHorizontal,
  CreditCard,
  Ban,
  Trash2,
  Edit3,
} from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import { Button, useToast, ConfirmDialog } from '@/components/admin/ui';
import { AdminDataGrid, QuickFilterBar, QuickFilterOption, BulkAction } from '@/components/admin/data-grid';
import { ListPage, ListPageGrid } from '@/components/workspace';
import { HoverCardGrid, HoverEffectCardItem } from '@/components/ui/card-hover-effect';
import { PersonIdentity, DiceBearIcon } from '@/components/ui/avatar';
import { InvoiceDTO, CreateInvoiceDTO, UpdateInvoiceDTO } from '@/modules/invoices';
import { formatCurrency } from '@/modules/invoices/domain/value-objects/currency';
import {
  fetchInvoicesAction,
  createInvoiceAction,
  updateInvoiceAction,
  issueInvoiceAction,
  recordInvoicePaymentAction,
  cancelInvoiceAction,
  deleteDraftInvoiceAction,
  deleteInvoiceAction,
  getInvoiceDownloadUrlAction,
  generateInvoiceDocumentAction,
  sendInvoiceEmailAction,
} from '@/app/actions/invoices';
import dynamic from 'next/dynamic';
import { formatAuDisplayDate, formatAuDisplayDateTime } from '@/lib/format/australian-time';
import { cn } from '@/lib/utils';

const CreateInvoiceModal = dynamic(
  () => import('./CreateInvoiceModal').then((mod) => mod.CreateInvoiceModal),
  { ssr: false }
);
const InvoiceDetailModal = dynamic(
  () => import('./InvoiceDetailModal').then((mod) => mod.InvoiceDetailModal),
  { ssr: false }
);

export function InvoiceList() {
  const router = useRouter();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<InvoiceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<InvoiceDTO | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDTO | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<InvoiceDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filterOptions = useMemo<QuickFilterOption[]>(
    () => [
      { label: 'All', value: 'all' },
      { label: 'Draft', value: 'draft' },
      { label: 'Issued', value: 'issued' },
      { label: 'Partially Paid', value: 'partially_paid' },
      { label: 'Paid', value: 'paid' },
      { label: 'Overdue', value: 'overdue' },
      { label: 'Cancelled', value: 'cancelled' },
    ],
    []
  );

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetchInvoicesAction({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100,
      });
      setInvoices(res.items);
    } catch (err: any) {
      toast({
        title: 'Error loading invoices',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  // KPIs
  const stats = useMemo(() => {
    let totalOutstanding = 0;
    let totalInvoiced = 0;
    let overdueCount = 0;
    let paidCount = 0;

    for (const inv of invoices) {
      if (inv.status !== 'cancelled' && inv.status !== 'void') {
        totalInvoiced += inv.total;
        totalOutstanding += inv.balance;
      }
      if (inv.status === 'overdue') overdueCount++;
      if (inv.status === 'paid') paidCount++;
    }

    return { totalOutstanding, totalInvoiced, overdueCount, paidCount };
  }, [invoices]);

  // Actions
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
          console.warn('[InvoiceList] Email send warning:', emailErr);
        }
      }
    }

    toast({
      title: 'Invoice Created',
      description: `Invoice ${res.invoice.invoiceNumber} created ${issueImmediately ? 'and issued ' : ''}successfully.`,
    });
    loadInvoices();
  };

  const handleUpdateSubmit = async (id: string, dto: UpdateInvoiceDTO) => {
    const res = await updateInvoiceAction(id, dto);
    if (!res.success || !res.invoice) {
      throw new Error(res.error || 'Failed to update invoice');
    }

    toast({
      title: 'Invoice Updated',
      description: `Invoice ${res.invoice.invoiceNumber} updated successfully.`,
    });
    setInvoiceToEdit(null);
    loadInvoices();
  };

  const handleIssue = async (id: string) => {
    const res = await issueInvoiceAction(id);
    if (!res.success) {
      toast({ title: 'Issue Failed', description: res.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Invoice Issued', description: 'Status updated to Issued.' });
    loadInvoices();
    if (selectedInvoice && selectedInvoice.id === id) {
      setSelectedInvoice(res.invoice || null);
    }
  };

  const handleRecordPayment = async (id: string, amount: number, method: string, reference?: string) => {
    const res = await recordInvoicePaymentAction(id, amount, method, reference);
    if (!res.success) {
      toast({ title: 'Payment Failed', description: res.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Payment Recorded', description: 'Invoice balance updated.' });
    loadInvoices();
    if (selectedInvoice && selectedInvoice.id === id) {
      setSelectedInvoice(res.invoice || null);
    }
  };

  const handleCancel = async (id: string, reason: string) => {
    const res = await cancelInvoiceAction(id, reason);
    if (!res.success) {
      toast({ title: 'Cancellation Failed', description: res.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Invoice Cancelled', description: 'Invoice marked as cancelled.' });
    loadInvoices();
    if (selectedInvoice && selectedInvoice.id === id) {
      setSelectedInvoice(res.invoice || null);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    const res = await deleteDraftInvoiceAction(id);
    if (!res.success) {
      toast({ title: 'Delete Failed', description: res.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Draft Deleted', description: 'Draft invoice removed.' });
    setSelectedInvoice(null);
    loadInvoices();
  };

  const handleDeleteInvoice = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await deleteInvoiceAction(id);
      if (!res.success) {
        toast({ title: 'Delete Failed', description: res.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Invoice Deleted', description: 'Invoice permanently removed.' });
      if (selectedInvoice && selectedInvoice.id === id) {
        setSelectedInvoice(null);
      }
      setInvoiceToDelete(null);
      loadInvoices();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteInvoices = async (selectedRows: InvoiceDTO[]) => {
    if (!selectedRows || selectedRows.length === 0) return;
    setIsDeleting(true);
    try {
      let successCount = 0;
      let failCount = 0;

      for (const inv of selectedRows) {
        const res = await deleteInvoiceAction(inv.id);
        if (res.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Bulk Delete Completed',
          description: `Successfully deleted ${successCount} invoice(s)${failCount > 0 ? `, ${failCount} failed` : ''}.`,
        });
      } else {
        toast({
          title: 'Bulk Delete Failed',
          description: 'Failed to delete selected invoices.',
          variant: 'destructive',
        });
      }
      loadInvoices();
    } finally {
      setIsDeleting(false);
    }
  };

  const bulkActions = useMemo<BulkAction[]>(
    () => [
      {
        label: 'Issue Selected Invoices',
        onClick: async (selectedRows: InvoiceDTO[]) => {
          const drafts = selectedRows.filter((inv) => inv.status === 'draft');
          if (drafts.length === 0) {
            toast({
              title: 'No Draft Invoices Selected',
              description: 'Only draft invoices can be issued.',
              variant: 'destructive',
            });
            return;
          }
          let count = 0;
          for (const inv of drafts) {
            const res = await issueInvoiceAction(inv.id);
            if (res.success) count++;
          }
          toast({
            title: 'Invoices Issued',
            description: `Successfully issued ${count} draft invoice(s).`,
          });
          loadInvoices();
        },
      },
    ],
    []
  );

  const handleDownload = async (id: string, format: 'pdf' | 'docx') => {
    try {
      const res = await getInvoiceDownloadUrlAction(id, format);
      if (res.success && res.url) {
        window.open(res.url, '_blank');
      } else {
        const genRes = await generateInvoiceDocumentAction(id, format);
        if (genRes.success && genRes.url) {
          window.open(genRes.url, '_blank');
        } else {
          toast({ title: 'Download Error', description: genRes.error || 'Unable to download file', variant: 'destructive' });
        }
      }
    } catch (err: any) {
      toast({ title: 'Download Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleSendEmail = async (id: string, customMessage?: string, driveFolderUrl?: string) => {
    const res = await sendInvoiceEmailAction(id, customMessage, driveFolderUrl);
    if (!res.success) {
      toast({ title: 'Email Failed', description: res.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Email Sent', description: 'Invoice delivered via email.' });
    loadInvoices();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'partially_paid':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
      case 'issued':
      case 'viewed':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'overdue':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'cancelled':
      case 'void':
        return 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20';
      case 'draft':
      default:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
  };

  // AG Grid columns definition
  const agGridColumns: ColDef[] = useMemo(
    () => [
      {
        headerName: 'Invoice #',
        field: 'invoiceNumber',
        width: 140,
        cellRenderer: (params: any) => {
          const inv = params.data as InvoiceDTO;
          if (!inv) return null;
          return (
            <div className="flex items-center gap-2 py-1">
              <div className="w-6 h-6 rounded-md bg-admin-primary/10 text-admin-primary flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span className="font-mono font-bold text-admin-foreground text-xs">{inv.invoiceNumber}</span>
            </div>
          );
        },
      },
      {
        headerName: 'Recipient / Bill To',
        flex: 1.5,
        minWidth: 200,
        valueGetter: (p) => p.data?.recipient?.name || p.data?.customerName || 'Customer',
        cellRenderer: (params: any) => {
          const inv = params.data as InvoiceDTO;
          if (!inv) return null;
          const name = inv.recipient?.name || inv.customerName || 'Customer';
          const email = inv.recipient?.email || inv.customerEmail || undefined;
          return (
            <PersonIdentity
              seed={inv.tenantId || inv.customerEmail || name}
              name={name}
              subtitle={email}
              size="sm"
            />
          );
        },
      },
      {
        headerName: 'Issue Date',
        field: 'issueDate',
        width: 130,
        cellRenderer: (params: any) => {
          const inv = params.data as InvoiceDTO;
          if (!inv) return null;
          return (
            <span className="text-xs text-admin-muted font-medium">
              {formatAuDisplayDate(inv.issueDate)}
            </span>
          );
        },
      },
      {
        headerName: 'Due Date',
        field: 'dueDate',
        width: 130,
        cellRenderer: (params: any) => {
          const inv = params.data as InvoiceDTO;
          if (!inv) return null;
          const isOverdue = inv.status === 'overdue' || (inv.balance > 0 && new Date(inv.dueDate) < new Date());
          return (
            <span className={cn('text-xs font-medium', isOverdue && inv.balance > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-admin-foreground')}>
              {formatAuDisplayDate(inv.dueDate)}
            </span>
          );
        },
      },
      {
        headerName: 'Total Amount',
        field: 'total',
        width: 130,
        cellRenderer: (params: any) => {
          const inv = params.data as InvoiceDTO;
          if (!inv) return null;
          return (
            <span className="font-bold text-admin-foreground text-xs">
              {formatCurrency(inv.total, inv.currency)}
            </span>
          );
        },
      },
      {
        headerName: 'Balance Due',
        field: 'balance',
        width: 130,
        cellRenderer: (params: any) => {
          const inv = params.data as InvoiceDTO;
          if (!inv) return null;
          return (
            <span className={cn('font-bold text-xs', inv.balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
              {formatCurrency(inv.balance, inv.currency)}
            </span>
          );
        },
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 130,
        cellRenderer: (params: any) => {
          const status = params.data?.status || 'draft';
          return (
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border capitalize', getStatusBadge(status))}>
              {status.replace('_', ' ')}
            </span>
          );
        },
      },
      {
        headerName: 'Actions',
        colId: 'actions',
        width: 175,
        pinned: 'right',
        sortable: false,
        filter: false,
        cellRenderer: (params: any) => {
          const inv = params.data as InvoiceDTO;
          if (!inv) return null;
          const canEdit = inv.status !== 'paid' && inv.status !== 'cancelled' && inv.status !== 'void';
          return (
            <div className="flex items-center gap-1 py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedInvoice(inv);
                }}
                className="px-2 py-1 text-admin-primary hover:bg-admin-primary/10 rounded transition-colors inline-flex items-center gap-1 font-bold text-xs"
                title="View Invoice"
              >
                <Eye className="w-3.5 h-3.5" /> View
              </button>
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setInvoiceToEdit(inv);
                    setIsCreateOpen(true);
                  }}
                  className="p-1 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded transition-colors"
                  title="Edit Invoice"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(inv.id, 'pdf');
                }}
                className="p-1 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded transition-colors"
                title="Download PDF"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setInvoiceToDelete(inv);
                }}
                className="p-1 text-admin-muted hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
                title="Delete Invoice"
              >
                <Trash2 className="w-3.5 h-3.5" />
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
      title="Invoices & Billing"
      description="Manage customer billing, automated recurring rent invoices, PDF documents, and payment tracking."
      breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Invoices' }]}
      actions={
        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-admin-surface-subtle border border-admin-border p-0.5 rounded-xl">
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
          </div>

          <Button
            onClick={() => {
              setInvoiceToEdit(null);
              setIsCreateOpen(true);
            }}
            size="sm"
            className="font-bold shadow-xs bg-admin-primary hover:bg-admin-primary/90 text-white text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Invoice
          </Button>
        </div>
      }
      summary={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Outstanding Balance</p>
              <h3 className="text-lg font-black text-admin-foreground truncate">
                {loading ? (
                  <span className="inline-block h-5 w-20 rounded skeleton-shimmer align-middle" />
                ) : (
                  formatCurrency(stats.totalOutstanding, 'AUD')
                )}
              </h3>
            </div>
          </div>

          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Total Invoiced</p>
              <h3 className="text-lg font-black text-admin-foreground truncate">
                {loading ? (
                  <span className="inline-block h-5 w-20 rounded skeleton-shimmer align-middle" />
                ) : (
                  formatCurrency(stats.totalInvoiced, 'AUD')
                )}
              </h3>
            </div>
          </div>

          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Paid Invoices</p>
              <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400 truncate">
                {loading ? (
                  <span className="inline-block h-5 w-12 rounded skeleton-shimmer align-middle" />
                ) : (
                  stats.paidCount
                )}
              </h3>
            </div>
          </div>

          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Overdue Invoices</p>
              <h3 className="text-lg font-black text-rose-600 dark:text-rose-400 truncate">
                {loading ? (
                  <span className="inline-block h-5 w-12 rounded skeleton-shimmer align-middle" />
                ) : (
                  stats.overdueCount
                )}
              </h3>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex-1 flex flex-col min-h-0 h-full space-y-4">
        {!loading && invoices.length === 0 && statusFilter === 'all' ? (
          <div className="py-20 px-6 text-center bg-admin-surface rounded-2xl border border-admin-border shadow-xs flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-14 h-14 bg-admin-surface-subtle rounded-full flex items-center justify-center mx-auto mb-4 text-admin-muted border border-admin-border">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-admin-foreground mb-1">No invoices yet</h3>
            <p className="text-xs text-admin-muted max-w-sm mx-auto mb-5 font-medium">
              Create your first standalone invoice or manage automated invoices through the Automations tab.
            </p>
            <div className="flex items-center gap-2">
              <Button onClick={() => setIsCreateOpen(true)} className="font-bold">
                <Plus className="w-4 h-4 mr-1.5" /> Create First Invoice
              </Button>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <ListPageGrid>
            <AdminDataGrid
              rowData={invoices}
              columnDefs={agGridColumns}
              loading={loading}
              labelSingular="invoice"
              labelPlural="invoices"
              enableSelection={true}
              onDeleteSelected={handleBulkDeleteInvoices}
              bulkActions={bulkActions}
              onRowClick={(row) => setSelectedInvoice(row)}
              getRowId={(p) => p.data.id}
              enableColumnChooser
              enableExport
              exportFilename="invoices-export"
              searchPlaceholder="Search invoices by number or customer..."
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
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-admin-surface border border-admin-border rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4 skeleton-shimmer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="h-4 rounded skeleton-shimmer w-28" />
                    <div className="h-3 rounded skeleton-shimmer w-36" />
                  </div>
                  <div className="h-5 w-16 rounded skeleton-shimmer" />
                </div>
                <div className="h-px w-full bg-admin-border/60" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 rounded skeleton-shimmer w-24" />
                  <div className="h-5 rounded skeleton-shimmer w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <HoverCardGrid className="overflow-y-auto flex-1 p-1">
            {invoices.map((inv) => {
              const name = inv.recipient?.name || inv.customerName || 'Customer';
              const email = inv.recipient?.email || inv.customerEmail || '';
              const isOverdue = inv.status === 'overdue' || (inv.balance > 0 && new Date(inv.dueDate) < new Date());

              return (
                <HoverEffectCardItem
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className="group/card cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-admin-primary/10 text-admin-primary flex items-center justify-center shrink-0 border border-admin-primary/20">
                        <FileText className="w-5 h-5 text-admin-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-admin-foreground line-clamp-1 group-hover/card:text-admin-primary transition-colors font-mono">
                          {inv.invoiceNumber}
                        </h4>
                        <p className="text-xs text-admin-muted truncate font-sans">{name}</p>
                      </div>
                    </div>

                    <span className={cn('px-2 py-0.5 rounded-md text-[10.5px] font-bold border capitalize shrink-0', getStatusBadge(inv.status))}>
                      {inv.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="h-px w-full bg-admin-border/60 my-3" />

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[10.5px] text-admin-muted font-medium">Total Amount</p>
                      <p className="font-bold text-admin-foreground mt-0.5">{formatCurrency(inv.total, inv.currency)}</p>
                    </div>
                    <div>
                      <p className="text-[10.5px] text-admin-muted font-medium">Balance Due</p>
                      <p className={cn('font-bold mt-0.5', inv.balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
                        {formatCurrency(inv.balance, inv.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10.5px] text-admin-muted font-medium">Issue Date</p>
                      <p className="text-admin-foreground mt-0.5">{formatAuDisplayDate(inv.issueDate)}</p>
                    </div>
                    <div>
                      <p className="text-[10.5px] text-admin-muted font-medium">Due Date</p>
                      <p className={cn('mt-0.5', isOverdue && inv.balance > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-admin-foreground')}>
                        {formatAuDisplayDate(inv.dueDate)}
                      </p>
                    </div>
                  </div>

                  <div className="h-px w-full bg-admin-border/60 my-3" />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-admin-muted truncate">{email}</span>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {inv.status !== 'paid' && inv.status !== 'cancelled' && inv.status !== 'void' && (
                        <button
                          onClick={() => {
                            setInvoiceToEdit(inv);
                            setIsCreateOpen(true);
                          }}
                          className="p-1.5 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded-md transition-colors"
                          title="Edit Invoice"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(inv.id, 'pdf')}
                        className="p-1.5 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded-md transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setInvoiceToDelete(inv)}
                        className="p-1.5 text-admin-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                        title="Delete Invoice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-2.5 py-1 text-xs font-bold text-admin-primary hover:bg-admin-primary/10 rounded-md transition-colors inline-flex items-center gap-1"
                      >
                        View <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </HoverEffectCardItem>
              );
            })}
          </HoverCardGrid>
        )}
      </div>

      {/* Create / Edit Modal */}
      <CreateInvoiceModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setInvoiceToEdit(null);
        }}
        onSubmit={handleCreateSubmit}
        invoiceToEdit={invoiceToEdit}
        onUpdate={handleUpdateSubmit}
      />

      {/* Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onIssue={handleIssue}
          onRecordPayment={handleRecordPayment}
          onCancel={handleCancel}
          onDeleteDraft={handleDeleteDraft}
          onDelete={handleDeleteInvoice}
          onDownload={handleDownload}
          onSendEmail={handleSendEmail}
          onEdit={(inv) => {
            setSelectedInvoice(null);
            setInvoiceToEdit(inv);
            setIsCreateOpen(true);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!invoiceToDelete}
        onClose={() => setInvoiceToDelete(null)}
        onConfirm={async () => {
          if (!invoiceToDelete) return;
          await handleDeleteInvoice(invoiceToDelete.id);
        }}
        title="Delete Invoice?"
        description={`Are you sure you want to permanently delete invoice ${invoiceToDelete?.invoiceNumber}? All line items and generated documents will also be removed.`}
        confirmLabel="Delete Invoice"
        variant="danger"
        loading={isDeleting}
      />
    </ListPage>
  );
}
