'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LiveInvoiceRenderer } from '@/components/invoices/LiveInvoiceRenderer';
import { InvoiceLayoutStyle } from '@/modules/invoices';

function AuditTemplatesContent() {
  const params = useSearchParams();
  const style = (params.get('style') || 'classic') as InvoiceLayoutStyle;

  const dummyData = {
    invoiceId: 'inv-audit-001',
    invoiceNumber: 'INV-2026-00124',
    issueDate: '2026-09-01',
    dueDate: '2026-09-15',
    currency: 'AUD',
    currencySymbol: '$',
    customerName: 'Jessica Watson',
    customerEmail: 'jessica.watson@example.com',
    customerAddress: 'Unit 4B, 100 George Street, Sydney NSW 2000',
    issuerName: 'Property Ledge Management',
    issuerEmail: 'accounts@propertyledge.com.au',
    issuerPhone: '+61 2 9000 0000',
    issuerTaxId: '17 234 567 890',
    issuerAddress: 'Level 12, 100 Miller Street\nNorth Sydney NSW 2060\nAustralia',
    propertyAddress: 'Unit 4B, 100 George Street, Sydney NSW 2000',
    items: [
      { description: 'Monthly Residential Rent (Sep 2026)', quantity: 1, unitPrice: 3400, taxRate: 0 },
      { description: 'Council Water Consumption Allowance', quantity: 1, unitPrice: 120, taxRate: 10 },
    ],
    notes: 'Payment is due within 14 calendar days. Direct debit accepted.\nLate payments may incur a $35 administration covenant fee.',
    paymentInstructions: 'Bank Name: Commonwealth Bank of Australia\nBSB: 062-000\nAccount Number: 1092 8472\nAccount Name: Property Ledge Client Trust Account\nReference: INV-2026-00124',
    layoutStyle: style,
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8 flex justify-center items-start">
      <div className="w-[1000px]">
        <LiveInvoiceRenderer
          data={dummyData}
          showThemePicker={true}
          initialZoom={1.0}
          canvasClassName="bg-transparent border-0 p-0 shadow-none min-h-0"
        />
      </div>
    </div>
  );
}

export default function AuditTemplatesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white">Loading audit template...</div>}>
      <AuditTemplatesContent />
    </Suspense>
  );
}
