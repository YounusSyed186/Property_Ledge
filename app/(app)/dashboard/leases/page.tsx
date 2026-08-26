'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { EntityListPage } from '@/components/dashboard/EntityListPage';
import { CompactKpiCard } from '@/components/workspace';
import { createEntityDrawer } from '@/components/dashboard/entities/createEntityDrawer';
import { leaseFields, leaseColumns } from '@/components/dashboard/entities/config';
import { CreateLeaseWizard } from '@/components/dashboard/workflows/CreateLeaseWizard';
import { usePropertyContext } from '@/components/property/PropertyContext';
import {
  fetchDashboardLeases,
  handleUpdateLease,
  handleDeleteLease,
} from '@/app/actions/dashboard';

const LeaseEditDrawer = createEntityDrawer(
  'Lease',
  leaseFields,
  {
    onCreate: async () => ({ success: false }),
    onUpdate: handleUpdateLease,
    onDelete: handleDeleteLease,
  },
  { status: 'draft', rent_frequency: 'monthly', payment_due_day: 1 }
);

export default function LeasesPage() {
  const router = useRouter();
  const { selectedProperty } = usePropertyContext();
  const [rows, setRows] = useState<Array<{ id: string; status?: string; end_date?: string }>>([]);

  useEffect(() => {
    if (!selectedProperty) return;
    fetchDashboardLeases(selectedProperty.propertyId).then(setRows);
  }, [selectedProperty?.propertyId]);

  const activeCount = rows.filter((r) => r.status === 'active').length;
  const expiringSoon = rows.filter((r) => {
    if (!r.end_date || r.status !== 'active') return false;
    const days = Math.ceil((new Date(r.end_date).getTime() - Date.now()) / 86400000);
    return days > 0 && days <= 60;
  }).length;

  return (
    <EntityListPage
      title="Leases"
      description="Manage lease agreements and renewals."
      entityLabel="lease"
      entityLabelPlural="leases"
      fetchAction={fetchDashboardLeases}
      columnDefs={leaseColumns}
      DrawerComponent={LeaseEditDrawer}
      summary={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CompactKpiCard label="Total Leases" value={rows.length} />
          <CompactKpiCard label="Active" value={activeCount} />
          <CompactKpiCard label="Expiring Soon" value={expiringSoon} />
          <CompactKpiCard label="Property" value={selectedProperty?.propertyName || '—'} />
        </div>
      }
      onRowClick={(row) => router.push(`/dashboard/leases/${row.id}`)}
      renderCreateModal={({ isOpen, onClose, onSuccess }) => (
        <CreateLeaseWizard
          isOpen={isOpen}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
    />
  );
}
