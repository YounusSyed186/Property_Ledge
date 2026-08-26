'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import { Button, useToast } from '@/components/admin/ui';
import { AdminDataGrid } from '@/components/admin/data-grid';
import { PropertyRequired } from '@/components/dashboard/PropertyRequired';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { ListPage, ListPageGrid } from '@/components/workspace';

interface EntityListPageProps<T = Record<string, unknown>> {
  title: string;
  description?: string;
  entityLabel: string;
  entityLabelPlural: string;
  fetchAction: (propertyId: string) => Promise<T[]>;
  columnDefs: ColDef[];
  breadcrumb?: { label: string; href?: string }[];
  summary?: React.ReactNode;
  DrawerComponent: React.ComponentType<{
    entity: T | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    propertyId: string;
    isCreate?: boolean;
  }>;
  onRowClick?: (entity: T) => void;
  clientFilter?: (row: T) => boolean;
  renderCreateModal?: (ctx: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }) => React.ReactNode;
}

export function EntityListPage<T extends { id: string }>({
  title,
  description,
  entityLabel,
  entityLabelPlural,
  fetchAction,
  columnDefs,
  breadcrumb,
  summary,
  DrawerComponent,
  onRowClick,
  clientFilter,
  renderCreateModal,
}: EntityListPageProps<T>) {
  const { selectedProperty } = usePropertyContext();
  const { error: showError } = useToast();
  const [rows, setRows] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<T | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreate, setIsCreate] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadData = async () => {
    if (!selectedProperty) return;
    setIsLoading(true);
    try {
      const data = await fetchAction(selectedProperty.propertyId);
      setRows(data);
    } catch (err) {
      console.error(`Failed to load ${entityLabelPlural}:`, err);
      showError('Load failed', `Could not load ${entityLabelPlural}.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProperty?.propertyId]);

  const handleOpenCreate = () => {
    if (renderCreateModal) {
      setIsCreateModalOpen(true);
      return;
    }
    setSelectedEntity(null);
    setIsCreate(true);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (entity: T) => {
    setSelectedEntity(entity);
    setIsCreate(false);
    setIsDrawerOpen(true);
  };

  const displayRows = useMemo(
    () => (clientFilter ? rows.filter(clientFilter) : rows),
    [rows, clientFilter]
  );

  const pageDescription =
    description ??
    (selectedProperty
      ? `${selectedProperty.propertyName} — ${displayRows.length} ${displayRows.length === 1 ? entityLabel : entityLabelPlural}`
      : undefined);

  const columns = useMemo<ColDef[]>(
    () => [
      ...columnDefs,
      {
        headerName: '',
        field: 'actions',
        width: 80,
        sortable: false,
        filter: false,
        cellRenderer: (params: { data: T }) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(params.data);
            }}
            className="text-[11px] text-admin-primary hover:underline"
          >
            Edit
          </button>
        ),
      },
    ],
    [columnDefs]
  );

  return (
    <PropertyRequired>
      <>
        <ListPage
          title={title}
          description={pageDescription}
          breadcrumb={breadcrumb}
          summary={summary}
          actions={
            <Button onClick={handleOpenCreate} size="sm">
              <Plus className="w-3 h-3 mr-1" />
              Add {entityLabel}
            </Button>
          }
        >
          <ListPageGrid>
            <AdminDataGrid
              rowData={displayRows}
              columnDefs={columns}
              loading={isLoading}
              labelSingular={entityLabel}
              labelPlural={entityLabelPlural}
              searchPlaceholder={`Search ${entityLabelPlural}...`}
              onRowClick={(row) => {
                if (onRowClick) {
                  onRowClick(row);
                } else {
                  handleOpenEdit(row);
                }
              }}
              getRowId={(params) => params.data.id}
            />
          </ListPageGrid>
        </ListPage>

        {selectedProperty && (
          <DrawerComponent
            entity={selectedEntity}
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            onSuccess={() => {
              setIsDrawerOpen(false);
              loadData();
            }}
            propertyId={selectedProperty.propertyId}
            isCreate={isCreate}
          />
        )}

        {renderCreateModal?.({
          isOpen: isCreateModalOpen,
          onClose: () => setIsCreateModalOpen(false),
          onSuccess: () => {
            setIsCreateModalOpen(false);
            loadData();
          },
        })}
      </>
    </PropertyRequired>
  );
}
