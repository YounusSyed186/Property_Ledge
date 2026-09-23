import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { container } from '@/composition';
import { DashboardOverview } from '@/components/dashboard/overview/DashboardOverview';
import { getSetupProgress } from '@/lib/dashboard/setupProgress';
import { fetchDashboardDataAction } from '@/app/actions/dashboard';

export const metadata: Metadata = {
  title: 'Dashboard | PropertyLedge',
  description: 'Property management dashboard overview',
};

export default async function DashboardPage() {
  const authService = await container.resolve('authService');
  const userRes = await authService.getCurrentUser();
  const user = userRes.success ? userRes.data : null;
  if (!user) redirect('/login');

  const [profileRes, setupProgress, dashboardData] = await Promise.all([
    authService.getUserProfile(user.id),
    getSetupProgress(user.id),
    fetchDashboardDataAction().catch(() => null),
  ]);

  const profile = profileRes.success ? profileRes.data : null;
  const userName = profile?.fullName || user.fullName || 'User';

  return (
    <DashboardOverview
      userName={userName}
      setupProgress={setupProgress}
      initialDashboardData={dashboardData}
    />
  );
}
