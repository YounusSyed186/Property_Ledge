'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  X,
} from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import { LayoutGrid, List } from 'lucide-react';
import { Button, useToast } from '@/components/admin/ui';
import { AdminDataGrid, QuickFilterBar, QuickFilterOption } from '@/components/admin/data-grid';
import { ListPage, ListPageGrid } from '@/components/workspace';
import dynamic from 'next/dynamic';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { fetchAllWorkspaceTenants, fetchDashboardProperties, handleDeleteTenant } from '@/app/actions/dashboard';
import { HoverCardGrid, HoverEffectCardItem } from '@/components/ui/card-hover-effect';
import { Avatar, PersonIdentity, JsonIcon, DiceBearIcon } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const TenancySetupWizard = dynamic(
  () => import('@/components/dashboard/workflows/TenancySetupWizard').then((m) => m.TenancySetupWizard),
  { ssr: false }
);
const TenantDrawer = dynamic(
  () => import('@/components/dashboard/tenants/TenantDrawer').then((m) => m.TenantDrawer),
  { ssr: false }
);

type TenantRecord = {
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

type PropertyOption = {
  id: string;
  name: string;
  address_line_1: string;
  city: string;
  rent_amount?: number;
};

export function TenantDirectoryPage() {
  const router = useRouter();
  const { error: showError } = useToast();
  const { selectedProperty, availableProperties } = usePropertyContext();

  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    'All' | 'Active Resident' | 'Inactive / Past Resident' | 'Prospect / Applicant' | 'Archived'
  >('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Tenancy Setup Wizard state
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);
  const [selectedPropertyForSetup, setSelectedPropertyForSetup] = useState<PropertyOption | null>(null);
  const [isPropertySelectModalOpen, setIsPropertySelectModalOpen] = useState(false);

  // Edit Drawer state
  const [selectedTenantForEdit, setSelectedTenantForEdit] = useState<TenantRecord | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  const filterOptions = useMemo<QuickFilterOption[]>(
    () => [
      { label: 'All', value: 'All' },
      { label: 'Active Resident', value: 'Active Resident' },
      { label: 'Inactive / Past Resident', value: 'Inactive / Past Resident' },
      { label: 'Prospect / Applicant', value: 'Prospect / Applicant' },
      { label: 'Archived', value: 'Archived' },
    ],
    []
  );

  const agGridColumns: ColDef[] = useMemo(
    () => [
      {
        field: 'first_name',
        headerName: 'Tenant Name',
        flex: 1.5,
        minWidth: 220,
        valueGetter: (p) => `${p.data?.first_name || ''} ${p.data?.last_name || ''}`.trim(),
        cellRenderer: (params: any) => {
          const tenant = params.data;
          if (!tenant) return null;
          const fullName = `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim();
          return (
            <PersonIdentity
              seed={tenant.id}
              name={fullName || 'Tenant'}
              subtitle={tenant.email}
              size="sm"
            />
          );
        },
      },
      {
        field: 'email',
        headerName: 'Email Address',
        flex: 1.5,
        minWidth: 200,
      },
      {
        field: 'phone',
        headerName: 'Phone Number',
        width: 140,
        valueGetter: (p) => p.data?.phone || '—',
      },
      {
        headerName: 'Assigned Property',
        flex: 1.5,
        minWidth: 200,
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
              <DiceBearIcon name="building" badge variant="red" className="w-3.5 h-3.5" />
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="font-semibold text-foreground text-[13px] truncate">{name}</span>
                {location && <span className="text-[10.5px] text-muted truncate">{location}</span>}
              </div>
            </div>
          );
        },
      },
      {
        headerName: 'Active Lease Rent',
        width: 150,
        valueGetter: (p) => {
          const activeLease = p.data?.lease_tenants?.find((lt: any) => lt.lease?.status === 'active')?.lease || p.data?.lease_tenants?.[0]?.lease;
          if (!activeLease) return '—';
          return `$${Number(activeLease.rent_amount || 0).toLocaleString()}/${activeLease.rent_frequency || 'mo'}`;
        },
      },
      {
        field: 'date_of_birth',
        headerName: 'Date of Birth',
        width: 130,
        valueGetter: (p) => p.data?.date_of_birth || '—',
      },
      {
        field: 'emergency_contact_name',
        headerName: 'Emergency Contact',
        width: 170,
        valueGetter: (p) => {
          const name = p.data?.emergency_contact_name;
          const phone = p.data?.emergency_contact_phone;
          if (name && phone) return `${name} (${phone})`;
          return name || phone || '—';
        },
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
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
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTenantForEdit(params.data);
                setIsEditDrawerOpen(true);
              }}
              className="p-1 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-500/10 rounded transition-colors inline-flex items-center gap-1 font-bold text-xs"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          );
        },
      },
    ],
    []
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const activePropertyId = selectedProperty?.propertyId ?? null;
      const [tenantsData, propertiesData] = await Promise.all([
        fetchAllWorkspaceTenants(activePropertyId),
        fetchDashboardProperties(),
      ]);
      setTenants(tenantsData as unknown as TenantRecord[]);
      setProperties(propertiesData as unknown as PropertyOption[]);
    } catch (err: any) {
      console.error('Error loading tenants directory:', err);
      showError('Failed to load tenants', err.message || 'Could not fetch tenant directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProperty?.propertyId]);

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

  const getTenantCategory = (t: TenantRecord): 'Active Resident' | 'Inactive / Past Resident' | 'Prospect / Applicant' | 'Archived' => {
    const status = (t.status || '').toLowerCase();
    if (status === 'archived') return 'Archived';
    if (status === 'prospect' || status === 'applicant' || status === 'pending') return 'Prospect / Applicant';
    if (status === 'inactive' || status === 'past' || status === 'ended' || status === 'terminated') return 'Inactive / Past Resident';

    const hasActiveLease = t.lease_tenants?.some((lt) => lt.lease?.status === 'active');
    if (hasActiveLease || status === 'active') return 'Active Resident';

    if (t.lease_tenants && t.lease_tenants.length > 0) return 'Inactive / Past Resident';

    return 'Active Resident';
  };

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      if (selectedProperty && t.property_id !== selectedProperty.propertyId) {
        return false;
      }
      if (statusFilter === 'All') return true;
      return getTenantCategory(t) === statusFilter;
    });
  }, [tenants, statusFilter, selectedProperty]);

  const stats = useMemo(() => {
    const active = filteredTenants.filter((t) => getTenantCategory(t) === 'Active Resident').length;
    const pending = filteredTenants.filter((t) => getTenantCategory(t) === 'Prospect / Applicant').length;
    const past = filteredTenants.filter((t) => getTenantCategory(t) === 'Inactive / Past Resident').length;
    const archived = filteredTenants.filter((t) => getTenantCategory(t) === 'Archived').length;

    return { total: filteredTenants.length, active, pending, past, archived };
  }, [filteredTenants]);

  const handleBulkDeleteTenants = async (selected: TenantRecord[]) => {
    try {
      for (const t of selected) {
        await handleDeleteTenant(t.property_id || '', t.id);
      }
      await loadData();
    } catch (err: any) {
      console.error('Error deleting tenants:', err);
      showError('Delete Failed', err.message || 'Could not delete selected tenants.');
    }
  };

  const contextName = selectedProperty ? selectedProperty.propertyName : 'All Properties';
  const pageDescription = `${contextName} · ${filteredTenants.length} ${filteredTenants.length === 1 ? 'resident' : 'residents'}`;

  return (
    <ListPage
      title="Tenants"
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
              title="Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <Button onClick={handleStartTenancySetup} className="font-bold gap-2">
            <Plus className="w-4 h-4" /> Setup Tenancy
          </Button>
        </div>
      }
      summary={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Action Card */}
          <div
            onClick={handleStartTenancySetup}
            className="bg-admin-primary text-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-white/70 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div>
              <h3 className="text-base font-black mb-0.5">Setup Tenancy</h3>
              <p className="text-xs text-white/80 font-medium">Add a tenant and configure lease details.</p>
            </div>
          </div>

          {/* Active Tenants */}
          <div className="bg-admin-surface border border-admin-border rounded-2xl p-5 flex flex-col justify-between shadow-xs">
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-admin-muted uppercase tracking-wider mb-0.5">Active Residents</p>
              <h3 className="text-2xl font-black text-admin-foreground">
                {isLoading ? (
                  <span className="inline-block h-7 w-12 rounded skeleton-shimmer align-middle" />
                ) : (
                  stats.active
                )}
              </h3>
            </div>
          </div>

          {/* Pending Invites */}
          <div className="bg-admin-surface border border-admin-border rounded-2xl p-5 flex flex-col justify-between shadow-xs">
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-admin-muted uppercase tracking-wider mb-0.5">Pending / Prospects</p>
              <h3 className="text-2xl font-black text-admin-foreground">
                {isLoading ? (
                  <span className="inline-block h-7 w-12 rounded skeleton-shimmer align-middle" />
                ) : (
                  stats.pending
                )}
              </h3>
            </div>
          </div>

          {/* Total Records */}
          <div className="bg-admin-surface border border-admin-border rounded-2xl p-5 flex flex-col justify-between shadow-xs">
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 bg-admin-surface-elevated rounded-xl flex items-center justify-center text-admin-muted">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-admin-muted uppercase tracking-wider mb-0.5">Total Directory</p>
              <h3 className="text-2xl font-black text-admin-foreground">
                {isLoading ? (
                  <span className="inline-block h-7 w-12 rounded skeleton-shimmer align-middle" />
                ) : (
                  stats.total
                )}
              </h3>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex-1 flex flex-col min-h-0 h-full space-y-4">
        {/* Tenants Data Table */}
        {!isLoading && filteredTenants.length === 0 && statusFilter === 'All' ? (
          <div className="py-20 px-6 text-center bg-admin-surface rounded-2xl border border-admin-border shadow-xs flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-14 h-14 bg-admin-surface-subtle rounded-full flex items-center justify-center mx-auto mb-4 text-admin-muted border border-admin-border">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-admin-foreground mb-1">No tenants found</h3>
            <p className="text-xs text-admin-muted max-w-sm mx-auto mb-5 font-medium">
              Get started by creating your first tenancy and registering residents to a property.
            </p>
            <Button onClick={handleStartTenancySetup} className="font-bold">
              <Plus className="w-4 h-4 mr-1.5" /> Setup First Tenancy
            </Button>
          </div>
        ) : viewMode === 'table' ? (
          <ListPageGrid>
            <AdminDataGrid
              rowData={filteredTenants}
              columnDefs={agGridColumns}
              loading={isLoading}
              labelSingular="tenant"
              labelPlural="tenants"
              onRowClick={(row) => router.push(`/dashboard/people/${row.id}`)}
              getRowId={(p) => p.data.id}
              enableColumnChooser
              enableExport
              exportFilename="tenants-export"
              searchPlaceholder="Search tenants..."
              onDeleteSelected={handleBulkDeleteTenants}
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
                      <div className="h-2.5 rounded skeleton-shimmer w-36" />
                    </div>
                  </div>
                  <div className="h-5 w-14 rounded skeleton-shimmer" />
                </div>
                <div className="h-px w-full bg-admin-border/60" />
                <div className="space-y-2 py-1">
                  <div className="h-3 rounded skeleton-shimmer w-32" />
                  <div className="h-3 rounded skeleton-shimmer w-24" />
                </div>
                <div className="h-px w-full bg-admin-border/60" />
                <div className="flex items-center justify-between pt-1">
                  <div className="h-3 rounded skeleton-shimmer w-12" />
                  <div className="h-3 rounded skeleton-shimmer w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <HoverCardGrid className="overflow-y-auto flex-1 p-1">
            {filteredTenants.map((t) => {
              const activeLease = t.lease_tenants?.find((lt) => lt.lease?.status === 'active')?.lease;
              const leaseStatus = activeLease ? 'Active' : t.lease_tenants?.length ? 'Past' : t.status === 'pending' ? 'Pending' : 'No Lease';

              return (
                <HoverEffectCardItem
                  key={t.id}
                  onClick={() => router.push(`/dashboard/people/${t.id}`)}
                  className="cursor-pointer group/card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        seed={t.id}
                        name={`${t.first_name || ''} ${t.last_name || ''}`.trim()}
                        size="md"
                        decorative
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-admin-foreground leading-tight truncate group-hover/card:text-admin-primary transition-colors">
                          {t.first_name} {t.last_name}
                        </h4>
                        <p className="text-xs text-admin-muted mt-0.5 truncate">{t.email || 'No email'}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider shrink-0',
                        leaseStatus === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-admin-surface-subtle text-admin-muted border border-admin-border'
                      )}
                    >
                      {leaseStatus}
                    </span>
                  </div>

                  <div className="space-y-2 p-3 rounded-xl bg-admin-surface-subtle/50 border border-admin-border/50 text-xs text-admin-muted my-1">
                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-admin-primary shrink-0" />
                      <span className="font-semibold text-admin-foreground truncate">
                        {t.property?.name || t.property?.address_line_1 || 'Unassigned Property'}
                      </span>
                    </div>
                    {t.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-admin-muted shrink-0" />
                        <span className="truncate">{t.phone}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-admin-muted/60 italic">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>No phone recorded</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-admin-border/50">
                    <span className="text-xs font-bold text-admin-primary group-hover/card:underline inline-flex items-center gap-1">
                      View Profile <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTenantForEdit(t);
                        setIsEditDrawerOpen(true);
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

      {/* Property Select Modal for Tenancy Setup */}
      {isPropertySelectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsPropertySelectModalOpen(false)} />
          <div className="relative w-full max-w-md bg-admin-surface border border-admin-border rounded-2xl p-6 shadow-2xl z-10 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-admin-foreground">Select Property</h3>
                <p className="text-xs text-admin-muted mt-0.5">Choose a property to set up tenancy for.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPropertySelectModalOpen(false)}
                className="p-1 text-admin-muted hover:text-admin-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {properties.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedPropertyForSetup(p);
                    setIsPropertySelectModalOpen(false);
                    setIsSetupWizardOpen(true);
                  }}
                  className="p-3 rounded-xl border border-admin-border hover:border-admin-primary hover:bg-admin-primary/5 cursor-pointer transition-all"
                >
                  <div className="text-sm font-bold text-admin-foreground">{p.name || p.address_line_1}</div>
                  <div className="text-xs text-admin-muted">{p.city || p.address_line_1}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tenancy Setup Wizard Modal */}
      {isSetupWizardOpen && selectedPropertyForSetup && (
        <TenancySetupWizard
          isOpen={true}
          propertyId={selectedPropertyForSetup.id}
          propertyName={selectedPropertyForSetup.name}
          propertyAddress={selectedPropertyForSetup.address_line_1}
          defaultRentAmount={selectedPropertyForSetup.rent_amount || 0}
          onClose={() => {
            setIsSetupWizardOpen(false);
            setSelectedPropertyForSetup(null);
          }}
          onSuccess={() => {
            setIsSetupWizardOpen(false);
            setSelectedPropertyForSetup(null);
            loadData();
          }}
        />
      )}

      {/* Edit Tenant Drawer */}
      {isEditDrawerOpen && selectedTenantForEdit && (
        <TenantDrawer
          isOpen={true}
          tenant={selectedTenantForEdit}
          propertyId={selectedTenantForEdit.property_id}
          onClose={() => {
            setIsEditDrawerOpen(false);
            setSelectedTenantForEdit(null);
          }}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </ListPage>
  );
}
