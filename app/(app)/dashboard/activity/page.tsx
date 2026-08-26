'use client';

import React, { useState, useEffect } from 'react';
import { ColDef } from 'ag-grid-community';
import { PageContainer } from '@/components/admin/ui';
import { AdminDataGrid } from '@/components/admin/data-grid';
import { PropertyRequired } from '@/components/dashboard/PropertyRequired';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { fetchDashboardActivity } from '@/app/actions/dashboard';
import { humanizeActivityLog } from '@/lib/activity/formatActivity';

const columns: ColDef[] = [
  { field: 'created_at', headerName: 'Time', width: 160, cellRenderer: 'dateCell' },
  { field: 'message', headerName: 'Activity', flex: 1, minWidth: 280 },
  { field: 'entity_type', headerName: 'Entity', width: 120 },
];

export default function ActivityPage() {
  const { selectedProperty } = usePropertyContext();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!selectedProperty) return;
    setIsLoading(true);
    fetchDashboardActivity(selectedProperty.propertyId)
      .then((rows) =>
        setRows(
          rows.map((row) => {
            const humanized = humanizeActivityLog(row as Parameters<typeof humanizeActivityLog>[0]);
            return { ...row, message: humanized.message };
          })
        )
      )
      .finally(() => setIsLoading(false));
  }, [selectedProperty?.propertyId]);

  return (
    <PropertyRequired>
      <PageContainer className="h-full flex flex-col">
        <div className="mb-4 shrink-0">
          <h2 className="workspace-page-title">Activity Log</h2>
          <p className="text-caption text-admin-muted">Recent activity for {selectedProperty?.propertyName}</p>
        </div>
        <div className="flex-1 min-h-0">
          <AdminDataGrid
            rowData={rows}
            columnDefs={columns}
            loading={isLoading}
            labelSingular="entry"
            labelPlural="entries"
            searchPlaceholder="Search activity..."
            getRowId={(params) => String(params.data.id)}
          />
        </div>
      </PageContainer>
    </PropertyRequired>
  );
}
