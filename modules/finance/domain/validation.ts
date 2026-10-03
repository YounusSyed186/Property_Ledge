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
  'credit_card',
  'debit_card',
  'cheque',
  'direct_debit',
  'stripe',
  'bpay',
  'other',
]);

const emptyToNull = (val: unknown) => (val === '' || val === undefined ? null : val);
const emptyToUndefined = (val: unknown) => (val === '' ? undefined : val);

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
  property_id: z.preprocess(emptyToUndefined, z.string().uuid('Property is required')),
  workspace_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  payment_method: z.preprocess(emptyToNull, paymentMethodSchema.nullable().optional()),
  description: z.preprocess(emptyToNull, z.string().max(500, 'Description cannot exceed 500 characters').nullable().optional()),
  reference: z.preprocess(emptyToNull, z.string().max(100, 'Reference cannot exceed 100 characters').nullable().optional()),
  vendor_name: z.preprocess(emptyToNull, z.string().max(200, 'Vendor name cannot exceed 200 characters').nullable().optional()),
  notes: z.preprocess(emptyToNull, z.string().max(2000, 'Notes cannot exceed 2000 characters').nullable().optional()),
  status: transactionStatusSchema.default('completed'),
  tenant_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  lease_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  invoice_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),

  // GST & Tax Classification
  gst_inclusive: z.boolean().default(false).optional(),
  gst_amount: z.number().min(0).default(0).optional(),
  tax_classification_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),

  // Receipt Attachment (Stored in Vercel Blob)
  receipt_url: z.preprocess(emptyToNull, z.string().url().nullable().optional()),
  receipt_blob_path: z.preprocess(emptyToNull, z.string().nullable().optional()),
  receipt_file_name: z.preprocess(emptyToNull, z.string().nullable().optional()),
  receipt_file_size: z.preprocess(emptyToNull, z.number().nullable().optional()),
  receipt_mime_type: z.preprocess(emptyToNull, z.string().nullable().optional()),
  receipt_uploaded_at: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export const updateTransactionSchema = createTransactionSchema.partial();

// Receipt File Validation Constants & Helpers
export const ALLOWED_RECEIPT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'] as const;
export const ALLOWED_RECEIPT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export const MAX_RECEIPT_FILE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes

export function validateReceiptFile(file: { name: string; size: number; type?: string }): {
  valid: boolean;
  error?: string;
} {
  if (!file || !file.name) {
    return { valid: false, error: 'No receipt file provided.' };
  }

  if (file.size > MAX_RECEIPT_FILE_SIZE) {
    return {
      valid: false,
      error: 'This receipt is too large. Maximum file size is 10 MB.',
    };
  }

  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  const isExtensionValid = (ALLOWED_RECEIPT_EXTENSIONS as readonly string[]).includes(ext);

  const isMimeValid = !file.type || (ALLOWED_RECEIPT_MIME_TYPES as readonly string[]).includes(file.type.toLowerCase());

  if (!isExtensionValid || !isMimeValid) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload a PDF, JPG, JPEG, PNG, or WebP file.',
    };
  }

  return { valid: true };
}

export function sanitizeReceiptFileName(originalName: string): string {
  // Remove directory traversal, illegal chars, control chars
  const baseName = originalName.replace(/^.*[\\\/]/, '');
  const sanitized = baseName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
  return sanitized.slice(0, 100) || 'receipt';
}

export const transactionFilterSchema = z.object({
  workspace_id: z.string().uuid().optional(),
  property_id: z.string().uuid().optional(),
  transaction_type: z.enum(['income', 'expense', 'all']).optional(),
  transaction_category_id: z.string().uuid().optional(),
  tax_classification_id: z.string().uuid().optional(),
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

export const basFilterSchema = z.object({
  workspace_id: z.string().uuid().optional(),
  property_id: z.string().uuid().nullable().optional(),
  financial_year: z.number().int().min(2000).max(2100).default(2026),
  period: z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'FY', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12']).default('Q1'),
});

export const expenseStatusSchema = z.enum([
  'pending',
  'completed',
  'partially_paid',
  'paid',
  'cancelled',
]);

export const createExpenseSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Amount is required and must be a number' })
    .positive('Amount must be greater than 0'),
  property_id: z.preprocess(emptyToUndefined, z.string().uuid('Property is required')),
  lease_id: z.preprocess(emptyToNull, z.string().uuid('Invalid lease ID').nullable().optional()),
  transaction_category_id: z.preprocess(emptyToNull, z.string().uuid('Invalid category ID').nullable().optional()),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD').optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD').optional(),
  vendor_name: z.preprocess(emptyToNull, z.string().max(200, 'Vendor name cannot exceed 200 characters').nullable().optional()),
  description: z.preprocess(emptyToNull, z.string().max(500, 'Description cannot exceed 500 characters').nullable().optional()),
  reference: z.preprocess(emptyToNull, z.string().max(100, 'Reference cannot exceed 100 characters').nullable().optional()),
  notes: z.preprocess(emptyToNull, z.string().max(2000, 'Notes cannot exceed 2000 characters').nullable().optional()),
  status: expenseStatusSchema.default('completed'),
  payment_method: z.preprocess(emptyToNull, paymentMethodSchema.nullable().optional()),
  receipt_url: z.preprocess(emptyToNull, z.string().max(1000).nullable().optional()),
  receipt_blob_path: z.preprocess(emptyToNull, z.string().nullable().optional()),
  receipt_file_name: z.preprocess(emptyToNull, z.string().nullable().optional()),
  receipt_file_size: z.preprocess(emptyToNull, z.number().nullable().optional()),
  receipt_mime_type: z.preprocess(emptyToNull, z.string().nullable().optional()),
  receipt_uploaded_at: z.preprocess(emptyToNull, z.string().nullable().optional()),
  workspace_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  gst_inclusive: z.boolean().default(false).optional(),
  gst_amount: z.number().min(0).default(0).optional(),
  tax_classification_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  attachments: z.array(z.object({
    blob_url: z.string(),
    blob_path: z.string(),
    file_name: z.string(),
    mime_type: z.string().optional(),
    file_size: z.number().optional(),
  })).optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const expenseFilterSchema = z.object({
  workspace_id: z.string().uuid().optional(),
  property_id: z.string().uuid().optional(),
  lease_id: z.string().uuid().optional(),
  transaction_category_id: z.string().uuid().optional(),
  tax_classification_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'completed', 'partially_paid', 'paid', 'cancelled', 'all']).optional(),
  search_query: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
});


