/**
 * Supabase Implementation of InvoiceRepository.
 * Handles database interaction for Invoices and Invoice Items.
 */

import { Result, ok, err } from '@/shared/domain/result';
import { DomainError, NotFoundError, toSafeDomainError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';
import { TypedSupabaseClient } from '@/shared/infrastructure/database/supabase';
import { Invoice, InvoiceFilters, InvoiceStatus, InvoiceSnapshot } from '../../domain/entities/invoice';
import {
  InvoiceRepository,
  CreateInvoiceData,
  UpdateInvoiceData,
} from '../../domain/repositories/invoice-repository';
import { mapInvoiceRowToDomain, mapInvoiceItemRowToDomain } from '../mappers/invoice-mapper';

export class SupabaseInvoiceRepository implements InvoiceRepository {
  constructor(private readonly client: TypedSupabaseClient) {}

  async getById(id: string, _context?: RequestContext): Promise<Result<Invoice, DomainError>> {
    try {
      const { data: invRow, error: invError } = await this.client
        .from('invoices')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (invError) return err(toSafeDomainError(invError));
      if (!invRow) return err(new NotFoundError('Invoice', id));

      const { data: itemRows, error: itemError } = await this.client
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('sort_order', { ascending: true });

      if (itemError) return err(toSafeDomainError(itemError));

      const items = (itemRows || []).map(mapInvoiceItemRowToDomain);
      return ok(mapInvoiceRowToDomain(invRow, items));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async getByNumber(invoiceNumber: string, _context?: RequestContext): Promise<Result<Invoice, DomainError>> {
    try {
      const { data: invRow, error: invError } = await this.client
        .from('invoices')
        .select('*')
        .eq('invoice_number', invoiceNumber)
        .maybeSingle();

      if (invError) return err(toSafeDomainError(invError));
      if (!invRow) return err(new NotFoundError('Invoice', invoiceNumber));

      const { data: itemRows } = await this.client
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invRow.id)
        .order('sort_order', { ascending: true });

      const items = (itemRows || []).map(mapInvoiceItemRowToDomain);
      return ok(mapInvoiceRowToDomain(invRow, items));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async list(filters: InvoiceFilters = {}, _context?: RequestContext): Promise<Result<Invoice[], DomainError>> {
    try {
      let query = this.client
        .from('invoices')
        .select('*, invoice_items(*)')
        .order('created_at', { ascending: false });

      if (filters.workspaceId) {
        query = query.eq('workspace_id', filters.workspaceId);
      }
      if (filters.propertyId) {
        query = query.eq('property_id', filters.propertyId);
      }
      if (filters.leaseId) {
        query = query.eq('lease_id', filters.leaseId);
      }
      if (filters.tenantId) {
        query = query.eq('tenant_id', filters.tenantId);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.startDate) {
        query = query.gte('issue_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('due_date', filters.endDate);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      const { data, error } = await query;
      if (error) return err(toSafeDomainError(error));

      const invoices: Invoice[] = (data || []).map((row: any) => {
        const items = (row.invoice_items || []).map(mapInvoiceItemRowToDomain);
        return mapInvoiceRowToDomain(row, items);
      });

      // Filter by search query if present
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        return ok(
          invoices.filter(
            (i) =>
              i.invoiceNumber.toLowerCase().includes(q) ||
              (i.customerName && i.customerName.toLowerCase().includes(q)) ||
              (i.customerEmail && i.customerEmail.toLowerCase().includes(q))
          )
        );
      }

      return ok(invoices);
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async getNextInvoiceNumber(workspaceId: string, prefix: string = 'INV', year: number = new Date().getFullYear()): Promise<Result<string, DomainError>> {
    try {
      // Call atomic stored procedure
      const { data, error } = await (this.client as any).rpc('get_next_invoice_number', {
        p_workspace_id: workspaceId,
        p_prefix: prefix,
        p_year: year,
      });

      if (error) {
        // Fallback in case rpc is unavailable: compute sequence manually
        const fallbackNum = Math.floor(100000 + Math.random() * 900000);
        return ok(`${prefix}-${year}-${fallbackNum}`);
      }

      return ok(data);
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async create(data: CreateInvoiceData, context?: RequestContext): Promise<Result<Invoice, DomainError>> {
    try {
      const invPayload: Record<string, any> = {
        workspace_id: data.workspaceId,
        invoice_number: data.invoiceNumber,
        currency: data.currency,
        property_id: data.propertyId || null,
        unit_id: data.unitId || null,
        lease_id: data.leaseId || null,
        tenant_id: data.tenantId || null,
        customer_name: data.customerName || null,
        customer_email: data.customerEmail || null,
        customer_address: data.customerAddress || null,
        subtotal: data.subtotal,
        tax_amount: data.taxAmount,
        total_amount: data.totalAmount,
        balance_due: data.balanceDue,
        issue_date: data.issueDate,
        due_date: data.dueDate,
        notes: data.notes || null,
        payment_instructions: data.paymentInstructions || null,
        template_id: data.templateId || null,
        status: data.status || 'draft',
        created_by: context?.userId || null,
      };

      if (data.billingPeriodStart) invPayload.billing_period_start = data.billingPeriodStart;
      if (data.billingPeriodEnd) invPayload.billing_period_end = data.billingPeriodEnd;

      const { data: insertedInv, error: invError } = await this.client
        .from('invoices')
        .insert(invPayload)
        .select()
        .single();

      if (invError) return err(toSafeDomainError(invError));

      // Insert normalized items
      const itemsPayload = data.items.map((it, idx) => {
        const itemAmount = Math.round(Number(it.quantity) * Number(it.unitPrice) * 100) / 100;
        return {
          invoice_id: insertedInv.id,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          amount: itemAmount,
          tax_rate: it.taxRate,
          tax_amount: it.taxAmount,
          line_total: it.lineTotal ?? itemAmount,
          sort_order: idx,
        };
      });

      const { data: insertedItems, error: itemsError } = await this.client
        .from('invoice_items')
        .insert(itemsPayload)
        .select();

      if (itemsError) return err(toSafeDomainError(itemsError));

      const items = (insertedItems || []).map(mapInvoiceItemRowToDomain);
      return ok(mapInvoiceRowToDomain(insertedInv, items));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async update(id: string, data: UpdateInvoiceData, _context?: RequestContext): Promise<Result<Invoice, DomainError>> {
    try {
      const updatePayload: any = {};
      if (data.currency !== undefined) updatePayload.currency = data.currency;
      if (data.propertyId !== undefined) updatePayload.property_id = data.propertyId;
      if (data.unitId !== undefined) updatePayload.unit_id = data.unitId;
      if (data.leaseId !== undefined) updatePayload.lease_id = data.leaseId;
      if (data.tenantId !== undefined) updatePayload.tenant_id = data.tenantId;
      if (data.customerName !== undefined) updatePayload.customer_name = data.customerName;
      if (data.customerEmail !== undefined) updatePayload.customer_email = data.customerEmail;
      if (data.customerAddress !== undefined) updatePayload.customer_address = data.customerAddress;
      if (data.subtotal !== undefined) updatePayload.subtotal = data.subtotal;
      if (data.taxAmount !== undefined) updatePayload.tax_amount = data.taxAmount;
      if (data.totalAmount !== undefined) updatePayload.total_amount = data.totalAmount;
      if (data.balanceDue !== undefined) updatePayload.balance_due = data.balanceDue;
      if (data.issueDate !== undefined) updatePayload.issue_date = data.issueDate;
      if (data.dueDate !== undefined) updatePayload.due_date = data.dueDate;
      if (data.billingPeriodStart !== undefined) updatePayload.billing_period_start = data.billingPeriodStart;
      if (data.billingPeriodEnd !== undefined) updatePayload.billing_period_end = data.billingPeriodEnd;
      if (data.notes !== undefined) updatePayload.notes = data.notes;
      if (data.paymentInstructions !== undefined) updatePayload.payment_instructions = data.paymentInstructions;
      if (data.templateId !== undefined) updatePayload.template_id = data.templateId;
      updatePayload.updated_at = new Date().toISOString();

      const { data: updatedInv, error: updateError } = await this.client
        .from('invoices')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (updateError) return err(toSafeDomainError(updateError));

      // Replace items if provided
      if (data.items) {
        await this.client.from('invoice_items').delete().eq('invoice_id', id);
        const newItems = data.items.map((it, idx) => {
          const itemAmount = Math.round(Number(it.quantity) * Number(it.unitPrice) * 100) / 100;
          return {
            invoice_id: id,
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unitPrice,
            amount: itemAmount,
            tax_rate: it.taxRate,
            tax_amount: it.taxAmount,
            line_total: it.lineTotal ?? itemAmount,
            sort_order: idx,
          };
        });
        await this.client.from('invoice_items').insert(newItems);
      }

      const { data: itemRows } = await this.client
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('sort_order', { ascending: true });

      const items = (itemRows || []).map(mapInvoiceItemRowToDomain);
      return ok(mapInvoiceRowToDomain(updatedInv, items));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async updateStatus(
    id: string,
    status: InvoiceStatus,
    extra?: {
      balanceDue?: number;
      paidAt?: string;
      issuedAt?: string;
      cancellationReason?: string;
      snapshot?: InvoiceSnapshot;
    },
    _context?: RequestContext
  ): Promise<Result<Invoice, DomainError>> {
    try {
      const payload: any = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (extra?.balanceDue !== undefined) payload.balance_due = extra.balanceDue;
      if (extra?.paidAt !== undefined) payload.paid_at = extra.paidAt;
      if (extra?.issuedAt !== undefined) payload.issued_at = extra.issuedAt;
      if (extra?.cancellationReason !== undefined) payload.cancellation_reason = extra.cancellationReason;
      if (extra?.snapshot !== undefined) payload.snapshot = extra.snapshot;

      const { data: updated, error } = await this.client
        .from('invoices')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) return err(toSafeDomainError(error));

      const { data: itemRows } = await this.client
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('sort_order', { ascending: true });

      const items = (itemRows || []).map(mapInvoiceItemRowToDomain);
      return ok(mapInvoiceRowToDomain(updated, items));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async deleteDraft(id: string, _context?: RequestContext): Promise<Result<void, DomainError>> {
    try {
      const { error } = await this.client
        .from('invoices')
        .delete()
        .eq('id', id)
        .eq('status', 'draft');

      if (error) return err(toSafeDomainError(error));
      return ok(undefined);
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async delete(id: string, _context?: RequestContext): Promise<Result<void, DomainError>> {
    try {
      // Clean up child records first
      await this.client.from('invoice_items').delete().eq('invoice_id', id);
      await this.client.from('invoice_documents').delete().eq('invoice_id', id);

      const { error } = await this.client
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) return err(toSafeDomainError(error));
      return ok(undefined);
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }
}
