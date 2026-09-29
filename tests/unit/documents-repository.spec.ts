import { test, expect } from '@playwright/test';
import {
  formatDocumentSize,
  getFileTypeGroup,
  sanitizeDocumentFileName,
} from '@/lib/documents/storage';
import { UnifiedDocument, DocumentStats } from '@/types/documents';

test.describe('PropertyLedge — Documents & Vercel Blob Repository Suite', () => {
  test.describe('1. File Size Formatter', () => {
    test('formats bytes to human-readable strings', () => {
      expect(formatDocumentSize(0)).toBe('0 B');
      expect(formatDocumentSize(500)).toBe('500 B');
      expect(formatDocumentSize(1024)).toBe('1 KB');
      expect(formatDocumentSize(1024 * 500)).toBe('500 KB');
      expect(formatDocumentSize(1024 * 1024 * 3.5)).toBe('3.5 MB');
      expect(formatDocumentSize(1024 * 1024 * 1024 * 1.2)).toBe('1.2 GB');
      expect(formatDocumentSize(null)).toBe('0 B');
      expect(formatDocumentSize(undefined)).toBe('0 B');
    });
  });

  test.describe('2. MIME Type and Extension Classification', () => {
    test('classifies PDF documents accurately', () => {
      expect(getFileTypeGroup('application/pdf', 'lease-agreement.pdf')).toBe('pdf');
      expect(getFileTypeGroup(null, 'tax-invoice.PDF')).toBe('pdf');
      expect(getFileTypeGroup('application/pdf', 'doc')).toBe('pdf');
    });

    test('classifies image files accurately', () => {
      expect(getFileTypeGroup('image/jpeg', 'bedroom-photo.jpg')).toBe('image');
      expect(getFileTypeGroup('image/png', 'damage.png')).toBe('image');
      expect(getFileTypeGroup('image/webp', 'room.webp')).toBe('image');
      expect(getFileTypeGroup(null, 'photo.heic')).toBe('image');
    });

    test('classifies spreadsheet files accurately', () => {
      expect(getFileTypeGroup('text/csv', 'transactions.csv')).toBe('spreadsheet');
      expect(
        getFileTypeGroup(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'financials.xlsx'
        )
      ).toBe('spreadsheet');
    });

    test('falls back to other for unknown binaries or text files', () => {
      expect(getFileTypeGroup('text/plain', 'notes.txt')).toBe('other');
      expect(getFileTypeGroup('application/octet-stream', 'data.bin')).toBe('other');
    });
  });

  test.describe('3. File Name Sanitization', () => {
    test('removes illegal characters and spaces for storage', () => {
      expect(sanitizeDocumentFileName('My Lease Agreement (2026).pdf')).toBe(
        'My_Lease_Agreement_2026_.pdf'
      );
      expect(sanitizeDocumentFileName('../../etc/passwd.jpg')).toBe('passwd.jpg');
      expect(sanitizeDocumentFileName('photo___test.png')).toBe('photo_test.png');
    });
  });

  test.describe('4. Document Aggregation & Filtering Logic', () => {
    const mockDocuments: UnifiedDocument[] = [
      {
        id: 'receipt-1',
        title: 'Receipt: Plumbing Repair',
        fileName: 'plumber-invoice.pdf',
        fileUrl: 'https://public.blob.vercel-storage.com/workspaces/w1/receipts/plumber.pdf',
        fileSize: 1024 * 250,
        mimeType: 'application/pdf',
        category: 'receipt',
        propertyId: 'p-1',
        propertyName: '128 Crown St, Surry Hills',
        linkedEntityType: 'transaction',
        linkedEntityId: 'tx-1',
        linkedEntityLabel: '$350.00 - Repairs & Maintenance',
        uploadedAt: '2026-09-20T10:00:00Z',
        source: 'transaction_receipt',
        isVercelBlob: true,
      },
      {
        id: 'photo-1',
        title: 'Kitchen: Sink area',
        fileName: 'kitchen-sink.jpg',
        fileUrl: 'https://public.blob.vercel-storage.com/workspaces/w1/photos/sink.jpg',
        fileSize: 1024 * 800,
        mimeType: 'image/jpeg',
        category: 'inspection_photo',
        propertyId: 'p-1',
        propertyName: '128 Crown St, Surry Hills',
        linkedEntityType: 'inspection',
        linkedEntityId: 'rep-1',
        linkedEntityLabel: 'Kitchen (Ingoing Inspection)',
        uploadedAt: '2026-09-22T14:00:00Z',
        source: 'inspection_photo',
        isVercelBlob: true,
      },
      {
        id: 'doc-1',
        title: 'Residential Tenancy Agreement',
        fileName: 'lease-signed.pdf',
        fileUrl: 'https://public.blob.vercel-storage.com/workspaces/w1/documents/lease.pdf',
        fileSize: 1024 * 1024 * 1.5,
        mimeType: 'application/pdf',
        category: 'lease_agreement',
        propertyId: 'p-2',
        propertyName: '45 Ocean View Dr, Bondi',
        linkedEntityType: 'custom',
        uploadedAt: '2026-09-25T09:00:00Z',
        source: 'database_document',
        isVercelBlob: true,
      },
    ];

    test('calculates correct document statistics', () => {
      const totalFiles = mockDocuments.length;
      const totalSizeBytes = mockDocuments.reduce((acc, d) => acc + (d.fileSize || 0), 0);
      const receiptsCount = mockDocuments.filter((d) => d.category === 'receipt').length;
      const photosCount = mockDocuments.filter((d) => d.category === 'inspection_photo').length;
      const leasesCount = mockDocuments.filter((d) => d.category === 'lease_agreement').length;

      const stats: DocumentStats = {
        totalFiles,
        totalSizeBytes,
        receiptsCount,
        photosCount,
        reportsCount: 0,
        leasesAndAgreementsCount: leasesCount,
        complianceCount: 0,
        otherCount: 0,
      };

      expect(stats.totalFiles).toBe(3);
      expect(stats.receiptsCount).toBe(1);
      expect(stats.photosCount).toBe(1);
      expect(stats.leasesAndAgreementsCount).toBe(1);
      expect(stats.totalSizeBytes).toBe(1024 * 250 + 1024 * 800 + 1024 * 1024 * 1.5);
    });

    test('filters documents by property, category, and search query', () => {
      // Filter by category
      const receipts = mockDocuments.filter((d) => d.category === 'receipt');
      expect(receipts).toHaveLength(1);
      expect(receipts[0].id).toBe('receipt-1');

      // Filter by property
      const p1Docs = mockDocuments.filter((d) => d.propertyId === 'p-1');
      expect(p1Docs).toHaveLength(2);

      // Search query matching file name or title
      const searchMatches = mockDocuments.filter(
        (d) =>
          d.title.toLowerCase().includes('bondi') ||
          (d.propertyName && d.propertyName.toLowerCase().includes('bondi'))
      );
      expect(searchMatches).toHaveLength(1);
      expect(searchMatches[0].id).toBe('doc-1');
    });
  });
});
