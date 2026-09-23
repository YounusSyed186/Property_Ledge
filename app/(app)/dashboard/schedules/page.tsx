import React, { Suspense } from 'react';
import { ExpectedScheduleList } from '@/components/finance/ExpectedScheduleList';
import { fetchSchedulesPageDataAction } from '@/app/actions/schedules';

export const metadata = {
  title: 'Payment Schedules | PropertyLedge',
  description: 'Manage lease-based and independent recurring payment schedules with dynamic transaction mapping.',
};

export default async function SchedulesPage() {
  let initialSchedules;

  try {
    const res = await fetchSchedulesPageDataAction();
    if (res.success && res.data) {
      initialSchedules = res.data.schedules;
    }
  } catch (err) {
    console.error('Failed to pre-fetch schedules page data on server:', err);
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-admin-muted">Loading payment schedules...</div>}>
      <ExpectedScheduleList initialSchedules={initialSchedules} />
    </Suspense>
  );
}
