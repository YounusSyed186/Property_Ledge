import React from 'react';
import { getAdminPlans } from '@/lib/admin/queries';
import { updateAdminPlan } from '@/lib/admin/service';
import { revalidatePath } from 'next/cache';
import { PageContainer } from '@/components/admin/ui';
import { AdminPlansPageView } from '@/components/admin/views/AdminPlansPageView';

export const revalidate = 0;

export default async function AdminPlansPage() {
  const plans = await getAdminPlans();

  async function handleToggleStatus(planId: string, currentStatus: string) {
    'use server';
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await updateAdminPlan(planId, { status: newStatus as 'active' | 'inactive' });
    revalidatePath('/admin/plans');
  }

  return (
    <PageContainer>
      <AdminPlansPageView plans={plans} onToggleStatus={handleToggleStatus} />
    </PageContainer>
  );
}
