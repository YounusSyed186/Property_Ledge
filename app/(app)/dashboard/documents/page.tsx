'use client';

import { useState, useEffect } from 'react';
import { EntityListPage } from '@/components/dashboard/EntityListPage';
import { CompactKpiCard } from '@/components/workspace';
import { createEntityDrawer } from '@/components/dashboard/entities/createEntityDrawer';
import { documentFields, documentColumns } from '@/components/dashboard/entities/config';
import { usePropertyContext } from '@/components/property/PropertyContext';
import {
  fetchDashboardDocuments,
  handleCreateDocument,
  handleUpdateDocument,
  handleDeleteDocument,
} from '@/app/actions/dashboard';

const DocumentDrawer = createEntityDrawer('Document', documentFields, {
  onCreate: handleCreateDocument,
  onUpdate: handleUpdateDocument,
  onDelete: handleDeleteDocument,
}, { document_type: 'other', mime_type: 'application/pdf', file_size: 0 });

export default function DocumentsPage() {
  const { selectedProperty } = usePropertyContext();
  const [rows, setRows] = useState<Array<{ id: string; document_type?: string }>>([]);

  useEffect(() => {
    if (!selectedProperty) return;
    fetchDashboardDocuments(selectedProperty.propertyId).then(setRows);
  }, [selectedProperty?.propertyId]);

  return (
    <EntityListPage
      title="Documents"
      description="Store and manage property documents."
      entityLabel="document"
      entityLabelPlural="documents"
      fetchAction={fetchDashboardDocuments}
      columnDefs={documentColumns}
      DrawerComponent={DocumentDrawer}
      summary={
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <CompactKpiCard label="Total Documents" value={rows.length} />
          <CompactKpiCard label="Property" value={selectedProperty?.propertyName || '—'} />
          <CompactKpiCard
            label="Types"
            value={new Set(rows.map((r) => r.document_type).filter(Boolean)).size}
          />
        </div>
      }
    />
  );
}
