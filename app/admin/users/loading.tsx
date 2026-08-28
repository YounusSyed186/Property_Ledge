import React from 'react';
import { TableSkeleton } from '@/components/ui/skeletons';

export default function AdminUsersLoading() {
  return <TableSkeleton rows={12} />;
}
