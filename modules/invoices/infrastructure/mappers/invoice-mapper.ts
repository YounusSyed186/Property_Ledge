/**
 * Invoice Data Mapper.
 * Maps between raw database snake_case records and camelCase domain entities.
 */

import { Invoice, InvoiceItem, InvoiceStatus } from '../../domain/entities/invoice';

export function mapInvoiceItemRowToDomain(row: any): InvoiceItem {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    description: row.description || '',
    quantity: Number(row.quantity) || 1,
    unitPrice: Number(row.unit_price) || 0,
    taxRate: Number(row.tax_rate) || 0,
    taxAmount: Number(row.tax_amount) || 0,
    lineTotal: Number(row.line_total || row.amount) || 0,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at,
  };
}

export function mapInvoiceRowToDomain(row: any, items: InvoiceItem[] = []): Invoice {
  const totalAmount = Number(row.total_amount) || 0;
  const balanceDue = Number(row.balance_due) || 0;
  const customerName = row.customer_name || row.recipient_name || 'Customer';
  const customerEmail = row.customer_email || row.recipient_email || null;
  const customerAddress = row.customer_address || row.recipient_address || null;

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    invoiceNumber: row.invoice_number,
    status: (row.status as InvoiceStatus) || 'draft',
    currency: row.currency || 'AUD',
    propertyId: row.property_id || null,
    unitId: row.unit_id || null,
    leaseId: row.lease_id || null,
    tenantId: row.tenant_id || null,
    customerName,
    customerEmail,
    customerAddress,
    recipient: {
      name: customerName,
      email: customerEmail || undefined,
      address: customerAddress || undefined,
    },
    subtotal: Number(row.subtotal) || 0,
    taxAmount: Number(row.tax_amount) || 0,
    totalAmount,
    balanceDue,
    total: totalAmount,
    balance: balanceDue,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    billingPeriodStart: row.billing_period_start || null,
    billingPeriodEnd: row.billing_period_end || null,
    issuedAt: row.issued_at || null,
    paidAt: row.paid_at || null,
    notes: row.notes || row.description || null,
    paymentInstructions: row.payment_instructions || null,
    cancellationReason: row.cancellation_reason || null,
    templateId: row.template_id || null,
    snapshot: row.snapshot || null,
    items,
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
