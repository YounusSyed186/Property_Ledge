'use client';

import React, { useCallback, useState } from 'react';
import { AdminPlansGridView } from '@/components/admin/data-grid/views/AdminPlansGridView';
import { CreatePlanDrawer } from '@/components/admin/CreatePlanDrawer';
import { fetchAdminPlans } from '@/app/actions/admin';

interface AdminPlansPageViewProps {
  plans: any[];
  onToggleStatus: (planId: string, currentStatus: string) => Promise<void>;
}

export function AdminPlansPageView({ plans: initialPlans, onToggleStatus }: AdminPlansPageViewProps) {
  const [plans, setPlans] = useState<any[]>(initialPlans);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const fresh = await fetchAdminPlans();
      if (Array.isArray(fresh)) {
        setPlans(fresh);
      }
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Failed to refresh plans:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  return (
    <>
      <AdminPlansGridView
        plans={plans}
        onToggleStatus={onToggleStatus}
        onCreateClick={() => setIsCreateOpen(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        lastRefreshedAt={lastRefreshedAt}
      />

      <CreatePlanDrawer isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </>
  );
}
