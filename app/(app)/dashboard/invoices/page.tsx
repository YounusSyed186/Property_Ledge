import React from 'react';
import { InvoiceList } from '@/components/invoices/InvoiceList';
import { fetchInvoicesAction } from '@/app/actions/invoices';

export const metadata = {
  title: 'Invoices | PropertyLedge',
  description: 'Manage independent customer invoices, recurring rent billing, and automated payment tracking.',
};

export default async function InvoicesPage() {
  const initialData = await fetchInvoicesAction({ limit: 150 });
  return <InvoiceList initialInvoices={initialData.items} />;
}
