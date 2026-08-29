'use client';

import { ClipboardCheck } from 'lucide-react';
import { ComingSoonPage } from '@/components/dashboard/ComingSoonPage';

export default function InspectionsPage() {
  return (
    <ComingSoonPage
      title="Inspections"
      description="Schedule and record property inspections with photos, checklists, and tenant sign-offs. Coming soon."
      icon={ClipboardCheck}
    />
  );
}
