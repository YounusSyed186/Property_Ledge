'use client';

import { Wrench } from 'lucide-react';
import { ComingSoonPage } from '@/components/dashboard/ComingSoonPage';

export default function MaintenancePage() {
  return (
    <ComingSoonPage
      title="Maintenance"
      description="Track repair requests, assign contractors, and manage maintenance schedules — all in one place. Coming soon."
      icon={Wrench}
    />
  );
}
