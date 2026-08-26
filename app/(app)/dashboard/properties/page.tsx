'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Building2, Home, CheckCircle } from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import { Button, useToast } from '@/components/admin/ui';
import { AdminDataGrid } from '@/components/admin/data-grid';
import { EntityDrawer } from '@/components/dashboard/EntityDrawer';
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
  const { error: showError } = useToast();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreate, setIsCreate] = useState(false);

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
        headerName: '',
        field: 'actions',
        width: 80,
        sortable: false,
        filter: false,
        cellRenderer: (params: { data: Record<string, unknown> }) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelected(params.data);
              setIsCreate(false);
              setIsDrawerOpen(true);
            }}
            className="text-[11px] text-admin-primary hover:underline"
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
      description="Manage your property portfolio."
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
          onClick={() => {
            setSelected(null);
            setIsCreate(true);
            setIsDrawerOpen(true);
          }}
        >
          <Plus className="w-3 h-3 mr-1" />
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
        isCreate={isCreate}
        defaultValues={{ country: 'Australia', status: 'active' } as Record<string, unknown>}
        onCreate={async (_propertyId, data) => {
          const { fetchUserWorkspaces } = await import('@/app/actions/dashboard');
          const workspaces = await fetchUserWorkspaces() as { id: string; name: string }[];
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
