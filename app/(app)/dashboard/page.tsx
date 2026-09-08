import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { container } from '@/composition';
import { DashboardOverview } from '@/components/dashboard/overview/DashboardOverview';
import { getSetupProgress } from '@/lib/dashboard/setupProgress';

export const metadata: Metadata = {
  title: 'Dashboard | PropertyLedge',
  description: 'Property management dashboard overview',
};

export default async function DashboardPage() {
  const authService = await container.resolve('authService');
  const userRes = await authService.getCurrentUser();
  const user = userRes.success ? userRes.data : null;
  if (!user) redirect('/login');

  const profileRes = await authService.getUserProfile(user.id);
  const profile = profileRes.success ? profileRes.data : null;
  const userName = profile?.fullName || user.fullName || 'User';
  const setupProgress = await getSetupProgress(user.id);

  return <DashboardOverview userName={userName} setupProgress={setupProgress} />;
}
