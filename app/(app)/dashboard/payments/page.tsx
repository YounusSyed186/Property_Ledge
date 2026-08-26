'use client';

import { EntityListPage } from '@/components/dashboard/EntityListPage';
import { createEntityDrawer } from '@/components/dashboard/entities/createEntityDrawer';
import { paymentFields, paymentColumns } from '@/components/dashboard/entities/config';
import {
  fetchDashboardPayments,
  handleCreatePayment,
  handleUpdatePayment,
  handleDeletePayment,
} from '@/app/actions/dashboard';

const PaymentDrawer = createEntityDrawer('Payment', paymentFields, {
  onCreate: handleCreatePayment,
  onUpdate: handleUpdatePayment,
  onDelete: handleDeletePayment,
}, { status: 'completed', payment_method: 'bank_transfer' });

export default function PaymentsPage() {
  return (
    <EntityListPage
      title="Payments"
      entityLabel="payment"
      entityLabelPlural="payments"
      fetchAction={fetchDashboardPayments}
      columnDefs={paymentColumns}
      DrawerComponent={PaymentDrawer}
    />
  );
}
