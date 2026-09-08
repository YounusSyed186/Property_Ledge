/**
 * Invoice Document Application Service.
 * Orchestrates rendering, storage upload, and signed URL generation for PDF and DOCX documents.
 */

import { Result, ok, err } from '@/shared/domain/result';
import { DomainError, NotFoundError, ExternalServiceError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';
import { TypedSupabaseClient } from '@/shared/infrastructure/database/supabase';
import { InvoiceRepository } from '../../domain/repositories/invoice-repository';
import { InvoiceTemplateRepository } from '../../domain/repositories/invoice-template-repository';
import { InvoiceDocument, DocumentType } from '../../domain/entities/invoice-document';
import { InvoiceRenderDTO } from '../dto/invoice-render-dto';
import { formatInvoiceAmount } from '../../domain/value-objects/currency';
import { PdfInvoiceAdapter } from '../../infrastructure/documents/pdf/pdf-invoice-adapter';
import { DocxInvoiceAdapter } from '../../infrastructure/documents/docx/docx-invoice-adapter';
import { InvoiceStorageService } from '../../infrastructure/storage/invoice-storage-service';

export interface GenerateDocOptions {
  invoiceId: string;
  format: 'pdf' | 'docx';
  forceRegenerate?: boolean;
}

export interface GeneratedDocResult {
  id: string;
  format: 'pdf' | 'docx';
  storagePath: string;
  documentUrl: string;
  buffer?: Buffer;
}

export class InvoiceDocumentService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly templateRepository: InvoiceTemplateRepository,
    private readonly storageService: InvoiceStorageService,
    private readonly client: TypedSupabaseClient
  ) {}

  /**
   * Builds the canonical InvoiceRenderDTO from domain invoice and template data.
   */
  public async buildRenderDTO(invoiceId: string, context?: RequestContext): Promise<Result<InvoiceRenderDTO, DomainError>> {
    const invRes = await this.invoiceRepository.getById(invoiceId, context);
    if (!invRes.success) return err(invRes.error);
    const invoice = invRes.data;

    let template = null;
    if (invoice.templateId) {
      const tmplRes = await this.templateRepository.getById(invoice.templateId, context);
      if (tmplRes.success) template = tmplRes.data;
    }

    const currency = invoice.currency || 'AUD';

    const billTo = invoice.snapshot?.billTo || {
      name: invoice.customerName || 'Customer',
      email: invoice.customerEmail,
      address: invoice.customerAddress,
    };

    const issuer = invoice.snapshot?.issuer || {
      name: 'Property Ledge Management',
      email: 'manager@propertyledge.com.au',
      phone: '+61 2 9000 0000',
    };

    const amountPaid = invoice.totalAmount - invoice.balanceDue;

    const renderDto: InvoiceRenderDTO = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      currencyCode: currency,
      currencySymbol: currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$',
      issueDateFormatted: invoice.issueDate,
      dueDateFormatted: invoice.dueDate,
      billingPeriodFormatted:
        invoice.billingPeriodStart && invoice.billingPeriodEnd
          ? `${invoice.billingPeriodStart} to ${invoice.billingPeriodEnd}`
          : null,
      billTo,
      issuer,
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
      brandColor: template?.brandColor || '#22333b',
      accentColor: template?.accentColor || '#a9927d',
      logoUrl: template?.logoUrl || null,
      layoutStyle: template?.layoutStyle || 'classic',
    };

    return ok(renderDto);
  }

  /**
   * Generates, uploads, and registers a PDF document for an invoice.
   */
  public async generateAndStorePdf(
    invoiceId: string,
    context?: RequestContext
  ): Promise<Result<{ document: InvoiceDocument; signedUrl: string; buffer: Buffer }, DomainError>> {
    const renderRes = await this.buildRenderDTO(invoiceId, context);
    if (!renderRes.success) return err(renderRes.error);
    const renderDto = renderRes.data;

    const invRes = await this.invoiceRepository.getById(invoiceId, context);
    if (!invRes.success) return err(invRes.error);
    const invoice = invRes.data;

    try {
      const pdfBytes = await PdfInvoiceAdapter.generate(renderDto);
      const fileName = `${invoice.invoiceNumber}.pdf`;

      const uploadRes = await this.storageService.uploadDocument(
        invoice.workspaceId,
        invoice.id,
        fileName,
        pdfBytes,
        'application/pdf'
      );
      if (!uploadRes.success) return err(uploadRes.error);

      // Record in invoice_documents table
      const { data: docRow, error: docError } = await (this.client as any)
        .from('invoice_documents')
        .insert({
          invoice_id: invoice.id,
          workspace_id: invoice.workspaceId,
          document_type: 'pdf',
          storage_path: uploadRes.data.storagePath,
          file_name: fileName,
          mime_type: 'application/pdf',
          file_size_bytes: uploadRes.data.fileSizeBytes,
        })
        .select()
        .single();

      if (docError) return err(new ExternalServiceError('Database', `Failed to save invoice document record: ${docError.message}`));

      const signedUrlRes = await this.storageService.getSignedUrl(uploadRes.data.storagePath, 1800); // 30 min
      if (!signedUrlRes.success) return err(signedUrlRes.error);

      return ok({
        document: {
          id: docRow.id,
          invoiceId: docRow.invoice_id,
          workspaceId: docRow.workspace_id,
          documentType: 'pdf',
          storagePath: docRow.storage_path,
          fileName: docRow.file_name,
          mimeType: docRow.mime_type,
          fileSizeBytes: docRow.file_size_bytes,
          createdAt: docRow.created_at,
        },
        signedUrl: signedUrlRes.data,
        buffer: Buffer.from(pdfBytes),
      });
    } catch (e: any) {
      return err(new ExternalServiceError('PdfLib', `PDF generation failure: ${e.message}`));
    }
  }

  /**
   * Generates, uploads, and registers a DOCX document for an invoice.
   */
  public async generateAndStoreDocx(
    invoiceId: string,
    context?: RequestContext
  ): Promise<Result<{ document: InvoiceDocument; signedUrl: string; buffer: Buffer }, DomainError>> {
    const renderRes = await this.buildRenderDTO(invoiceId, context);
    if (!renderRes.success) return err(renderRes.error);
    const renderDto = renderRes.data;

    const invRes = await this.invoiceRepository.getById(invoiceId, context);
    if (!invRes.success) return err(invRes.error);
    const invoice = invRes.data;

    try {
      const docxBuffer = await DocxInvoiceAdapter.generate(renderDto);
      const fileName = `${invoice.invoiceNumber}.docx`;

      const uploadRes = await this.storageService.uploadDocument(
        invoice.workspaceId,
        invoice.id,
        fileName,
        docxBuffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      if (!uploadRes.success) return err(uploadRes.error);

      const { data: docRow, error: docError } = await (this.client as any)
        .from('invoice_documents')
        .insert({
          invoice_id: invoice.id,
          workspace_id: invoice.workspaceId,
          document_type: 'docx',
          storage_path: uploadRes.data.storagePath,
          file_name: fileName,
          mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          file_size_bytes: uploadRes.data.fileSizeBytes,
        })
        .select()
        .single();

      if (docError) return err(new ExternalServiceError('Database', `Failed to save invoice document record: ${docError.message}`));

      const signedUrlRes = await this.storageService.getSignedUrl(uploadRes.data.storagePath, 1800);
      if (!signedUrlRes.success) return err(signedUrlRes.error);

      return ok({
        document: {
          id: docRow.id,
          invoiceId: docRow.invoice_id,
          workspaceId: docRow.workspace_id,
          documentType: 'docx',
          storagePath: docRow.storage_path,
          fileName: docRow.file_name,
          mimeType: docRow.mime_type,
          fileSizeBytes: docRow.file_size_bytes,
          createdAt: docRow.created_at,
        },
        signedUrl: signedUrlRes.data,
        buffer: docxBuffer,
      });
    } catch (e: any) {
      return err(new ExternalServiceError('Docx', `DOCX generation failure: ${e.message}`));
    }
  }

  /**
   * Retrieves download URL for an existing document or generates it on-demand.
   */
  public async getDownloadUrl(invoiceId: string, type: DocumentType = 'pdf', context?: RequestContext): Promise<Result<string, DomainError>> {
    const { data: existingDoc } = await (this.client as any)
      .from('invoice_documents')
      .select('*')
      .eq('invoice_id', invoiceId)
      .eq('document_type', type)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingDoc) {
      const signedUrlRes = await this.storageService.getSignedUrl(existingDoc.storage_path, 1800);
      if (signedUrlRes.success) {
        return ok(signedUrlRes.data);
      }
    }

    if (type === 'pdf') {
      const res = await this.generateAndStorePdf(invoiceId, context);
      return res.success ? ok(res.data.signedUrl) : err(res.error);
    } else {
      const res = await this.generateAndStoreDocx(invoiceId, context);
      return res.success ? ok(res.data.signedUrl) : err(res.error);
    }
  }

  /**
   * Helper method for server actions / automation handlers
   */
  public async generateDocument(options: GenerateDocOptions): Promise<GeneratedDocResult> {
    if (options.format === 'docx') {
      const res = await this.generateAndStoreDocx(options.invoiceId);
      if (!res.success) throw res.error;
      return {
        id: res.data.document.id,
        format: 'docx',
        storagePath: res.data.document.storagePath,
        documentUrl: res.data.signedUrl,
        buffer: res.data.buffer,
      };
    } else {
      const res = await this.generateAndStorePdf(options.invoiceId);
      if (!res.success) throw res.error;
      return {
        id: res.data.document.id,
        format: 'pdf',
        storagePath: res.data.document.storagePath,
        documentUrl: res.data.signedUrl,
        buffer: res.data.buffer,
      };
    }
  }

  public async getDocumentUrl(invoiceId: string, format: 'pdf' | 'docx' = 'pdf'): Promise<string> {
    const res = await this.getDownloadUrl(invoiceId, format);
    if (!res.success) throw res.error;
    return res.data;
  }
}
