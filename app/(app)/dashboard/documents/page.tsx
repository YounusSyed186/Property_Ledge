'use client';

import { FolderOpen } from 'lucide-react';
import { ComingSoonPage } from '@/components/dashboard/ComingSoonPage';

export default function DocumentsPage() {
  return (
    <ComingSoonPage
      title="Documents"
      description="Securely store, organise, and share leases, agreements, and property documents. Coming soon."
      icon={FolderOpen}
    />
  );
}
