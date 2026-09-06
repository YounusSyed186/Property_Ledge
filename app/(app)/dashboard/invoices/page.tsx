'use client';

import { EntityListPage } from '@/components/dashboard/EntityListPage';
import { createEntityDrawer } from '@/components/dashboard/entities/createEntityDrawer';
import { invoiceFields, invoiceColumns } from '@/components/dashboard/entities/config';
import {
  fetchDashboardInvoices,
  handleCreateInvoice,
  handleUpdateInvoice,
  handleDeleteInvoice,
} from '@/app/actions/dashboard';

const InvoiceDrawer = createEntityDrawer('Invoice', invoiceFields, {
  onCreate: handleCreateInvoice,
  onUpdate: handleUpdateInvoice,
  onDelete: handleDeleteInvoice,
}, { status: 'draft', subtotal: 0, tax_amount: 0, balance_due: 0 });

export default function InvoicesPage() {
  return (
    <EntityListPage
      title="Invoices"
      entityLabel="invoice"
      entityLabelPlural="invoices"
      fetchAction={fetchDashboardInvoices}
      columnDefs={invoiceColumns}
      DrawerComponent={InvoiceDrawer}
      deleteAction={handleDeleteInvoice}
    />
  );
}
