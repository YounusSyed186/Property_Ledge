/**
 * Canonical Invoice Render DTO.
 * Shared model consumed by both PDF and DOCX document generators.
 */

export interface InvoiceRenderParty {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
}

export interface InvoiceRenderItem {
  description: string;
  quantity: number;
  unitPriceFormatted: string;
  taxRateFormatted: string;
  taxAmountFormatted: string;
  lineTotalFormatted: string;
}

export interface InvoiceRenderDTO {
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  currencyCode: string;
  currencySymbol: string;

  // Dates
  issueDateFormatted: string;
  dueDateFormatted: string;
  billingPeriodFormatted?: string | null;

  // Parties
  billTo: InvoiceRenderParty;
  issuer: InvoiceRenderParty;
  propertyAddress?: string | null;

  // Items & Totals
  items: InvoiceRenderItem[];
  subtotalFormatted: string;
  taxAmountFormatted: string;
  totalAmountFormatted: string;
  amountPaidFormatted: string;
  balanceDueFormatted: string;

  // Notes & Footer
  notes?: string | null;
  paymentInstructions?: string | null;
  headerText?: string | null;
  footerText?: string | null;

  // Styling Tokens
  brandColor: string;
  accentColor: string;
  logoUrl?: string | null;
  layoutStyle: string;
}
