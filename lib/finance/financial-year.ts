/**
 * Canonical Australian Financial Year (AFY) Utility.
 *
 * In Australia, the financial year runs strictly from 01 July through 30 June:
 * - FY25: 01 Jul 2024 -> 30 Jun 2025
 * - FY26: 01 Jul 2025 -> 30 Jun 2026
 * - FY27: 01 Jul 2026 -> 30 Jun 2027
 *
 * This utility provides the application's authoritative source of truth for all
 * FY calculations, date ranges, labels, validation, and boundary conditions.
 */

import {
  getAuDateParts,
  formatAuDateIso,
  DEFAULT_AU_TIMEZONE,
  DEFAULT_AU_LOCALE,
} from '@/lib/format/australian-time';

export interface FinancialYearRange {
  start: string; // YYYY-MM-DD (e.g. '2025-07-01')
  end: string;   // YYYY-MM-DD (e.g. '2026-06-30')
}

export interface FinancialYearOption {
  value: string;      // e.g. 'FY26'
  year: number;       // e.g. 2026 (the ending calendar year)
  label: string;      // e.g. 'FY26 (01 Jul 2025 – 30 Jun 2026)'
  shortLabel: string; // e.g. 'FY26'
  range: FinancialYearRange;
}

export interface GetFinancialYearsOptions {
  countBack?: number;
  countForward?: number;
}

/**
 * Parses any financial year representation into a 4-digit ending calendar year integer.
 * Examples:
 * - 'FY26' -> 2026
 * - 'FY2026' -> 2026
 * - '2025-2026' -> 2026
 * - 2026 -> 2026
 * - 26 -> 2026
 */
export function parseFinancialYear(fy: string | number): number {
  if (typeof fy === 'number') {
    if (fy < 100) return 2000 + fy;
    return fy;
  }

  const clean = fy.trim().toUpperCase();
  if (clean.startsWith('FY')) {
    const numPart = parseInt(clean.substring(2).trim(), 10);
    if (!isNaN(numPart)) {
      return numPart < 100 ? 2000 + numPart : numPart;
    }
  }

  if (clean.includes('-') || clean.includes('/')) {
    const parts = clean.split(/[-/]/);
    const last = parseInt(parts[parts.length - 1].trim(), 10);
    if (!isNaN(last)) {
      return last < 100 ? 2000 + last : last;
    }
  }

  const parsed = parseInt(clean, 10);
  if (!isNaN(parsed)) {
    return parsed < 100 ? 2000 + parsed : parsed;
  }

  return getCurrentFinancialYearNumber();
}

/**
 * Returns the current 4-digit Australian Financial Year ending year.
 * e.g., in March 2026 -> 2026 (FY26); in August 2026 -> 2027 (FY27).
 */
export function getCurrentFinancialYearNumber(): number {
  const parts = getAuDateParts(new Date());
  return parts.month >= 7 ? parts.year + 1 : parts.year;
}

/**
 * Returns current Australian Financial Year code (e.g. 'FY26', 'FY27').
 */
export function getCurrentFinancialYear(): string {
  const yr = getCurrentFinancialYearNumber();
  return `FY${String(yr).slice(-2)}`;
}

/**
 * Returns the 4-digit Australian Financial Year ending year for a given date.
 * Example:
 * - '2026-08-10' (10 Aug 2026) -> 2027
 * - '2026-03-10' (10 Mar 2026) -> 2026
 */
export function getFinancialYearNumber(date: Date | string | number = new Date()): number {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return getCurrentFinancialYearNumber();
  }
  const parts = getAuDateParts(d);
  return parts.month >= 7 ? parts.year + 1 : parts.year;
}

/**
 * Returns the standard financial year code (e.g. 'FY26', 'FY27') for a given date or FY code.
 * Example:
 * - getFinancialYear('2026-08-10') -> 'FY27'
 * - getFinancialYear('2026-03-10') -> 'FY26'
 */
export function getFinancialYear(dateOrFy: Date | string | number = new Date()): string {
  if (typeof dateOrFy === 'string' && (dateOrFy.startsWith('FY') || dateOrFy.startsWith('fy'))) {
    const yr = parseFinancialYear(dateOrFy);
    return `FY${String(yr).slice(-2)}`;
  }

  if (
    (typeof dateOrFy === 'number' && dateOrFy >= 2000 && dateOrFy < 2100) ||
    (typeof dateOrFy === 'string' && /^\d{4}$/.test(dateOrFy))
  ) {
    const yr = parseFinancialYear(dateOrFy);
    return `FY${String(yr).slice(-2)}`;
  }

  const yr = getFinancialYearNumber(dateOrFy);
  return `FY${String(yr).slice(-2)}`;
}

/**
 * Returns the start date (YYYY-MM-DD) for a financial year (01 July).
 * Example:
 * - getFinancialYearStart('FY26') -> '2025-07-01'
 * - getFinancialYearStart(2026) -> '2025-07-01'
 */
export function getFinancialYearStart(fy: string | number): string {
  const endYear = parseFinancialYear(fy);
  const startYear = endYear - 1;
  return `${startYear}-07-01`;
}

/**
 * Returns the end date (YYYY-MM-DD) for a financial year (30 June).
 * Example:
 * - getFinancialYearEnd('FY26') -> '2026-06-30'
 * - getFinancialYearEnd(2026) -> '2026-06-30'
 */
export function getFinancialYearEnd(fy: string | number): string {
  const endYear = parseFinancialYear(fy);
  return `${endYear}-06-30`;
}

/**
 * Returns the start and end date range for a given financial year.
 */
export function getFinancialYearRange(fy: string | number): FinancialYearRange {
  return {
    start: getFinancialYearStart(fy),
    end: getFinancialYearEnd(fy),
  };
}

/**
 * Returns a user-friendly label for a financial year.
 * Example:
 * - getFinancialYearLabel('FY26') -> 'FY26 (01 Jul 2025 – 30 Jun 2026)'
 */
export function getFinancialYearLabel(dateOrFy: Date | string | number): string {
  const yr = typeof dateOrFy === 'object' && dateOrFy instanceof Date
    ? getFinancialYearNumber(dateOrFy)
    : parseFinancialYear(dateOrFy);

  const startYear = yr - 1;
  const shortCode = `FY${String(yr).slice(-2)}`;
  return `${shortCode} (01 Jul ${startYear} – 30 Jun ${yr})`;
}

/**
 * Formats a financial year code or number into standard display string.
 */
export function formatFinancialYear(fy: string | number): string {
  const yr = parseFinancialYear(fy);
  return `FY${String(yr).slice(-2)}`;
}

/**
 * Returns formatted long title, e.g. 'Financial Year 2025–2026 (FY26)'
 */
export function formatFinancialYearFull(fy: string | number): string {
  const yr = parseFinancialYear(fy);
  const startYear = yr - 1;
  const shortCode = `FY${String(yr).slice(-2)}`;
  return `Financial Year ${startYear}–${yr} (${shortCode})`;
}

/**
 * Validates whether a given ISO date string or Date object falls inside the specified financial year.
 * Example:
 * - isDateInFinancialYear('2026-08-01', 'FY26') -> false (belongs to FY27)
 * - isDateInFinancialYear('2026-03-10', 'FY26') -> true
 */
export function isDateInFinancialYear(date: Date | string | number, fy: string | number): boolean {
  const iso = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)
    ? date.substring(0, 10)
    : formatAuDateIso(date);

  if (!iso) return false;

  const range = getFinancialYearRange(fy);
  return iso >= range.start && iso <= range.end;
}

/**
 * Generates an array of available Australian Financial Year options for dropdowns and selectors.
 */
export function getAvailableFinancialYears(
  countBack = 4,
  countForward = 1
): FinancialYearOption[] {
  const currentEndYear = getCurrentFinancialYearNumber();
  const startEndYear = currentEndYear + countForward;
  const total = countBack + countForward + 1;

  const options: FinancialYearOption[] = [];
  for (let i = 0; i < total; i++) {
    const yr = startEndYear - i;
    const shortCode = `FY${String(yr).slice(-2)}`;
    const range = getFinancialYearRange(yr);
    options.push({
      value: shortCode,
      year: yr,
      label: `${shortCode} (01 Jul ${yr - 1} – 30 Jun ${yr})`,
      shortLabel: shortCode,
      range,
    });
  }

  return options;
}

/**
 * Alias for getAvailableFinancialYears with options object support
 */
export function getFinancialYears(options?: GetFinancialYearsOptions): FinancialYearOption[] {
  return getAvailableFinancialYears(options?.countBack ?? 4, options?.countForward ?? 1);
}

/**
 * Australian Financial Year Month Order (1 July -> 30 June)
 * Returns array of 12 months with index, label, and calendar month offset.
 */
export const AFY_MONTH_ORDER = [
  { fyIndex: 1, monthNumber: 7, monthName: 'July', shortName: 'Jul' },
  { fyIndex: 2, monthNumber: 8, monthName: 'August', shortName: 'Aug' },
  { fyIndex: 3, monthNumber: 9, monthName: 'September', shortName: 'Sep' },
  { fyIndex: 4, monthNumber: 10, monthName: 'October', shortName: 'Oct' },
  { fyIndex: 5, monthNumber: 11, monthName: 'November', shortName: 'Nov' },
  { fyIndex: 6, monthNumber: 12, monthName: 'December', shortName: 'Dec' },
  { fyIndex: 7, monthNumber: 1, monthName: 'January', shortName: 'Jan' },
  { fyIndex: 8, monthNumber: 2, monthName: 'February', shortName: 'Feb' },
  { fyIndex: 9, monthNumber: 3, monthName: 'March', shortName: 'Mar' },
  { fyIndex: 10, monthNumber: 4, monthName: 'April', shortName: 'Apr' },
  { fyIndex: 11, monthNumber: 5, monthName: 'May', shortName: 'May' },
  { fyIndex: 12, monthNumber: 6, monthName: 'June', shortName: 'Jun' },
] as const;

/**
 * Returns array of month keys formatted as YYYY-MM for a given FY in Australian chronological order (Jul -> Jun).
 */
export function getFinancialYearMonths(fy: string | number): Array<{ key: string; label: string; shortLabel: string; year: number; month: number }> {
  const endYear = parseFinancialYear(fy);
  const startYear = endYear - 1;

  return AFY_MONTH_ORDER.map((m) => {
    const year = m.monthNumber >= 7 ? startYear : endYear;
    const mStr = String(m.monthNumber).padStart(2, '0');
    const key = `${year}-${mStr}`;
    return {
      key,
      label: `${m.monthName} ${year}`,
      shortLabel: `${m.shortName} ${String(year).slice(-2)}`,
      year,
      month: m.monthNumber,
    };
  });
}
