import React from 'react';
import { getAdminPlatformRolesWithStats } from '@/lib/admin/queries';
import { AdminPlatformRolesPageView } from '@/components/admin/views/AdminPlatformRolesPageView';

export const revalidate = 0;

export default async function AdminPlatformRolesPage() {
  const roles = await getAdminPlatformRolesWithStats();
  return <AdminPlatformRolesPageView roles={roles} />;
}
