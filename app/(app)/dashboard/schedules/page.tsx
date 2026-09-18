import React, { Suspense } from 'react';
import { ExpectedScheduleList } from '@/components/finance/ExpectedScheduleList';

export const metadata = {
  title: 'Payment Schedules | PropertyLedge',
  description: 'Manage lease-based and independent recurring payment schedules with dynamic transaction mapping.',
};

export default function SchedulesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-admin-muted">Loading payment schedules...</div>}>
      <ExpectedScheduleList />
    </Suspense>
  );
}
