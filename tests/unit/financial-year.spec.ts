import { test, expect } from '@playwright/test';
import { createAuDate } from '../../lib/format/australian-time';
import {
  getFinancialYear,
  getFinancialYearNumber,
  getFinancialYearStart,
  getFinancialYearEnd,
  getCurrentFinancialYear,
  getCurrentFinancialYearNumber,
  getFinancialYearLabel,
  getFinancialYearRange,
  isDateInFinancialYear,
  parseFinancialYear,
  getAvailableFinancialYears,
  getFinancialYears,
  formatFinancialYear,
  formatFinancialYearFull,
  getFinancialYearMonths,
  AFY_MONTH_ORDER,
} from '../../lib/finance/financial-year';

test.describe('Australian Financial Year Canonical Utility Suite', () => {
  test('1. Core Financial Year Calculation: FY25, FY26, FY27', () => {
    // FY25: 1 Jul 2024 to 30 Jun 2025
    expect(getFinancialYear('2024-07-01')).toBe('FY25');
    expect(getFinancialYear('2024-12-31')).toBe('FY25');
    expect(getFinancialYear('2025-01-01')).toBe('FY25');
    expect(getFinancialYear('2025-06-30')).toBe('FY25');

    // FY26: 1 Jul 2025 to 30 Jun 2026
    expect(getFinancialYear('2025-07-01')).toBe('FY26');
    expect(getFinancialYear('2025-10-15')).toBe('FY26');
    expect(getFinancialYear('2026-03-10')).toBe('FY26');
    expect(getFinancialYear('2026-06-30')).toBe('FY26');

    // FY27: 1 Jul 2026 to 30 Jun 2027
    expect(getFinancialYear('2026-07-01')).toBe('FY27');
    expect(getFinancialYear('2026-08-10')).toBe('FY27');
    expect(getFinancialYear('2027-02-15')).toBe('FY27');
    expect(getFinancialYear('2027-06-30')).toBe('FY27');
  });

  test('2. Exact 30 June vs 01 July Boundaries', () => {
    // 30 June belongs strictly to the ending FY
    expect(getFinancialYear('2025-06-30')).toBe('FY25');
    expect(getFinancialYear('2026-06-30')).toBe('FY26');
    expect(getFinancialYear('2027-06-30')).toBe('FY27');

    // 01 July belongs strictly to the new FY
    expect(getFinancialYear('2025-07-01')).toBe('FY26');
    expect(getFinancialYear('2026-07-01')).toBe('FY27');
    expect(getFinancialYear('2027-07-01')).toBe('FY28');

    // Date object boundary tests using createAuDate (Australian local time)
    const endOfFY26 = createAuDate(2026, 6, 30, 23, 59, 59); // June 30, 2026 23:59:59 AEST
    const startOfFY27 = createAuDate(2026, 7, 1, 0, 0, 0);   // July 1, 2026 00:00:00 AEST

    expect(getFinancialYear(endOfFY26)).toBe('FY26');
    expect(getFinancialYear(startOfFY27)).toBe('FY27');
  });

  test('3. Leap Year & Special Calendar Handling', () => {
    // 2024 is a leap year; 29 Feb 2024 is in FY24
    expect(getFinancialYear('2024-02-29')).toBe('FY24');
    expect(isDateInFinancialYear('2024-02-29', 'FY24')).toBe(true);
    expect(isDateInFinancialYear('2024-02-29', 'FY25')).toBe(false);
  });

  test('4. Date Ranges & Half-Open Queries', () => {
    const range26 = getFinancialYearRange('FY26');
    expect(range26.start).toBe('2025-07-01');
    expect(range26.end).toBe('2026-06-30');
    expect(getFinancialYearStart('FY26')).toBe('2025-07-01');
    expect(getFinancialYearEnd('FY26')).toBe('2026-06-30');

    const range27 = getFinancialYearRange('FY27');
    expect(range27.start).toBe('2026-07-01');
    expect(range27.end).toBe('2027-06-30');
  });

  test('5. Parsing Inputs & Robust Sanitization', () => {
    expect(parseFinancialYear('FY26')).toBe(2026);
    expect(parseFinancialYear('fy26')).toBe(2026);
    expect(parseFinancialYear('FY2026')).toBe(2026);
    expect(parseFinancialYear('2025-2026')).toBe(2026);
    expect(parseFinancialYear('2025/2026')).toBe(2026);
    expect(parseFinancialYear(2026)).toBe(2026);
    expect(parseFinancialYear(26)).toBe(2026);
  });

  test('6. Validation: isDateInFinancialYear', () => {
    // In FY26
    expect(isDateInFinancialYear('2025-07-01', 'FY26')).toBe(true);
    expect(isDateInFinancialYear('2025-12-25', 'FY26')).toBe(true);
    expect(isDateInFinancialYear('2026-06-30', 'FY26')).toBe(true);

    // Outside FY26
    expect(isDateInFinancialYear('2025-06-30', 'FY26')).toBe(false);
    expect(isDateInFinancialYear('2026-07-01', 'FY26')).toBe(false);
  });

  test('7. Formatting & Label Generation', () => {
    expect(formatFinancialYear('FY26')).toBe('FY26');
    expect(formatFinancialYear(2026)).toBe('FY26');
    expect(getFinancialYearLabel('FY26')).toBe('FY26 (01 Jul 2025 – 30 Jun 2026)');
    expect(formatFinancialYearFull('FY26')).toBe('Financial Year 2025–2026 (FY26)');

    const currentFy = getCurrentFinancialYear();
    expect(currentFy).toMatch(/^FY\d{2}$/);
  });

  test('8. Chronological Australian FY Month Order (Jul -> Jun)', () => {
    expect(AFY_MONTH_ORDER[0].shortName).toBe('Jul');
    expect(AFY_MONTH_ORDER[11].shortName).toBe('Jun');

    const fy26Months = getFinancialYearMonths('FY26');
    expect(fy26Months.length).toBe(12);
    expect(fy26Months[0].key).toBe('2025-07');
    expect(fy26Months[5].key).toBe('2025-12');
    expect(fy26Months[6].key).toBe('2026-01');
    expect(fy26Months[11].key).toBe('2026-06');
  });

  test('9. Options and Selectors', () => {
    const list = getFinancialYears({ countBack: 3, countForward: 1 });
    expect(list.length).toBe(5);
    expect(list.every((opt) => opt.value.startsWith('FY'))).toBe(true);
    expect(list.every((opt) => opt.range.start.endsWith('-07-01'))).toBe(true);
    expect(list.every((opt) => opt.range.end.endsWith('-06-30'))).toBe(true);
  });
});
