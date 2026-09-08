/**
 * Invoice State Machine and Immutability Validator.
 * Pure Domain Service - guarantees accounting integrity.
 */

import { InvoiceStatus } from '../entities/invoice';

export class InvoiceStateMachine {
  /**
   * Evaluates if a transition between two statuses is valid.
   */
  public static canTransition(current: InvoiceStatus, target: InvoiceStatus): boolean {
    if (current === target) return true;

    // Immutability: paid or cancelled cannot transition backward to draft or issued
    if (current === 'paid') return false;
    if (current === 'cancelled' || current === 'void') return false;

    if (current === 'draft') {
      return ['issued', 'cancelled'].includes(target);
    }

    if (['issued', 'viewed'].includes(current)) {
      return ['partially_paid', 'paid', 'overdue', 'cancelled'].includes(target);
    }

    if (current === 'partially_paid') {
      return ['paid', 'overdue', 'cancelled'].includes(target);
    }

    if (current === 'overdue') {
      return ['partially_paid', 'paid', 'cancelled'].includes(target);
    }

    return false;
  }

  public static isModifiable(status: InvoiceStatus): boolean {
    return status === 'draft';
  }

  /**
   * Unpaid invoices (draft, issued, viewed, overdue) can have details or line items edited.
   */
  public static canEdit(status: InvoiceStatus): boolean {
    return ['draft', 'issued', 'viewed', 'overdue'].includes(status);
  }

  /**
   * Only draft invoices can transition to issued.
   */
  public static canIssue(status: InvoiceStatus): boolean {
    return status === 'draft';
  }

  /**
   * Only issued, viewed, partially_paid, or overdue invoices can receive payments.
   */
  public static canRecordPayment(status: InvoiceStatus): boolean {
    return ['issued', 'viewed', 'partially_paid', 'overdue'].includes(status);
  }

  /**
   * Only unfinalized/unpaid invoices can be cancelled.
   * Paid invoices cannot be cancelled without credit note/refund flow.
   */
  public static canCancel(status: InvoiceStatus): boolean {
    return ['draft', 'issued', 'viewed', 'overdue'].includes(status);
  }

  /**
   * Financial regulations forbid deleting issued/paid invoices.
   * Only unissued drafts may be deleted.
   */
  public static canDelete(status: InvoiceStatus): boolean {
    return status === 'draft';
  }

  /**
   * Calculates new status after payment is applied.
   */
  public static getStatusAfterPayment(totalAmount: number, totalPaid: number): InvoiceStatus {
    if (totalPaid >= totalAmount) {
      return 'paid';
    }
    if (totalPaid > 0) {
      return 'partially_paid';
    }
    return 'issued';
  }

  /**
   * Checks if an invoice is overdue based on due date.
   */
  public static isOverdue(dueDate: string, status: InvoiceStatus): boolean {
    if (['paid', 'cancelled', 'void', 'draft'].includes(status)) {
      return false;
    }
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }
}
