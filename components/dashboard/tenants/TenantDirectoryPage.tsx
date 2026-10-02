'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Building,
  Building2,
  Mail,
  Phone,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Plus,
  Pencil,
  UserCheck,
  UserPlus,
  X,
  List,
  LayoutGrid,
} from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import dynamic from 'next/dynamic';
import { Button, useToast } from '@/components/admin/ui';
import { AdminDataGrid } from '@/components/admin/data-grid/AdminDataGrid';
import { PageLayout, PageContent } from '@/components/workspace/layout';
import { usePropertyContext } from '@/components/property/PropertyContext';
import {
  fetchAllWorkspaceTenants,
  fetchDashboardProperties,
  handleDeleteTenant,
} from '@/app/actions/dashboard';
import { HoverCardGrid, HoverEffectCardItem } from '@/components/ui/card-hover-effect';
import { cn } from '@/lib/utils';
import { useEntityCacheStore } from '@/lib/stores/useEntityCacheStore';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';

import { TenantOverviewBanner } from './TenantOverviewBanner';
import { LeaseOverviewDonut } from './LeaseOverviewDonut';
import { TenantNeedsAttention } from './TenantNeedsAttention';
import { getTenantTableColumns } from './tenantTableColumns';

const TenancySetupWizard = dynamic(
  () => import('@/components/dashboard/workflows/TenancySetupWizard').then((m) => m.TenancySetupWizard),
  { ssr: false }
);
const TenantDrawer = dynamic(
  () => import('@/components/dashboard/tenants/TenantDrawer').then((m) => m.TenantDrawer),
  { ssr: false }
);

export type TenantRecord = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  date_of_birth?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  property_id: string;
  property?: {
    id: string;
    name: string;
    address_line_1: string;
    city: string;
    suburb?: string;
    state?: string;
    postal_code?: string;
  } | null;
  lease_tenants?: Array<{
    is_primary: boolean;
    role: string;
    lease?: {
      id: string;
      status: string;
      start_date: string;
      end_date: string | null;
      rent_amount: number;
      rent_frequency: string;
      security_deposit?: number;
      payment_due_day?: number;
    } | null;
  }>;
};

export type PropertyOption = {
  id: string;
  name: string;
  address_line_1: string;
  city: string;
  rent_amount?: number;
};

export interface TenantDirectoryPageProps {
  initialTenants?: TenantRecord[];
  initialProperties?: PropertyOption[];
}

export function TenantDirectoryPage({
  initialTenants,
  initialProperties,
}: TenantDirectoryPageProps = {}) {
  const router = useRouter();
  const { error: showError, success: showSuccess } = useToast();
  const { selectedProperty, availableProperties } = usePropertyContext();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const cachedTenants = useEntityCacheStore((s) => s.tenants);
  const setCachedTenants = useEntityCacheStore((s) => s.setTenants);
  const cachedProperties = useEntityCacheStore((s) => s.properties);
  const setCachedProperties = useEntityCacheStore((s) => s.setProperties);

  const activePropertyId = selectedProperty?.propertyId ?? null;
  const hasMatchingCache =
    cachedTenants &&
    cachedTenants.workspaceId === activeWorkspaceId &&
    cachedTenants.propertyId === activePropertyId;

  const [tenants, setTenants] = useState<TenantRecord[]>(() => {
    if (initialTenants && initialTenants.length > 0) return initialTenants;
    return hasMatchingCache ? (cachedTenants.data as TenantRecord[]) : [];
  });

  const [properties, setProperties] = useState<PropertyOption[]>(() => {
    if (initialProperties && initialProperties.length > 0) return initialProperties;
    if (cachedProperties && cachedProperties.workspaceId === activeWorkspaceId) {
      return cachedProperties.data as PropertyOption[];
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

  const [isLoading, setIsLoading] = useState(() => !initialTenants && !hasMatchingCache);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(() => new Date());
  const isInitialMount = useRef(true);

  const [statusFilter, setStatusFilter] = useState<
    'All' | 'Active Resident' | 'Inactive / Past Resident' | 'Prospect / Applicant' | 'Archived'
  >('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isTableExpanded, setIsTableExpanded] = useState(false);

  // Selected property for Lease Overview filtering
  const [overviewPropertyId, setOverviewPropertyId] = useState<string | null>(activePropertyId);

  // Tenancy Setup Wizard state
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);
  const [selectedPropertyForSetup, setSelectedPropertyForSetup] = useState<PropertyOption | null>(null);
  const [isPropertySelectModalOpen, setIsPropertySelectModalOpen] = useState(false);

  // Edit Drawer state
  const [selectedTenantForEdit, setSelectedTenantForEdit] = useState<TenantRecord | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  const loadData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else if (!hasMatchingCache) {
        setIsLoading(true);
      }
      try {
        const activePropId = selectedProperty?.propertyId ?? null;
        const [tenantsData, propertiesData] = await Promise.all([
          fetchAllWorkspaceTenants(activePropId),
          fetchDashboardProperties(),
        ]);
        setTenants(tenantsData as unknown as TenantRecord[]);
        setProperties(propertiesData as unknown as PropertyOption[]);
        setCachedTenants(tenantsData, activeWorkspaceId, activePropId);
        setCachedProperties(propertiesData, activeWorkspaceId);
        setLastRefreshedAt(new Date());
      } catch (err: any) {
        console.error('Error loading tenants directory:', err);
        showError(
          isManualRefresh ? 'Refresh failed' : 'Failed to load tenants',
          isManualRefresh
            ? 'Unable to refresh tenants. Please try again.'
            : err.message || 'Could not fetch tenant directory.'
        );
      } finally {
        if (isManualRefresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [activeWorkspaceId, hasMatchingCache, selectedProperty?.propertyId, setCachedProperties, setCachedTenants, showError]
  );

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialTenants && initialTenants.length > 0) {
        setCachedTenants(initialTenants, activeWorkspaceId, activePropertyId);
        if (initialProperties && initialProperties.length > 0) {
          setCachedProperties(initialProperties, activeWorkspaceId);
        }
        return;
      }
    }
    loadData();
  }, [activePropertyId, activeWorkspaceId, initialProperties, initialTenants, loadData, setCachedProperties, setCachedTenants]);

  // Escape key exits table expanded mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTableExpanded && !isSetupWizardOpen && !isEditDrawerOpen) {
        setIsTableExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTableExpanded, isSetupWizardOpen, isEditDrawerOpen]);

  const handleStartTenancySetup = () => {
    if (properties.length === 0) {
      showError('No Properties Found', 'Please create a property before adding tenants.');
      return;
    }
    if (selectedProperty) {
      const prop = properties.find((p) => p.id === selectedProperty.propertyId);
      if (prop) {
        setSelectedPropertyForSetup(prop);
        setIsSetupWizardOpen(true);
        return;
      }
    }
    if (properties.length === 1) {
      setSelectedPropertyForSetup(properties[0]);
      setIsSetupWizardOpen(true);
    } else {
      setIsPropertySelectModalOpen(true);
    }
  };

  const getTenantCategory = (
    t: TenantRecord
  ): 'Active Resident' | 'Inactive / Past Resident' | 'Prospect / Applicant' | 'Archived' => {
    const status = (t.status || '').toLowerCase();
    if (status === 'archived') return 'Archived';
    if (status === 'prospect' || status === 'applicant' || status === 'pending') return 'Prospect / Applicant';
    if (status === 'inactive' || status === 'past' || status === 'ended' || status === 'terminated')
      return 'Inactive / Past Resident';

    const hasActiveLease = t.lease_tenants?.some((lt) => lt.lease?.status === 'active');
    if (hasActiveLease || status === 'active') return 'Active Resident';

    if (t.lease_tenants && t.lease_tenants.length > 0) return 'Inactive / Past Resident';

    return 'Active Resident';
  };

  // Scope by global or local property selection
  const scopedTenants = useMemo(() => {
    if (!selectedProperty) return tenants;
    return tenants.filter((t) => t.property_id === selectedProperty.propertyId);
  }, [tenants, selectedProperty]);

  // Overview stats calculated from scoped tenants
  const overviewStats = useMemo(() => {
    const total = scopedTenants.length;
    const active = scopedTenants.filter((t) => getTenantCategory(t) === 'Active Resident').length;
    const past = scopedTenants.filter((t) => getTenantCategory(t) === 'Inactive / Past Resident').length;
    const pending = scopedTenants.filter((t) => getTenantCategory(t) === 'Prospect / Applicant').length;
    const archived = scopedTenants.filter((t) => getTenantCategory(t) === 'Archived').length;

    return { total, active, past, pending, archived };
  }, [scopedTenants]);

  // Filtered rows for AG Grid / Card Grid based on active status tab
  const filteredRows = useMemo(() => {
    return scopedTenants.filter((t) => {
      if (statusFilter === 'All') return true;
      return getTenantCategory(t) === statusFilter;
    });
  }, [scopedTenants, statusFilter]);

  // Scoped tenants for the right Lease Overview card
  const leaseOverviewTenants = useMemo(() => {
    if (!overviewPropertyId) return scopedTenants;
    return scopedTenants.filter((t) => t.property_id === overviewPropertyId);
  }, [scopedTenants, overviewPropertyId]);

  const handleEditTenant = (tenant: Record<string, unknown>) => {
    setSelectedTenantForEdit(tenant as unknown as TenantRecord);
    setIsEditDrawerOpen(true);
  };

  const handleBulkDeleteTenants = async (selectedRows: TenantRecord[]) => {
    try {
      for (const t of selectedRows) {
        await handleDeleteTenant(t.property_id || '', t.id);
      }
      await loadData(true);
      showSuccess('Deleted', 'Selected tenants have been removed.');
    } catch (err: any) {
      console.error('Error deleting tenants:', err);
      showError('Delete Failed', err.message || 'Could not delete selected tenants.');
    }
  };

  const columns = useMemo<ColDef[]>(() => getTenantTableColumns(handleEditTenant), []);

  return (
    <PageLayout>
      <PageContent>
        <div className="space-y-5 lg:space-y-6 pb-16">
          {/* 1. Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight text-slate-900 dark:text-white">
                Tenants
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
                Manage your residents, leases and tenant information.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* List / Grid View Switch */}
              <div className="flex items-center p-1 rounded-xl bg-white dark:bg-[#07111F] border border-slate-200/80 dark:border-[#17283A] shadow-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors',
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
                    'px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors',
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
                onClick={handleStartTenancySetup}
                className="font-semibold text-xs rounded-xl bg-[#008F83] hover:bg-[#007a70] text-white shadow-none px-4 py-2"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Setup Tenancy
              </Button>
            </div>
          </div>

          {/* 2. Tenant Overview Banner (Hidden when Table is Expanded) */}
          {!isTableExpanded && (
            <TenantOverviewBanner
              totalTenants={overviewStats.total}
              activeResidents={overviewStats.active}
              pastResidents={overviewStats.past}
              prospects={overviewStats.pending}
              isLoading={isLoading}
              onSetupTenancy={handleStartTenancySetup}
            />
          )}

          {/* 3. Main Workspace Grid */}
          {!isLoading && scopedTenants.length === 0 && statusFilter === 'All' ? (
            /* Empty State */
            <div className="py-20 px-6 text-center bg-white dark:bg-[#07111F] rounded-[24px] border border-slate-200/80 dark:border-[#17283A] shadow-xs flex flex-col items-center justify-center min-h-[360px]">
              <div className="w-14 h-14 bg-slate-50 dark:bg-[#0E1E33] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/20">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                No tenants yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#7F8B99] max-w-sm mx-auto mb-5 leading-relaxed">
                Set up your first tenancy to start managing residents and leases.
              </p>
              <Button
                onClick={handleStartTenancySetup}
                className="font-semibold text-xs rounded-xl bg-[#008F83] hover:bg-[#007a70] text-white shadow-none px-4 py-2"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Setup Tenancy
              </Button>
            </div>
          ) : viewMode === 'table' ? (
            /* TABLE MODE: Left Table + Right Contextual Intelligence (or Full-Width when Expanded) */
            <div
              className={cn(
                'grid grid-cols-1 gap-5 items-stretch transition-all duration-300',
                isTableExpanded ? 'grid-cols-1' : 'lg:grid-cols-12'
              )}
            >
              {/* PRIMARY TENANT DIRECTORY (Col-span-8 or Col-span-12) */}
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
                    labelSingular="tenant"
                    labelPlural="tenants"
                    onRowClick={(row: any) => handleEditTenant(row)}
                    getRowId={(params: any) => String(params.data.id)}
                    enableColumnChooser
                    enableExport
                    exportFilename="tenants-export"
                    searchPlaceholder="Search tenants..."
                    onDeleteSelected={handleBulkDeleteTenants}
                    disablePagination={true}
                    isExpanded={isTableExpanded}
                    onExpandedChange={setIsTableExpanded}
                    leftToolbarContent={
                      <div className="flex items-center gap-3">
                        <span className="font-heading text-base font-bold text-slate-900 dark:text-white shrink-0">
                          Tenant Directory
                        </span>

                        {/* Status Filter Tabs Pill */}
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 dark:bg-[#0E1E33] text-xs font-semibold overflow-x-auto">
                          <button
                            type="button"
                            onClick={() => setStatusFilter('All')}
                            className={cn(
                              'px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-xs',
                              statusFilter === 'All'
                                ? 'bg-[#E8F7F5] dark:bg-[#008F83]/25 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/25 shadow-xs font-bold'
                                : 'text-slate-600 dark:text-[#7F8B99] hover:text-slate-900 dark:hover:text-white font-medium'
                            )}
                          >
                            All ({overviewStats.total})
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusFilter('Active Resident')}
                            className={cn(
                              'px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-xs',
                              statusFilter === 'Active Resident'
                                ? 'bg-[#E8F7F5] dark:bg-[#008F83]/25 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/25 shadow-xs font-bold'
                                : 'text-slate-600 dark:text-[#7F8B99] hover:text-slate-900 dark:hover:text-white font-medium'
                            )}
                          >
                            Active Resident ({overviewStats.active})
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusFilter('Inactive / Past Resident')}
                            className={cn(
                              'px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-xs',
                              statusFilter === 'Inactive / Past Resident'
                                ? 'bg-[#E8F7F5] dark:bg-[#008F83]/25 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/25 shadow-xs font-bold'
                                : 'text-slate-600 dark:text-[#7F8B99] hover:text-slate-900 dark:hover:text-white font-medium'
                            )}
                          >
                            Inactive / Past ({overviewStats.past})
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusFilter('Prospect / Applicant')}
                            className={cn(
                              'px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-xs',
                              statusFilter === 'Prospect / Applicant'
                                ? 'bg-[#E8F7F5] dark:bg-[#008F83]/25 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/25 shadow-xs font-bold'
                                : 'text-slate-600 dark:text-[#7F8B99] hover:text-slate-900 dark:hover:text-white font-medium'
                            )}
                          >
                            Prospect / Applicant ({overviewStats.pending})
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusFilter('Archived')}
                            className={cn(
                              'px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-xs',
                              statusFilter === 'Archived'
                                ? 'bg-[#E8F7F5] dark:bg-[#008F83]/25 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/25 shadow-xs font-bold'
                                : 'text-slate-600 dark:text-[#7F8B99] hover:text-slate-900 dark:hover:text-white font-medium'
                            )}
                          >
                            Archived ({overviewStats.archived})
                          </button>
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>

              {/* RIGHT CONTEXTUAL INTELLIGENCE (Col-span-4, Hidden when Expanded) */}
              {!isTableExpanded && (
                <div className="lg:col-span-4 flex flex-col gap-5">
                  {/* 1. Lease Overview Donut */}
                  <LeaseOverviewDonut
                    tenants={scopedTenants}
                    properties={properties}
                    selectedPropertyId={overviewPropertyId}
                    onPropertySelect={setOverviewPropertyId}
                    isLoading={isLoading}
                  />

                  {/* 2. Needs Attention */}
                  <TenantNeedsAttention
                    tenants={scopedTenants}
                    onFilterClick={(filterName) => {
                      if (filterName === 'Active Resident' || filterName === 'Prospect / Applicant' || filterName === 'All') {
                        setStatusFilter(filterName as any);
                      }
                    }}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </div>
          ) : (
            /* CARD GRID VIEW MODE */
            <HoverCardGrid className="overflow-y-auto flex-1 p-1">
              {filteredRows.map((t) => {
                const fullName = `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Tenant';
                const propertyName = t.property?.name || t.property?.address_line_1 || 'Unassigned';
                const activeLease = t.lease_tenants?.find((lt) => lt.lease?.status === 'active')?.lease || t.lease_tenants?.[0]?.lease;
                const leaseStr = activeLease?.rent_amount
                  ? `$${Number(activeLease.rent_amount).toLocaleString()}/${activeLease.rent_frequency || 'yearly'}`
                  : 'No active lease';
                const statusCategory = getTenantCategory(t);

                return (
                  <HoverEffectCardItem
                    key={String(t.id)}
                    onClick={() => handleEditTenant(t)}
                    className="cursor-pointer group/card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#008F83]/10 text-[#008F83] dark:text-[#32D5C4] flex items-center justify-center font-bold text-xs shrink-0 border border-[#008F83]/20">
                          {fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight truncate group-hover/card:text-[#008F83] dark:group-hover/card:text-[#32D5C4] transition-colors">
                            {fullName}
                          </h4>
                          <p className="text-xs text-slate-400 dark:text-[#7F8B99] mt-0.5 truncate">{t.email}</p>
                        </div>
                      </div>

                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-[10.5px] font-bold shrink-0',
                          statusCategory === 'Active Resident'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : statusCategory === 'Prospect / Applicant'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            : statusCategory === 'Inactive / Past Resident'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                        )}
                      >
                        {statusCategory}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0B1726] border border-slate-200/60 dark:border-[#17283A] my-1.5">
                      <div>
                        <span className="text-slate-400 dark:text-[#7F8B99] text-[10px] uppercase font-bold tracking-wider block">
                          Phone
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                          {t.phone || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-[#7F8B99] text-[10px] uppercase font-bold tracking-wider block">
                          Property
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                          {propertyName}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 dark:text-[#7F8B99] text-[10px] uppercase font-bold tracking-wider block">
                          Lease
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white truncate block mt-0.5">
                          {leaseStr}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-[#17283A]/80">
                      <span className="text-xs font-semibold text-[#008F83] dark:text-[#32D5C4] group-hover/card:underline inline-flex items-center gap-1">
                        <span>View profile</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTenant(t);
                        }}
                        className="px-2.5 py-1 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0E1E33] rounded-lg transition-colors inline-flex items-center gap-1 font-semibold text-xs"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </HoverEffectCardItem>
                );
              })}
            </HoverCardGrid>
          )}
        </div>
      </PageContent>

      {/* Property Selection Modal for Tenancy Setup */}
      {isPropertySelectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white dark:bg-[#07111F] border border-slate-200 dark:border-[#17283A] rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Select Property for Tenancy
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#7F8B99] mb-4">
              Choose the property where you want to set up this tenancy.
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {properties.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPropertyForSetup(p);
                    setIsPropertySelectModalOpen(false);
                    setIsSetupWizardOpen(true);
                  }}
                  className="w-full text-left p-3.5 rounded-2xl border border-slate-200/80 dark:border-[#17283A] hover:border-[#008F83] hover:bg-[#E6F8F3]/50 dark:hover:bg-[#0E1E33] transition-all flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">{p.name}</h4>
                    <p className="text-[11px] text-slate-400 dark:text-[#7F8B99] mt-0.5">{p.address_line_1}</p>
                  </div>
                  <Plus className="w-4 h-4 text-[#008F83]" />
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => setIsPropertySelectModalOpen(false)}
              className="w-full mt-4 rounded-xl text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Tenancy Setup Wizard Modal */}
      {isSetupWizardOpen && selectedPropertyForSetup && (
        <TenancySetupWizard
          isOpen={isSetupWizardOpen}
          propertyId={selectedPropertyForSetup.id}
          propertyName={selectedPropertyForSetup.name}
          defaultRentAmount={selectedPropertyForSetup.rent_amount}
          onClose={() => {
            setIsSetupWizardOpen(false);
            setSelectedPropertyForSetup(null);
          }}
          onSuccess={async () => {
            setIsSetupWizardOpen(false);
            setSelectedPropertyForSetup(null);
            await loadData(true);
          }}
        />
      )}

      {/* Edit Tenant Drawer */}
      <TenantDrawer
        isOpen={isEditDrawerOpen}
        propertyId={selectedTenantForEdit?.property_id || ''}
        onClose={() => {
          setIsEditDrawerOpen(false);
          setSelectedTenantForEdit(null);
        }}
        onSuccess={async () => {
          setIsEditDrawerOpen(false);
          setSelectedTenantForEdit(null);
          await loadData(true);
        }}
        tenant={selectedTenantForEdit as any}
      />
    </PageLayout>
  );
}
