'use client';

import { EntityListPage } from '@/components/dashboard/EntityListPage';
import { unitColumns } from '@/components/dashboard/entities/config';
import { UnitDrawer } from '@/components/dashboard/units/UnitDrawer';
import { fetchDashboardUnits } from '@/app/actions/dashboard';

export default function UnitsPage() {
  return (
    <EntityListPage
      title="Units"
      entityLabel="unit"
      entityLabelPlural="units"
      fetchAction={fetchDashboardUnits}
      columnDefs={unitColumns}
      DrawerComponent={UnitDrawer}
    />
  );
}
