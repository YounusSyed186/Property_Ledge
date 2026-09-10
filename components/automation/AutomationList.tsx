'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Plus,
  Play,
  History,
  Trash2,
  Clock,
  Calendar,
  Send,
  CheckCircle,
  AlertCircle,
  Pause,
  List,
  LayoutGrid,
  Building,
  User,
  Receipt,
  FileText,
} from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import { Button, useToast, ConfirmDialog } from '@/components/admin/ui';
import { AdminDataGrid, QuickFilterBar, QuickFilterOption, BulkAction } from '@/components/admin/data-grid';
import { ListPage, ListPageGrid } from '@/components/workspace';
import { HoverCardGrid, HoverEffectCardItem } from '@/components/ui/card-hover-effect';
import { PersonIdentity } from '@/components/ui/avatar';
import {
  fetchAutomationsAction,
  togglePauseAutomationAction,
  triggerAutomationNowAction,
  deleteAutomationAction,
  bulkDeleteAutomationsAction,
  evaluateDueAutomationsAction,
  AutomationItem,
} from '@/app/actions/automations';
import { ScheduleCalculator } from '@/modules/automation/domain/services/schedule-calculator';
import { formatAuDisplayDateTime } from '@/lib/format/australian-time';
import { CreateAutomationModal } from './CreateAutomationModal';
import { TriggerConfirmationModal } from './TriggerConfirmationModal';
import { ExecutionHistoryModal } from './ExecutionHistoryModal';
import { cn } from '@/lib/utils';

export function AutomationList() {
  const { toast } = useToast();
  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [triggerAutomation, setTriggerAutomation] = useState<AutomationItem | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);

  const [historyAutomationId, setHistoryAutomationId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [automationToDelete, setAutomationToDelete] = useState<AutomationItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Live Australian Time Clock
  const [auTime, setAuTime] = useState(() => formatAuDisplayDateTime(new Date(), true));
  useEffect(() => {
    const timer = setInterval(() => {
      setAuTime(formatAuDisplayDateTime(new Date(), true));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const filterOptions = useMemo<QuickFilterOption[]>(
    () => [
      { label: 'All Automations', value: 'all' },
      { label: 'Lease Automations', value: 'lease' },
      { label: 'Invoice Automations', value: 'invoice' },
      { label: 'Active', value: 'active' },
      { label: 'Paused', value: 'paused' },
    ],
    []
  );

  const loadAutomations = async () => {
    setLoading(true);
    try {
      // Check and execute any due automations automatically
      await evaluateDueAutomationsAction();

      const typeFilter = activeFilter === 'lease' || activeFilter === 'invoice' ? activeFilter : undefined;
      const statusFilter = activeFilter === 'active' || activeFilter === 'paused' ? activeFilter : undefined;

      const data = await fetchAutomationsAction({
        type: typeFilter as any,
        status: statusFilter,
      });
      setAutomations(data);
    } catch (err: any) {
      toast({
        title: 'Error loading automations',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAutomations();

    // Periodic automatic background check every 20 seconds
    const interval = setInterval(async () => {
      const evalRes = await evaluateDueAutomationsAction();
      if (evalRes?.success && evalRes.evaluated && evalRes.evaluated > 0) {
        toast({
          title: 'Automated Invoice Dispatched',
          description: `Successfully executed ${evalRes.evaluated} scheduled automation(s).`,
        });
        const typeFilter = activeFilter === 'lease' || activeFilter === 'invoice' ? activeFilter : undefined;
        const statusFilter = activeFilter === 'active' || activeFilter === 'paused' ? activeFilter : undefined;
        const fresh = await fetchAutomationsAction({ type: typeFilter as any, status: statusFilter });
        setAutomations(fresh);
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [activeFilter]);

  const handleTogglePause = async (id: string) => {
    const res = await togglePauseAutomationAction(id);
    if (!res.success) {
      toast({ title: 'Update Failed', description: res.error, variant: 'destructive' });
      return;
    }
    toast({
      title: res.status === 'active' ? 'Automation Resumed' : 'Automation Paused',
      description: `Automation state set to ${res.status}.`,
    });
    loadAutomations();
  };

  const handleConfirmTrigger = async () => {
    if (!triggerAutomation) return;
    setIsTriggering(true);
    try {
      const res = await triggerAutomationNowAction(triggerAutomation.id);
      if (!res.success) {
        toast({ title: 'Trigger Failed', description: res.error, variant: 'destructive' });
        return;
      }
      toast({
        title: 'Automation Dispatched',
        description: `Action executed successfully. A fresh document/email was generated.`,
      });
      setTriggerAutomation(null);
      loadAutomations();
    } finally {
      setIsTriggering(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!automationToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteAutomationAction(automationToDelete.id);
      if (!res.success) {
        toast({ title: 'Delete Failed', description: res.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Automation Removed', description: 'Automation schedule deleted successfully.' });
      setAutomationToDelete(null);
      loadAutomations();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async (selectedRows: AutomationItem[]) => {
    if (!selectedRows || selectedRows.length === 0) return;
    try {
      const ids = selectedRows.map((r) => r.id);
      const res = await bulkDeleteAutomationsAction(ids);
      if (!res.success) {
        toast({
          title: 'Bulk Delete Failed',
          description: res.error || 'Failed to delete selected automations',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Automations Deleted',
        description: `Successfully deleted ${res.count || ids.length} automation(s).`,
      });
      loadAutomations();
    } catch (err: any) {
      toast({
        title: 'Delete Error',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const bulkActions = useMemo<BulkAction[]>(
    () => [
      {
        label: 'Pause Selected',
        icon: <Pause className="w-3.5 h-3.5" />,
        onClick: async (selectedRows: AutomationItem[]) => {
          const activeRows = selectedRows.filter((a) => a.status === 'active');
          if (activeRows.length === 0) {
            toast({
              title: 'No Active Automations Selected',
              description: 'Selected automations are already paused.',
            });
            return;
          }
          let count = 0;
          for (const auto of activeRows) {
            const res = await togglePauseAutomationAction(auto.id);
            if (res.success) count++;
          }
          toast({
            title: 'Automations Paused',
            description: `Successfully paused ${count} automation(s).`,
          });
          loadAutomations();
        },
      },
      {
        label: 'Resume Selected',
        icon: <Play className="w-3.5 h-3.5" />,
        onClick: async (selectedRows: AutomationItem[]) => {
          const pausedRows = selectedRows.filter((a) => a.status === 'paused');
          if (pausedRows.length === 0) {
            toast({
              title: 'No Paused Automations Selected',
              description: 'Selected automations are already active.',
            });
            return;
          }
          let count = 0;
          for (const auto of pausedRows) {
            const res = await togglePauseAutomationAction(auto.id);
            if (res.success) count++;
          }
          toast({
            title: 'Automations Activated',
            description: `Successfully activated ${count} automation(s).`,
          });
          loadAutomations();
        },
      },
    ],
    []
  );

  const formatNextDelivery = (dateStr: string | null) => {
    if (!dateStr) return 'Not Scheduled';
    return formatAuDisplayDateTime(dateStr);
  };

  // AG Grid columns definition
  const agGridColumns: ColDef[] = useMemo(
    () => [
      {
        headerName: 'Type',
        width: 110,
        cellRenderer: (params: any) => {
          const isLease = params.data?.automationType === 'lease';
          return (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border my-1',
                isLease
                  ? 'bg-admin-primary/10 text-admin-primary border-admin-primary/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              )}
            >
              {isLease ? <Building className="w-3 h-3" /> : <Receipt className="w-3 h-3" />}
              {isLease ? 'Lease' : 'Invoice'}
            </span>
          );
        },
      },
      {
        headerName: 'Source & Context',
        flex: 2,
        minWidth: 260,
        cellRenderer: (params: any) => {
          const auto = params.data as AutomationItem;
          if (!auto) return null;
          if (auto.automationType === 'lease') {
            const propName = auto.lease?.propertyName || 'Property';
            const tenantName = auto.lease?.tenantName || 'Tenant';
            const email = auto.lease?.tenantEmail;
            return (
              <div className="flex items-center gap-3 py-1">
                <PersonIdentity
                  seed={email || tenantName}
                  name={propName}
                  subtitle={`${tenantName} ${email ? `(${email})` : ''}`}
                  size="sm"
                />
              </div>
            );
          } else {
            const custName = auto.metadata?.customerName || 'Customer';
            const custEmail = auto.metadata?.customerEmail;
            const desc = auto.metadata?.description || 'Service';
            const amt = auto.metadata?.amount ? `$${Number(auto.metadata.amount).toLocaleString()}` : '';
            return (
              <div className="flex items-center gap-3 py-1">
                <PersonIdentity
                  seed={custEmail || custName}
                  name={custName}
                  subtitle={`${desc} ${amt ? `• ${amt}` : ''}`}
                  size="sm"
                />
              </div>
            );
          }
        },
      },
      {
        headerName: 'Action',
        width: 200,
        cellRenderer: (params: any) => {
          const isInvoiceAction = params.data?.actionType === 'generate_and_send_invoice';
          return (
            <div className="flex items-center gap-1.5 font-bold text-xs py-1 text-admin-foreground">
              {isInvoiceAction ? (
                <>
                  <Receipt className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="text-emerald-600 dark:text-emerald-400">Generate & Send Invoice</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-admin-primary shrink-0" />
                  <span className="text-admin-primary">Send Lease Document</span>
                </>
              )}
            </div>
          );
        },
      },
      {
        headerName: 'Schedule',
        flex: 1.5,
        minWidth: 180,
        cellRenderer: (params: any) => {
          const auto = params.data as AutomationItem;
          if (!auto) return null;
          const scheduleText = ScheduleCalculator.formatHumanSchedule(auto.scheduleType, auto.scheduleConfig);
          return (
            <div className="flex items-center gap-1.5 text-xs text-admin-foreground py-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-admin-muted shrink-0" />
              <span>{scheduleText}</span>
            </div>
          );
        },
      },
      {
        headerName: 'Next Due',
        width: 175,
        cellRenderer: (params: any) => {
          const auto = params.data as AutomationItem;
          if (!auto) return null;
          return (
            <div className="flex items-center gap-1.5 text-xs py-1">
              <Clock className="w-3.5 h-3.5 text-admin-primary shrink-0" />
              <span className="font-semibold text-admin-foreground">{formatNextDelivery(auto.nextRunAt)}</span>
            </div>
          );
        },
      },
      {
        headerName: 'Last Processed',
        width: 175,
        cellRenderer: (params: any) => {
          const auto = params.data as AutomationItem;
          if (!auto) return null;
          return (
            <div className="flex items-center gap-1.5 text-xs py-1 text-admin-muted">
              <History className="w-3.5 h-3.5 shrink-0" />
              <span>{auto.lastRunAt ? formatAuDisplayDateTime(auto.lastRunAt) : 'Never'}</span>
            </div>
          );
        },
      },
      {
        headerName: 'Status',
        width: 110,
        cellRenderer: (params: any) => {
          const status = params.data?.status || 'active';
          const isPaused = status === 'paused';
          return (
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider',
                isPaused
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              )}
            >
              {status}
            </span>
          );
        },
      },
      {
        headerName: 'Actions',
        colId: 'actions',
        width: 220,
        pinned: 'right',
        sortable: false,
        filter: false,
        cellRenderer: (params: any) => {
          const auto = params.data as AutomationItem;
          if (!auto) return null;
          const isPaused = auto.status === 'paused';
          return (
            <div className="flex items-center gap-1.5 py-1">
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setTriggerAutomation(auto);
                }}
                className="gap-1 text-[11px] font-bold py-1 px-2.5 shadow-xs"
                title="Trigger Now"
              >
                <Play className="w-3 h-3 fill-current" /> Trigger
              </Button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePause(auto.id);
                }}
                className="p-1.5 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded-md transition-colors"
                title={isPaused ? 'Resume Automation' : 'Pause Automation'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-500" /> : <Pause className="w-3.5 h-3.5 text-amber-500" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setHistoryAutomationId(auto.id);
                  setIsHistoryOpen(true);
                }}
                className="p-1.5 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded-md transition-colors"
                title="Execution History"
              >
                <History className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAutomationToDelete(auto);
                }}
                className="p-1.5 text-admin-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                title="Delete Automation"
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
      title="Automations"
      description="Manage scheduled actions for your portfolio — Automate rent invoices, lease agreements, and standalone client billings."
      breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Automations' }]}
      actions={
        <div className="flex items-center gap-2">
          {/* Live AU Time Clock Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-admin-surface-subtle border border-admin-border rounded-xl text-xs shadow-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-admin-muted font-medium">AU Time (Sydney):</span>
            <span className="font-mono font-bold text-admin-foreground">{auTime}</span>
          </div>

          {/* View Switcher */}
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
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="font-bold shadow-xs bg-admin-primary hover:bg-admin-primary/90 text-white text-xs gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create Automation
          </Button>
        </div>
      }
      summary={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-admin-primary/10 text-admin-primary flex items-center justify-center shrink-0 border border-admin-primary/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-admin-muted font-medium">Total Automations</p>
              <p className="text-lg font-bold text-admin-foreground">{automations.length}</p>
            </div>
          </div>
          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-admin-primary/10 text-admin-primary flex items-center justify-center shrink-0 border border-admin-primary/20">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-admin-muted font-medium">Lease Automations</p>
              <p className="text-lg font-bold text-admin-foreground">
                {automations.filter((a) => a.automationType === 'lease').length}
              </p>
            </div>
          </div>
          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-admin-muted font-medium">Invoice Automations</p>
              <p className="text-lg font-bold text-admin-foreground">
                {automations.filter((a) => a.automationType === 'invoice').length}
              </p>
            </div>
          </div>
          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Pause className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-admin-muted font-medium">Paused</p>
              <p className="text-lg font-bold text-admin-foreground">
                {automations.filter((a) => a.status === 'paused').length}
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex-1 flex flex-col min-h-0 bg-admin-surface border border-admin-border rounded-2xl p-4 shadow-sm overflow-hidden gap-3">
        {/* Daily Queue Processing Notice Banner */}
        <div className="bg-admin-primary/5 border border-admin-primary/20 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-admin-foreground">
            <div className="p-1 rounded-md bg-admin-primary/10 text-admin-primary">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span>
              <strong>Daily Queue Processing:</strong> Property Ledge evaluates and dispatches all eligible pending automations every morning at <strong>7:00 AM AU</strong> (Sydney).
            </span>
          </div>
          <span className="hidden md:inline-flex text-[11px] font-medium text-admin-primary bg-admin-primary/10 px-2 py-0.5 rounded-md border border-admin-primary/20">
            Daily Vercel Cron Active
          </span>
        </div>

        {automations.length === 0 && !loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-admin-primary/10 text-admin-primary flex items-center justify-center mb-3">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-admin-foreground">No Automations Scheduled</h3>
            <p className="text-xs text-admin-muted max-w-sm mt-1 mb-4">
              Create an automation to automatically generate rent invoices, lease agreements, or standalone customer billings on a recurring schedule.
            </p>
            <Button size="sm" onClick={() => setIsCreateOpen(true)} className="font-bold gap-1.5 text-xs">
              <Plus className="w-4 h-4" /> Create Automation
            </Button>
          </div>
        ) : viewMode === 'table' ? (
          <ListPageGrid>
            <AdminDataGrid
              rowData={automations}
              columnDefs={agGridColumns}
              loading={loading}
              labelSingular="automation"
              labelPlural="automations"
              getRowId={(p) => p.data.id}
              enableSelection={true}
              onDeleteSelected={handleBulkDelete}
              bulkActions={bulkActions}
              enableColumnChooser
              enableExport
              exportFilename="automations-export"
              searchPlaceholder="Search automations by lease, property, tenant, or customer..."
              leftToolbarContent={
                <QuickFilterBar
                  options={filterOptions}
                  activeValue={activeFilter}
                  onChange={(val) => setActiveFilter(val as string)}
                />
              }
              disablePagination={true}
            />
          </ListPageGrid>
        ) : (
          <HoverCardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto p-1">
            {automations.map((auto) => {
              const isLease = auto.automationType === 'lease';
              const title = isLease ? auto.lease?.propertyName || 'Property' : auto.metadata?.customerName || 'Customer';
              const subtitle = isLease ? auto.lease?.tenantName || 'Tenant' : auto.metadata?.description || 'Service';
              const scheduleText = ScheduleCalculator.formatHumanSchedule(auto.scheduleType, auto.scheduleConfig);
              const isPaused = auto.status === 'paused';
              const isInvoiceAction = auto.actionType === 'generate_and_send_invoice';

              return (
                <HoverEffectCardItem key={auto.id} className="p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          'p-2 rounded-xl border',
                          isLease
                            ? 'bg-admin-primary/10 text-admin-primary border-admin-primary/20'
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        )}>
                          {isLease ? <Building className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-admin-foreground">{title}</h4>
                          <p className="text-xs text-admin-muted">{subtitle}</p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border',
                          isPaused
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        )}
                      >
                        {auto.status}
                      </span>
                    </div>

                    <div className="bg-admin-surface-subtle border border-admin-border rounded-xl p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Type:</span>
                        <strong className="text-admin-foreground">{isLease ? 'Lease' : 'Invoice'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Action:</span>
                        <strong className={isInvoiceAction ? 'text-emerald-500' : 'text-admin-primary'}>
                          {isInvoiceAction ? 'Generate & Send Invoice' : 'Send Lease Document'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Schedule:</span>
                        <span className="text-admin-foreground font-medium">{scheduleText}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Next Due:</span>
                        <strong className="text-admin-primary">{formatNextDelivery(auto.nextRunAt)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-admin-muted">Last Processed:</span>
                        <span className="text-admin-muted font-medium">{auto.lastRunAt ? formatAuDisplayDateTime(auto.lastRunAt) : 'Never'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-admin-border">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setTriggerAutomation(auto)}
                      className="gap-1 text-xs font-bold"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Trigger Now
                    </Button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTogglePause(auto.id)}
                        className="p-1.5 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded-md transition-colors"
                        title={isPaused ? 'Resume' : 'Pause'}
                      >
                        {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-500" /> : <Pause className="w-3.5 h-3.5 text-amber-500" />}
                      </button>
                      <button
                        onClick={() => {
                          setHistoryAutomationId(auto.id);
                          setIsHistoryOpen(true);
                        }}
                        className="p-1.5 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded-md transition-colors"
                        title="Execution History"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setAutomationToDelete(auto)}
                        className="p-1.5 text-admin-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </HoverEffectCardItem>
              );
            })}
          </HoverCardGrid>
        )}
      </div>

      {/* Unified Create Automation Modal */}
      <CreateAutomationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadAutomations}
      />

      {/* Trigger Confirmation Modal */}
      <TriggerConfirmationModal
        isOpen={!!triggerAutomation}
        onClose={() => setTriggerAutomation(null)}
        onConfirm={handleConfirmTrigger}
        automation={triggerAutomation}
        loading={isTriggering}
      />

      {/* Execution History Modal */}
      <ExecutionHistoryModal
        automationId={historyAutomationId || ''}
        isOpen={isHistoryOpen}
        onClose={() => {
          setIsHistoryOpen(false);
          setHistoryAutomationId(null);
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!automationToDelete}
        onClose={() => setAutomationToDelete(null)}
        onConfirm={handleDeleteSubmit}
        title="Delete Automation Schedule?"
        description={`Are you sure you want to delete this automation? Scheduled executions will stop immediately.`}
        confirmLabel="Delete Automation"
        variant="danger"
        loading={isDeleting}
      />
    </ListPage>
  );
}
