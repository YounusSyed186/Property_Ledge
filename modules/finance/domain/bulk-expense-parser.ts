/**
 * Bulk Expense Upload Parser & Extraction Logic
 */

import {
  ExpenseDocumentType,
  ExpenseValidationStatus,
  ExpenseConflictType,
  ExtractionMetadata,
  ExpenseImportItemDTO,
} from './bulk-expense-types';
import { CategoryDTO, TaxClassificationDTO } from './types';

export interface ParseFileInput {
  relativePath: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  propertyId: string;
  leaseId?: string | null;
  categories: CategoryDTO[];
  taxClassifications: TaxClassificationDTO[];
  documentExtractedAmount?: number | null;
  documentExtractedDate?: string | null;
  documentExtractedSupplier?: string | null;
  documentExtractedGst?: number | null;
  defaultPaymentStatus?: 'paid' | 'unpaid';
}

/**
 * Normalizes folder names by stripping leading numeric indexes (e.g., "3. Council Bills" -> "Council Bills")
 */
export function normalizeFolderName(folderName: string | null | undefined): string {
  if (!folderName) return '';
  return folderName.replace(/^\d+[\.\-_]\s*/, '').trim();
}

/**
 * Classifies a document as EXPENSE, SUPPORTING_DOCUMENT, or UNKNOWN based on folder and filename
 */
export function classifyDocumentType(folderName: string, fileName: string): ExpenseDocumentType {
  const normalized = normalizeFolderName(folderName).toLowerCase();
  const lowerName = fileName.toLowerCase();

  // Supporting reports / statements that aren't single-ledger expenses
  if (
    normalized.includes('depreciation report') ||
    lowerName.includes('depreciation') ||
    normalized.includes('income statement') ||
    lowerName.includes('income statement')
  ) {
    return 'SUPPORTING_DOCUMENT';
  }

  // Common expense folders / files
  if (
    normalized.includes('council') ||
    normalized.includes('strata') ||
    normalized.includes('water') ||
    normalized.includes('expense') ||
    normalized.includes('repair') ||
    normalized.includes('maintenance') ||
    normalized.includes('bill') ||
    normalized.includes('insurance') ||
    normalized.includes('interest') ||
    normalized.includes('rates') ||
    normalized.includes('tax') ||
    lowerName.includes('bill') ||
    lowerName.includes('receipt') ||
    lowerName.includes('invoice') ||
    lowerName.includes('repair')
  ) {
    return 'EXPENSE';
  }

  return 'EXPENSE';
}

/**
 * Parses monetary value from filename
 * Supports: $158, $69, $1,250, $1,250.50, AUD 158, AUD $158, 158.00, etc.
 * Avoids misidentifying standalone reference numbers (like 883234) as price when explicit currency token exists.
 */
export function extractAmountAndReferenceFromFileName(fileName: string): {
  amount: number | null;
  possibleReference: string | null;
  cleanNameWithoutAmount: string;
} {
  // Strip extension
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

  // 1. Check for explicit currency prefix: ($ or AUD or AUD$) followed by numbers
  // Matches: $1,250.50, $158, AUD 158, AUD $476, $ 69.00
  const explicitCurrencyRegex = /(?:AUD\s*\$|AUD\s*|\$)\s*([\d,]+(?:\.\d{1,2})?)/i;
  const explicitMatch = nameWithoutExt.match(explicitCurrencyRegex);

  let extractedAmount: number | null = null;
  let matchedToken = '';

  if (explicitMatch) {
    matchedToken = explicitMatch[0];
    const numericStr = explicitMatch[1].replace(/,/g, '');
    const parsed = parseFloat(numericStr);
    if (!isNaN(parsed) && parsed > 0 && parsed < 10_000_000) {
      extractedAmount = parsed;
    }
  }

  // 2. If no explicit currency symbol, look for standalone decimal amount (e.g. "repair 158.50" or "bill 476.00")
  if (extractedAmount === null) {
    const decimalAmountRegex = /\b([\d,]+\.\d{2})\b/;
    const decimalMatch = nameWithoutExt.match(decimalAmountRegex);
    if (decimalMatch) {
      matchedToken = decimalMatch[0];
      const numericStr = decimalMatch[1].replace(/,/g, '');
      const parsed = parseFloat(numericStr);
      if (!isNaN(parsed) && parsed > 0 && parsed < 10_000_000) {
        extractedAmount = parsed;
      }
    }
  }

  // 3. Find potential reference numbers (e.g. 6+ digit numbers not matching amount)
  let possibleReference: string | null = null;
  const refRegex = /\b(\d{6,12})\b/;
  const refMatch = nameWithoutExt.match(refRegex);
  if (refMatch) {
    possibleReference = refMatch[1];
  }

  // Clean the description by removing the amount token and trailing punctuation
  let cleanName = nameWithoutExt;
  if (matchedToken) {
    cleanName = cleanName.replace(matchedToken, ' ');
  }
  // Remove reference number if separate
  if (possibleReference) {
    cleanName = cleanName.replace(possibleReference, ' ');
  }

  // Clean up extra spaces, dashes, underscores
  cleanName = cleanName
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    amount: extractedAmount,
    possibleReference,
    cleanNameWithoutAmount: cleanName || nameWithoutExt,
  };
}

/**
 * Month names and abbreviations mapping to month number (1-12)
 */
const MONTH_MAP: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

const MONTH_NAMES_SET = new Set(Object.keys(MONTH_MAP));

/**
 * Extracts a date (YYYY-MM-DD) from filename and folder name
 * Supports:
 * - Explicit ISO dates: 2026-04-15, 2025/11/20
 * - Australian / UK dates: 15/04/2026, 15-10-2025, 15.10.2025
 * - Day + Month + Year: 15 Oct 2025, 15 October 2026, Oct 15 2025
 * - Month + Year: April 2026, Nov 2025 -> 2026-04-01
 * - Standalone Month in filename/folder: April $476.pdf -> 2026-04-01 (using current/found year)
 */
export function extractDateFromFileNameAndFolder(
  fileName: string,
  folderName?: string
): string | null {
  const textToScan = `${folderName || ''} ${fileName}`;
  const currentYear = new Date().getFullYear();

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = textToScan.match(/\b(20\d{2})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 2. Day-Month-Year numeric: DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = textToScan.match(/\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](20\d{2})\b/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Find 4-digit year in string if present (2020 to 2035)
  const yearMatch = textToScan.match(/\b(202[0-9]|203[0-5])\b/);
  const foundYear = yearMatch ? parseInt(yearMatch[1], 10) : currentYear;

  // 3. Day + Month Name + (Optional Year): e.g., "15 Oct 2025", "15th October", "Oct 15 2025"
  const dayMonthYearRegex = /\b(?:(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})(?:\s+(20\d{2}))?|([A-Za-z]{3,9})\s+(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?(?:\s+(20\d{2}))?)\b/i;
  const dmyTextMatch = textToScan.match(dayMonthYearRegex);
  if (dmyTextMatch) {
    const dayStr = dmyTextMatch[1] || dmyTextMatch[5];
    const monthStr = (dmyTextMatch[2] || dmyTextMatch[4]).toLowerCase();
    const explicitYear = dmyTextMatch[3] || dmyTextMatch[6];
    
    if (MONTH_MAP[monthStr]) {
      const monthNum = MONTH_MAP[monthStr];
      const dayNum = parseInt(dayStr, 10);
      const yearNum = explicitYear ? parseInt(explicitYear, 10) : foundYear;
      const mm = String(monthNum).padStart(2, '0');
      const dd = String(dayNum).padStart(2, '0');
      return `${yearNum}-${mm}-${dd}`;
    }
  }

  // 4. Standalone Month Name (e.g. "April $476.pdf", "August $477.pdf", "November Rates.pdf")
  const words = textToScan.toLowerCase().match(/\b[a-z]{3,9}\b/g) || [];
  for (const word of words) {
    if (MONTH_MAP[word]) {
      const monthNum = MONTH_MAP[word];
      const mm = String(monthNum).padStart(2, '0');
      return `${foundYear}-${mm}-01`;
    }
  }

  return null;
}

/**
 * Extracts merchant/supplier name from description and folder context
 */
export function extractSupplier(description: string, folderName?: string): string | null {
  const knownSuppliers = [
    'EnergyAustralia',
    'Yarra Valley Water',
    'City West Water',
    'Urban Utilities',
    'Sydney Water',
    'Harvey Norman',
    'Strata Choice',
    'Body Corporate',
    'Reece Plumbing',
    'City Council',
    'Origin Energy',
    'Officeworks',
    'Woolworths',
    'Bunnings',
    'Telstra',
    'Allianz',
    'Council',
    'Strata',
    'Optus',
    'Coles',
    'Bupa',
    'AGL',
    'QBE',
    'CGU',
    'IKEA',
  ];

  const fullContext = `${folderName || ''} ${description}`;

  for (const supplier of knownSuppliers) {
    const regex = new RegExp(`\\b${supplier}\\b`, 'i');
    if (regex.test(fullContext)) {
      return supplier;
    }
  }

  // Check if first word of description looks like a merchant, BUT ensure it's not a Month name or common stopword
  const firstWord = description.split(' ')[0]?.trim();
  const lowerFirst = firstWord?.toLowerCase() || '';
  const isStopWord =
    MONTH_NAMES_SET.has(lowerFirst) ||
    ['bill', 'bills', 'invoice', 'rates', 'receipt', 'expense', 'expenses', 'repair', 'repairs', 'q1', 'q2', 'q3', 'q4'].includes(lowerFirst);

  if (firstWord && firstWord.length > 2 && /^[A-Z][a-z]+/.test(firstWord) && !isStopWord) {
    return firstWord;
  }

  // Fallback to normalized folder context
  if (folderName) {
    const normFolder = normalizeFolderName(folderName);
    const lowerFolder = normFolder.toLowerCase();
    if (lowerFolder.includes('council')) return 'City Council';
    if (lowerFolder.includes('strata')) return 'Body Corporate / Strata';
    if (lowerFolder.includes('water')) return 'Water Utility';
    if (normFolder) return normFolder;
  }

  return null;
}

/**
 * Matches folder / filename to existing Expense Categories in workspace
 */
export function matchCategory(
  normalizedFolderName: string,
  fileName: string,
  categories: CategoryDTO[]
): CategoryDTO | null {
  const expenseCategories = categories.filter((c) => c.transaction_type === 'expense' && c.is_active);

  const cleanFolder = normalizeFolderName(normalizedFolderName);
  const target = `${cleanFolder} ${fileName}`.toLowerCase().trim();

  // 1. Direct exact name matching with existing categories in DB
  if (cleanFolder) {
    const exactMatch = expenseCategories.find(
      (c) => c.name.toLowerCase() === cleanFolder.toLowerCase()
    );
    if (exactMatch) return exactMatch;
  }

  // 2. Explicit priority keywords
  const categoryKeywords: Record<string, string[]> = {
    'Council Rates': ['council', 'rates', 'shire', 'city council'],
    'Water & Sewerage Rates': ['water', 'sewerage', 'sydney water', 'urban utilities', 'yarra water'],
    'Strata / Body Corporate': ['strata', 'body corporate', 'owners corp', 'levy', 'sinking fund'],
    'Repairs & Maintenance': ['repair', 'maintenance', 'bunnings', 'plumb', 'electric', 'downlight', 'tool', 'handyman', 'trade'],
    'Insurance': ['insurance', 'landlord insurance', 'building insurance', 'allianz', 'qbe', 'cgu', 'bupa'],
    'Utilities (Electricity/Gas)': ['electricity', 'gas', 'power', 'origin', 'agl', 'energyaustralia', 'utilities'],
    'Property Management Fees': ['management fee', 'letting fee', 'agency fee', 'commission'],
    'Cleaning & Gardening': ['cleaning', 'gardening', 'mowing', 'lawn', 'rubbish'],
    'Legal & Professional Fees': ['legal', 'solicitor', 'accountant', 'professional'],
    'Advertising & Marketing': ['advertising', 'marketing', 'domain', 'realestate.com.au'],
    'Other Operating Expense': ['other expense', 'sundry', 'general expense'],
  };

  for (const [canonicalName, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((kw) => target.includes(kw))) {
      // Find matching category in DB
      const matched = expenseCategories.find(
        (c) =>
          c.name.toLowerCase() === canonicalName.toLowerCase() ||
          keywords.some((kw) => c.name.toLowerCase().includes(kw))
      );
      if (matched) return matched;
    }
  }

  // 3. Target includes existing category name
  const partialMatch = expenseCategories.find((c) =>
    target.includes(c.name.toLowerCase())
  );
  if (partialMatch) return partialMatch;

  // 4. If folder name exists and no existing category matched, define a new category from folder name
  if (cleanFolder) {
    return {
      id: `new:${cleanFolder}`,
      name: cleanFolder,
      transaction_type: 'expense',
      description: `Category for ${cleanFolder}`,
      is_active: true,
      category_group_id: null,
      default_tax_classification_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // 5. Fallback to "Other Operating Expense" or first expense category
  const otherCat = expenseCategories.find(
    (c) => c.name.toLowerCase().includes('other') || c.name.toLowerCase().includes('general')
  );
  return otherCat || expenseCategories[0] || null;
}

/**
 * Matches Tax Classification (GST treatment)
 */
export function matchTaxClassification(
  category: CategoryDTO | null,
  normalizedFolderName: string,
  taxClassifications: TaxClassificationDTO[]
): {
  taxClassification: TaxClassificationDTO | null;
  gstTreatment: 'inclusive' | 'exclusive' | 'none';
  gstAmount: number;
  gstInclusive: boolean;
} {
  const lowerFolder = normalizedFolderName.toLowerCase();
  const isGstFree =
    lowerFolder.includes('council') ||
    lowerFolder.includes('water') ||
    lowerFolder.includes('rates') ||
    lowerFolder.includes('land tax') ||
    lowerFolder.includes('interest');

  const expenseClassifications = taxClassifications.filter(
    (tc) => tc.applies_to === 'expense' || tc.applies_to === 'both'
  );

  let matchedTc: TaxClassificationDTO | null = null;

  if (category?.default_tax_classification_id) {
    matchedTc =
      expenseClassifications.find((tc) => tc.id === category.default_tax_classification_id) || null;
  }

  if (!matchedTc) {
    if (isGstFree) {
      matchedTc =
        expenseClassifications.find(
          (tc) =>
            tc.name.toLowerCase().includes('gst-free') ||
            (tc.bas_code && (tc.bas_code.includes('G3') || tc.bas_code.includes('Free')))
        ) || null;
    } else {
      matchedTc =
        expenseClassifications.find(
          (tc) =>
            tc.name.toLowerCase().includes('operating') ||
            (tc.bas_code && tc.bas_code.includes('G11'))
        ) ||
        expenseClassifications[0] ||
        null;
    }
  }

  return {
    taxClassification: matchedTc,
    gstTreatment: isGstFree ? 'none' : 'exclusive',
    gstAmount: 0,
    gstInclusive: false,
  };
}

/**
 * Main parser that parses a raw file upload into a draft ExpenseImportItem
 */
export function parseRawFileToImportItem(
  input: ParseFileInput,
  batchId: string,
  workspaceId: string
): Omit<ExpenseImportItemDTO, 'id' | 'created_at' | 'updated_at'> {
  const parts = input.relativePath.split('/');
  const fileName = parts.pop() || input.fileName;
  const folderName = parts.length > 0 ? parts[parts.length - 1] : '';
  const normalizedFolder = normalizeFolderName(folderName);

  const documentType = classifyDocumentType(folderName, fileName);
  const { amount: filenameAmount, possibleReference, cleanNameWithoutAmount } =
    extractAmountAndReferenceFromFileName(fileName);

  const finalAmount =
    input.documentExtractedAmount !== undefined && input.documentExtractedAmount !== null
      ? input.documentExtractedAmount
      : filenameAmount;

  const extractedDate =
    input.documentExtractedDate ||
    extractDateFromFileNameAndFolder(fileName, folderName);

  const today = new Date().toISOString().split('T')[0];
  const finalDate = extractedDate || today;

  const supplier =
    input.documentExtractedSupplier ||
    extractSupplier(cleanNameWithoutAmount, folderName) ||
    (normalizedFolder ? normalizedFolder : null);

  // Enhance description if it's solely a month name to include the folder context (e.g. "April Council Bills")
  let description = cleanNameWithoutAmount || normalizedFolder || fileName;
  if (cleanNameWithoutAmount && MONTH_NAMES_SET.has(cleanNameWithoutAmount.toLowerCase().trim()) && normalizedFolder) {
    description = `${cleanNameWithoutAmount} ${normalizedFolder}`;
  }

  const matchedCat = matchCategory(normalizedFolder, fileName, input.categories);
  const { taxClassification, gstTreatment, gstInclusive } = matchTaxClassification(
    matchedCat,
    normalizedFolder,
    input.taxClassifications
  );

  // Compute GST amount if applicable (Standard Australian 10% GST on taxable expenses)
  let gstAmount = 0;
  if (input.documentExtractedGst !== undefined && input.documentExtractedGst !== null) {
    gstAmount = input.documentExtractedGst;
  } else if (finalAmount && gstTreatment !== 'none') {
    if (gstTreatment === 'inclusive') {
      gstAmount = Math.round((finalAmount / 11) * 100) / 100;
    } else {
      gstAmount = Math.round((finalAmount * 0.1) * 100) / 100;
    }
  }

  // Determine Conflict & Validation Status
  let validationStatus: ExpenseValidationStatus = 'READY';
  let conflictType: ExpenseConflictType | null = null;
  let conflictMessage: string | null = null;

  // Check 1: Missing Amount
  if (documentType === 'EXPENSE' && (finalAmount === null || finalAmount === undefined || finalAmount <= 0)) {
    validationStatus = 'NEEDS_ATTENTION';
    conflictType = 'MISSING_AMOUNT';
    conflictMessage = 'Amount could not be detected from the filename or document.';
  }
  // Check 2: Amount Conflict (Filename vs Document)
  else if (
    filenameAmount !== null &&
    input.documentExtractedAmount !== undefined &&
    input.documentExtractedAmount !== null &&
    Math.abs(filenameAmount - input.documentExtractedAmount) > 0.01
  ) {
    validationStatus = 'NEEDS_ATTENTION';
    conflictType = 'AMOUNT_CONFLICT';
    conflictMessage = `Filename amount ($${filenameAmount.toFixed(2)}) differs from document amount ($${input.documentExtractedAmount.toFixed(2)}).`;
  }

  const extractionMetadata: ExtractionMetadata = {
    amount_source:
      input.documentExtractedAmount !== undefined && input.documentExtractedAmount !== null
        ? 'DOCUMENT'
        : filenameAmount !== null
        ? 'FILENAME'
        : undefined,
    category_source: normalizedFolder ? 'FOLDER' : 'USER',
    description_source: 'FILENAME',
    date_source: input.documentExtractedDate ? 'DOCUMENT' : extractedDate ? 'FILENAME' : 'USER',
    supplier_source: input.documentExtractedSupplier ? 'DOCUMENT' : supplier ? 'FILENAME' : 'USER',
    gst_source: input.documentExtractedGst !== undefined ? 'DOCUMENT' : 'FOLDER',
    property_source: 'USER',
    lease_source: 'USER',
    filename_amount: filenameAmount,
    document_amount: input.documentExtractedAmount ?? null,
    possible_reference: possibleReference ?? undefined,
    normalized_folder_name: normalizedFolder,
  };

  return {
    file: {
      name: fileName,
      relativePath: input.relativePath,
      mimeType: input.mimeType || 'application/pdf',
      size: input.fileSize || 0,
      blobUrl: null,
      blobPath: null,
    },
    folderName: folderName || '',
    folder_name: folderName || null,
    fileName: fileName,
    file_name: fileName,
    fileType: input.mimeType || 'application/pdf',
    file_type: input.mimeType || 'application/pdf',
    fileSize: input.fileSize || 0,
    file_size: input.fileSize || 0,
    sourcePath: input.relativePath,
    source_path: input.relativePath,
    documentType: documentType,
    document_type: documentType,
    description: description,
    supplier: supplier,
    amount: finalAmount ?? null,
    transactionDate: finalDate,
    transaction_date: finalDate,
    gstInclusive: gstInclusive,
    gst_inclusive: gstInclusive,
    gstTreatment: gstTreatment,
    gst_treatment: gstTreatment,
    gstAmount: gstAmount,
    gst_amount: gstAmount,
    taxClassificationId: taxClassification?.id || null,
    tax_classification_id: taxClassification?.id || null,
    categoryId: matchedCat?.id || null,
    category_id: matchedCat?.id || null,
    propertyId: input.propertyId || '',
    property_id: input.propertyId || null,
    leaseId: input.leaseId || null,
    lease_id: input.leaseId || null,
    status: validationStatus,
    validation_status: validationStatus,
    paymentStatus: input.defaultPaymentStatus || 'paid',
    payment_status: input.defaultPaymentStatus || 'paid',
    conflicts: conflictMessage ? [{ field: conflictType || 'error', message: conflictMessage }] : [],
    conflictType: conflictType,
    conflict_type: conflictType,
    conflictMessage: conflictMessage,
    conflict_message: conflictMessage,
    extractionSources: {
      amount: extractionMetadata.amount_source,
      category: extractionMetadata.category_source,
      description: extractionMetadata.description_source,
      date: extractionMetadata.date_source,
      supplier: extractionMetadata.supplier_source,
      gst: extractionMetadata.gst_source,
      property: 'USER',
      lease: 'USER',
    },
    extractionMetadata: extractionMetadata,
    extraction_metadata: extractionMetadata,
    blob_url: null,
    blob_path: null,
  };
}
