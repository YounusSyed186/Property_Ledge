'use client';

import { DollarSign } from 'lucide-react';
import { ComingSoonPage } from '@/components/dashboard/ComingSoonPage';

export default function FinancesPage() {
  return (
    <ComingSoonPage
      title="Finance Operations"
      description="Full financial management — invoices, payments, expenses, and reconciliation — is coming soon to your dashboard."
      icon={DollarSign}
    />
  );
}
