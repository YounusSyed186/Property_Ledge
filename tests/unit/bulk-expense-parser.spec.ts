import { test, expect } from '@playwright/test';
import {
  normalizeFolderName,
  classifyDocumentType,
  extractAmountAndReferenceFromFileName,
  extractDateFromFileNameAndFolder,
  extractSupplier,
  matchCategory,
  matchTaxClassification,
  parseRawFileToImportItem,
} from '@/modules/finance/domain/bulk-expense-parser';
import { CategoryDTO, TaxClassificationDTO } from '@/modules/finance/domain/types';

test.describe('PropertyLedge — Bulk Expense Parser & Extraction Unit Tests', () => {
  const mockCategories: CategoryDTO[] = [
    { id: 'cat-council', name: 'Council Rates', description: null, transaction_type: 'expense', is_active: true, created_at: '', updated_at: '' },
    { id: 'cat-water', name: 'Water & Sewerage Rates', description: null, transaction_type: 'expense', is_active: true, created_at: '', updated_at: '' },
    { id: 'cat-strata', name: 'Strata / Body Corporate', description: null, transaction_type: 'expense', is_active: true, created_at: '', updated_at: '' },
    { id: 'cat-repairs', name: 'Repairs & Maintenance', description: null, transaction_type: 'expense', is_active: true, created_at: '', updated_at: '' },
    { id: 'cat-insurance', name: 'Insurance', description: null, transaction_type: 'expense', is_active: true, created_at: '', updated_at: '' },
    { id: 'cat-other', name: 'Other Operating Expense', description: null, transaction_type: 'expense', is_active: true, created_at: '', updated_at: '' },
  ];

  const mockTaxClassifications: TaxClassificationDTO[] = [
    { id: 'tc-operating', workspace_id: 'ws-1', name: 'Taxable Operating Expense', bas_code: 'G11', description: null, applies_to: 'expense', is_active: true, created_at: '', updated_at: '' },
    { id: 'tc-gst-free', workspace_id: 'ws-1', name: 'GST-Free Expense', bas_code: 'G3', description: null, applies_to: 'expense', is_active: true, created_at: '', updated_at: '' },
  ];

  test('1. Normalizes folder names by stripping leading numeric indexes', () => {
    expect(normalizeFolderName('1. Income Statement (including maintenance expense)')).toBe('Income Statement (including maintenance expense)');
    expect(normalizeFolderName('2. Strata Bills')).toBe('Strata Bills');
    expect(normalizeFolderName('3. Council Bills')).toBe('Council Bills');
    expect(normalizeFolderName('4. Water Bills')).toBe('Water Bills');
    expect(normalizeFolderName('5. Other Expense')).toBe('Other Expense');
    expect(normalizeFolderName('6. Depreciation Report')).toBe('Depreciation Report');
    expect(normalizeFolderName('7. Interest Statement')).toBe('Interest Statement');
    expect(normalizeFolderName('08_Maintenance_Invoices')).toBe('Maintenance_Invoices');
  });

  test('2. Classifies document types correctly into EXPENSE vs SUPPORTING_DOCUMENT', () => {
    expect(classifyDocumentType('3. Council Bills', 'April $476.pdf')).toBe('EXPENSE');
    expect(classifyDocumentType('2. Strata Bills', 'January.pdf')).toBe('EXPENSE');
    expect(classifyDocumentType('6. Depreciation Report', 'depreciation.pdf')).toBe('SUPPORTING_DOCUMENT');
    expect(classifyDocumentType('1. Income Statement (including maintenance expense)', 'Income Statement.pdf')).toBe('SUPPORTING_DOCUMENT');
  });

  test('3. Extracts monetary values and descriptions accurately from filenames', () => {
    // Standard dollar amount
    const r1 = extractAmountAndReferenceFromFileName('Bunnings downlight repairs $158.pdf');
    expect(r1.amount).toBe(158.0);
    expect(r1.cleanNameWithoutAmount).toBe('Bunnings downlight repairs');

    // Decimal amount
    const r2 = extractAmountAndReferenceFromFileName('Bunnings Maintenance Tool $69.pdf');
    expect(r2.amount).toBe(69.0);
    expect(r2.cleanNameWithoutAmount).toBe('Bunnings Maintenance Tool');

    // Comma-separated currency
    const r3 = extractAmountAndReferenceFromFileName('Emergency Roof Repair $1,250.50.pdf');
    expect(r3.amount).toBe(1250.5);
    expect(r3.cleanNameWithoutAmount).toBe('Emergency Roof Repair');

    // AUD prefix
    const r4 = extractAmountAndReferenceFromFileName('Strata Levy Q1 AUD $780.00.pdf');
    expect(r4.amount).toBe(780.0);
    expect(r4.cleanNameWithoutAmount).toBe('Strata Levy Q1');

    // Standalone decimal amount without dollar sign
    const r5 = extractAmountAndReferenceFromFileName('Sydney Water 180.25.pdf');
    expect(r5.amount).toBe(180.25);
    expect(r5.cleanNameWithoutAmount).toBe('Sydney Water');
  });

  test('4. Contextual monetary parsing: does not interpret reference numbers as amounts', () => {
    const res = extractAmountAndReferenceFromFileName('April $476 883234.pdf');
    expect(res.amount).toBe(476.0);
    expect(res.possibleReference).toBe('883234');
    expect(res.cleanNameWithoutAmount).toBe('April');
  });

  test('5. Handles filenames with missing amounts safely', () => {
    const res = extractAmountAndReferenceFromFileName('Bunnings maintenance.pdf');
    expect(res.amount).toBeNull();
    expect(res.cleanNameWithoutAmount).toBe('Bunnings maintenance');
  });

  test('6. Extracts supplier names from descriptions and avoids month names', () => {
    expect(extractSupplier('Bunnings downlight repairs')).toBe('Bunnings');
    expect(extractSupplier('Sydney Water Q2 Bill')).toBe('Sydney Water');
    expect(extractSupplier('City Council Rates Notice')).toBe('City Council');
    expect(extractSupplier('Harvey Norman Appliance')).toBe('Harvey Norman');
    // Month names should not be chosen as supplier
    expect(extractSupplier('April', '3. Council Bills')).toBe('Council');
    expect(extractSupplier('August', '2. Strata Bills')).toBe('Strata');
    expect(extractSupplier('November Rates', '3. Council Bills')).toBe('Council');
  });

  test('7. Extracts dates from months, explicit dates, and folder/file patterns', () => {
    const curYear = new Date().getFullYear();
    // Standalone month
    expect(extractDateFromFileNameAndFolder('April $476.pdf', '3. Council Bills')).toBe(`${curYear}-04-01`);
    expect(extractDateFromFileNameAndFolder('August $477.pdf', '3. Council Bills')).toBe(`${curYear}-08-01`);
    expect(extractDateFromFileNameAndFolder('November Rates $476.50.pdf', '3. Council Bills')).toBe(`${curYear}-11-01`);
    expect(extractDateFromFileNameAndFolder('January $180.pdf', '4. Water Bills')).toBe(`${curYear}-01-01`);
    
    // Explicit dates with year
    expect(extractDateFromFileNameAndFolder('15 Oct 2025 Repair $150.pdf')).toBe('2025-10-15');
    expect(extractDateFromFileNameAndFolder('2025-06-30 Maintenance $220.pdf')).toBe('2025-06-30');
    expect(extractDateFromFileNameAndFolder('Water Bill 15/03/2026.pdf')).toBe('2026-03-15');
  });

  test('8. Matches categories based on folder and filename context', () => {
    const catCouncil = matchCategory('Council Bills', 'April $476.pdf', mockCategories);
    expect(catCouncil?.name).toBe('Council Rates');

    const catWater = matchCategory('Water Bills', 'January $180.pdf', mockCategories);
    expect(catWater?.name).toBe('Water & Sewerage Rates');

    const catStrata = matchCategory('Strata Bills', 'Q1 Strata.pdf', mockCategories);
    expect(catStrata?.name).toBe('Strata / Body Corporate');

    const catRepair = matchCategory('Other Expense', 'Bunnings downlight repairs $158.pdf', mockCategories);
    expect(catRepair?.name).toBe('Repairs & Maintenance');
  });

  test('9. Determines GST treatment and Tax Classification based on folder context', () => {
    // Council rates are GST-free
    const councilGst = matchTaxClassification(mockCategories[0], 'Council Bills', mockTaxClassifications);
    expect(councilGst.gstTreatment).toBe('none');
    expect(councilGst.taxClassification?.name).toContain('GST-Free');

    // General repairs are Taxable (10% GST)
    const repairGst = matchTaxClassification(mockCategories[3], 'Other Expense', mockTaxClassifications);
    expect(repairGst.gstTreatment).toBe('exclusive');
    expect(repairGst.taxClassification?.name).toContain('Operating');
  });

  test('10. Full file parsing with detected amount & month date produces READY status', () => {
    const curYear = new Date().getFullYear();
    const item = parseRawFileToImportItem(
      {
        relativePath: 'Expenses/3. Council Bills/April $476.pdf',
        fileName: 'April $476.pdf',
        fileSize: 102400,
        mimeType: 'application/pdf',
        propertyId: 'prop-123',
        leaseId: 'lease-456',
        categories: mockCategories,
        taxClassifications: mockTaxClassifications,
      },
      'batch-1',
      'ws-1'
    );

    expect(item.amount).toBe(476.0);
    expect(item.supplier).toBe('Council');
    expect(item.transaction_date).toBe(`${curYear}-04-01`);
    expect(item.description).toBe('April Council Bills');
    expect(item.validation_status).toBe('READY');
    expect(item.conflict_type).toBeNull();
    expect(item.gst_amount).toBe(0); // GST-free
    expect(item.property_id).toBe('prop-123');
    expect(item.lease_id).toBe('lease-456');
    expect(item.extraction_metadata.amount_source).toBe('FILENAME');
    expect(item.extraction_metadata.category_source).toBe('FOLDER');
    expect(item.extraction_metadata.date_source).toBe('FILENAME');
  });

  test('11. Full file parsing with missing amount flags MISSING_AMOUNT conflict', () => {
    const item = parseRawFileToImportItem(
      {
        relativePath: 'Expenses/5. Other Expense/Bunnings maintenance.pdf',
        fileName: 'Bunnings maintenance.pdf',
        fileSize: 81920,
        mimeType: 'application/pdf',
        propertyId: 'prop-123',
        leaseId: 'lease-456',
        categories: mockCategories,
        taxClassifications: mockTaxClassifications,
      },
      'batch-1',
      'ws-1'
    );

    expect(item.amount).toBeNull();
    expect(item.validation_status).toBe('NEEDS_ATTENTION');
    expect(item.conflict_type).toBe('MISSING_AMOUNT');
    expect(item.conflict_message).toContain('Amount could not be detected');
  });

  test('12. Conflicting amount between filename and document flags AMOUNT_CONFLICT', () => {
    const item = parseRawFileToImportItem(
      {
        relativePath: 'Expenses/5. Other Expense/Bunnings repair $158.pdf',
        fileName: 'Bunnings repair $158.pdf',
        fileSize: 94000,
        mimeType: 'application/pdf',
        propertyId: 'prop-123',
        leaseId: null,
        categories: mockCategories,
        taxClassifications: mockTaxClassifications,
        documentExtractedAmount: 168.0, // Document says 168 while filename says 158
      },
      'batch-1',
      'ws-1'
    );

    expect(item.amount).toBe(168.0);
    expect(item.validation_status).toBe('NEEDS_ATTENTION');
    expect(item.conflict_type).toBe('AMOUNT_CONFLICT');
    expect(item.conflict_message).toContain('Filename amount ($158.00) differs from document amount ($168.00)');
  });

  test('13. Auto-maps folder name to a new category when it does not exist in DB', () => {
    const customCat = matchCategory('12. Landscaping & Tree Care', 'Tree Trimming $650.pdf', mockCategories);
    expect(customCat).not.toBeNull();
    expect(customCat?.name).toBe('Landscaping & Tree Care');
    expect(customCat?.id).toBe('new:Landscaping & Tree Care');

    const item = parseRawFileToImportItem(
      {
        relativePath: 'Expenses/12. Landscaping & Tree Care/Tree Trimming $650.pdf',
        fileName: 'Tree Trimming $650.pdf',
        fileSize: 50000,
        mimeType: 'application/pdf',
        propertyId: 'prop-123',
        leaseId: null,
        categories: mockCategories,
        taxClassifications: mockTaxClassifications,
      },
      'batch-1',
      'ws-1'
    );

    expect(item.amount).toBe(650.0);
    expect(item.category_id).toBe('new:Landscaping & Tree Care');
    expect(item.validation_status).toBe('READY');
  });
});

