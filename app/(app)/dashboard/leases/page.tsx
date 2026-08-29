'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { ComingSoonPage } from '@/components/dashboard/ComingSoonPage';

export default function LeasesPage() {
  return (
    <ComingSoonPage
      title="Leases Management"
      description="We're building an automated lease lifecycle, document generator, and digital signature workflow. Lease management features are coming soon."
      icon={FileText}
    />
  );
}
