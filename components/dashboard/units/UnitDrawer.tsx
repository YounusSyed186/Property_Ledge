'use client';

import { createEntityDrawer } from '@/components/dashboard/entities/createEntityDrawer';
import { unitFields } from '@/components/dashboard/entities/config';
import {
  handleCreateUnit,
  handleUpdateUnit,
  handleDeleteUnit,
} from '@/app/actions/dashboard';

export const UnitDrawer = createEntityDrawer(
  'Unit',
  unitFields,
  {
    onCreate: handleCreateUnit,
    onUpdate: handleUpdateUnit,
    onDelete: handleDeleteUnit,
  },
  { status: 'vacant' }
);
