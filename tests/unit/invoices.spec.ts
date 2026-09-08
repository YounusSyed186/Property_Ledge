import { test, expect } from '@playwright/test';
import { InvoiceCalculator, roundToDecimals } from '../../modules/invoices/domain/services/invoice-calculator';
import { InvoiceStateMachine } from '../../modules/invoices/domain/services/invoice-state-machine';
import { formatCurrency, isValidCurrency } from '../../modules/invoices/domain/value-objects/currency';
import { Invoice, InvoiceFilters } from '../../modules/invoices/domain/entities/invoice';
import { InvoiceRepository, CreateInvoiceData, UpdateInvoiceData } from '../../modules/invoices/domain/repositories/invoice-repository';
import { InvoiceService } from '../../modules/invoices/application/services/invoice-service';
import { ok, err } from '@/shared/domain/result';
import { NotFoundError } from '@/shared/domain/errors';

// In-Memory Repository for pure decoupled domain testing
class InMemoryInvoiceRepository implements InvoiceRepository {
  public invoices: Invoice[] = [];
  public sequences: Record<string, number> = {};

  async getById(id: string) {
    const found = this.invoices.find((i) => i.id === id);
    if (!found) return err(new NotFoundError('Invoice', id));
    return ok(found);
  }

  async getByNumber(invoiceNumber: string) {
    const found = this.invoices.find((i) => i.invoiceNumber === invoiceNumber);
    if (!found) return err(new NotFoundError('Invoice', invoiceNumber));
    return ok(found);
  }

  async list(filters: InvoiceFilters = {}) {
    let result = [...this.invoices];
    if (filters.workspaceId) {
      result = result.filter((i) => i.workspaceId === filters.workspaceId);
    }
    if (filters.status && filters.status !== 'all') {
      result = result.filter((i) => i.status === filters.status);
    }
    return ok(result);
  }

  async create(data: CreateInvoiceData) {
    const inv: Invoice = {
      id: `inv-${this.invoices.length + 1}`,
      workspaceId: data.workspaceId,
      invoiceNumber: data.invoiceNumber,
      status: data.status || 'draft',
      currency: data.currency || 'AUD',
      propertyId: data.propertyId || null,
      unitId: data.unitId || null,
      leaseId: data.leaseId || null,
      tenantId: data.tenantId || null,
      customerName: data.customerName || null,
      customerEmail: data.customerEmail || null,
      customerAddress: data.customerAddress || null,
      recipient: {
        name: data.customerName || 'Customer',
        email: data.customerEmail || undefined,
        address: data.customerAddress || undefined,
      },
      subtotal: data.subtotal,
      taxAmount: data.taxAmount,
      totalAmount: data.totalAmount,
      balanceDue: data.balanceDue,
      total: data.totalAmount,
      balance: data.balanceDue,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      billingPeriodStart: data.billingPeriodStart || null,
      billingPeriodEnd: data.billingPeriodEnd || null,
      notes: data.notes || null,
      paymentInstructions: data.paymentInstructions || null,
      templateId: data.templateId || null,
      items: (data.items || []).map((it, idx) => ({
        id: `item-${idx + 1}`,
        invoiceId: `inv-${this.invoices.length + 1}`,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        taxRate: it.taxRate,
        taxAmount: it.taxAmount,
        lineTotal: it.lineTotal,
        sortOrder: it.sortOrder,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.invoices.push(inv);
    return ok(inv);
  }

  async update(id: string, data: UpdateInvoiceData) {
    const idx = this.invoices.findIndex((i) => i.id === id);
    if (idx === -1) return err(new NotFoundError('Invoice', id));
    const current = this.invoices[idx];
    const updated: Invoice = {
      ...current,
      ...data,
      total: data.totalAmount ?? current.totalAmount,
      balance: data.balanceDue ?? current.balanceDue,
      totalAmount: data.totalAmount ?? current.totalAmount,
      balanceDue: data.balanceDue ?? current.balanceDue,
      subtotal: data.subtotal ?? current.subtotal,
      taxAmount: data.taxAmount ?? current.taxAmount,
      items: data.items
        ? data.items.map((it, itemIdx) => ({
            id: `item-${itemIdx + 1}`,
            invoiceId: current.id,
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            taxRate: it.taxRate,
            taxAmount: it.taxAmount,
            lineTotal: it.lineTotal,
            sortOrder: it.sortOrder,
          }))
        : current.items,
      updatedAt: new Date().toISOString(),
    };
    this.invoices[idx] = updated;
    return ok(updated);
  }

  async updateStatus(id: string, status: any, data: any) {
    const idx = this.invoices.findIndex((i) => i.id === id);
    if (idx === -1) return err(new NotFoundError('Invoice', id));
    const current = this.invoices[idx];
    const updated: Invoice = {
      ...current,
      status,
      ...data,
      total: data?.totalAmount ?? current.totalAmount,
      balance: data?.balanceDue ?? current.balanceDue,
      totalAmount: data?.totalAmount ?? current.totalAmount,
      balanceDue: data?.balanceDue ?? current.balanceDue,
      updatedAt: new Date().toISOString(),
    };
    this.invoices[idx] = updated;
    return ok(updated);
  }

  async deleteDraft(id: string) {
    this.invoices = this.invoices.filter((i) => i.id !== id);
    return ok(undefined);
  }

  async delete(id: string) {
    this.invoices = this.invoices.filter((i) => i.id !== id);
    return ok(undefined);
  }

  async getNextInvoiceNumber(workspaceId: string, prefix = 'INV', year = 2026) {
    const key = `${workspaceId}_${prefix}_${year}`;
    this.sequences[key] = (this.sequences[key] || 0) + 1;
    const formatted = `${prefix}-${year}-${String(this.sequences[key]).padStart(6, '0')}`;
    return ok(formatted);
  }
}

test.describe('Invoice Domain & Application Unit Tests', () => {
  test.describe('InvoiceCalculator', () => {
    test('calculates line totals with tax correctly and without floating point errors', () => {
      const line1 = InvoiceCalculator.calculateLineItem({ quantity: 3, unitPrice: 33.33, taxRate: 10 });
      expect(line1.subtotal).toBe(99.99);
      expect(line1.taxAmount).toBe(10.0);
      expect(line1.lineTotal).toBe(109.99);

      // Testing 0.1 + 0.2 precision problem
      const line2 = InvoiceCalculator.calculateLineItem({ quantity: 1, unitPrice: 0.1, taxRate: 0 });
      const line3 = InvoiceCalculator.calculateLineItem({ quantity: 1, unitPrice: 0.2, taxRate: 0 });
      const sub = roundToDecimals(line2.subtotal + line3.subtotal, 2);
      expect(sub).toBe(0.3);
    });

    test('calculates invoice totals and balance due', () => {
      const items = [
        { quantity: 2, unitPrice: 250, taxRate: 10 },  // 500 + 50 tax = 550
        { quantity: 1, unitPrice: 100, taxRate: 0 },   // 100 + 0 tax = 100
      ];

      const totals = InvoiceCalculator.calculateTotals(items, 250); // 250 paid
      expect(totals.subtotal).toBe(600.0);
      expect(totals.taxAmount).toBe(50.0);
      expect(totals.totalAmount).toBe(650.0);
      expect(totals.balanceDue).toBe(400.0); // 650 - 250 = 400
    });
  });

  test.describe('InvoiceStateMachine', () => {
    test('allows valid state transitions', () => {
      expect(InvoiceStateMachine.canTransition('draft', 'issued')).toBe(true);
      expect(InvoiceStateMachine.canTransition('issued', 'partially_paid')).toBe(true);
      expect(InvoiceStateMachine.canTransition('partially_paid', 'paid')).toBe(true);
      expect(InvoiceStateMachine.canTransition('issued', 'overdue')).toBe(true);
      expect(InvoiceStateMachine.canTransition('draft', 'cancelled')).toBe(true);
      expect(InvoiceStateMachine.canTransition('issued', 'cancelled')).toBe(true);
    });

    test('rejects invalid state transitions and enforces immutability', () => {
      expect(InvoiceStateMachine.canTransition('paid', 'draft')).toBe(false);
      expect(InvoiceStateMachine.canTransition('paid', 'issued')).toBe(false);
      expect(InvoiceStateMachine.canTransition('cancelled', 'draft')).toBe(false);
      expect(InvoiceStateMachine.canTransition('cancelled', 'paid')).toBe(false);
    });

    test('asserts modifiable only in draft state', () => {
      expect(InvoiceStateMachine.isModifiable('draft')).toBe(true);
      expect(InvoiceStateMachine.isModifiable('issued')).toBe(false);
      expect(InvoiceStateMachine.isModifiable('paid')).toBe(false);
      expect(InvoiceStateMachine.isModifiable('cancelled')).toBe(false);
    });
  });

  test.describe('Currency Value Object', () => {
    test('validates supported currencies', () => {
      expect(isValidCurrency('AUD')).toBe(true);
      expect(isValidCurrency('USD')).toBe(true);
      expect(isValidCurrency('INR')).toBe(true);
      expect(isValidCurrency('EUR')).toBe(true);
      expect(isValidCurrency('GBP')).toBe(true);
      expect(isValidCurrency('XYZ')).toBe(false);
    });

    test('formats multi-currency values cleanly', () => {
      const aud = formatCurrency(1250.5, 'AUD');
      expect(aud).toContain('1,250.50');

      const usd = formatCurrency(500, 'USD');
      expect(usd).toContain('500.00');

      const inr = formatCurrency(50000, 'INR');
      expect(inr).toContain('50,000.00');
    });
  });

  test.describe('Decoupled Standalone Invoice Service', () => {
    test('creates and issues a standalone invoice with NO property, lease, or tenant', async () => {
      const repo = new InMemoryInvoiceRepository();
      const service = new InvoiceService(repo);

      const createRes = await service.createInvoice({
        workspaceId: 'ws-100',
        customerName: 'Acme Corporation',
        customerEmail: 'billing@acmecorp.com',
        customerAddress: '42 Wallaby Way, Sydney',
        currency: 'USD',
        dueDate: '2026-10-01',
        items: [
          { description: 'Quarterly Strategic Consulting', quantity: 1, unitPrice: 5000, taxRate: 10 },
        ],
      });

      expect(createRes.success).toBe(true);
      if (!createRes.success) return;

      expect(createRes.data.propertyId).toBeNull();
      expect(createRes.data.leaseId).toBeNull();
      expect(createRes.data.tenantId).toBeNull();
      expect(createRes.data.customerName).toBe('Acme Corporation');
      expect(createRes.data.totalAmount).toBe(5500);
      expect(createRes.data.invoiceNumber).toBe('INV-2026-000001');

      // Issue invoice
      const issueRes = await service.issueInvoice(createRes.data.id);
      expect(issueRes.success).toBe(true);
      if (!issueRes.success) return;
      expect(issueRes.data.status).toBe('issued');
      expect(issueRes.data.snapshot?.billTo.name).toBe('Acme Corporation');

      // Record partial payment
      const payRes = await service.recordPayment(createRes.data.id, 2500);
      expect(payRes.success).toBe(true);
      if (!payRes.success) return;
      expect(payRes.data.status).toBe('partially_paid');
      expect(payRes.data.balanceDue).toBe(3000);

      // Complete payment
      const fullPayRes = await service.recordPayment(createRes.data.id, 3000);
      expect(fullPayRes.success).toBe(true);
      if (!fullPayRes.success) return;
      expect(fullPayRes.data.status).toBe('paid');
      expect(fullPayRes.data.balanceDue).toBe(0);

      // Delete invoice
      const delRes = await service.deleteInvoice(createRes.data.id);
      expect(delRes.success).toBe(true);
      const getRes = await repo.getById(createRes.data.id);
      expect(getRes.success).toBe(false);
    });

    test('generates bulk multi-month recurring invoices sequentially', async () => {
      const repo = new InMemoryInvoiceRepository();
      const service = new InvoiceService(repo);

      const bulkRes = await service.createBulkInvoices({
        workspaceId: 'ws-100',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        description: 'Monthly Retainer',
        monthsCount: 6,
        startMonth: '2026-01',
        amountPerMonth: 1200,
        dueDays: 14,
      });

      expect(bulkRes.success).toBe(true);
      if (!bulkRes.success) return;
      expect(bulkRes.data.createdCount).toBe(6);
      expect(bulkRes.data.invoices.length).toBe(6);
      expect(bulkRes.data.invoices[0].invoiceNumber).toBe('INV-2026-000001');
      expect(bulkRes.data.invoices[5].invoiceNumber).toBe('INV-2026-000006');
    });

    test('creates, duplicates, and manages status transitions of recurring invoice templates', async () => {
      const invoiceRepo = new InMemoryInvoiceRepository();
      const templates: any[] = [];
      const templateRepo = {
        async getById(id: string) {
          const t = templates.find((x) => x.id === id);
          if (!t) return err(new NotFoundError('InvoiceTemplate', id));
          return ok(t);
        },
        async list(filters: any) {
          return ok(templates.filter((x) => !filters.workspaceId || x.workspaceId === filters.workspaceId));
        },
        async create(data: any) {
          const t = { id: `tpl-${templates.length + 1}`, ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
          templates.push(t);
          return ok(t);
        },
        async update(id: string, data: any) {
          const idx = templates.findIndex((x) => x.id === id);
          if (idx === -1) return err(new NotFoundError('InvoiceTemplate', id));
          templates[idx] = { ...templates[idx], ...data, updatedAt: new Date().toISOString() };
          return ok(templates[idx]);
        },
        async delete(id: string) {
          const idx = templates.findIndex((x) => x.id === id);
          if (idx === -1) return err(new NotFoundError('InvoiceTemplate', id));
          templates.splice(idx, 1);
          return ok(true);
        },
      };

      const service = new InvoiceService(invoiceRepo, templateRepo as any);

      // 1. Create Template
      const template = await service.createTemplate({
        workspaceId: 'ws-100',
        name: 'Executive Commercial Lease Template',
        description: 'Monthly commercial rental billing',
        status: 'draft',
        currency: 'AUD',
        invoiceType: 'rent',
        items: [
          { description: 'Office Suite 401 Rent', quantity: 1, unitPrice: 4500, taxRate: 10, lineTotal: 4950 },
          { description: 'High-Speed Fiber Network', quantity: 1, unitPrice: 250, taxRate: 10, lineTotal: 275 },
        ],
        paymentTermsDays: 14,
        lateFeeAmount: 50,
        lateFeeDays: 7,
        defaultCustomerName: 'Tech Innovations Pty Ltd',
        defaultCustomerEmail: 'billing@techinnovations.com',
        automationConfig: {
          enabled: true,
          triggerFrequency: 'monthly',
          dayOfMonth: 1,
          onlyActiveLeases: true,
        },
        emailConfig: {
          enabled: true,
          attachPdf: true,
          subjectTemplate: 'Invoice {{invoice.number}} - Commercial Lease',
          bodyTemplate: 'Hi {{customer_name}},\nYour invoice is attached.',
        },
      });

      expect(template.id).toBe('tpl-1');
      expect(template.name).toBe('Executive Commercial Lease Template');
      expect(template.status).toBe('draft');

      // 2. Activate Template
      const activeTemplate = await service.setTemplateStatus('tpl-1', 'active');
      expect(activeTemplate.status).toBe('active');

      // 3. Duplicate Template
      const dupTemplate = await service.duplicateTemplate('tpl-1');
      expect(dupTemplate.id).toBe('tpl-2');
      expect(dupTemplate.name).toBe('Executive Commercial Lease Template (Copy)');
      expect(dupTemplate.status).toBe('draft');
      expect(dupTemplate.items.length).toBe(2);

      // 4. Pause Original Template
      const pausedTemplate = await service.setTemplateStatus('tpl-1', 'paused');
      expect(pausedTemplate.status).toBe('paused');
    });
  });
});

