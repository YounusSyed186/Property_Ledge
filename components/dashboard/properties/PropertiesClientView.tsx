'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  Building2,
  Building,
  Home,
  CheckCircle2,
  X,
  Pencil,
  ArrowUpRight,
  List,
  LayoutGrid,
  Maximize2,
  Minimize2,
  RefreshCw,
  Columns,
  Download,
  Search,
} from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, useToast } from '@/components/admin/ui';
import { PropertyDrawer } from '@/components/dashboard/properties/PropertyDrawer';
import { PropertyCreationWizard } from '@/components/dashboard/properties/PropertyCreationWizard';
import { PortfolioOverviewBanner } from '@/components/dashboard/properties/PortfolioOverviewBanner';
import { PropertiesCategoryDonut } from '@/components/dashboard/properties/PropertiesCategoryDonut';
import { getPropertiesTableColumns } from '@/components/dashboard/properties/propertyTableColumns';
import { PageLayout, PageContent } from '@/components/workspace/layout';
import { AdminDataGrid } from '@/components/admin/data-grid/AdminDataGrid';
import { HoverCardGrid, HoverEffectCardItem } from '@/components/ui/card-hover-effect';
import { cn } from '@/lib/utils';
import {
  fetchDashboardProperties,
  handleDeleteProperty,
} from '@/app/actions/dashboard';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { useEntityCacheStore } from '@/lib/stores/useEntityCacheStore';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';

export interface PropertiesClientViewProps {
  initialProperties?: Record<string, unknown>[];
}

export function PropertiesClientView({ initialProperties }: PropertiesClientViewProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error: showError } = useToast();
  const { availableProperties, refreshProperties } = usePropertyContext();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const cachedProperties = useEntityCacheStore((s) => s.properties);
  const setCachedProperties = useEntityCacheStore((s) => s.setProperties);

  const hasMatchingCache = cachedProperties && cachedProperties.workspaceId === activeWorkspaceId;

  const [rows, setRows] = useState<Record<string, unknown>[]>(() => {
    if (initialProperties && initialProperties.length > 0) {
      return initialProperties;
    }
    if (hasMatchingCache && cachedProperties.data.length > 0) {
      return cachedProperties.data;
    }
    if (availableProperties && availableProperties.length > 0) {
      return availableProperties.map((p) => ({
        id: p.propertyId,
        name: p.propertyName,
        address_line_1: p.propertyName,
        city: '',
        status: p.status || 'active',
      }));
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(
    () => !initialProperties && !hasMatchingCache && (!availableProperties || availableProperties.length === 0)
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(() => new Date());
  const isInitialMount = useRef(true);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Draft' | 'Archived'>('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isTableExpanded, setIsTableExpanded] = useState(false);

  const isNewQueryParam = searchParams.get('new') === 'true' || searchParams.get('action') === 'new';

  useEffect(() => {
    if (isNewQueryParam) {
      setIsWizardOpen(true);
    }
  }, [isNewQueryParam]);

  const closeWizard = () => {
    setIsWizardOpen(false);
    if (isNewQueryParam) {
      router.replace('/dashboard/properties');
    }
  };

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else if (!hasMatchingCache && (!availableProperties || availableProperties.length === 0)) {
      setIsLoading(true);
    }
    try {
      const data = await fetchDashboardProperties();
      setRows(data);
      setCachedProperties(data, activeWorkspaceId);
      setLastRefreshedAt(new Date());
    } catch {
      showError(
        isManualRefresh ? 'Refresh failed' : 'Load failed',
        isManualRefresh ? 'Unable to refresh properties. Please try again.' : 'Could not load properties.'
      );
    } finally {
      if (isManualRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [activeWorkspaceId, availableProperties, hasMatchingCache, setCachedProperties, showError]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialProperties && initialProperties.length > 0) {
        setCachedProperties(initialProperties, activeWorkspaceId);
        return;
      }
    }
    loadData();
  }, [activeWorkspaceId, initialProperties, loadData, setCachedProperties]);

  // Escape key exits table expanded mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTableExpanded && !isWizardOpen && !isDrawerOpen) {
        setIsTableExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTableExpanded, isWizardOpen, isDrawerOpen]);

  // Derived filter counts
  const filterCounts = useMemo(() => {
    const all = rows.length;
    const active = rows.filter((r) => String(r.status || '').toLowerCase() === 'active').length;
    const draft = rows.filter((r) => {
      const s = String(r.status || '').toLowerCase();
      return s === 'draft' || s === 'pending';
    }).length;
    const archived = rows.filter((r) => String(r.status || '').toLowerCase() === 'archived').length;
    return { all, active, draft, archived };
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const status = String(r.status || '').toLowerCase();
      if (statusFilter === 'All') return true;
      if (statusFilter === 'Active') return status === 'active';
      if (statusFilter === 'Draft') return status === 'draft' || status === 'pending';
      if (statusFilter === 'Archived') return status === 'archived';
      return true;
    });
  }, [rows, statusFilter]);

  // Portfolio occupancy metrics
  const occupancyStats = useMemo(() => {
    const total = rows.length;
    const active = filterCounts.active;
    let tenanted = 0;
    let vacant = 0;

    rows.forEach((r) => {
      const hasTenants = Number(r.tenants_count) > 0;
      const isActive = String(r.status || '').toLowerCase() === 'active';
      if (hasTenants || isActive) {
        tenanted += 1;
      } else {
        vacant += 1;
      }
    });

    if (total > 0 && tenanted === 0 && vacant === 0) {
      tenanted = active;
      vacant = Math.max(0, total - active);
    }

    return { total, active, tenanted, vacant };
  }, [rows, filterCounts.active]);

  const handleBulkDeleteProperties = async (selectedRows: any[]) => {
    try {
      for (const p of selectedRows) {
        await handleDeleteProperty(p.id);
      }
      await loadData();
      try {
        await refreshProperties();
      } catch (e) {
        console.error('Error refreshing properties context:', e);
      }
    } catch (err: any) {
      console.error('Error deleting properties:', err);
      showError('Delete Failed', err.message || 'Could not delete selected properties.');
    }
  };

  const handleEditProperty = (property: Record<string, unknown>) => {
    setSelected(property);
    setIsDrawerOpen(true);
  };

  const columns = useMemo<ColDef[]>(
    () => getPropertiesTableColumns(handleEditProperty),
    []
  );

  return (
    <PageLayout>
      <PageContent>
        <div className="space-y-5 lg:space-y-6 pb-16">
          {/* 1. Compact Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight text-slate-900 dark:text-white">
                Properties
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
                Manage your property portfolio and keep everything organized.
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

              {/* Add Property Button */}
              <Button
                onClick={() => setIsWizardOpen(true)}
                className="font-semibold text-xs rounded-xl bg-[#008F83] hover:bg-[#007a70] text-white shadow-none px-4 py-2"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Property
              </Button>
            </div>
          </div>

          {/* 2. Portfolio Overview Banner (Hidden when Table is Expanded) */}
          {!isTableExpanded && (
            <PortfolioOverviewBanner
              totalProperties={occupancyStats.total}
              activeProperties={occupancyStats.active}
              tenantedProperties={occupancyStats.tenanted}
              vacantProperties={occupancyStats.vacant}
              isLoading={isLoading}
              onAddProperty={() => setIsWizardOpen(true)}
            />
          )}

          {/* 3. Main Workspace Grid */}
          {!isLoading && filteredRows.length === 0 && statusFilter === 'All' ? (
            /* Empty State */
            <div className="py-20 px-6 text-center bg-white dark:bg-[#07111F] rounded-[24px] border border-slate-200/80 dark:border-[#17283A] shadow-xs flex flex-col items-center justify-center min-h-[360px]">
              <div className="w-14 h-14 bg-slate-50 dark:bg-[#0E1E33] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/20">
                <Building2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                No properties yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#7F8B99] max-w-sm mx-auto mb-5 leading-relaxed">
                Add your first property to start building your PropertyLedge portfolio.
              </p>
              <Button
                onClick={() => setIsWizardOpen(true)}
                className="font-semibold text-xs rounded-xl bg-[#008F83] hover:bg-[#007a70] text-white shadow-none px-4 py-2"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Property
              </Button>
            </div>
          ) : viewMode === 'table' ? (
            /* TABLE MODE: Left Table + Right Visualizations (or Full-Width when Expanded) */
            <div
              className={cn(
                'grid grid-cols-1 gap-5 items-stretch transition-all duration-300',
                isTableExpanded ? 'grid-cols-1' : 'lg:grid-cols-12'
              )}
            >
              {/* PRIMARY OPERATIONAL PROPERTY TABLE (Col-span-8 or Col-span-12) */}
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
                    onRefresh={() => loadData(true)}
                    isRefreshing={isRefreshing}
                    lastRefreshedAt={lastRefreshedAt}
                    labelSingular="property"
                    labelPlural="properties"
                    onRowClick={(row: any) => router.push(`/dashboard/properties/${row.id}`)}
                    getRowId={(params: any) => String(params.data.id)}
                    enableColumnChooser
                    enableExport
                    exportFilename="properties-export"
                    searchPlaceholder="Search properties..."
                    onDeleteSelected={handleBulkDeleteProperties}
                    disablePagination={true}
                    isExpanded={isTableExpanded}
                    onExpandedChange={setIsTableExpanded}
                    leftToolbarContent={
                      <div className="flex items-center gap-3">
                        <span className="font-heading text-base font-bold text-slate-900 dark:text-white shrink-0">
                          Properties
                        </span>

                        {/* Status Filter Tabs Pill */}
                        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 dark:bg-[#0E1E33] text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => setStatusFilter('All')}
                            className={cn(
                              'px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium',
                              statusFilter === 'All'
                                ? 'bg-[#E6F8F3] dark:bg-[#008F83]/25 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/30 shadow-xs font-bold'
                                : 'text-slate-600 dark:text-[#7F8B99] hover:text-slate-900 dark:hover:text-white'
                            )}
                          >
                            All ({filterCounts.all})
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusFilter('Active')}
                            className={cn(
                              'px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium',
                              statusFilter === 'Active'
                                ? 'bg-[#E6F8F3] dark:bg-[#008F83]/25 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/30 shadow-xs font-bold'
                                : 'text-slate-600 dark:text-[#7F8B99] hover:text-slate-900 dark:hover:text-white'
                            )}
                          >
                            Active ({filterCounts.active})
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusFilter('Draft')}
                            className={cn(
                              'px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium',
                              statusFilter === 'Draft'
                                ? 'bg-[#E6F8F3] dark:bg-[#008F83]/25 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/30 shadow-xs font-bold'
                                : 'text-slate-600 dark:text-[#7F8B99] hover:text-slate-900 dark:hover:text-white'
                            )}
                          >
                            Draft ({filterCounts.draft})
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusFilter('Archived')}
                            className={cn(
                              'px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium',
                              statusFilter === 'Archived'
                                ? 'bg-[#E6F8F3] dark:bg-[#008F83]/25 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/30 shadow-xs font-bold'
                                : 'text-slate-600 dark:text-[#7F8B99] hover:text-slate-900 dark:hover:text-white'
                            )}
                          >
                            Archived ({filterCounts.archived})
                          </button>
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>

              {/* RIGHT VISUAL CONTEXT (Col-span-4, Hidden when Expanded) */}
              {!isTableExpanded && (
                <div className="lg:col-span-4 flex flex-col">
                  <PropertiesCategoryDonut
                    properties={rows}
                    isLoading={isLoading}
                    className="h-full"
                  />
                </div>
              )}
            </div>
          ) : (
            /* CARD GRID VIEW MODE */
            <HoverCardGrid className="overflow-y-auto flex-1 p-1">
              {filteredRows.map((p) => {
                const address = String(p.address_line_1 || p.address || p.name || '—');
                const location = `${p.suburb || p.city || ''}${p.state ? `, ${p.state}` : ''}`.trim() || '—';
                const rent = p.rent_amount ? `$${Number(p.rent_amount).toLocaleString()}` : '—';
                const frequency = String(p.payment_frequency || 'Weekly');

                return (
                  <HoverEffectCardItem
                    key={String(p.id)}
                    onClick={() => router.push(`/dashboard/properties/${p.id}`)}
                    className="cursor-pointer group/card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#008F83]/10 text-[#008F83] dark:text-[#32D5C4] flex items-center justify-center font-bold text-sm shrink-0 border border-[#008F83]/20">
                          <Building2 className="w-5 h-5 text-[#008F83] dark:text-[#32D5C4]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight truncate group-hover/card:text-[#008F83] dark:group-hover/card:text-[#32D5C4] transition-colors">
                            {String(p.name || address)}
                          </h4>
                          <p className="text-xs text-slate-400 dark:text-[#7F8B99] mt-0.5 truncate">{address}</p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-[10.5px] font-bold shrink-0',
                          String(p.status).toLowerCase() === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : String(p.status).toLowerCase() === 'draft' || String(p.status).toLowerCase() === 'pending'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                        )}
                      >
                        {String(p.status || 'Active')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0B1726] border border-slate-200/60 dark:border-[#17283A] my-1.5">
                      <div>
                        <span className="text-slate-400 dark:text-[#7F8B99] text-[10px] uppercase font-bold tracking-wider block">
                          Location
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                          {location}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-[#7F8B99] text-[10px] uppercase font-bold tracking-wider block">
                          Type / Beds
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                          {String(p.property_type || 'Residential')} {p.bedrooms ? `(${p.bedrooms} Bed)` : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-[#7F8B99] text-[10px] uppercase font-bold tracking-wider block">
                          Advertised Rent
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white truncate block mt-0.5">
                          {rent} <span className="text-[10px] text-slate-400 dark:text-[#7F8B99] font-normal">/{frequency}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-[#7F8B99] text-[10px] uppercase font-bold tracking-wider block">
                          Category
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                          {String(p.property_category || 'Residential')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-[#17283A]/80">
                      <span className="text-xs font-semibold text-[#008F83] dark:text-[#32D5C4] group-hover/card:underline inline-flex items-center gap-1">
                        <span>View details</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(p);
                          setIsDrawerOpen(true);
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

      {/* V1 Property Creation Journey Modal */}
      <AnimatePresence>
        {isWizardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeWizard}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#07111F] border border-slate-200 dark:border-[#17283A] rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh] z-10 p-6 sm:p-8"
            >
              <button
                type="button"
                onClick={closeWizard}
                aria-label="Close dialog"
                className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0E1E33] transition-colors focus:outline-none focus:ring-2 focus:ring-[#008F83]/30"
              >
                <X className="w-5 h-5" />
              </button>

              <PropertyCreationWizard
                onCancel={closeWizard}
                onSuccess={async () => {
                  closeWizard();
                  await loadData();
                  try {
                    await refreshProperties();
                  } catch (e) {
                    console.error('Error refreshing properties context:', e);
                  }
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Property Drawer */}
      <PropertyDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={async () => {
          setIsDrawerOpen(false);
          await loadData();
          try {
            await refreshProperties();
          } catch (e) {
            console.error('Error refreshing properties context:', e);
          }
        }}
        property={selected as any}
        propertyId={String(selected?.id || '')}
        isCreate={false}
      />
    </PageLayout>
  );
}
