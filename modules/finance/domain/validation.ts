import { z } from 'zod';

export const transactionTypeSchema = z.enum(['income', 'expense'], {
  errorMap: () => ({ message: 'Transaction type must be either income or expense' }),
});

export const transactionStatusSchema = z.enum([
  'pending',
  'completed',
  'failed',
  'reversed',
  'refunded',
]);

export const paymentMethodSchema = z.enum([
  'bank_transfer',
  'cash',
  'card',
  'cheque',
  'direct_debit',
  'other',
]);

export const createTransactionSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Amount is required and must be a number' })
    .positive('Amount must be greater than 0'),
  transaction_type: transactionTypeSchema,
  transaction_category_id: z.string().uuid('Please select a valid category'),
  transaction_date: z
    .string()
    .min(1, 'Transaction date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  property_id: z.string().uuid('Property is required'),
  workspace_id: z.string().uuid().optional(),
  payment_method: paymentMethodSchema.nullable().optional(),
  description: z.string().max(500, 'Description cannot exceed 500 characters').nullable().optional(),
  reference: z.string().max(100, 'Reference cannot exceed 100 characters').nullable().optional(),
  vendor_name: z.string().max(200, 'Vendor name cannot exceed 200 characters').nullable().optional(),
  notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').nullable().optional(),
  status: transactionStatusSchema.default('completed'),
  tenant_id: z.string().uuid().nullable().optional(),
  lease_id: z.string().uuid().nullable().optional(),
  invoice_id: z.string().uuid().nullable().optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const transactionFilterSchema = z.object({
  workspace_id: z.string().uuid().optional(),
  property_id: z.string().uuid().optional(),
  transaction_type: z.enum(['income', 'expense', 'all']).optional(),
  transaction_category_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  lease_id: z.string().uuid().optional(),
  invoice_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'completed', 'failed', 'reversed', 'refunded', 'all']).optional(),
  payment_method: z.string().optional(),
  search_query: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
});
