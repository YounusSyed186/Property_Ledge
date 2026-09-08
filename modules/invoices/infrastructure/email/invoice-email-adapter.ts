import { emailService, EmailResult } from '@/lib/email/service';
import { InvoiceRenderDTO } from '../../application/dto/invoice-render-dto';

export interface SendInvoiceEmailOptions {
  to: string;
  recipientName?: string;
  invoice: InvoiceRenderDTO;
  downloadUrl?: string;
  pdfBuffer?: Buffer;
  customMessage?: string;
  driveFolderUrl?: string;
}

export class InvoiceEmailAdapter {
  async sendInvoice(options: SendInvoiceEmailOptions): Promise<EmailResult> {
    const { to, recipientName, invoice, pdfBuffer, customMessage, driveFolderUrl } = options;

    const subject = `Invoice ${invoice.invoiceNumber} from ${invoice.issuer.name || 'Property Ledge'}`;

    const rawName = recipientName || invoice.billTo.name || 'Customer';
    const firstName = rawName.trim().split(' ')[0] || rawName;

    const attachments: Array<{ filename: string; content: string }> = [];
    if (pdfBuffer) {
      attachments.push({
        filename: `${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer.toString('base64'),
      });
    }

    const bodyMessageHtml = customMessage
      ? customMessage.replace(/\n/g, '<br/>')
      : `Hi ${firstName},<br/><br/>
         Hope everything is going smoothly.<br/><br/>
         Please find attached invoice <strong>${invoice.invoiceNumber}</strong> (due <strong>${invoice.dueDateFormatted}</strong>).<br/><br/>
         Could you please review the invoice and confirm that all details are correct on your end?<br/><br/>
         Please let me know if you have any questions.<br/><br/>
         Kind regards,<br/>
         ${invoice.issuer.name || 'Property Ledge Management'}`;

    const driveLinkHtml = driveFolderUrl
      ? `<br/><br/>
         <strong>Google drive folder link for ${firstName} invoices:</strong><br/>
         <a href="${driveFolderUrl}" target="_blank" style="color: #2563eb; font-weight: 500; text-decoration: underline; word-break: break-all;">${driveFolderUrl}</a>`
      : '';

    const emailBody = `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #111827; line-height: 1.6;">
        ${bodyMessageHtml}
        ${driveLinkHtml}
      </div>
    `;

    return emailService.sendEmail({
      to,
      subject,
      templateType: 'invoice_plain',
      variables: {
        title: `Invoice ${invoice.invoiceNumber}`,
        body: emailBody,
      },
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  }
}

export const invoiceEmailAdapter = new InvoiceEmailAdapter();
