'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Building,
  Building2,
  Calendar,
  DollarSign,
  Search,
  LayoutGrid,
  List,
  Clock,
  ArrowRight,
  Settings,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Pencil,
  Zap,
} from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import dynamic from 'next/dynamic';
import { Button, useToast, ConfirmDialog } from '@/components/admin/ui';
import { AdminDataGrid } from '@/components/admin/data-grid/AdminDataGrid';
import { PageLayout, PageContent } from '@/components/workspace/layout';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { useEntityCacheStore } from '@/lib/stores/useEntityCacheStore';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';
import {
  fetchAllWorkspaceLeases,
  fetchDashboardProperties,
  handleUpdateLeaseStatus,
  handleConvertToPeriodic,
  handleDeleteLease,
  handleDoNotRenew,
} from '@/app/actions/dashboard';
import { createLeaseAutomationAction, CreateLeaseAutomationDTO } from '@/app/actions/automations';
import { HoverCardGrid, HoverEffectCardItem } from '@/components/ui/card-hover-effect';
import { Avatar, AvatarGroup } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// Redesigned Modular Components
import { LeaseCommandCenter } from './LeaseCommandCenter';
import { LeaseTimeline } from './LeaseTimeline';
import { LeaseHealthDonut } from './LeaseHealthDonut';
import { LeaseRequiresAttention } from './LeaseRequiresAttention';
import { getLeaseTableColumns } from './leaseTableColumns';

const CreateLeaseWizard = dynamic(
  () => import('@/components/dashboard/workflows/CreateLeaseWizard').then((m) => m.CreateLeaseWizard),
  { ssr: false }
);
const LeaseEditDrawer = dynamic(
  () => import('@/components/dashboard/leases/LeaseEditDrawer').then((m) => m.LeaseEditDrawer),
  { ssr: false }
);
const RenewLeaseModal = dynamic(
  () => import('@/components/dashboard/leases/RenewLeaseModal').then((m) => m.RenewLeaseModal),
  { ssr: false }
);
const CreateAutomationModal = dynamic(
  () => import('@/components/automation/CreateAutomationModal').then((m) => m.CreateAutomationModal),
  { ssr: false }
);

export type LeaseRecord = {
  id: string;
  property_id: string;
  unit_id?: string | null;
  start_date: string;
  end_date: string | null;
  rent_amount: number;
  rent_frequency: string;
  security_deposit: number;
  payment_due_day: number;
  status: string;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  property?: {
    id: string;
    name: string;
    address_line_1: string;
    city: string;
    suburb?: string;
    state?: string;
    postal_code?: string;
  } | null;
  unit?: {
    id: string;
    unit_number: string;
  } | null;
  lease_tenants?: Array<{
    role: string;
    is_primary: boolean;
    tenant_id?: string;
    tenant?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
      emergency_contact_name?: string | null;
      emergency_contact_phone?: string | null;
    } | null;
  }>;
};

export interface LeaseManagementPageProps {
  initialLeases?: LeaseRecord[];
  initialProperties?: any[];
}

export function LeaseManagementPage({ initialLeases, initialProperties }: LeaseManagementPageProps = {}) {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const { selectedProperty, availableProperties } = usePropertyContext();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const cachedLeases = useEntityCacheStore((s) => s.leases);
  const setCachedLeases = useEntityCacheStore((s) => s.setLeases);
  const cachedProperties = useEntityCacheStore((s) => s.properties);
  const setCachedProperties = useEntityCacheStore((s) => s.setProperties);

  const activePropertyId = selectedProperty?.propertyId ?? null;
  const hasMatchingCache =
    cachedLeases &&
    cachedLeases.workspaceId === activeWorkspaceId &&
    cachedLeases.propertyId === activePropertyId;

  const [leases, setLeases] = useState<LeaseRecord[]>(() => {
    if (initialLeases && initialLeases.length > 0) return initialLeases;
    return hasMatchingCache ? (cachedLeases.data as LeaseRecord[]) : [];
  });

  const [properties, setProperties] = useState<any[]>(() => {
    if (initialProperties && initialProperties.length > 0) return initialProperties;
    if (cachedProperties && cachedProperties.workspaceId === activeWorkspaceId) {
      return cachedProperties.data;
    }
    if (availableProperties && availableProperties.length > 0) {
      return availableProperties.map((p) => ({
        id: p.propertyId,
        name: p.propertyName,
        address_line_1: p.propertyName,
        city: '',
      }));
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(() => !initialLeases && !hasMatchingCache);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(() => new Date());
  const isInitialMount = useRef(true);

  // Status Filter Tabs: All, Active, Pending, Expired, Renewed
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Pending' | 'Expired' | 'Renewed'>('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isTableExpanded, setIsTableExpanded] = useState(false);

  // Selected Property for Health Donut
  const [healthPropertyId, setHealthPropertyId] = useState<string | null>(activePropertyId);

  // Create Wizard state
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [wizardInitialData, setWizardInitialData] = useState<any>(null);

  // Dedicated Renew Lease Modal state
  const [selectedLeaseForRenewal, setSelectedLeaseForRenewal] = useState<LeaseRecord | null>(null);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);

  // Edit Drawer state
  const [selectedLeaseForEdit, setSelectedLeaseForEdit] = useState<LeaseRecord | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  // Automation Modal state
  const [selectedLeaseForAutomation, setSelectedLeaseForAutomation] = useState<string | null>(null);
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);

  // Delete Confirmation state
  const [deletingLeaseId, setDeletingLeaseId] = useState<string | null>(null);
  const [deletingPropertyId, setDeletingPropertyId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else if (!hasMatchingCache) {
        setIsLoading(true);
      }
      try {
        const activePropId = selectedProperty?.propertyId ?? null;
        const [leasesData, propertiesData] = await Promise.all([
          fetchAllWorkspaceLeases(activePropId),
          fetchDashboardProperties(),
        ]);
        setLeases(leasesData as unknown as LeaseRecord[]);
        setProperties(propertiesData);
        setCachedLeases(leasesData, activeWorkspaceId, activePropId);
        setCachedProperties(propertiesData, activeWorkspaceId);
        setLastRefreshedAt(new Date());
      } catch (err: any) {
        console.error('Error loading leases directory:', err);
        showError(
          isManualRefresh ? 'Refresh failed' : 'Failed to load leases',
          isManualRefresh
            ? 'Unable to refresh leases. Please try again.'
            : err.message || 'Could not fetch lease agreements.'
        );
      } finally {
        if (isManualRefresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [activeWorkspaceId, hasMatchingCache, selectedProperty?.propertyId, setCachedLeases, setCachedProperties, showError]
  );

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialLeases && initialLeases.length > 0) {
        setCachedLeases(initialLeases, activeWorkspaceId, activePropertyId);
        if (initialProperties && initialProperties.length > 0) {
          setCachedProperties(initialProperties, activeWorkspaceId);
        }
        return;
      }
    }
    loadData();
  }, [activePropertyId, activeWorkspaceId, initialProperties, initialLeases, loadData, setCachedLeases, setCachedProperties]);

  // Escape key exits table expanded mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTableExpanded && !isCreateWizardOpen && !isEditDrawerOpen && !isRenewModalOpen) {
        setIsTableExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTableExpanded, isCreateWizardOpen, isEditDrawerOpen, isRenewModalOpen]);

  // Filter leases by workspace/property context
  const scopedLeases = useMemo(() => {
    if (!selectedProperty) return leases;
    return leases.filter((l) => l.property_id === selectedProperty.propertyId);
  }, [leases, selectedProperty]);

  // Key metrics for Hero Command Center
  const commandCenterStats = useMemo(() => {
    let active = 0;
    let periodic = 0;
    let expiringSoon = 0;
    let rentInflow = 0;

    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    scopedLeases.forEach((l) => {
      const st = (l.status || '').toLowerCase();
      if (st === 'active') {
        active += 1;
        const amt = Number(l.rent_amount) || 0;
        const freq = (l.rent_frequency || 'monthly').toLowerCase();
        if (freq === 'weekly') {
          rentInflow += (amt * 52) / 12;
        } else if (freq === 'fortnightly') {
          rentInflow += (amt * 26) / 12;
        } else if (freq === 'yearly' || freq === 'annually') {
          rentInflow += amt / 12;
        } else {
          rentInflow += amt;
        }

        if (!l.end_date) {
          periodic += 1;
        } else {
          const endDate = new Date(l.end_date);
          if (endDate >= now && endDate <= ninetyDaysFromNow) {
            expiringSoon += 1;
          }
        }
      }
    });

    return {
      active,
      periodic,
      expiringSoon,
      monthlyRentInflow: Math.round(rentInflow),
    };
  }, [scopedLeases]);

  // Tab counts for Lease Directory Header
  const tabCounts = useMemo(() => {
    const now = new Date();
    let all = scopedLeases.length;
    let active = 0;
    let pending = 0;
    let expired = 0;
    let renewed = 0;

    scopedLeases.forEach((l) => {
      const st = (l.status || '').toLowerCase();
      if (st === 'active') {
        active += 1;
      } else if (st === 'pending' || st === 'draft') {
        pending += 1;
      } else if (st === 'renewed') {
        renewed += 1;
      } else if (st === 'expired' || (l.end_date && new Date(l.end_date) < now)) {
        expired += 1;
      }
    });

    return { all, active, pending, expired, renewed };
  }, [scopedLeases]);

  // Filtered rows for AG Grid / Card Grid based on active status tab
  const filteredRows = useMemo(() => {
    const now = new Date();
    return scopedLeases.filter((l) => {
      const st = (l.status || '').toLowerCase();
      if (statusFilter === 'All') return true;
      if (statusFilter === 'Active') return st === 'active';
      if (statusFilter === 'Pending') return st === 'pending' || st === 'draft';
      if (statusFilter === 'Renewed') return st === 'renewed';
      if (statusFilter === 'Expired') {
        return st === 'expired' || (l.end_date && new Date(l.end_date) < now);
      }
      return true;
    });
  }, [scopedLeases, statusFilter]);

  const handleEditLease = (lease: LeaseRecord) => {
    setSelectedLeaseForEdit(lease);
    setIsEditDrawerOpen(true);
  };

  const handleRenewLease = (lease: LeaseRecord) => {
    setSelectedLeaseForRenewal(lease);
    setIsRenewModalOpen(true);
  };

  const handleConvertToPeriodicLease = async (lease: LeaseRecord) => {
    try {
      await handleConvertToPeriodic(lease.property_id, lease.id);
      showSuccess('Periodic Status', 'Lease successfully converted to a periodic contract.');
      loadData();
    } catch (err: any) {
      showError('Conversion Failed', err.message || 'An error occurred.');
    }
  };

  const handleBulkDeleteLeases = async (selectedRows: LeaseRecord[]) => {
    try {
      for (const l of selectedRows) {
        await handleDeleteLease(l.property_id, l.id);
      }
      showSuccess('Leases Deleted', `Successfully deleted ${selectedRows.length} ${selectedRows.length === 1 ? 'lease' : 'leases'}.`);
      await loadData(true);
    } catch (err: any) {
      console.error('Error deleting leases:', err);
      showError('Delete Failed', err.message || 'Could not delete selected leases.');
    }
  };

  const columns = useMemo<ColDef[]>(
    () =>
      getLeaseTableColumns({
        onEditLease: handleEditLease,
        onViewLease: handleEditLease,
        onRenewLease: handleRenewLease,
        onConvertToPeriodic: handleConvertToPeriodicLease,
      }),
    []
  );

  const statusTabs: Array<{ key: 'All' | 'Active' | 'Pending' | 'Expired' | 'Renewed'; label: string; count: number }> = [
    { key: 'All', label: 'All', count: tabCounts.all },
    { key: 'Active', label: 'Active', count: tabCounts.active },
    { key: 'Pending', label: 'Pending', count: tabCounts.pending },
    { key: 'Expired', label: 'Expired', count: tabCounts.expired },
    { key: 'Renewed', label: 'Renewed', count: tabCounts.renewed },
  ];

  return (
    <PageLayout>
      <PageContent>
        <div className="space-y-5 lg:space-y-6 pb-16">
          {/* 1. Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-[28px] font-heading font-bold tracking-tight text-slate-900 dark:text-white">
                Leases
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
                Manage contracts, rent and important lease dates.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* List / Grid View Switch */}
              <div className="flex items-center p-1 rounded-xl bg-white dark:bg-[#07111F] border border-slate-200/80 dark:border-[#17283A] shadow-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors',
                    viewMode === 'table'
                      ? 'bg-slate-100 dark:bg-[#0E1E33] text-[#008F83] dark:text-[#32D5C4] font-bold shadow-xs'
                      : 'text-slate-500 dark:text-[#7F8B99] hover:text-slate-900 dark:hover:text-white'
                  )}
                  title="List Table View"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>List</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors',
                    viewMode === 'grid'
                      ? 'bg-slate-100 dark:bg-[#0E1E33] text-[#008F83] dark:text-[#32D5C4] font-bold shadow-xs'
                      : 'text-slate-500 dark:text-[#7F8B99] hover:text-slate-900 dark:hover:text-white'
                  )}
                  title="Card Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grid</span>
                </button>
              </div>

              {/* Primary CTA */}
              <Button
                onClick={() => {
                  setWizardInitialData(selectedProperty ? { property_id: selectedProperty.propertyId } : null);
                  setIsCreateWizardOpen(true);
                }}
                className="font-semibold text-xs sm:text-[13px] rounded-xl bg-[#008F83] hover:bg-[#007a70] text-white shadow-none px-4 py-2"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Create Lease
              </Button>
            </div>
          </div>

          {/* 2. Lease Command Center Hero (Hidden when Table is Expanded) */}
          {!isTableExpanded && (
            <LeaseCommandCenter
              activeLeasesCount={commandCenterStats.active}
              monthlyRentInflow={commandCenterStats.monthlyRentInflow}
              expiringSoonCount={commandCenterStats.expiringSoon}
              periodicLeasesCount={commandCenterStats.periodic}
              isLoading={isLoading}
            />
          )}

          {/* 3. Main Workspace Section: Lease Directory (70%) + Lease Health & Attention (30%) */}
          {!isLoading && scopedLeases.length === 0 && statusFilter === 'All' ? (
            /* Empty State */
            <div className="py-20 px-6 text-center bg-white dark:bg-[#07111F] rounded-[24px] border border-slate-200/80 dark:border-[#17283A] shadow-xs flex flex-col items-center justify-center min-h-[360px]">
              <div className="w-14 h-14 bg-slate-50 dark:bg-[#0E1E33] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/20">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                No leases found
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#7F8B99] max-w-sm mx-auto mb-5 leading-relaxed">
                Get started by creating a new lease agreement or setting up a tenancy.
              </p>
              <Button
                onClick={() => {
                  setWizardInitialData(null);
                  setIsCreateWizardOpen(true);
                }}
                className="font-semibold text-xs sm:text-[13px] rounded-xl bg-[#008F83] hover:bg-[#007a70] text-white shadow-none px-4 py-2"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Create First Lease
              </Button>
            </div>
          ) : viewMode === 'table' ? (
            /* TABLE MODE: Left 70% AG Grid Directory + Right 30% Contextual Intelligence */
            <div
              className={cn(
                'grid grid-cols-1 gap-5 items-stretch transition-all duration-300',
                isTableExpanded ? 'grid-cols-1' : 'lg:grid-cols-12'
              )}
            >
              {/* PRIMARY LEASE DIRECTORY (Col-span-8 or Col-span-12) */}
              <div
                className={cn(
                  'rounded-[24px] border border-slate-200/80 dark:border-[#17283A] bg-white dark:bg-[#07111F] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none flex flex-col transition-all duration-300',
                  isTableExpanded
                    ? 'col-span-12 min-h-[calc(100vh-160px)]'
                    : 'lg:col-span-8 h-full'
                )}
              >
                <div className="flex-1 flex flex-col min-h-0 h-full">
                  <AdminDataGrid
                    rowData={filteredRows}
                    columnDefs={columns}
                    loading={isLoading}
                    rowHeight={68}
                    onRefresh={() => loadData(true)}
                    isRefreshing={isRefreshing}
                    lastRefreshedAt={lastRefreshedAt}
                    labelSingular="lease"
                    labelPlural="leases"
                    onRowClick={(row: any) => handleEditLease(row)}
                    getRowId={(params: any) => String(params.data.id)}
                    enableColumnChooser
                    enableExport
                    exportFilename="leases-export"
                    searchPlaceholder="Search leases, tenants or properties..."
                    onDeleteSelected={handleBulkDeleteLeases}
                    disablePagination={true}
                    isExpanded={isTableExpanded}
                    onExpandedChange={setIsTableExpanded}
                    leftToolbarContent={
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
                        <h3 className="text-sm sm:text-base font-heading font-bold text-slate-900 dark:text-white shrink-0 pr-2">
                          Lease Directory
                        </h3>
                        {/* Filter Tabs */}
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                          {statusTabs.map((tab) => {
                            const isSelected = statusFilter === tab.key;
                            return (
                              <button
                                key={tab.key}
                                type="button"
                                onClick={() => setStatusFilter(tab.key)}
                                className={cn(
                                  'px-3.5 py-1.5 rounded-full text-xs sm:text-[12.5px] transition-all flex items-center gap-1 font-semibold cursor-pointer',
                                  isSelected
                                    ? 'bg-[#E6F8F3] text-[#008F83] border border-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 font-bold shadow-xs'
                                    : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0E1E33]'
                                )}
                              >
                                <span>{tab.label}</span>
                                <span className="tabular-nums font-normal">({tab.count})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>

              {/* RIGHT CONTEXTUAL INTELLIGENCE (Col-span-4, Hidden when Expanded) */}
              {!isTableExpanded && (
                <div className="lg:col-span-4 flex flex-col gap-5">
                  <LeaseHealthDonut
                    leases={scopedLeases}
                    properties={properties}
                    selectedPropertyId={healthPropertyId}
                    onPropertySelect={setHealthPropertyId}
                    isLoading={isLoading}
                  />
                  <LeaseRequiresAttention
                    leases={scopedLeases}
                    onFilterClick={(tab) => setStatusFilter(tab as any)}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </div>
          ) : isLoading ? (
            /* Card Grid Loading */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-[#07111F] border border-slate-200/80 dark:border-[#17283A] rounded-[20px] p-5 shadow-xs flex flex-col gap-4 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-28" />
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-20" />
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                </div>
              ))}
            </div>
          ) : (
            /* Card Grid View */
            <HoverCardGrid className="flex-1">
              {filteredRows.map((lease) => {
                const isPeriodic = !lease.end_date || lease.status === 'periodic';
                const propName = lease.property?.name || lease.property?.address_line_1 || 'Unassigned Property';
                const primaryLt = lease.lease_tenants?.find((lt) => lt.is_primary) || lease.lease_tenants?.[0];
                const tenantName = primaryLt?.tenant
                  ? `${primaryLt.tenant.first_name || ''} ${primaryLt.tenant.last_name || ''}`.trim()
                  : 'No tenant assigned';

                return (
                  <HoverEffectCardItem key={lease.id} className="group/card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200/60 dark:border-purple-500/20">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover/card:text-[#008F83] transition-colors">
                            {propName}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-[#7F8B99] truncate">
                            {lease.property?.city || lease.property?.suburb || 'Property'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide',
                          lease.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span className="capitalize">{lease.status}</span>
                      </span>
                    </div>

                    <div className="h-px w-full bg-slate-100 dark:bg-slate-800 my-3" />

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-500 dark:text-[#7F8B99]">
                        <span>Tenant:</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[160px]">
                          {tenantName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 dark:text-[#7F8B99]">
                        <span>Rent:</span>
                        <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                          ${Number(lease.rent_amount).toFixed(2)} / {lease.rent_frequency}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 dark:text-[#7F8B99]">
                        <span>Term:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {new Date(lease.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{' '}
                          →{' '}
                          {lease.end_date
                            ? new Date(lease.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                            : 'Periodic'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 dark:bg-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditLease(lease);
                        }}
                        className="text-xs font-semibold text-[#008F83] hover:underline inline-flex items-center gap-1"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit Lease
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenewLease(lease);
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        Renew →
                      </button>
                    </div>
                  </HoverEffectCardItem>
                );
              })}
            </HoverCardGrid>
          )}

          {/* 4. Bottom Section: Lease Timeline (Full Width, Hidden when Table is Expanded) */}
          {!isTableExpanded && (
            <LeaseTimeline
              leases={scopedLeases}
              onSelectLease={(lease) => handleEditLease(lease)}
              isLoading={isLoading}
            />
          )}
        </div>
      </PageContent>

      {/* Modals & Drawers */}
      {isCreateWizardOpen && (
        <CreateLeaseWizard
          isOpen={isCreateWizardOpen}
          onClose={() => setIsCreateWizardOpen(false)}
          onSuccess={() => {
            setIsCreateWizardOpen(false);
            loadData(true);
          }}
          initialData={wizardInitialData}
        />
      )}

      {isEditDrawerOpen && selectedLeaseForEdit && (
        <LeaseEditDrawer
          isOpen={isEditDrawerOpen}
          onClose={() => {
            setIsEditDrawerOpen(false);
            setSelectedLeaseForEdit(null);
          }}
          onSuccess={() => {
            setIsEditDrawerOpen(false);
            setSelectedLeaseForEdit(null);
            loadData(true);
          }}
          propertyId={selectedLeaseForEdit.property_id}
          lease={selectedLeaseForEdit as any}
        />
      )}

      {isRenewModalOpen && selectedLeaseForRenewal && (
        <RenewLeaseModal
          isOpen={isRenewModalOpen}
          onClose={() => {
            setIsRenewModalOpen(false);
            setSelectedLeaseForRenewal(null);
          }}
          onSuccess={() => {
            setIsRenewModalOpen(false);
            setSelectedLeaseForRenewal(null);
            loadData(true);
          }}
          previousLease={selectedLeaseForRenewal as any}
        />
      )}

      {isAutomationModalOpen && (
        <CreateAutomationModal
          isOpen={isAutomationModalOpen}
          onClose={() => {
            setIsAutomationModalOpen(false);
            setSelectedLeaseForAutomation(null);
          }}
          preselectedLeaseId={selectedLeaseForAutomation || undefined}
          onSuccess={() => {
            setIsAutomationModalOpen(false);
            setSelectedLeaseForAutomation(null);
            showSuccess('Automation Created', 'Lease automation successfully configured.');
          }}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(deletingLeaseId)}
        title="Delete Lease Record"
        description="Are you sure you want to delete this lease? This action cannot be undone."
        confirmLabel="Delete Lease"
        variant="danger"
        loading={isDeleting}
        onConfirm={async () => {
          if (!deletingLeaseId || !deletingPropertyId) return;
          setIsDeleting(true);
          try {
            await handleDeleteLease(deletingPropertyId, deletingLeaseId);
            showSuccess('Lease Deleted', 'The lease record has been permanently removed.');
            setDeletingLeaseId(null);
            setDeletingPropertyId(null);
            loadData(true);
          } catch (err: any) {
            showError('Failed to delete lease', err.message || 'An error occurred.');
          } finally {
            setIsDeleting(false);
          }
        }}
        onClose={() => {
          setDeletingLeaseId(null);
          setDeletingPropertyId(null);
        }}
      />
    </PageLayout>
  );
}
