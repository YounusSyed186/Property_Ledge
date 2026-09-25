import React, { Suspense } from 'react';
import { ExpenseList } from '@/components/finance/ExpenseList';
import { fetchExpensesPageDataAction } from '@/app/actions/expenses';

export const metadata = {
  title: 'Expenses | PropertyLedge',
  description: 'Track and manage property operating expenses, utility bills, maintenance, rates, and landlord costs.',
};

export default async function ExpensesPage() {
  let initialExpenses;
  let initialCategories;

  try {
    const res = await fetchExpensesPageDataAction();
    if (res.success && res.data) {
      initialExpenses = res.data.expenses;
      initialCategories = res.data.categories;
    }
  } catch (err) {
    console.error('Failed to pre-fetch expenses page data on server:', err);
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-admin-muted">
          Loading property expenses...
        </div>
      }
    >
      <ExpenseList initialExpenses={initialExpenses} initialCategories={initialCategories} />
    </Suspense>
  );
}

