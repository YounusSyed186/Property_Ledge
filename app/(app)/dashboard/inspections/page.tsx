'use client';

import { useRouter } from 'next/navigation';
import { EntityListPage } from '@/components/dashboard/EntityListPage';
import { createEntityDrawer } from '@/components/dashboard/entities/createEntityDrawer';
import { inspectionFields, inspectionColumns } from '@/components/dashboard/entities/config';
import {
  fetchDashboardInspections,
  handleCreateInspection,
  handleUpdateInspection,
  handleDeleteInspection,
} from '@/app/actions/dashboard';

const InspectionDrawer = createEntityDrawer('Inspection', inspectionFields, {
  onCreate: handleCreateInspection,
  onUpdate: handleUpdateInspection,
  onDelete: handleDeleteInspection,
}, { status: 'scheduled', inspection_type: 'routine' });

export default function InspectionsPage() {
  const router = useRouter();
  return (
    <EntityListPage
      title="Inspections"
      description="Schedule and track property inspections."
      entityLabel="inspection"
      entityLabelPlural="inspections"
      fetchAction={fetchDashboardInspections}
      columnDefs={inspectionColumns}
      DrawerComponent={InspectionDrawer}
      onRowClick={(row) => router.push(`/dashboard/inspections/${row.id}`)}
    />
  );
}
