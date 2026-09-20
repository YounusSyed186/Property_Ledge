import React, { Suspense } from 'react';
import { ExpenseList } from '@/components/finance/ExpenseList';

export const metadata = {
  title: 'Expenses | PropertyLedge',
  description: 'Track and manage property operating expenses, utility bills, maintenance, rates, and landlord costs.',
};

export default function ExpensesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400 text-sm">
          Loading property expenses...
        </div>
      }
    >
      <ExpenseList />
    </Suspense>
  );
}

