'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
} from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, useToast } from '@/components/admin/ui';
import { PropertyDrawer } from '@/components/dashboard/properties/PropertyDrawer';
import { PropertyCreationWizard } from '@/components/dashboard/properties/PropertyCreationWizard';
import { propertyColumns } from '@/components/dashboard/entities/config';
import { ListPage, ListPageGrid } from '@/components/workspace';
import { AdminDataGrid, QuickFilterBar, QuickFilterOption } from '@/components/admin/data-grid';
import { HoverCardGrid, HoverEffectCardItem } from '@/components/ui/card-hover-effect';
import { cn } from '@/lib/utils';
import {
  fetchDashboardProperties,
  handleCreateProperty,
  handleUpdateProperty,
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

  const loadData = async (isManualRefresh = false) => {
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
      showError(isManualRefresh ? 'Refresh failed' : 'Load failed', isManualRefresh ? 'Unable to refresh properties. Please try again.' : 'Could not load properties.');
    } finally {
      if (isManualRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialProperties && initialProperties.length > 0) {
        setCachedProperties(initialProperties, activeWorkspaceId);
        return;
      }
    }
    loadData();
  }, [activeWorkspaceId]);

  const filterOptions = useMemo<QuickFilterOption[]>(
    () => [
      { label: 'All', value: 'All' },
      { label: 'Active', value: 'Active' },
      { label: 'Draft', value: 'Draft' },
      { label: 'Archived', value: 'Archived' },
    ],
    []
  );

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

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => String(r.status || '').toLowerCase() === 'active').length;
    const draft = rows.filter((r) => {
      const status = String(r.status || '').toLowerCase();
      return status === 'draft' || status === 'pending';
    }).length;

    return { total, active, draft };
  }, [rows]);

  const handleBulkDeleteProperties = async (selected: any[]) => {
    try {
      for (const p of selected) {
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

  const columns = useMemo<ColDef[]>(
    () => [
      ...propertyColumns,
      {
        headerName: 'Actions',
        colId: 'actions',
        width: 100,
        pinned: 'right',
        sortable: false,
        filter: false,
        cellRenderer: (params: { data: Record<string, unknown> }) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelected(params.data);
              setIsDrawerOpen(true);
            }}
            className="px-2 py-1 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded-md transition-colors inline-flex items-center gap-1 font-semibold text-xs"
          >
            <Pencil className="w-3.5 h-3.5 text-admin-muted" /> Edit
          </button>
        ),
      },
    ],
    []
  );

  return (
    <ListPage
      title="Properties"
      description="Central catalog to view, add, and manage real estate assets in your portfolio."
      actions={
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-admin-surface border border-admin-border rounded-xl p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                viewMode === 'table'
                  ? 'bg-admin-surface-elevated text-admin-primary shadow-xs'
                  : 'text-admin-muted hover:text-admin-foreground'
              )}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                viewMode === 'grid'
                  ? 'bg-admin-surface-elevated text-admin-primary shadow-xs'
                  : 'text-admin-muted hover:text-admin-foreground'
              )}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <Button onClick={() => setIsWizardOpen(true)} className="font-bold gap-2">
            <Plus className="w-4 h-4" /> Add Property
          </Button>
        </div>
      }
      summary={
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-admin-border bg-admin-surface px-5 py-3.5 mb-4 shadow-2xs">
          <div className="flex flex-wrap items-center gap-6 sm:gap-10">
            {/* Total Assets */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-admin-surface-subtle border border-admin-border text-admin-foreground">
                <Building2 className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-admin-muted block">
                  Total Assets
                </span>
                <span className="text-lg font-bold font-mono text-admin-foreground">
                  {isLoading ? '—' : stats.total}
                </span>
              </div>
            </div>

            <div className="hidden h-7 w-px bg-admin-border sm:block" />

            {/* Active & Producing */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-admin-muted block">
                  Active &amp; Producing
                </span>
                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {isLoading ? '—' : stats.active}
                </span>
              </div>
            </div>

            <div className="hidden h-7 w-px bg-admin-border sm:block" />

            {/* Draft / Pending */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Building className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-admin-muted block">
                  Draft / Setup
                </span>
                <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                  {isLoading ? '—' : stats.draft}
                </span>
              </div>
            </div>

            <div className="hidden h-7 w-px bg-admin-border sm:block" />

            {/* Active Ratio */}
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-admin-muted block">
                  Active Share
                </span>
                <span className="text-lg font-bold font-mono text-admin-foreground">
                  {isLoading ? '—' : `${stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%`}
                </span>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex-1 flex flex-col min-h-0 h-full space-y-4">
        {!isLoading && filteredRows.length === 0 && statusFilter === 'All' ? (
          <div className="py-20 px-6 text-center bg-admin-surface rounded-2xl border border-admin-border shadow-xs flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-14 h-14 bg-admin-surface-subtle rounded-full flex items-center justify-center mx-auto mb-4 text-admin-muted border border-admin-border">
              <Building2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-admin-foreground mb-1">No properties found</h3>
            <p className="text-xs text-admin-muted max-w-sm mx-auto mb-5 font-medium">
              Start expanding your portfolio by adding your first real estate asset or building.
            </p>
            <Button onClick={() => setIsWizardOpen(true)} className="font-bold">
              <Plus className="w-4 h-4 mr-1.5" /> Add First Property
            </Button>
          </div>
        ) : viewMode === 'table' ? (
          <ListPageGrid>
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
              leftToolbarContent={
                <QuickFilterBar
                  options={filterOptions}
                  activeValue={statusFilter}
                  onChange={(val: any) => setStatusFilter(val as any)}
                />
              }
              disablePagination={true}
            />
          </ListPageGrid>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto flex-1 p-1">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-admin-surface border border-admin-border rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-3 skeleton-shimmer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl skeleton-shimmer shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 rounded skeleton-shimmer w-28" />
                      <div className="h-2.5 rounded skeleton-shimmer w-20" />
                    </div>
                  </div>
                  <div className="h-5 w-14 rounded skeleton-shimmer" />
                </div>
                <div className="grid grid-cols-2 gap-2 py-2 border-y border-admin-border/60 my-1">
                  <div className="space-y-1.5">
                    <div className="h-2 rounded skeleton-shimmer w-10" />
                    <div className="h-3 rounded skeleton-shimmer w-16" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2 rounded skeleton-shimmer w-12" />
                    <div className="h-3 rounded skeleton-shimmer w-16" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2 rounded skeleton-shimmer w-14" />
                    <div className="h-3 rounded skeleton-shimmer w-16" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2 rounded skeleton-shimmer w-10" />
                    <div className="h-3 rounded skeleton-shimmer w-8" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="h-3 rounded skeleton-shimmer w-16" />
                  <div className="h-3 rounded skeleton-shimmer w-12" />
                </div>
              </div>
            ))}
          </div>
        ) : (
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
                      <div className="w-10 h-10 rounded-xl bg-admin-primary/10 text-admin-primary flex items-center justify-center font-bold text-sm shrink-0 border border-admin-primary/20">
                        <Building2 className="w-5 h-5 text-admin-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-admin-foreground leading-tight truncate group-hover/card:text-admin-primary transition-colors">
                          {String(p.name || address)}
                        </h4>
                        <p className="text-xs text-admin-muted mt-0.5 truncate">{address}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider shrink-0',
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

                  <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-admin-surface-subtle/50 border border-admin-border/50 my-1">
                    <div>
                      <span className="text-admin-muted text-[10px] uppercase font-bold tracking-wider block">Location</span>
                      <span className="font-semibold text-admin-foreground truncate block">{location}</span>
                    </div>
                    <div>
                      <span className="text-admin-muted text-[10px] uppercase font-bold tracking-wider block">Type / Beds</span>
                      <span className="font-semibold text-admin-foreground truncate block">
                        {String(p.property_type || 'Residential')} {p.bedrooms ? `(${p.bedrooms} Bed)` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-admin-muted text-[10px] uppercase font-bold tracking-wider block">Advertised Rent</span>
                      <span className="font-bold text-admin-foreground truncate block">
                        {rent} <span className="text-[10px] text-admin-muted font-normal">/{frequency}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-admin-muted text-[10px] uppercase font-bold tracking-wider block">Total Units</span>
                      <span className="font-bold text-admin-foreground">{p.units_count !== undefined && p.units_count !== null ? String(p.units_count) : '1'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-admin-border/50">
                    <span className="text-xs font-bold text-admin-primary group-hover/card:underline inline-flex items-center gap-1">
                      View Details <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(p);
                        setIsDrawerOpen(true);
                      }}
                      className="px-2 py-1 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded-lg transition-colors inline-flex items-center gap-1 font-semibold text-xs"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                </HoverEffectCardItem>
              );
            })}
          </HoverCardGrid>
        )}
      </div>

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
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh] z-10 p-6 sm:p-8"
            >
              <button
                type="button"
                onClick={closeWizard}
                aria-label="Close dialog"
                className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#008F83]/30"
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
    </ListPage>
  );
}
