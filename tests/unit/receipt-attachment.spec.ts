import { test, expect } from '@playwright/test';
import {
  validateReceiptFile,
  sanitizeReceiptFileName,
  ALLOWED_RECEIPT_EXTENSIONS,
  ALLOWED_RECEIPT_MIME_TYPES,
  MAX_RECEIPT_FILE_SIZE,
  createTransactionSchema,
  updateTransactionSchema,
} from '../../modules/finance/domain/validation';
import { formatFileSize } from '../../components/finance/ReceiptAttachment';
import { CreateTransactionInput, UpdateTransactionInput } from '../../modules/finance/domain/types';

test.describe('PropertyLedge — Receipt Attachment & Vercel Blob Validation Suite', () => {
  const sampleWorkspaceId = '11111111-1111-4111-8111-111111111111';
  const samplePropertyId = '22222222-2222-4222-8222-222222222222';
  const sampleExpenseCategoryId = '55555555-5555-4555-8555-555555555555';

  // 1. File Type & Extension Validation
  test.describe('1. Receipt File Type Validation', () => {
    test('Accepts valid PDF receipts', () => {
      const result = validateReceiptFile({
        name: 'invoice-sep-2026.pdf',
        size: 1024 * 1024, // 1 MB
        type: 'application/pdf',
      });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('Accepts valid JPG/JPEG image receipts', () => {
      const jpgRes = validateReceiptFile({
        name: 'hardware-store-receipt.jpg',
        size: 500 * 1024,
        type: 'image/jpeg',
      });
      expect(jpgRes.valid).toBe(true);

      const jpegRes = validateReceiptFile({
        name: 'plumbing_bill.jpeg',
        size: 750 * 1024,
        type: 'image/jpeg',
      });
      expect(jpegRes.valid).toBe(true);
    });

    test('Accepts valid PNG image receipts', () => {
      const result = validateReceiptFile({
        name: 'strata-levy-receipt.png',
        size: 2 * 1024 * 1024, // 2 MB
        type: 'image/png',
      });
      expect(result.valid).toBe(true);
    });

    test('Accepts valid WebP image receipts', () => {
      const result = validateReceiptFile({
        name: 'council_rates.webp',
        size: 350 * 1024,
        type: 'image/webp',
      });
      expect(result.valid).toBe(true);
    });

    test('Rejects unsupported file extensions (e.g. .txt, .exe, .zip, .docx)', () => {
      const txtRes = validateReceiptFile({
        name: 'receipt.txt',
        size: 1024,
        type: 'text/plain',
      });
      expect(txtRes.valid).toBe(false);
      expect(txtRes.error).toContain('Unsupported file type');

      const exeRes = validateReceiptFile({
        name: 'malicious.exe',
        size: 1024,
        type: 'application/x-msdownload',
      });
      expect(exeRes.valid).toBe(false);

      const zipRes = validateReceiptFile({
        name: 'archive.zip',
        size: 1024,
        type: 'application/zip',
      });
      expect(zipRes.valid).toBe(false);
    });
  });

  // 2. File Size Limits (Max 10 MB)
  test.describe('2. Receipt File Size Validation', () => {
    test('Accepts files up to exactly 10 MB (10,485,760 bytes)', () => {
      const result = validateReceiptFile({
        name: 'high-res-contractor-tax-invoice.pdf',
        size: 10 * 1024 * 1024, // Exactly 10 MB
        type: 'application/pdf',
      });
      expect(result.valid).toBe(true);
    });

    test('Rejects files strictly exceeding 10 MB', () => {
      const result = validateReceiptFile({
        name: 'oversized-scan.pdf',
        size: 10 * 1024 * 1024 + 1, // 10 MB + 1 byte
        type: 'application/pdf',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('This receipt is too large');
      expect(result.error).toContain('10 MB');
    });

    test('Rejects missing or null file descriptors', () => {
      const result = validateReceiptFile(null as any);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // 3. Filename Sanitization & Path Traversal Prevention
  test.describe('3. Filename Sanitization & Collision Safety', () => {
    test('Strips path traversal sequences like ../ and ..\\', () => {
      const sanitized = sanitizeReceiptFileName('../../../etc/passwd/electricity.pdf');
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
      expect(sanitized).toBe('electricity.pdf');
    });

    test('Replaces illegal characters, spaces, and colons with underscores', () => {
      const sanitized = sanitizeReceiptFileName('Tax: Invoice* Sept "2026" <final>.pdf');
      expect(sanitized).not.toContain(':');
      expect(sanitized).not.toContain('*');
      expect(sanitized).not.toContain('"');
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).toContain('tax_invoice_sept_2026_final_.pdf');
    });

    test('Handles empty or special-only names gracefully', () => {
      const sanitized = sanitizeReceiptFileName('');
      expect(sanitized).toBe('receipt');
    });
  });

  // 4. Human-Readable Size Formatter Tests
  test.describe('4. File Size Formatter', () => {
    test('Formats bytes to readable KB / MB values', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(842391)).toBe('822.6 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(7.8 * 1024 * 1024)).toBe('7.8 MB');
    });
  });

  // 5. Transaction Schema Integration with Receipt Metadata
  test.describe('5. Transaction Schema with Optional Receipt Fields', () => {
    test('Validates expense transaction without receipt (receipt fields optional/null)', () => {
      const input: CreateTransactionInput = {
        amount: 450.0,
        transaction_type: 'expense',
        transaction_category_id: sampleExpenseCategoryId,
        transaction_date: '2026-09-24',
        property_id: samplePropertyId,
        workspace_id: sampleWorkspaceId,
        description: 'Smoke alarm safety inspection',
        vendor_name: 'Smoke Safety Vic',
        status: 'completed',
      };

      const result = createTransactionSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test('Validates expense transaction with full Vercel Blob receipt metadata', () => {
      const input: CreateTransactionInput = {
        amount: 880.0,
        transaction_type: 'expense',
        transaction_category_id: sampleExpenseCategoryId,
        transaction_date: '2026-09-24',
        property_id: samplePropertyId,
        workspace_id: sampleWorkspaceId,
        description: 'Air conditioning emergency repair',
        vendor_name: 'Cool Breeze Heating & Cooling',
        status: 'completed',
        receipt_url: 'https://public.blob.vercel-storage.com/workspaces/w1/receipts/ac-repair.pdf',
        receipt_blob_path: 'workspaces/w1/transactions/t1/receipt/9f1a2b-ac-repair.pdf',
        receipt_file_name: 'ac-repair.pdf',
        receipt_file_size: 842391,
        receipt_mime_type: 'application/pdf',
        receipt_uploaded_at: '2026-09-24T10:00:00.000Z',
      };

      const result = createTransactionSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.receipt_url).toBe(
          'https://public.blob.vercel-storage.com/workspaces/w1/receipts/ac-repair.pdf'
        );
        expect(result.data.receipt_file_name).toBe('ac-repair.pdf');
        expect(result.data.receipt_file_size).toBe(842391);
        expect(result.data.receipt_mime_type).toBe('application/pdf');
      }
    });

    test('Validates updating an existing transaction with replacement receipt', () => {
      const updateInput: UpdateTransactionInput = {
        receipt_url: 'https://public.blob.vercel-storage.com/workspaces/w1/receipts/updated-receipt.jpg',
        receipt_blob_path: 'workspaces/w1/transactions/t1/receipt/b2c3d4-updated-receipt.jpg',
        receipt_file_name: 'updated-receipt.jpg',
        receipt_file_size: 512000,
        receipt_mime_type: 'image/jpeg',
        receipt_uploaded_at: '2026-09-24T12:30:00.000Z',
      };

      const result = updateTransactionSchema.safeParse(updateInput);
      expect(result.success).toBe(true);
    });

    test('Validates removing a receipt by setting fields to null', () => {
      const removeInput: UpdateTransactionInput = {
        receipt_url: null,
        receipt_blob_path: null,
        receipt_file_name: null,
        receipt_file_size: null,
        receipt_mime_type: null,
        receipt_uploaded_at: null,
      };

      const result = updateTransactionSchema.safeParse(removeInput);
      expect(result.success).toBe(true);
    });
  });
});
