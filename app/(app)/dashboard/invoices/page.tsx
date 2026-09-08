import React from 'react';
import { InvoiceList } from '@/components/invoices/InvoiceList';

export const metadata = {
  title: 'Invoices | PropertyLedge',
  description: 'Manage independent customer invoices, recurring rent billing, and automated payment tracking.',
};

export default function InvoicesPage() {
  return <InvoiceList />;
}
