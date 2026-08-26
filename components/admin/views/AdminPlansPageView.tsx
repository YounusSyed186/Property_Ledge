'use client';

import React, { useState } from 'react';
import { AdminPlansGridView } from '@/components/admin/data-grid/views/AdminPlansGridView';
import { CreatePlanDrawer } from '@/components/admin/CreatePlanDrawer';

interface AdminPlansPageViewProps {
  plans: any[];
  onToggleStatus: (planId: string, currentStatus: string) => Promise<void>;
}

export function AdminPlansPageView({ plans, onToggleStatus }: AdminPlansPageViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <>
      <AdminPlansGridView
        plans={plans}
        onToggleStatus={onToggleStatus}
        onCreateClick={() => setIsCreateOpen(true)}
      />

      <CreatePlanDrawer isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </>
  );
}
