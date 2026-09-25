import {
  ExpenseDTO,
  ExpenseStatus,
} from './types';

/**
 * Calculates net expense amount and GST component
 */
export function calculateExpenseNetAndGst(
  amount: number,
  gstInclusive: boolean = true,
  gstAmount?: number
): { netAmount: number; gstAmount: number; totalAmount: number } {
  const safeAmount = Number(amount) || 0;
  let computedGst: number;

  if (gstAmount !== undefined) {
    computedGst = Number(gstAmount);
  } else if (gstInclusive && safeAmount > 0) {
    computedGst = safeAmount - safeAmount / 1.1;
  } else {
    computedGst = 0;
  }

  if (gstInclusive) {
    const net = Math.max(0, safeAmount - computedGst);
    return {
      netAmount: Math.round(net * 100) / 100,
      gstAmount: Math.round(computedGst * 100) / 100,
      totalAmount: Math.round(safeAmount * 100) / 100,
    };
  } else {
    const total = safeAmount + computedGst;
    return {
      netAmount: Math.round(safeAmount * 100) / 100,
      gstAmount: Math.round(computedGst * 100) / 100,
      totalAmount: Math.round(total * 100) / 100,
    };
  }
}
