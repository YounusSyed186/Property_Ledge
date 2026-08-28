import React from 'react';
import { TableSkeleton } from '@/components/ui/skeletons';

export default function PropertiesLoading() {
  return <TableSkeleton rows={10} />;
}
