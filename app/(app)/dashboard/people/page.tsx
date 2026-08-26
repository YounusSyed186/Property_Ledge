'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EntityListPage } from '@/components/dashboard/EntityListPage';
import { CompactKpiCard } from '@/components/workspace';
import { createEntityDrawer } from '@/components/dashboard/entities/createEntityDrawer';
import { tenantFields, tenantColumns } from '@/components/dashboard/entities/config';
import { usePropertyContext } from '@/components/property/PropertyContext';
import {
  fetchDashboardTenants,
  handleCreateTenant,
  handleUpdateTenant,
  handleDeleteTenant,
} from '@/app/actions/dashboard';

const TenantDrawer = createEntityDrawer('Tenant', tenantFields, {
  onCreate: handleCreateTenant,
  onUpdate: handleUpdateTenant,
  onDelete: handleDeleteTenant,
}, { status: 'active' });

export default function PeoplePage() {
  const router = useRouter();
  const { selectedProperty } = usePropertyContext();
  const [rows, setRows] = useState<Array<{ id: string; status?: string }>>([]);

  useEffect(() => {
    if (!selectedProperty) return;
    fetchDashboardTenants(selectedProperty.propertyId).then(setRows);
  }, [selectedProperty?.propertyId]);

  const activeCount = rows.filter((r) => r.status === 'active').length;
  const prospectCount = rows.filter((r) => r.status === 'prospect').length;
  const inactiveCount = rows.filter((r) => r.status === 'inactive').length;

  return (
    <EntityListPage
      title="Tenants"
      description="Manage tenants and lease relationships."
      entityLabel="tenant"
      entityLabelPlural="tenants"
      fetchAction={fetchDashboardTenants}
      columnDefs={tenantColumns}
      DrawerComponent={TenantDrawer}
      summary={
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CompactKpiCard label="Total Tenants" value={rows.length} />
          <CompactKpiCard label="Active" value={activeCount} />
          <CompactKpiCard label="Prospects" value={prospectCount} />
          <CompactKpiCard label="Inactive" value={inactiveCount} />
        </div>
      }
      onRowClick={(row) => router.push(`/dashboard/people/${row.id}`)}
    />
  );
}
