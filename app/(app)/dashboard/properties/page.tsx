'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Building2, Home, CheckCircle, X } from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, useToast } from '@/components/admin/ui';
import { AdminDataGrid } from '@/components/admin/data-grid';
import { EntityDrawer } from '@/components/dashboard/EntityDrawer';
import { PropertyCreationWizard } from '@/components/dashboard/properties/PropertyCreationWizard';
import { propertyFields, propertyColumns } from '@/components/dashboard/entities/config';
import { ListPage, CompactKpiCard, ListPageGrid } from '@/components/workspace';
import {
  fetchDashboardProperties,
  handleCreateProperty,
  handleUpdateProperty,
  handleDeleteProperty,
} from '@/app/actions/dashboard';

export default function PropertiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error: showError } = useToast();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

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

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDashboardProperties();
      setRows(data);
    } catch {
      showError('Load failed', 'Could not load properties.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalUnits = rows.reduce((sum, r) => sum + Number(r.units_count ?? 0), 0);
  const activeCount = rows.filter((r) => r.status === 'active').length;

  const columns = useMemo<ColDef[]>(
    () => [
      ...propertyColumns,
      {
        headerName: 'Actions',
        field: 'actions',
        width: 90,
        minWidth: 80,
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
            className="text-[12px] font-semibold text-[#008F83] hover:underline"
          >
            Edit
          </button>
        ),
      },
    ],
    []
  );

  return (
    <ListPage
      title="Properties"
      description="Manage your property portfolio with full V1 data parity."
      summary={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CompactKpiCard label="Properties" value={rows.length} icon={Building2} accent="blue" />
          <CompactKpiCard label="Total Units" value={totalUnits} icon={Home} accent="indigo" />
          <CompactKpiCard label="Active" value={activeCount} icon={CheckCircle} accent="teal" />
        </div>
      }
      actions={
        <Button
          size="sm"
          onClick={() => setIsWizardOpen(true)}
          className="bg-[#008F83] hover:bg-[#007a70] text-white"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Property
        </Button>
      }
    >
      <ListPageGrid>
        <AdminDataGrid
          rowData={rows}
          columnDefs={columns}
          loading={isLoading}
          labelSingular="property"
          labelPlural="properties"
          searchPlaceholder="Search properties..."
          onRowClick={(row) => router.push(`/dashboard/properties/${row.id}`)}
          getRowId={(params) => String(params.data.id)}
        />
      </ListPageGrid>

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
                className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <PropertyCreationWizard
                onCancel={closeWizard}
                onSuccess={() => {
                  closeWizard();
                  loadData();
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Property Drawer */}
      <EntityDrawer
        title="Property"
        fields={propertyFields}
        entity={selected as { id: string } | null}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={() => {
          setIsDrawerOpen(false);
          loadData();
        }}
        propertyId={String(selected?.id || '')}
        isCreate={false}
        defaultValues={{ country: 'Australia', status: 'active' } as Record<string, unknown>}
        onCreate={async (_propertyId, data) => {
          const { fetchUserWorkspaces } = await import('@/app/actions/dashboard');
          const workspaces = (await fetchUserWorkspaces()) as { id: string; name: string }[];
          const workspaceId = workspaces[0]?.id;
          if (!workspaceId) throw new Error('No workspace found. Please contact support.');
          return handleCreateProperty({ ...data, workspace_id: workspaceId, status: 'active' } as never);
        }}
        onUpdate={async (_propertyId, id, data) => handleUpdateProperty(id, data as never)}
        onDelete={async (_propertyId, id) => handleDeleteProperty(id)}
      />
    </ListPage>
  );
}
