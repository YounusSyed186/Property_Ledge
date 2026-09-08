/**
 * Floating-Point Safe Invoice Calculation Service.
 * Pure Domain Service - Zero external dependencies.
 */

export interface CalculationLineItemInput {
  quantity: number;
  unitPrice: number;
  taxRate?: number; // e.g. 10 for 10%
}

export interface CalculatedLineItem {
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  lineTotal: number;
}

export interface CalculatedInvoiceTotals {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  balanceDue: number;
  items: CalculatedLineItem[];
}

/**
 * Rounds a number safely to fixed decimal places to prevent floating-point representation drift.
 */
export function roundToDecimals(value: number, decimals: number = 2): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export class InvoiceCalculator {
  /**
   * Computes a single line item with precise subtotal, tax amount, and line total.
   */
  public static calculateLineItem(item: CalculationLineItemInput): CalculatedLineItem {
    const qty = Math.max(0, item.quantity || 0);
    const price = Math.max(0, item.unitPrice || 0);
    const taxRate = Math.max(0, item.taxRate || 0);

    const subtotal = roundToDecimals(qty * price, 2);
    const taxAmount = roundToDecimals(subtotal * (taxRate / 100), 2);
    const lineTotal = roundToDecimals(subtotal + taxAmount, 2);

    return {
      quantity: qty,
      unitPrice: price,
      taxRate,
      subtotal,
      taxAmount,
      lineTotal,
    };
  }

  /**
   * Computes overall invoice totals across all line items and calculates balance due.
   */
  public static calculateTotals(
    items: CalculationLineItemInput[],
    amountPaid: number = 0
  ): CalculatedInvoiceTotals {
    const calculatedItems = items.map((item) => this.calculateLineItem(item));

    const subtotal = roundToDecimals(
      calculatedItems.reduce((acc, curr) => acc + curr.subtotal, 0),
      2
    );
    const taxAmount = roundToDecimals(
      calculatedItems.reduce((acc, curr) => acc + curr.taxAmount, 0),
      2
    );
    const totalAmount = roundToDecimals(subtotal + taxAmount, 2);
    const safeAmountPaid = Math.max(0, roundToDecimals(amountPaid || 0, 2));
    const balanceDue = roundToDecimals(Math.max(0, totalAmount - safeAmountPaid), 2);

    return {
      subtotal,
      taxAmount,
      totalAmount,
      balanceDue,
      items: calculatedItems,
    };
  }
}
