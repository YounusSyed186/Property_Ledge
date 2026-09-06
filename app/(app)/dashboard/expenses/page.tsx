'use client';

import { EntityListPage } from '@/components/dashboard/EntityListPage';
import { createEntityDrawer } from '@/components/dashboard/entities/createEntityDrawer';
import { expenseFields, expenseColumns } from '@/components/dashboard/entities/config';
import {
  fetchDashboardExpenses,
  handleCreateExpense,
  handleUpdateExpense,
  handleDeleteExpense,
} from '@/app/actions/dashboard';

const ExpenseDrawer = createEntityDrawer('Expense', expenseFields, {
  onCreate: handleCreateExpense,
  onUpdate: handleUpdateExpense,
  onDelete: handleDeleteExpense,
}, { status: 'pending' });

export default function ExpensesPage() {
  return (
    <EntityListPage
      title="Expenses"
      entityLabel="expense"
      entityLabelPlural="expenses"
      fetchAction={fetchDashboardExpenses}
      columnDefs={expenseColumns}
      DrawerComponent={ExpenseDrawer}
      deleteAction={handleDeleteExpense}
    />
  );
}
