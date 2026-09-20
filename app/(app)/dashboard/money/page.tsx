import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { FinancialList } from '@/components/finance/FinancialList';

export const metadata = {
  title: 'Transactions | PropertyLedge',
  description: 'Manage property transactions, track income and operating expenses with live dynamic ledger reconciliation.',
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  if (params?.tab === 'expenses') {
    redirect('/dashboard/expenses');
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-admin-muted">Loading transactions...</div>}>
      <FinancialList />
    </Suspense>
  );
}

