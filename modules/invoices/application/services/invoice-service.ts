/**
 * Invoice Application Service.
 * Pure Application Layer - Orchestrates domain calculation, numbering, immutability, and persistence.
 */

import {
  formatAuDisplayDate,
  getAuTodayString,
  getAuDateParts,
  createAuDate,
  formatAuDateIso,
} from '@/lib/format/australian-time';
import { Result, ok, err } from '@/shared/domain/result';
import { DomainError, ValidationError, NotFoundError, ConflictError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';
import { Invoice, InvoiceFilters, InvoiceSnapshot, InvoiceSnapshotParty } from '../../domain/entities/invoice';
import { InvoiceTemplate } from '../../domain/entities/invoice-template';
import { InvoiceRepository } from '../../domain/repositories/invoice-repository';
import { InvoiceTemplateRepository } from '../../domain/repositories/invoice-template-repository';
import { InvoiceCalculator } from '../../domain/services/invoice-calculator';
import { InvoiceStateMachine } from '../../domain/services/invoice-state-machine';
import { CreateInvoiceDTO, UpdateInvoiceDraftDTO, UpdateInvoiceDTO, BulkInvoiceDTO } from '../dto/invoice-dto';
import { InvoiceRenderDTO } from '../dto/invoice-render-dto';
import { formatInvoiceAmount } from '../../domain/value-objects/currency';
import { getPredefinedTemplateById } from '../../domain/constants/predefined-templates';

const isUuid = (val?: string | null): boolean =>
  typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export class InvoiceService {
  constructor(
    private readonly repository: InvoiceRepository,
    private readonly templateRepository?: InvoiceTemplateRepository
  ) {}

  public async getInvoice(id: string, context?: RequestContext): Promise<Result<Invoice, DomainError>> {
    if (!id) {
      return err(new ValidationError('Invoice ID is required.'));
    }
    return this.repository.getById(id, context);
  }

  public async getInvoiceById(id: string, context?: RequestContext): Promise<Invoice | null> {
    const res = await this.getInvoice(id, context);
    return res.success ? res.data : null;
  }

  public async listInvoices(
    filters: InvoiceFilters = {},
    context?: RequestContext
  ): Promise<Result<Invoice[], DomainError>> {
    return this.repository.list(filters, context);
  }

  /**
   * Supports both (dto, context) and (workspaceId, dto, context) call patterns.
   */
  public async createInvoice(
    arg1: string | CreateInvoiceDTO,
    arg2?: CreateInvoiceDTO | RequestContext,
    arg3?: RequestContext
  ): Promise<Result<Invoice, DomainError>> {
    let workspaceId: string;
    let dto: CreateInvoiceDTO;
    let context: RequestContext | undefined;

    if (typeof arg1 === 'string') {
      workspaceId = arg1;
      dto = arg2 as CreateInvoiceDTO;
      context = arg3;
    } else {
      dto = arg1 as CreateInvoiceDTO;
      workspaceId = dto.workspaceId || '';
      context = arg2 as RequestContext | undefined;
    }

    if (!workspaceId && !dto.workspaceId) {
      return err(new ValidationError('Workspace ID is required.'));
    }
    const finalWorkspaceId = workspaceId || dto.workspaceId!;

    if (!dto.dueDate) {
      return err(new ValidationError('Due date is required.'));
    }
    if (!dto.items || dto.items.length === 0) {
      return err(new ValidationError('At least one invoice line item is required.'));
    }

    // Resolve customer/recipient details
    const customerName = dto.customerName || dto.recipientName || 'Customer';
    const customerEmail = dto.customerEmail || dto.recipientEmail || null;
    const customerAddress = dto.customerAddress || dto.recipientAddress || null;

    // Generate atomic, concurrency-safe invoice number in AU timezone
    const year = dto.issueDate
      ? getAuDateParts(new Date(dto.issueDate)).year
      : getAuDateParts(new Date()).year;
    const numberResult = await this.repository.getNextInvoiceNumber(finalWorkspaceId, 'INV', year);
    if (!numberResult.success) {
      return err(numberResult.error);
    }
    const invoiceNumber = numberResult.data;

    // Calculate totals using floating-point safe calculator
    const calculation = InvoiceCalculator.calculateTotals(dto.items, 0);
    const issueDate = dto.issueDate || getAuTodayString();

    const rawDtoIssuer = (dto.issuer as any) || {};
    const hasIssuerInput = Boolean(
      dto.issuer ||
      dto.issuerName ||
      dto.senderCompanyName ||
      dto.issuerEmail ||
      dto.senderEmail ||
      rawDtoIssuer.name ||
      rawDtoIssuer.issuerName
    );

    const issuerData: InvoiceSnapshotParty = hasIssuerInput ? {
      name: rawDtoIssuer.name || rawDtoIssuer.issuerName || dto.issuerName || dto.senderCompanyName || 'Property Ledge Management',
      email: rawDtoIssuer.email || rawDtoIssuer.issuerEmail || dto.issuerEmail || dto.senderEmail || 'billing@propertyledge.com.au',
      phone: rawDtoIssuer.phone || rawDtoIssuer.issuerPhone || dto.issuerPhone || dto.senderPhone || null,
      address: rawDtoIssuer.address || rawDtoIssuer.issuerAddress || dto.issuerAddress || dto.senderCompanyAddress || null,
      taxId: rawDtoIssuer.taxId || rawDtoIssuer.issuerTaxId || (dto as any).issuerTaxId || dto.senderTaxNumber || null,
    } : {
      name: 'Property Ledge Management',
      email: 'billing@propertyledge.com.au',
      phone: '+61 2 9000 0000',
      address: null,
      taxId: null,
    };

    const predefinedTmpl = getPredefinedTemplateById(dto.templateId);

    const initialSnapshot: InvoiceSnapshot = {
      billTo: {
        name: customerName,
        email: customerEmail,
        address: customerAddress,
      },
      issuer: issuerData,
      propertyAddress: customerAddress,
      paymentInstructions: dto.paymentInstructions || null,
      capturedAt: new Date().toISOString(),
      ...(predefinedTmpl ? {
        layoutStyle: predefinedTmpl.layoutStyle,
        brandColor: predefinedTmpl.brandColor,
        accentColor: predefinedTmpl.accentColor,
        templateId: predefinedTmpl.id,
      } : {}),
    } as any;

    const createData = {
      workspaceId: finalWorkspaceId,
      invoiceNumber,
      currency: dto.currency || 'AUD',
      propertyId: dto.propertyId || null,
      unitId: dto.unitId || null,
      leaseId: dto.leaseId || null,
      tenantId: dto.tenantId || null,
      customerName,
      customerEmail,
      customerAddress,
      subtotal: calculation.subtotal,
      taxAmount: calculation.taxAmount,
      totalAmount: calculation.totalAmount,
      balanceDue: calculation.balanceDue,
      issueDate,
      dueDate: dto.dueDate,
      billingPeriodStart: dto.billingPeriodStart || null,
      billingPeriodEnd: dto.billingPeriodEnd || null,
      notes: dto.notes || null,
      paymentInstructions: dto.paymentInstructions || null,
      templateId: isUuid(dto.templateId) ? dto.templateId : null,
      automationId: dto.automationId || null,
      status: dto.autoIssue ? ('issued' as const) : ('draft' as const),
      snapshot: initialSnapshot,
      items: calculation.items.map((item, idx) => ({
        description: dto.items[idx].description || 'Item',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        lineTotal: item.lineTotal,
        sortOrder: idx,
      })),
    };

    const result = await this.repository.create(createData, context);
    if (!result.success) {
      return err(result.error);
    }

    // If autoIssue requested, capture snapshot
    if (dto.autoIssue && result.data) {
      return this.issueInvoice(result.data.id, context);
    }

    return result;
  }

  public async updateDraft(
    id: string,
    dto: UpdateInvoiceDraftDTO,
    context?: RequestContext
  ): Promise<Result<Invoice, DomainError>> {
    const existing = await this.repository.getById(id, context);
    if (!existing.success) return err(existing.error);

    if (!InvoiceStateMachine.canEdit(existing.data.status)) {
      return err(new ConflictError(`Invoice is in '${existing.data.status}' status and cannot be edited directly.`));
    }

    let calculation;
    if (dto.items && dto.items.length > 0) {
      calculation = InvoiceCalculator.calculateTotals(dto.items, existing.data.totalAmount - existing.data.balanceDue);
    }

    const customerName = dto.customerName ?? dto.recipientName;
    const customerEmail = dto.customerEmail ?? dto.recipientEmail;
    const customerAddress = dto.customerAddress ?? dto.recipientAddress;

    const updateData: any = {
      ...dto,
      customerName: customerName !== undefined ? customerName : existing.data.customerName,
      customerEmail: customerEmail !== undefined ? customerEmail : existing.data.customerEmail,
      customerAddress: customerAddress !== undefined ? customerAddress : existing.data.customerAddress,
    };

    if (calculation) {
      updateData.subtotal = calculation.subtotal;
      updateData.taxAmount = calculation.taxAmount;
      updateData.totalAmount = calculation.totalAmount;
      updateData.balanceDue = calculation.balanceDue;
      updateData.items = calculation.items.map((item, idx) => ({
        description: dto.items![idx].description || 'Item',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        lineTotal: item.lineTotal,
        sortOrder: idx,
      }));
    }

    if (dto.status === 'paid') {
      updateData.balanceDue = 0;
    } else if (dto.status === 'issued' && !existing.data.issuedAt) {
      updateData.issuedAt = new Date().toISOString();
    }

    return this.repository.update(id, updateData, context);
  }

  public async updateInvoice(
    id: string,
    dto: UpdateInvoiceDTO,
    context?: RequestContext
  ): Promise<Result<Invoice, DomainError>> {
    return this.updateDraft(id, dto, context);
  }

  public async issueInvoice(id: string, context?: RequestContext): Promise<Result<Invoice, DomainError>> {
    const existing = await this.repository.getById(id, context);
    if (!existing.success) return err(existing.error);

    const invoice = existing.data;
    if (!InvoiceStateMachine.canIssue(invoice.status)) {
      return err(new ConflictError(`Cannot issue an invoice with status '${invoice.status}'.`));
    }

    // Build minimal immutable billing snapshot to freeze historical details
    const existingSnapshot = invoice.snapshot;
    const issuer = existingSnapshot?.issuer || {
      name: 'Property Ledge Management',
      email: 'billing@propertyledge.com.au',
    };

    const snapshot: InvoiceSnapshot = {
      billTo: existingSnapshot?.billTo || {
        name: invoice.customerName || invoice.recipient?.name || 'Customer',
        email: invoice.customerEmail || invoice.recipient?.email || null,
        address: invoice.customerAddress || invoice.recipient?.address || null,
      },
      issuer,
      propertyAddress: existingSnapshot?.propertyAddress || invoice.customerAddress || invoice.recipient?.address || null,
      paymentInstructions: existingSnapshot?.paymentInstructions || invoice.paymentInstructions,
      capturedAt: new Date().toISOString(),
    };

    return this.repository.updateStatus(
      id,
      'issued',
      {
        issuedAt: new Date().toISOString(),
        snapshot,
      },
      context
    );
  }

  public async recordPayment(
    id: string,
    amount: number,
    paymentMethod?: string,
    reference?: string,
    context?: RequestContext
  ): Promise<Result<Invoice, DomainError>> {
    const existing = await this.repository.getById(id, context);
    if (!existing.success) return err(existing.error);

    const invoice = existing.data;
    if (!InvoiceStateMachine.canRecordPayment(invoice.status)) {
      return err(new ConflictError(`Cannot record payment on an invoice with status '${invoice.status}'.`));
    }

    const amountPaidSoFar = invoice.totalAmount - invoice.balanceDue;
    const newAmountPaid = amountPaidSoFar + amount;
    const newBalanceDue = Math.max(0, invoice.totalAmount - newAmountPaid);
    const newStatus = InvoiceStateMachine.getStatusAfterPayment(invoice.totalAmount, newAmountPaid);

    return this.repository.updateStatus(
      id,
      newStatus,
      {
        balanceDue: newBalanceDue,
        paidAt: newStatus === 'paid' ? new Date().toISOString() : undefined,
      },
      context
    );
  }

  public async cancelInvoice(
    id: string,
    reason?: string,
    context?: RequestContext
  ): Promise<Result<Invoice, DomainError>> {
    const existing = await this.repository.getById(id, context);
    if (!existing.success) return err(existing.error);

    if (!InvoiceStateMachine.canCancel(existing.data.status)) {
      return err(new ConflictError(`Invoice with status '${existing.data.status}' cannot be cancelled.`));
    }

    return this.repository.updateStatus(
      id,
      'cancelled',
      {
        cancellationReason: reason || 'Cancelled by user',
      },
      context
    );
  }

  public async deleteDraft(id: string, context?: RequestContext): Promise<Result<void, DomainError>> {
    const existing = await this.repository.getById(id, context);
    if (!existing.success) return err(existing.error);

    if (!InvoiceStateMachine.canDelete(existing.data.status)) {
      return err(new ConflictError('Only draft invoices can be deleted. Issued invoices must be cancelled.'));
    }

    return this.repository.deleteDraft(id, context);
  }

  public async deleteDraftInvoice(id: string, context?: RequestContext): Promise<Result<void, DomainError>> {
    return this.deleteDraft(id, context);
  }

  public async deleteInvoice(id: string, context?: RequestContext): Promise<Result<void, DomainError>> {
    const existing = await this.repository.getById(id, context);
    if (!existing.success) return err(existing.error);

    return this.repository.delete(id, context);
  }

  /**
   * Bulk multi-month invoice generator.
   * Calls the exact same createInvoice service sequentially for 1 to 24 months.
   */
  public async createBulkInvoices(
    dto: BulkInvoiceDTO,
    context?: RequestContext
  ): Promise<Result<{ createdCount: number; invoices: Invoice[] }, DomainError>> {
    if (!dto.workspaceId) return err(new ValidationError('Workspace ID is required.'));
    const months = Math.min(24, Math.max(1, dto.monthsCount || 1));
    const [startYear, startMonth] = dto.startMonth.split('-').map(Number);
    const dueDays = dto.dueDays ?? 7;

    const createdInvoices: Invoice[] = [];

    for (let i = 0; i < months; i++) {
      const cycleDate = new Date(startYear, startMonth - 1 + i, 1);
      const cycleYear = cycleDate.getFullYear();
      const cycleMonth = String(cycleDate.getMonth() + 1).padStart(2, '0');
      const monthLabel = cycleDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      const issueDate = `${cycleYear}-${cycleMonth}-01`;
      const dueDateObj = new Date(cycleDate);
      dueDateObj.setDate(dueDateObj.getDate() + dueDays);
      const dueDate = dueDateObj.toISOString().split('T')[0];

      const endBillingObj = new Date(cycleYear, cycleDate.getMonth() + 1, 0);
      const billingPeriodEnd = endBillingObj.toISOString().split('T')[0];

      const singleDto: CreateInvoiceDTO = {
        workspaceId: dto.workspaceId,
        currency: dto.currency || 'AUD',
        propertyId: dto.propertyId,
        unitId: dto.unitId,
        leaseId: dto.leaseId,
        tenantId: dto.tenantId,
        customerName: dto.customerName || dto.recipientName,
        customerEmail: dto.customerEmail || dto.recipientEmail,
        customerAddress: dto.customerAddress || dto.recipientAddress,
        customerPhone: dto.customerPhone || dto.recipientPhone,
        recipientName: dto.recipientName || dto.customerName,
        recipientEmail: dto.recipientEmail || dto.customerEmail,
        recipientAddress: dto.recipientAddress || dto.customerAddress,
        recipientPhone: dto.recipientPhone || dto.customerPhone,
        issueDate,
        dueDate,
        billingPeriodStart: issueDate,
        billingPeriodEnd,
        items: [
          {
            description: `${dto.description} — ${monthLabel}`,
            quantity: 1,
            unitPrice: dto.amountPerMonth,
            taxRate: dto.taxRate ?? 0,
          },
        ],
        notes: `Scheduled invoice for ${monthLabel}`,
        templateId: dto.templateId,
        autoIssue: dto.autoIssue ?? false,
      };

      const result = await this.createInvoice(singleDto, context);
      if (!result.success) {
        return err(result.error);
      }
      createdInvoices.push(result.data);
    }

    return ok({ createdCount: createdInvoices.length, invoices: createdInvoices });
  }

  /**
   * Overdue state reconciliation check.
   */
  public async checkAndUpdateOverdueInvoices(
    workspaceId: string,
    context?: RequestContext
  ): Promise<Result<number, DomainError>> {
    const listResult = await this.repository.list(
      { workspaceId, status: 'all' },
      context
    );
    if (!listResult.success) return err(listResult.error);

    let updatedCount = 0;
    for (const inv of listResult.data) {
      if (InvoiceStateMachine.isOverdue(inv.dueDate, inv.status)) {
        await this.repository.updateStatus(inv.id, 'overdue', {}, context);
        updatedCount++;
      }
    }

    return ok(updatedCount);
  }

  // Template methods
  public async listTemplates(workspaceId: string, context?: RequestContext): Promise<InvoiceTemplate[]> {
    if (!this.templateRepository) return [];
    const res = await this.templateRepository.listByWorkspace(workspaceId, context);
    return res.success ? res.data : [];
  }

  public async getTemplate(id: string, context?: RequestContext): Promise<InvoiceTemplate | null> {
    if (!this.templateRepository) return null;
    const res = await this.templateRepository.getById(id, context);
    return res.success ? res.data : null;
  }

  public async createTemplate(
    arg1: string | any,
    arg2?: any,
    context?: RequestContext
  ): Promise<InvoiceTemplate> {
    if (!this.templateRepository) throw new Error('Template repository is not configured.');
    let createData: any;
    if (typeof arg1 === 'string') {
      createData = { workspaceId: arg1, ...arg2 };
    } else {
      createData = { ...arg1 };
    }
    const res = await this.templateRepository.create(createData, context);
    if (!res.success) throw res.error;
    return res.data;
  }

  public async updateTemplate(id: string, data: any, context?: RequestContext): Promise<InvoiceTemplate> {
    if (!this.templateRepository) throw new Error('Template repository is not configured.');
    const res = await this.templateRepository.update(id, data, context);
    if (!res.success) throw res.error;
    return res.data;
  }

  public async duplicateTemplate(id: string, context?: RequestContext): Promise<InvoiceTemplate> {
    if (!this.templateRepository) throw new Error('Template repository is not configured.');
    const existing = await this.getTemplate(id, context);
    if (!existing) throw new Error('Template not found');

    const duplicateData = {
      workspaceId: existing.workspaceId,
      name: `${existing.name} (Copy)`,
      description: existing.description,
      status: 'draft' as const,
      currency: existing.currency,
      invoiceType: existing.invoiceType,
      items: existing.items,
      paymentTermsDays: existing.paymentTermsDays,
      lateFeeAmount: existing.lateFeeAmount,
      lateFeeDays: existing.lateFeeDays,
      linkedPropertyIds: existing.linkedPropertyIds,
      defaultCustomerName: existing.defaultCustomerName,
      defaultCustomerEmail: existing.defaultCustomerEmail,
      automationConfig: existing.automationConfig,
      emailConfig: existing.emailConfig,
      layoutStyle: existing.layoutStyle,
      brandColor: existing.brandColor,
      accentColor: existing.accentColor,
      logoUrl: existing.logoUrl,
      headerText: existing.headerText,
      footerText: existing.footerText,
      paymentInstructions: existing.paymentInstructions,
      taxName: existing.taxName,
      notes: existing.notes,
      isDefault: false,
    };

    const res = await this.templateRepository.create(duplicateData, context);
    if (!res.success) throw res.error;
    return res.data;
  }

  public async setTemplateStatus(id: string, status: 'draft' | 'active' | 'paused' | 'archived', context?: RequestContext): Promise<InvoiceTemplate> {
    return this.updateTemplate(id, { status }, context);
  }

  public async deleteTemplate(id: string, context?: RequestContext): Promise<void> {
    if (!this.templateRepository) throw new Error('Template repository is not configured.');
    const res = await this.templateRepository.delete(id, context);
    if (!res.success) throw res.error;
  }

  public async getInvoiceRenderData(invoiceId: string, context?: RequestContext): Promise<InvoiceRenderDTO> {
    const invRes = await this.repository.getById(invoiceId, context);
    if (!invRes.success) throw invRes.error;
    const invoice = invRes.data;

    let template: InvoiceTemplate | null = null;
    if (invoice.templateId && this.templateRepository) {
      const tmplRes = await this.templateRepository.getById(invoice.templateId, context);
      if (tmplRes.success) template = tmplRes.data;
    }

    const currency = invoice.currency || 'AUD';
    const amountPaid = invoice.totalAmount - invoice.balanceDue;

    const snapshot = (invoice.snapshot as any) || {};
    const snapshotStyle = snapshot.layoutStyle || snapshot.templateStyle || snapshot.templateId;
    const predefined = getPredefinedTemplateById(snapshotStyle || invoice.templateId || template?.layoutStyle || 'classic');

    const layoutStyle = template?.layoutStyle || snapshot.layoutStyle || predefined.layoutStyle || 'classic';
    const brandColor = template?.brandColor || snapshot.brandColor || predefined.brandColor || '#22333b';
    const accentColor = template?.accentColor || snapshot.accentColor || predefined.accentColor || '#a9927d';

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      currencyCode: currency,
      currencySymbol: currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$',
      issueDateFormatted: formatAuDisplayDate(invoice.issueDate),
      dueDateFormatted: formatAuDisplayDate(invoice.dueDate),
      billingPeriodFormatted:
        invoice.billingPeriodStart && invoice.billingPeriodEnd
          ? `${formatAuDisplayDate(invoice.billingPeriodStart)} – ${formatAuDisplayDate(invoice.billingPeriodEnd)}`
          : null,
      billTo: invoice.snapshot?.billTo || {
        name: invoice.customerName || invoice.recipient?.name || 'Customer',
        email: invoice.customerEmail || invoice.recipient?.email || null,
        address: invoice.customerAddress || invoice.recipient?.address || null,
      },
      issuer: invoice.snapshot?.issuer || {
        name: 'Property Ledge Management',
        email: 'manager@propertyledge.com.au',
        phone: '+61 2 9000 0000',
      },
      propertyAddress: invoice.snapshot?.propertyAddress || invoice.customerAddress || null,
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPriceFormatted: formatInvoiceAmount(item.unitPrice, currency),
        taxRateFormatted: item.taxRate ? `${item.taxRate}%` : '0%',
        taxAmountFormatted: formatInvoiceAmount(item.taxAmount, currency),
        lineTotalFormatted: formatInvoiceAmount(item.lineTotal, currency),
      })),
      subtotalFormatted: formatInvoiceAmount(invoice.subtotal, currency),
      taxAmountFormatted: formatInvoiceAmount(invoice.taxAmount, currency),
      totalAmountFormatted: formatInvoiceAmount(invoice.totalAmount, currency),
      amountPaidFormatted: formatInvoiceAmount(amountPaid, currency),
      balanceDueFormatted: formatInvoiceAmount(invoice.balanceDue, currency),
      notes: invoice.notes,
      paymentInstructions: invoice.paymentInstructions || template?.paymentInstructions || null,
      headerText: template?.headerText || null,
      footerText: template?.footerText || null,
      brandColor,
      accentColor,
      logoUrl: template?.logoUrl || null,
      layoutStyle,
    };
  }
}

