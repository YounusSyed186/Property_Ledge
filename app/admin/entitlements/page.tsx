import React from 'react';
import { getAdminEntitlementsWithUsage } from '@/lib/admin/queries';
import { AdminEntitlementsPageView } from '@/components/admin/views/AdminEntitlementsPageView';

export const revalidate = 0;

export default async function AdminEntitlementsPage() {
  const entitlements = await getAdminEntitlementsWithUsage();

  return <AdminEntitlementsPageView entitlements={entitlements} />;
}
