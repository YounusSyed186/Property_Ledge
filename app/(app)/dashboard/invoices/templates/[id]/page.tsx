import { redirect } from 'next/navigation';

export default async function InvoiceTemplateDetailPage() {
  redirect('/dashboard/invoices/templates');
}
