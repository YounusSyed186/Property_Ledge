'use client';

import { CheckSquare } from 'lucide-react';
import { ComingSoonPage } from '@/components/dashboard/ComingSoonPage';

export default function TasksPage() {
  return (
    <ComingSoonPage
      title="Tasks"
      description="Assign and track property management tasks across your team with due dates and priorities. Coming soon."
      icon={CheckSquare}
    />
  );
}
