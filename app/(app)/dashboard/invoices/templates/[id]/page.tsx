import React from 'react';
import { TemplateDetailHub } from '@/components/invoices/TemplateDetailHub';

export const metadata = {
  title: 'Invoice Template Details | PropertyLedge',
  description: 'View and manage recurring invoice blueprint definitions, live previews, and Resend delivery schedules.',
};

export default async function InvoiceTemplateDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <TemplateDetailHub templateId={params.id} />
    </div>
  );
}
