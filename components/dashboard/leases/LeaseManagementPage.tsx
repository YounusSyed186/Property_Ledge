'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Building,
  Building2,
  User,
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
import { motion, AnimatePresence } from 'framer-motion';
import { ColDef } from 'ag-grid-community';
import { Button, useToast, ConfirmDialog } from '@/components/admin/ui';
import { AdminDataGrid, QuickFilterBar, QuickFilterOption } from '@/components/admin/data-grid';
import { ListPage, ListPageGrid } from '@/components/workspace';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { useEntityCacheStore } from '@/lib/stores/useEntityCacheStore';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';
import dynamic from 'next/dynamic';
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
import { Avatar, AvatarGroup, PersonIdentity, JsonIcon, DiceBearIcon } from '@/components/ui/avatar';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

type LeaseRecord = {
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

export function LeaseManagementPage() {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const { selectedProperty, availableProperties } = usePropertyContext();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const cachedLeases = useEntityCacheStore((s) => s.leases);
  const setCachedLeases = useEntityCacheStore((s) => s.setLeases);
  const cachedProperties = useEntityCacheStore((s) => s.properties);
  const setCachedProperties = useEntityCacheStore((s) => s.setProperties);

  const activePropertyId = selectedProperty?.propertyId ?? null;
  const hasMatchingCache = cachedLeases &&
    cachedLeases.workspaceId === activeWorkspaceId &&
    cachedLeases.propertyId === activePropertyId;

  const [leases, setLeases] = useState<LeaseRecord[]>(() => hasMatchingCache ? (cachedLeases.data as LeaseRecord[]) : []);
  const [properties, setProperties] = useState<any[]>(() => {
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
  const [isLoading, setIsLoading] = useState(() => !hasMatchingCache);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Pending' | 'Expired' | 'Renewed'>('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

  const handleCreateAutomationSubmit = async (dto: CreateLeaseAutomationDTO) => {
    const res = await createLeaseAutomationAction(dto);
    if (!res.success) throw new Error(res.error || 'Failed to create automation');
    showSuccess('Automation Scheduled', 'Lease automation created successfully.');
    setIsAutomationModalOpen(false);
    setSelectedLeaseForAutomation(null);
  };

  const filterOptions = useMemo<QuickFilterOption[]>(
    () => [
      { label: 'All', value: 'All' },
      { label: 'Active', value: 'Active' },
      { label: 'Pending', value: 'Pending' },
      { label: 'Expired', value: 'Expired' },
      { label: 'Renewed', value: 'Renewed' },
    ],
    []
  );

  // Delete state
  const [deletingLeaseId, setDeletingLeaseId] = useState<string | null>(null);
  const [deletingPropertyId, setDeletingPropertyId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const agGridColumns: ColDef[] = useMemo(
    () => [
      {
        headerName: 'Property',
        flex: 1.5,
        minWidth: 180,
        valueGetter: (p) => {
          const prop = p.data?.property;
          if (!prop) return 'Unassigned';
          return `${prop.name || prop.address_line_1}${prop.city ? `, ${prop.city}` : ''}`;
        },
        cellRenderer: (params: any) => {
          const prop = params.data?.property;
          if (!prop) return <span className="text-muted text-xs">Unassigned</span>;
          const name = String(prop.name || prop.address_line_1 || 'Property');
          const location = prop.city || prop.suburb || prop.state || '';
          return (
            <div className="flex items-center gap-2 py-1 min-w-0 max-w-full overflow-hidden" title={name}>
              <DiceBearIcon name="building" badge variant="purple" className="w-3.5 h-3.5" />
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="font-semibold text-foreground text-[13px] truncate">{name}</span>
                {location && <span className="text-[10.5px] text-muted truncate">{location}</span>}
              </div>
            </div>
          );
        },
      },
      {
        headerName: 'Unit',
        width: 100,
        valueGetter: (p) => p.data?.unit?.unit_number || '—',
      },
      {
        headerName: 'Tenants',
        flex: 1.5,
        minWidth: 220,
        valueGetter: (p) => {
          const tenants = p.data?.lease_tenants || [];
          if (tenants.length === 0) return 'No tenants';
          return tenants
            .map((lt: any) => `${lt.tenant?.first_name || ''} ${lt.tenant?.last_name || ''}`.trim())
            .filter(Boolean)
            .join(', ');
        },
        cellRenderer: (params: any) => {
          const leaseTenants = params.data?.lease_tenants || [];
          if (leaseTenants.length === 0) return <span className="text-muted text-xs">No tenants</span>;
          const primaryLt = leaseTenants.find((lt: any) => lt.is_primary) || leaseTenants[0];
          const tenantObj = primaryLt?.tenant;
          if (!tenantObj) return <span className="text-muted text-xs">Unassigned</span>;
          const name = `${tenantObj.first_name || ''} ${tenantObj.last_name || ''}`.trim() || 'Tenant';
          const tenantId = tenantObj.id || primaryLt.tenant_id;

          if (leaseTenants.length > 1) {
            const avatarItems = leaseTenants.map((lt: any) => ({
              id: lt.tenant?.id || lt.tenant_id,
              name: `${lt.tenant?.first_name || ''} ${lt.tenant?.last_name || ''}`.trim(),
            }));
            return (
              <div className="flex items-center gap-2">
                <AvatarGroup items={avatarItems} size="sm" />
                <span className="text-xs font-semibold text-foreground truncate">{name} +{leaseTenants.length - 1}</span>
              </div>
            );
          }

          return (
            <PersonIdentity
              seed={tenantId}
              name={name}
              subtitle={tenantObj.email}
              size="sm"
            />
          );
        },
      },
      {
        field: 'rent_amount',
        headerName: 'Rent Amount',
        width: 130,
        cellRenderer: 'currencyCell',
      },
      {
        field: 'rent_frequency',
        headerName: 'Frequency',
        width: 120,
        valueGetter: (p) => {
          const freq = p.data?.rent_frequency || 'monthly';
          return freq.charAt(0).toUpperCase() + freq.slice(1);
        },
      },
      {
        field: 'security_deposit',
        headerName: 'Security Deposit',
        width: 140,
        cellRenderer: 'currencyCell',
      },
      {
        field: 'payment_due_day',
        headerName: 'Due Day',
        width: 100,
        valueGetter: (p) => (p.data?.payment_due_day ? `Day ${p.data.payment_due_day}` : '—'),
      },
      {
        field: 'start_date',
        headerName: 'Start Date',
        width: 120,
        cellRenderer: 'dateCell',
      },
      {
        field: 'end_date',
        headerName: 'End Date',
        width: 120,
        valueGetter: (p) => p.data?.end_date || 'Periodic',
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        cellRenderer: 'statusCell',
      },
      {
        field: 'notes',
        headerName: 'Notes',
        flex: 1,
        minWidth: 150,
        valueGetter: (p) => p.data?.notes || '—',
      },
      {
        field: 'created_at',
        headerName: 'Created Date',
        width: 130,
        cellRenderer: 'dateCell',
      },
      {
        headerName: 'Actions',
        colId: 'actions',
        width: 100,
        pinned: 'right',
        sortable: false,
        filter: false,
        cellRenderer: (params: any) => {
          const lease = params.data;
          return (
            <div className="flex items-center gap-1 py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLeaseForEdit(lease);
                  setIsEditDrawerOpen(true);
                }}
                className="px-2 py-0.5 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-500/10 rounded transition-colors inline-flex items-center gap-1 font-bold text-xs"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
            </div>
          );
        },
      },
    ],
    []
  );

  const loadData = async () => {
    if (!hasMatchingCache) {
      setIsLoading(true);
    }
    try {
      const activePropertyId = selectedProperty?.propertyId ?? null;
      const [leasesData, propertiesData] = await Promise.all([
        fetchAllWorkspaceLeases(activePropertyId),
        fetchDashboardProperties(),
      ]);
      setLeases(leasesData as unknown as LeaseRecord[]);
      setProperties(propertiesData);
      setCachedLeases(leasesData, activeWorkspaceId, activePropertyId);
      setCachedProperties(propertiesData, activeWorkspaceId);
    } catch (err: any) {
      console.error('Error loading leases:', err);
      showError('Failed to load leases', err.message || 'Could not fetch lease agreements.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProperty?.propertyId, activeWorkspaceId]);

  const filteredLeases = useMemo(() => {
    return leases.filter((l) => {
      if (selectedProperty && l.property_id !== selectedProperty.propertyId) {
        return false;
      }
      if (statusFilter === 'All') return true;
      if (statusFilter === 'Active') return l.status === 'active';
      if (statusFilter === 'Pending') return l.status === 'pending';
      if (statusFilter === 'Renewed') return l.status === 'renewed';
      if (statusFilter === 'Expired') {
        const isExpired = l.status === 'expired' || (l.end_date && new Date(l.end_date) < new Date());
        return isExpired;
      }
      return true;
    });
  }, [leases, statusFilter, selectedProperty]);

  const confirmDeleteLease = async () => {
    if (!deletingLeaseId || !deletingPropertyId) return;
    setIsDeleting(true);
    try {
      await handleDeleteLease(deletingPropertyId, deletingLeaseId);
      showSuccess('Lease Deleted', 'The lease record has been permanently removed.');
      setDeletingLeaseId(null);
      setDeletingPropertyId(null);
      loadData();
    } catch (err: any) {
      showError('Failed to delete lease', err.message || 'An error occurred.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateStatus = async (lease: LeaseRecord, newStatus: string) => {
    try {
      await handleUpdateLeaseStatus(lease.property_id, lease.id, newStatus);
      showSuccess('Status Updated', `Lease status set to ${newStatus}.`);
      loadData();
    } catch (err: any) {
      showError('Failed to update status', err.message || 'An error occurred.');
    }
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

  const handleDoNotRenewLease = async (lease: LeaseRecord) => {
    try {
      await handleDoNotRenew(lease.property_id, lease.id, 'Non-renewal confirmed by manager.');
      showSuccess('Non-Renewal Marked', 'Lease marked for completion at end of term without renewal.');
      loadData();
    } catch (err: any) {
      showError('Non-Renewal Failed', err.message || 'An error occurred.');
    }
  };

  const handleRenewLease = (lease: LeaseRecord) => {
    setSelectedLeaseForRenewal(lease);
    setIsRenewModalOpen(true);
  };

  const getLeaseTimeRemaining = (endDateStr: string | null, status: string) => {
    if (status !== 'active') return status.toUpperCase();
    if (!endDateStr) return 'Periodic (No Exp Date)';
    const end = new Date(endDateStr);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires Today';
    if (diffDays === 1) return 'Expires Tomorrow';
    if (diffDays <= 30) return `${diffDays} Days Left`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} Months Left`;
  };

  const stats = useMemo(() => {
    const active = filteredLeases.filter((l) => l.status === 'active').length;
    const periodic = filteredLeases.filter((l) => l.status === 'active' && !l.end_date).length;
    const expired = filteredLeases.filter((l) => l.status === 'expired' || (l.end_date && new Date(l.end_date) < new Date())).length;
    const totalRent = filteredLeases
      .filter((l) => l.status === 'active')
      .reduce((sum, l) => sum + (Number(l.rent_amount) || 0), 0);

    return { total: filteredLeases.length, active, periodic, expired, totalRent };
  }, [filteredLeases]);

  const handleBulkDeleteLeases = async (selected: LeaseRecord[]) => {
    try {
      for (const l of selected) {
        await handleDeleteLease(l.property_id, l.id);
      }
      showSuccess('Leases Deleted', `Successfully deleted ${selected.length} ${selected.length === 1 ? 'lease' : 'leases'}.`);
      await loadData();
    } catch (err: any) {
      console.error('Error deleting leases:', err);
      showError('Delete Failed', err.message || 'Could not delete selected leases.');
    }
  };

  const contextName = selectedProperty ? selectedProperty.propertyName : 'All Properties';
  const pageDescription = `${contextName} · ${filteredLeases.length} ${filteredLeases.length === 1 ? 'lease' : 'leases'}`;

  return (
    <ListPage
      title="Leases"
      description={pageDescription}
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
              title="AG Grid Table View"
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
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <Button
            onClick={() => {
              setWizardInitialData(selectedProperty ? { property_id: selectedProperty.propertyId } : null);
              setIsCreateWizardOpen(true);
            }}
            className="font-bold gap-2"
          >
            <Plus className="w-4 h-4" /> Create Lease
          </Button>
        </div>
      }
      summary={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Active Leases */}
          <div className="bg-admin-surface border border-admin-border rounded-2xl p-5 flex flex-col justify-between shadow-xs">
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-admin-muted uppercase tracking-wider mb-0.5">Active Contracts</p>
              <h3 className="text-2xl font-black text-admin-foreground">
                {isLoading ? (
                  <span className="inline-block h-7 w-12 rounded skeleton-shimmer align-middle" />
                ) : (
                  stats.active
                )}
              </h3>
            </div>
          </div>

          {/* Periodic Leases */}
          <div className="bg-admin-surface border border-admin-border rounded-2xl p-5 flex flex-col justify-between shadow-xs">
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-admin-muted uppercase tracking-wider mb-0.5">Periodic (Month-to-Month)</p>
              <h3 className="text-2xl font-black text-admin-foreground">
                {isLoading ? (
                  <span className="inline-block h-7 w-12 rounded skeleton-shimmer align-middle" />
                ) : (
                  stats.periodic
                )}
              </h3>
            </div>
          </div>

          {/* Expiring / Expired */}
          <div className="bg-admin-surface border border-admin-border rounded-2xl p-5 flex flex-col justify-between shadow-xs">
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-admin-muted uppercase tracking-wider mb-0.5">Expired / Action Needed</p>
              <h3 className="text-2xl font-black text-admin-foreground">
                {isLoading ? (
                  <span className="inline-block h-7 w-12 rounded skeleton-shimmer align-middle" />
                ) : (
                  stats.expired
                )}
              </h3>
            </div>
          </div>

          {/* Active Rent Volume */}
          <div className="bg-admin-surface border border-admin-border rounded-2xl p-5 flex flex-col justify-between shadow-xs">
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-admin-muted uppercase tracking-wider mb-0.5">Active Rent Inflow</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {isLoading ? (
                  <span className="inline-block h-7 w-20 rounded skeleton-shimmer align-middle" />
                ) : (
                  `$${stats.totalRent.toLocaleString()}`
                )}
              </h3>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex-1 flex flex-col min-h-0 h-full space-y-4">
        {/* Leases Data Content */}
        {!isLoading && filteredLeases.length === 0 && statusFilter === 'All' ? (
          <div className="py-20 px-6 text-center bg-admin-surface rounded-2xl border border-admin-border shadow-xs flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-14 h-14 bg-admin-surface-subtle rounded-full flex items-center justify-center mx-auto mb-4 text-admin-muted border border-admin-border">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-admin-foreground mb-1">No leases found</h3>
            <p className="text-xs text-admin-muted max-w-sm mx-auto mb-5 font-medium">
              Get started by creating a new lease agreement or setting up a tenancy.
            </p>
            <Button
              onClick={() => {
                setWizardInitialData(null);
                setIsCreateWizardOpen(true);
              }}
              className="font-bold"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create First Lease
            </Button>
          </div>
        ) : viewMode === 'table' ? (
          <ListPageGrid>
            <AdminDataGrid
              rowData={filteredLeases}
              columnDefs={agGridColumns}
              loading={isLoading}
              labelSingular="lease"
              labelPlural="leases"
              onRowClick={(row) => {
                setSelectedLeaseForEdit(row);
                setIsEditDrawerOpen(true);
              }}
              getRowId={(p) => p.data.id}
              enableColumnChooser
              enableExport
              exportFilename="leases-export"
              searchPlaceholder="Search leases..."
              onDeleteSelected={handleBulkDeleteLeases}
              leftToolbarContent={
                <QuickFilterBar
                  options={filterOptions}
                  activeValue={statusFilter}
                  onChange={(val) => setStatusFilter(val as any)}
                />
              }
              disablePagination={true}
            />
          </ListPageGrid>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 overflow-y-auto flex-1 p-1">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-admin-surface border border-admin-border rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4 skeleton-shimmer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl skeleton-shimmer shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 rounded skeleton-shimmer w-28" />
                      <div className="h-2.5 rounded skeleton-shimmer w-20" />
                    </div>
                  </div>
                  <div className="h-5 w-14 rounded skeleton-shimmer" />
                </div>
                <div className="h-px w-full bg-admin-border/60" />
                <div className="space-y-3 flex-1">
                  <div className="space-y-1.5">
                    <div className="h-2 rounded skeleton-shimmer w-12" />
                    <div className="h-3 rounded skeleton-shimmer w-24" />
                  </div>
                  <div className="h-px w-full bg-admin-border/60" />
                  <div className="space-y-1.5">
                    <div className="h-2 rounded skeleton-shimmer w-16" />
                    <div className="h-3 rounded skeleton-shimmer w-32" />
                  </div>
                  <div className="h-px w-full bg-admin-border/60" />
                  <div className="space-y-1.5">
                    <div className="h-2 rounded skeleton-shimmer w-20" />
                    <div className="h-3 rounded skeleton-shimmer w-24" />
                  </div>
                </div>
                <div className="h-px w-full bg-admin-border/60" />
                <div className="flex items-center gap-2 pt-1">
                  <div className="h-6 w-16 rounded skeleton-shimmer-lg" />
                  <div className="h-6 w-14 rounded skeleton-shimmer-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <HoverCardGrid className="overflow-y-auto flex-1 p-1">
            {filteredLeases.map((lease) => {
              const timeRemaining = getLeaseTimeRemaining(lease.end_date, lease.status);
              const isExpiringSoonOrExpired =
                lease.status === 'expired' || (lease.end_date && new Date(lease.end_date) < new Date());

              return (
                <HoverEffectCardItem
                  key={lease.id}
                  className="group/card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-admin-primary/10 text-admin-primary flex items-center justify-center shrink-0 border border-admin-primary/20">
                        <Building className="w-5 h-5 text-admin-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-admin-foreground line-clamp-1 group-hover/card:text-admin-primary transition-colors">
                          {lease.property?.name || lease.property?.address_line_1 || 'Unassigned Property'}
                        </h4>
                        <p className="text-xs text-admin-muted truncate">{lease.property?.city || lease.property?.suburb || 'Property'}</p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider shrink-0',
                        lease.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : lease.status === 'expired'
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      )}
                    >
                      {lease.status}
                    </span>
                  </div>

                  <div className="space-y-2.5 p-3 rounded-xl bg-admin-surface-subtle/50 border border-admin-border/50 text-xs text-admin-muted my-1">
                    <div>
                      <div className="text-[10px] font-bold text-admin-muted uppercase tracking-wider mb-1">Tenants</div>
                      <div className="space-y-1">
                        {lease.lease_tenants && lease.lease_tenants.length > 0 ? (
                          lease.lease_tenants.map((lt, tIdx) => (
                            <div key={tIdx} className="flex items-center gap-1.5 text-xs text-admin-foreground font-semibold">
                              <User className="w-3.5 h-3.5 text-admin-muted shrink-0" />
                              <span className="truncate">{lt.tenant?.first_name} {lt.tenant?.last_name}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-admin-muted italic">No attached tenants</span>
                        )}
                      </div>
                    </div>

                    <div className="h-px w-full bg-admin-border/60" />

                    <div>
                      <div className="text-[10px] font-bold text-admin-muted uppercase tracking-wider mb-1">Lease Term</div>
                      <div className="flex items-center gap-2 text-admin-foreground font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-admin-muted shrink-0" />
                        <span className="truncate">
                          {new Date(lease.start_date).toLocaleDateString()} - {lease.end_date ? new Date(lease.end_date).toLocaleDateString() : 'Periodic'}
                        </span>
                      </div>
                      <div className={cn('text-[11px] font-bold mt-1 pl-5.5', isExpiringSoonOrExpired ? 'text-red-500' : 'text-admin-primary')}>
                        {timeRemaining}
                      </div>
                    </div>

                    <div className="h-px w-full bg-admin-border/60" />

                    <div>
                      <div className="text-[10px] font-bold text-admin-muted uppercase tracking-wider mb-1">Rent Structure</div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-admin-muted shrink-0" />
                        <span className="text-admin-foreground font-bold text-sm">
                          ${Number(lease.rent_amount).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-admin-muted uppercase">/{lease.rent_frequency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1 border-t border-admin-border/50">
                    {lease.status === 'active' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRenewLease(lease)}
                          className="text-xs px-2.5 py-1 font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Renew
                        </button>
                        {lease.end_date && (
                          <button
                            type="button"
                            onClick={() => handleDoNotRenewLease(lease)}
                            className="text-xs px-2 py-1 font-medium text-admin-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Mark this lease as ending without renewal"
                          >
                            Do Not Renew
                          </button>
                        )}
                        {lease.end_date && (
                          <button
                            type="button"
                            onClick={() => handleConvertToPeriodicLease(lease)}
                            className="text-xs px-2 py-1 font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
                          >
                            Periodic
                          </button>
                        )}
                      </>
                    )}

                    {lease.status === 'renewed' && (
                      <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-500/10">
                        Historical Contract
                      </span>
                    )}

                    <div className="flex-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLeaseForEdit(lease);
                        setIsEditDrawerOpen(true);
                      }}
                      className="p-1.5 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded-lg transition-colors"
                      title="Edit Lease"
                    >
                      <Settings className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeletingLeaseId(lease.id);
                        setDeletingPropertyId(lease.property_id);
                      }}
                      className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete Lease"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </HoverEffectCardItem>
              );
            })}
          </HoverCardGrid>
        )}
      </div>

      {/* Dedicated Renew Lease Modal */}
      {isRenewModalOpen && selectedLeaseForRenewal && (
        <RenewLeaseModal
          isOpen={true}
          previousLease={selectedLeaseForRenewal}
          onClose={() => {
            setIsRenewModalOpen(false);
            setSelectedLeaseForRenewal(null);
          }}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Create Lease Wizard */}
      {isCreateWizardOpen && (
        <CreateLeaseWizard
          isOpen={true}
          propertyId={selectedProperty?.propertyId}
          propertyName={selectedProperty?.propertyName}
          initialData={wizardInitialData}
          onClose={() => {
            setIsCreateWizardOpen(false);
            setWizardInitialData(null);
          }}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Edit Lease Drawer */}
      {isEditDrawerOpen && selectedLeaseForEdit && (
        <LeaseEditDrawer
          isOpen={true}
          lease={selectedLeaseForEdit}
          propertyId={selectedLeaseForEdit.property_id}
          onClose={() => {
            setIsEditDrawerOpen(false);
            setSelectedLeaseForEdit(null);
          }}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Create Lease Automation Modal */}
      {isAutomationModalOpen && (
        <CreateAutomationModal
          isOpen={true}
          preselectedLeaseId={selectedLeaseForAutomation || undefined}
          onClose={() => {
            setIsAutomationModalOpen(false);
            setSelectedLeaseForAutomation(null);
          }}
          onSuccess={loadData}
        />
      )}

      {/* Delete Lease Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingLeaseId}
        onClose={() => {
          setDeletingLeaseId(null);
          setDeletingPropertyId(null);
        }}
        onConfirm={confirmDeleteLease}
        title="Delete Lease Record"
        description="Are you sure you want to permanently delete this lease agreement? This action cannot be undone."
        confirmLabel="Delete Lease"
        variant="danger"
      />
    </ListPage>
  );
}
