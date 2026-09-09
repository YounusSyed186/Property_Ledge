import { test, expect } from '@playwright/test';
import { InvoiceService } from '../../modules/invoices/application/services/invoice-service';
import { Invoice, InvoiceFilters } from '../../modules/invoices/domain/entities/invoice';
import { InvoiceRepository, CreateInvoiceData, UpdateInvoiceData } from '../../modules/invoices/domain/repositories/invoice-repository';
import { ScheduleCalculator } from '../../modules/automation/domain/services/schedule-calculator';
import { ok, err } from '@/shared/domain/result';
import { NotFoundError } from '@/shared/domain/errors';

class MockInvoiceRepository implements InvoiceRepository {
  public invoices: Invoice[] = [];

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
    if (filters.automationId) {
      result = result.filter((i) => i.automationId === filters.automationId);
    }
    return ok(result);
  }

  async getNextInvoiceNumber(workspaceId: string, prefix = 'INV', year = 2026) {
    const nextSeq = this.invoices.length + 1;
    return ok(`${prefix}-${year}-${String(nextSeq).padStart(6, '0')}`);
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
      automationId: data.automationId || null,
      items: data.items.map((it, idx) => ({
        id: `item-${idx + 1}`,
        invoiceId: `inv-${this.invoices.length + 1}`,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        taxRate: it.taxRate,
        taxAmount: it.taxAmount,
        lineTotal: it.lineTotal,
        sortOrder: idx,
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
    this.invoices[idx] = { ...this.invoices[idx], ...data } as any;
    return ok(this.invoices[idx]);
  }

  async updateStatus(id: string, status: any) {
    const idx = this.invoices.findIndex((i) => i.id === id);
    if (idx === -1) return err(new NotFoundError('Invoice', id));
    this.invoices[idx].status = status;
    return ok(this.invoices[idx]);
  }

  async deleteDraft(id: string) {
    this.invoices = this.invoices.filter((i) => i.id !== id);
    return ok(undefined);
  }

  async delete(id: string) {
    this.invoices = this.invoices.filter((i) => i.id !== id);
    return ok(undefined);
  }
}

test.describe('V2 Automation & Invoice Traceability Suite', () => {
  test('creates recurring invoices with distinct numbers and links them to automationId', async () => {
    const repo = new MockInvoiceRepository();
    const service = new InvoiceService(repo);

    const autoId = 'auto-lease-monthly-001';

    // 1st Execution: January
    const res1 = await service.createInvoice({
      workspaceId: 'ws-123',
      leaseId: 'lease-100',
      automationId: autoId,
      customerName: 'John Smith',
      customerEmail: 'john@example.com',
      issueDate: '2026-01-01',
      dueDate: '2026-01-15',
      billingPeriodStart: '2026-01-01',
      billingPeriodEnd: '2026-01-31',
      items: [{ description: 'Monthly Rent - Jan 2026', quantity: 1, unitPrice: 2500 }],
    });

    expect(res1.success).toBe(true);
    if (!res1.success) return;
    expect(res1.data.invoiceNumber).toBe('INV-2026-000001');
    expect(res1.data.automationId).toBe(autoId);
    expect(res1.data.billingPeriodStart).toBe('2026-01-01');

    // 2nd Execution: February
    const res2 = await service.createInvoice({
      workspaceId: 'ws-123',
      leaseId: 'lease-100',
      automationId: autoId,
      customerName: 'John Smith',
      customerEmail: 'john@example.com',
      issueDate: '2026-02-01',
      dueDate: '2026-02-15',
      billingPeriodStart: '2026-02-01',
      billingPeriodEnd: '2026-02-28',
      items: [{ description: 'Monthly Rent - Feb 2026', quantity: 1, unitPrice: 2500 }],
    });

    expect(res2.success).toBe(true);
    if (!res2.success) return;
    expect(res2.data.invoiceNumber).toBe('INV-2026-000002');
    expect(res2.data.automationId).toBe(autoId);
    expect(res2.data.billingPeriodStart).toBe('2026-02-01');

    // Verify filter by automationId returns both generated invoices
    const listRes = await service.listInvoices({ automationId: autoId, workspaceId: 'ws-123' });
    expect(listRes.success).toBe(true);
    if (!listRes.success) return;
    expect(listRes.data.length).toBe(2);
    expect(listRes.data.map((i) => i.invoiceNumber)).toEqual(['INV-2026-000001', 'INV-2026-000002']);
  });

  test('ScheduleCalculator correctly formats human readable schedule descriptions', () => {
    const monthlyText = ScheduleCalculator.formatHumanSchedule('monthly', {
      dayOfMonth: 1,
      timeOfDay: '09:00',
    });
    expect(monthlyText).toBe('Every month on the 1st at 09:00');

    const offsetText = ScheduleCalculator.formatHumanSchedule('after_start', {
      offsetMonths: 12,
      timeOfDay: '09:00',
    });
    expect(offsetText).toBe('12 months after lease start at 09:00');
  });

  test('ScheduleCalculator calculates deterministic next run date rolling forward to next month', () => {
    const baseDate = new Date('2026-01-15T12:00:00Z');
    const nextRunIso = ScheduleCalculator.calculateNextRun(
      'monthly',
      { dayOfMonth: 1, timeOfDay: '09:00' },
      undefined,
      undefined,
      baseDate
    );

    expect(nextRunIso).not.toBeNull();
    const nextRun = new Date(nextRunIso!);
    // Since Jan 1 is in the past relative to Jan 15, should roll to Feb 1
    expect(nextRun.getMonth()).toBe(1); // February (0-indexed)
    expect(nextRun.getDate()).toBe(1);
  });
});
