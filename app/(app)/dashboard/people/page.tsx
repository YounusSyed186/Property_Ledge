'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { ComingSoonPage } from '@/components/dashboard/ComingSoonPage';

export default function PeoplePage() {
  return (
    <ComingSoonPage
      title="Tenants Management"
      description="We're crafting an end-to-end tenant onboarding and portal experience. Tenant management features are coming soon."
      icon={Users}
    />
  );
}
