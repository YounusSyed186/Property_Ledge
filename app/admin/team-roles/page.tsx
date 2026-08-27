import React from 'react';
import { getAdminSystemTeamRolesWithStats } from '@/lib/admin/queries';
import { AdminSystemTeamRolesPageView } from '@/components/admin/views/AdminSystemTeamRolesPageView';

export const revalidate = 0;

export default async function AdminTeamRolesPage() {
  const roles = await getAdminSystemTeamRolesWithStats();
  return <AdminSystemTeamRolesPageView roles={roles} />;
}
