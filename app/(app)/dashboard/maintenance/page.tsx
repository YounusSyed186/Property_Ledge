'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EntityListPage } from '@/components/dashboard/EntityListPage';
import { CompactKpiCard, HubTabs } from '@/components/workspace';
import { createEntityDrawer } from '@/components/dashboard/entities/createEntityDrawer';
import { maintenanceFields, maintenanceColumns } from '@/components/dashboard/entities/config';
import { usePropertyContext } from '@/components/property/PropertyContext';
import {
  fetchDashboardMaintenance,
  handleCreateMaintenance,
  handleUpdateMaintenance,
  handleDeleteMaintenance,
} from '@/app/actions/dashboard';

const MaintenanceDrawer = createEntityDrawer('Maintenance Request', maintenanceFields, {
  onCreate: handleCreateMaintenance,
  onUpdate: handleUpdateMaintenance,
  onDelete: handleDeleteMaintenance,
}, { status: 'open', priority: 'medium' });

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
];

export default function MaintenancePage() {
  const router = useRouter();
  const { selectedProperty } = usePropertyContext();
  const [statusTab, setStatusTab] = useState('all');
  const [rows, setRows] = useState<Array<{ id: string; status?: string }>>([]);

  useEffect(() => {
    if (!selectedProperty) return;
    fetchDashboardMaintenance(selectedProperty.propertyId).then(setRows);
  }, [selectedProperty?.propertyId]);

  const openCount = rows.filter((r) => r.status === 'open').length;
  const inProgressCount = rows.filter((r) => r.status === 'in_progress').length;
  const completedCount = rows.filter((r) => r.status === 'completed').length;

  return (
    <EntityListPage
      title="Maintenance"
      description="Track and resolve property maintenance requests."
      entityLabel="request"
      entityLabelPlural="requests"
      fetchAction={fetchDashboardMaintenance}
      columnDefs={maintenanceColumns}
      DrawerComponent={MaintenanceDrawer}
      clientFilter={(row) => statusTab === 'all' || String((row as { status?: string }).status) === statusTab}
      summary={
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <CompactKpiCard label="Total" value={rows.length} />
            <CompactKpiCard label="Open" value={openCount} />
            <CompactKpiCard label="In Progress" value={inProgressCount} />
            <CompactKpiCard label="Completed" value={completedCount} />
          </div>
          <HubTabs tabs={STATUS_TABS} value={statusTab} onChange={setStatusTab} />
        </div>
      }
      onRowClick={(row) => router.push(`/dashboard/maintenance/${row.id}`)}
    />
  );
}
