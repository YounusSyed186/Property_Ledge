/**
 * DOCX Invoice Document Generator Adapter.
 * Generates structured Microsoft Word .docx OpenXML documents using docx package.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
} from 'docx';
import { InvoiceRenderDTO } from '../../../application/dto/invoice-render-dto';

export class DocxInvoiceAdapter {
  public static async generate(dto: InvoiceRenderDTO): Promise<Buffer> {
    const tableBorderNone = {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    };

    const headerBorder = {
      top: { style: BorderStyle.SINGLE, size: 1, color: '22333b' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '22333b' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    };

    const cellBorderBottom = {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'e5e7eb' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    };

    // Build Table Rows for line items
    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          borders: headerBorder,
          shading: { fill: '22333b' },
          children: [new Paragraph({ children: [new TextRun({ text: 'Description', bold: true, color: 'ffffff' })] })],
          width: { size: 50, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          borders: headerBorder,
          shading: { fill: '22333b' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Qty', bold: true, color: 'ffffff' })] })],
          width: { size: 10, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          borders: headerBorder,
          shading: { fill: '22333b' },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Unit Price', bold: true, color: 'ffffff' })] })],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          borders: headerBorder,
          shading: { fill: '22333b' },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Tax', bold: true, color: 'ffffff' })] })],
          width: { size: 10, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          borders: headerBorder,
          shading: { fill: '22333b' },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Total', bold: true, color: 'ffffff' })] })],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
      ],
    });

    const itemRows = dto.items.map((item, idx) => {
      const bgColor = idx % 2 === 1 ? 'f9fafb' : 'ffffff';
      return new TableRow({
        children: [
          new TableCell({
            borders: cellBorderBottom,
            shading: { fill: bgColor },
            children: [new Paragraph({ children: [new TextRun({ text: item.description })] })],
          }),
          new TableCell({
            borders: cellBorderBottom,
            shading: { fill: bgColor },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.quantity) })] })],
          }),
          new TableCell({
            borders: cellBorderBottom,
            shading: { fill: bgColor },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: item.unitPriceFormatted })] })],
          }),
          new TableCell({
            borders: cellBorderBottom,
            shading: { fill: bgColor },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: item.taxRateFormatted })] })],
          }),
          new TableCell({
            borders: cellBorderBottom,
            shading: { fill: bgColor },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: item.lineTotalFormatted, bold: true })] })],
          }),
        ],
      });
    });

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 720,
                bottom: 720,
                left: 720,
                right: 720,
              },
            },
          },
          children: [
            // Title and branding
            new Paragraph({
              children: [
                new TextRun({
                  text: 'TAX INVOICE',
                  bold: true,
                  size: 36,
                  color: '22333b',
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'PROPERTY LEDGE MANAGEMENT',
                  bold: true,
                  size: 18,
                  color: 'a9927d',
                }),
              ],
            }),
            new Paragraph({ text: '' }), // Spacer

            // Invoice Meta Table (Invoice #, Date, Due Date, Status)
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: tableBorderNone,
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      borders: tableBorderNone,
                      children: [
                        new Paragraph({ children: [new TextRun({ text: 'BILL TO:', bold: true, color: 'a9927d' })] }),
                        new Paragraph({ children: [new TextRun({ text: dto.billTo.name, bold: true })] }),
                        new Paragraph({ children: [new TextRun({ text: dto.billTo.email || '' })] }),
                        new Paragraph({ children: [new TextRun({ text: dto.billTo.address || '' })] }),
                      ],
                    }),
                    new TableCell({
                      borders: tableBorderNone,
                      children: [
                        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Invoice Number: ${dto.invoiceNumber}`, bold: true })] }),
                        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Issue Date: ${dto.issueDateFormatted}` })] }),
                        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Due Date: ${dto.dueDateFormatted}`, bold: true, color: 'a9927d' })] }),
                        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Status: ${dto.status.toUpperCase()}`, bold: true })] }),
                      ],
                    }),
                  ],
                }),
              ],
            }),

            new Paragraph({ text: '' }), // Spacer
            ...(dto.propertyAddress
              ? [new Paragraph({ children: [new TextRun({ text: `Property Reference: ${dto.propertyAddress}`, bold: true })] }), new Paragraph({ text: '' })]
              : []),

            // Line Items Table
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [headerRow, ...itemRows],
            }),

            new Paragraph({ text: '' }), // Spacer

            // Totals Summary Table
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: tableBorderNone,
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      borders: tableBorderNone,
                      width: { size: 60, type: WidthType.PERCENTAGE },
                      children: [
                        ...(dto.paymentInstructions
                          ? [
                              new Paragraph({ children: [new TextRun({ text: 'Payment Instructions:', bold: true })] }),
                              ...dto.paymentInstructions.split('\n').map((line) => new Paragraph({ children: [new TextRun({ text: line })] })),
                            ]
                          : []),
                      ],
                    }),
                    new TableCell({
                      borders: tableBorderNone,
                      width: { size: 40, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Subtotal: ${dto.subtotalFormatted}` })] }),
                        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Tax: ${dto.taxAmountFormatted}` })] }),
                        new Paragraph({
                          alignment: AlignmentType.RIGHT,
                          children: [new TextRun({ text: `TOTAL DUE: ${dto.totalAmountFormatted}`, bold: true, size: 24, color: '22333b' })],
                        }),
                        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Balance Due: ${dto.balanceDueFormatted}`, bold: true, color: 'a9927d' })] }),
                      ],
                    }),
                  ],
                }),
              ],
            }),

            new Paragraph({ text: '' }), // Spacer
            ...(dto.notes ? [new Paragraph({ children: [new TextRun({ text: `Notes: ${dto.notes}`, italics: true })] })] : []),

            new Paragraph({ text: '' }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Thank you for your business. Generated securely by Property Ledge.', size: 16, color: '9ca3af' })],
            }),
          ],
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }
}
