import { test, expect } from '@playwright/test';
import { renderInvoiceHtml } from '../../modules/invoices/domain/documents/invoice-html-template';
import { PdfInvoiceAdapter } from '../../modules/invoices/infrastructure/documents/pdf/pdf-invoice-adapter';
import { InvoiceRenderDTO } from '../../modules/invoices/application/dto/invoice-render-dto';
import { InvoiceLayoutStyle } from '../../modules/invoices/domain/entities/invoice-template';

function createSampleRenderDto(overrides: Partial<InvoiceRenderDTO> = {}): InvoiceRenderDTO {
  return {
    invoiceId: 'inv-test-123',
    invoiceNumber: 'INV-2026-000456',
    status: 'issued',
    currencyCode: 'AUD',
    currencySymbol: '$',
    issueDateFormatted: '2026-09-01',
    dueDateFormatted: '2026-09-15',
    billingPeriodFormatted: '2026-09-01 to 2026-09-30',
    billTo: {
      name: 'Sarah Connor',
      email: 'sarah.connor@example.com',
      phone: '+61 400 123 456',
      address: 'Unit 4B, 120 Ocean View Road, Manly NSW 2095',
    },
    issuer: {
      name: 'Property Ledge Management Pty Ltd',
      email: 'manager@propertyledge.com.au',
      phone: '+61 2 9000 0000',
      address: 'Level 14, 200 George Street, Sydney NSW 2000',
    },
    propertyAddress: 'Unit 4B, 120 Ocean View Road, Manly NSW 2095',
    items: [
      {
        description: 'Monthly Residential Rent - Apartment 4B',
        quantity: 1,
        unitPriceFormatted: '$2,800.00',
        taxRateFormatted: '10%',
        taxAmountFormatted: '$280.00',
        lineTotalFormatted: '$3,080.00',
      },
      {
        description: 'Allocated Secure Basement Parking Space #12',
        quantity: 1,
        unitPriceFormatted: '$150.00',
        taxRateFormatted: '10%',
        taxAmountFormatted: '$15.00',
        lineTotalFormatted: '$165.00',
      },
    ],
    subtotalFormatted: '$2,950.00',
    taxAmountFormatted: '$295.00',
    totalAmountFormatted: '$3,245.00',
    amountPaidFormatted: '$0.00',
    balanceDueFormatted: '$3,245.00',
    notes: 'Rent is due strictly within 14 days of issue date.',
    paymentInstructions: 'Direct Deposit\nBSB: 062-000\nAccount: 1234 5678\nRef: INV-2026-000456',
    headerText: 'PROPERTY LEDGE RESIDENTIAL',
    footerText: 'Thank you for choosing Property Ledge. All payments are processed securely.',
    brandColor: '#22333b',
    accentColor: '#a9927d',
    logoUrl: null,
    layoutStyle: 'classic',
    ...overrides,
  };
}

test.describe('A4 Invoice Document Rendering Pipeline', () => {
  test('generates canonical A4 HTML template with proper print dimensions and semantic tags', () => {
    const dto = createSampleRenderDto();
    const html = renderInvoiceHtml(dto);

    // 1. A4 Page dimensions and print styling
    expect(html).toContain('@page {');
    expect(html).toContain('size: A4 portrait;');
    expect(html).toContain('margin: 12mm 12mm 14mm 12mm;');

    // 2. Metadata and parties
    expect(html).toContain('INV-2026-000456');
    expect(html).toContain('Sarah Connor');
    expect(html).toContain('Property Ledge Management Pty Ltd');
    expect(html).toContain('Unit 4B, 120 Ocean View Road');

    // 3. Line items and totals
    expect(html).toContain('Monthly Residential Rent - Apartment 4B');
    expect(html).toContain('$3,245.00');
    expect(html).toContain('Tax / GST:');

    // 4. Multi-page print avoidance rules
    expect(html).toContain('display: table-header-group;');
    expect(html).toContain('page-break-inside: avoid;');
  });

  test('renders all 7 invoice visual themes with correct typography and colors', () => {
    const themes: InvoiceLayoutStyle[] = [
      'classic',
      'modern',
      'minimalist',
      'corporate',
      'elegant',
      'creative',
      'monochrome',
    ];

    for (const theme of themes) {
      const dto = createSampleRenderDto({ layoutStyle: theme });
      const html = renderInvoiceHtml(dto);

      expect(html).toContain(`Invoice ${dto.invoiceNumber}`);
      if (theme === 'elegant') {
        expect(html).toContain("Georgia, 'Times New Roman'");
      } else if (theme === 'monochrome') {
        expect(html).toContain('Courier New');
      } else if (theme === 'minimalist') {
        expect(html).toContain('border-bottom: 2px solid #18181b');
      } else {
        expect(html).toContain('font-family:');
      }
    }
  });

  test('handles multi-currency formatting including Indian Rupee (INR) and Euro (EUR)', () => {
    const inrDto = createSampleRenderDto({
      currencyCode: 'INR',
      currencySymbol: '₹',
      subtotalFormatted: '₹25,000.00',
      taxAmountFormatted: '₹4,500.00',
      totalAmountFormatted: '₹29,500.00',
      balanceDueFormatted: '₹29,500.00',
    });

    const inrHtml = renderInvoiceHtml(inrDto);
    expect(inrHtml).toContain('₹29,500.00');

    const eurDto = createSampleRenderDto({
      currencyCode: 'EUR',
      currencySymbol: '€',
      totalAmountFormatted: '€3,245.00',
      balanceDueFormatted: '€3,245.00',
    });

    const eurHtml = renderInvoiceHtml(eurDto);
    expect(eurHtml).toContain('€3,245.00');
  });

  test('generates valid PDF buffer with PDF-1.4+ magic header bytes', async () => {
    const dto = createSampleRenderDto();
    const pdfBytes = await PdfInvoiceAdapter.generate(dto);

    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(1000);

    // Verify PDF Magic Bytes (%PDF-)
    const headerString = String.fromCharCode(...pdfBytes.slice(0, 5));
    expect(headerString).toBe('%PDF-');
  });

  test('generates robust PDF for large multi-page invoices with 20 items and long descriptions', async () => {
    const largeItems = Array.from({ length: 20 }, (_, idx) => ({
      description: `Comprehensive Building Maintenance Task #${idx + 1} - Complete HVAC Inspection, Filter Replacement, and Duct Sanitation with Warranty Extension`,
      quantity: 1,
      unitPriceFormatted: '$450.00',
      taxRateFormatted: '10%',
      taxAmountFormatted: '$45.00',
      lineTotalFormatted: '$495.00',
    }));

    const largeDto = createSampleRenderDto({
      items: largeItems,
      subtotalFormatted: '$9,000.00',
      taxAmountFormatted: '$900.00',
      totalAmountFormatted: '$9,900.00',
      balanceDueFormatted: '$9,900.00',
      notes: 'Detailed engineering report attached separately. All works carried out pursuant to Building Code Clause 14A.',
    });

    const pdfBytes = await PdfInvoiceAdapter.generate(largeDto);
    expect(pdfBytes.length).toBeGreaterThan(5000);
    const headerString = String.fromCharCode(...pdfBytes.slice(0, 5));
    expect(headerString).toBe('%PDF-');
  });
});
