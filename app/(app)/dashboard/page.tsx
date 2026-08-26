import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/auth/queries';
import { DashboardOverview } from '@/components/dashboard/overview/DashboardOverview';
import { getSetupProgress } from '@/lib/dashboard/setupProgress';

export const metadata: Metadata = {
  title: 'Dashboard | PropertyLedge',
  description: 'Property management dashboard overview',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const profile = await getUserProfile(user.id);
  const userName = (profile as { full_name?: string })?.full_name || user.user_metadata?.full_name || 'User';
  const setupProgress = await getSetupProgress(user.id);

  return <DashboardOverview userName={userName} setupProgress={setupProgress} />;
}
