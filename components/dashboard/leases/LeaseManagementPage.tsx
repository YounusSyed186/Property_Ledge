'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Building,
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ColDef } from 'ag-grid-community';
import { Button, useToast, ConfirmDialog } from '@/components/admin/ui';
import { AdminDataGrid, QuickFilterBar, QuickFilterOption } from '@/components/admin/data-grid';
import { ListPage, ListPageGrid } from '@/components/workspace';
import {
  fetchAllWorkspaceLeases,
  fetchDashboardProperties,
  handleUpdateLeaseStatus,
  handleConvertToPeriodic,
  handleDeleteLease,
} from '@/app/actions/dashboard';
import { CreateLeaseWizard } from '@/components/dashboard/workflows/CreateLeaseWizard';
import { LeaseEditDrawer } from '@/components/dashboard/leases/LeaseEditDrawer';
import { cn } from '@/lib/utils';

type LeaseRecord = {
  id: string;
  property_id: string;
  start_date: string;
  end_date: string | null;
  rent_amount: number;
  rent_frequency: string;
  security_deposit: number;
  payment_due_day: number;
  status: string;
  notes: string | null;
  property?: {
    id: string;
    name: string;
    address_line_1: string;
    city: string;
    suburb?: string;
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
    } | null;
  }>;
};

export function LeaseManagementPage() {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();

  const [leases, setLeases] = useState<LeaseRecord[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Pending' | 'Expired'>('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Create / Renew Wizard state
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [wizardInitialData, setWizardInitialData] = useState<any>(null);

  // Edit Drawer state
  const [selectedLeaseForEdit, setSelectedLeaseForEdit] = useState<LeaseRecord | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  const filterOptions = useMemo<QuickFilterOption[]>(
    () => [
      { label: 'All', value: 'All' },
      { label: 'Active', value: 'Active' },
      { label: 'Pending', value: 'Pending' },
      { label: 'Expired', value: 'Expired' },
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
        minWidth: 200,
        valueGetter: (p) => {
          const prop = p.data?.property;
          if (!prop) return 'Unassigned';
          return `${prop.name || prop.address_line_1}${prop.city ? `, ${prop.city}` : ''}`;
        },
      },
      {
        headerName: 'Tenants',
        flex: 1.2,
        minWidth: 160,
        valueGetter: (p) => {
          const tenants = p.data?.lease_tenants || [];
          if (tenants.length === 0) return 'No tenants';
          return tenants
            .map((lt: any) => `${lt.tenant?.first_name || ''} ${lt.tenant?.last_name || ''}`.trim())
            .filter(Boolean)
            .join(', ');
        },
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
        field: 'rent_amount',
        headerName: 'Rent Amount',
        width: 130,
        cellRenderer: 'currencyCell',
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        cellRenderer: 'statusCell',
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
                setSelectedLeaseForEdit(params.data);
                setIsEditDrawerOpen(true);
              }}
              className="p-1 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-500/10 rounded transition-colors inline-flex items-center gap-1 font-bold text-xs"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          );
        }
      },
    ],
    []
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [leasesData, propertiesData] = await Promise.all([
        fetchAllWorkspaceLeases(),
        fetchDashboardProperties(),
      ]);
      setLeases(leasesData as unknown as LeaseRecord[]);
      setProperties(propertiesData);
    } catch (err: any) {
      console.error('Error loading leases:', err);
      showError('Failed to load leases', err.message || 'Could not fetch lease agreements.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLeases = useMemo(() => {
    return leases.filter((l) => {
      if (statusFilter === 'All') return true;
      if (statusFilter === 'Active') return l.status === 'active';
      if (statusFilter === 'Pending') return l.status === 'pending';
      if (statusFilter === 'Expired') {
        const isExpired = l.status === 'expired' || (l.end_date && new Date(l.end_date) < new Date());
        return isExpired;
      }
      return true;
    });
  }, [leases, statusFilter]);

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

  const handleRenewLease = (lease: LeaseRecord) => {
    setWizardInitialData({
      property_id: lease.property_id,
      rent_amount: lease.rent_amount,
      security_deposit: lease.security_deposit,
      payment_due_day: lease.payment_due_day,
      rent_frequency: lease.rent_frequency,
      isRenewal: true,
      previousLeaseId: lease.id,
      tenants: (lease.lease_tenants || []).map((lt) => lt.tenant),
    });
    setIsCreateWizardOpen(true);
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
    const active = leases.filter((l) => l.status === 'active').length;
    const periodic = leases.filter((l) => l.status === 'active' && !l.end_date).length;
    const expired = leases.filter((l) => l.status === 'expired' || (l.end_date && new Date(l.end_date) < new Date())).length;
    const totalRent = leases
      .filter((l) => l.status === 'active')
      .reduce((sum, l) => sum + (Number(l.rent_amount) || 0), 0);

    return { total: leases.length, active, periodic, expired, totalRent };
  }, [leases]);

  return (
    <ListPage
      title="Leases"
      description="Manage active tenancy contracts, renewal terms, and rental schedules across your properties."
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
              setWizardInitialData(null);
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
              <h3 className="text-2xl font-black text-admin-foreground">{stats.active}</h3>
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
              <h3 className="text-2xl font-black text-admin-foreground">{stats.periodic}</h3>
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
              <h3 className="text-2xl font-black text-admin-foreground">{stats.expired}</h3>
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
                ${stats.totalRent.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex-1 flex flex-col min-h-0 h-full space-y-4">
        {/* Leases Data Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24 bg-admin-surface rounded-2xl border border-admin-border flex-1 min-h-[300px]">
            <div className="w-8 h-8 border-3 border-admin-primary/20 border-t-admin-primary rounded-full animate-spin" />
          </div>
        ) : filteredLeases.length === 0 && statusFilter === 'All' ? (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 overflow-y-auto flex-1 p-1">
            {filteredLeases.map((lease) => {
              const timeRemaining = getLeaseTimeRemaining(lease.end_date, lease.status);
              const isExpiringSoonOrExpired =
                lease.status === 'expired' || (lease.end_date && new Date(lease.end_date) < new Date());

              return (
                <div
                  key={lease.id}
                  className="bg-admin-surface border border-admin-border rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-admin-primary/10 text-admin-primary flex items-center justify-center shrink-0 border border-admin-primary/20">
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-admin-foreground line-clamp-1">
                          {lease.property?.name || lease.property?.address_line_1 || 'Unassigned Property'}
                        </h4>
                        <p className="text-xs text-admin-muted">{lease.property?.city || lease.property?.suburb || 'Property'}</p>
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

                  <div className="h-px w-full bg-admin-border" />

                  <div className="space-y-3 flex-1 text-xs text-admin-muted">
                    <div>
                      <div className="text-[10px] font-bold text-admin-muted uppercase tracking-wider mb-1">Tenants</div>
                      <div className="space-y-1">
                        {lease.lease_tenants && lease.lease_tenants.length > 0 ? (
                          lease.lease_tenants.map((lt, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-xs text-admin-foreground font-semibold">
                              <User className="w-3.5 h-3.5 text-admin-muted" />
                              <span>{lt.tenant?.first_name} {lt.tenant?.last_name}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-admin-muted italic">No attached tenants</span>
                        )}
                      </div>
                    </div>

                    <div className="h-px w-full bg-admin-border" />

                    <div>
                      <div className="text-[10px] font-bold text-admin-muted uppercase tracking-wider mb-1">Lease Term</div>
                      <div className="flex items-center gap-2 text-admin-foreground font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-admin-muted" />
                        <span>
                          {new Date(lease.start_date).toLocaleDateString()} - {lease.end_date ? new Date(lease.end_date).toLocaleDateString() : 'Periodic'}
                        </span>
                      </div>
                      <div className={cn('text-[11px] font-bold mt-1 pl-5.5', isExpiringSoonOrExpired ? 'text-red-500' : 'text-admin-primary')}>
                        {timeRemaining}
                      </div>
                    </div>

                    <div className="h-px w-full bg-admin-border" />

                    <div>
                      <div className="text-[10px] font-bold text-admin-muted uppercase tracking-wider mb-1">Rent Structure</div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-admin-muted" />
                        <span className="text-admin-foreground font-bold">
                          ${Number(lease.rent_amount).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-admin-muted uppercase">/{lease.rent_frequency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px w-full bg-admin-border" />

                  <div className="flex items-center gap-1.5 pt-1">
                    {lease.status === 'active' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(lease, 'expired')}
                          className="text-xs px-2.5 py-1 font-bold text-red-600 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          Set Expired
                        </button>
                        {lease.end_date && (
                          <button
                            type="button"
                            onClick={() => handleConvertToPeriodicLease(lease)}
                            className="text-xs px-2.5 py-1 font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
                          >
                            Make Periodic
                          </button>
                        )}
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRenewLease(lease)}
                      className="text-xs px-2.5 py-1 font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
                    >
                      Renew
                    </button>

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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Renew Lease Wizard */}
      {isCreateWizardOpen && (
        <CreateLeaseWizard
          isOpen={true}
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
