/**
 * Australian Time & Date Utility Module.
 * Standardizes date formatting, scheduling, and timezone handling to Australian Time (Australia/Sydney).
 */

export const DEFAULT_AU_TIMEZONE = 'Australia/Sydney';
export const DEFAULT_AU_LOCALE = 'en-AU';

export interface AuDateParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Returns date parts in the given Australian timezone.
 */
export function getAuDateParts(
  date: Date = new Date(),
  timeZone: string = DEFAULT_AU_TIMEZONE
): AuDateParts {
  const formatter = new Intl.DateTimeFormat(DEFAULT_AU_LOCALE, {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== 'literal') {
      map[p.type] = parseInt(p.value, 10);
    }
  }

  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour === 24 ? 0 : (map.hour || 0),
    minute: map.minute || 0,
    second: map.second || 0,
  };
}

/**
 * Creates a UTC Date corresponding to the given local year, month (1-12), day, hour, minute in Australian timezone.
 */
export function createAuDate(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number = 0,
  minute: number = 0,
  timeZone: string = DEFAULT_AU_TIMEZONE
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const auParts = getAuDateParts(guess, timeZone);
  const auAsUtc = Date.UTC(
    auParts.year,
    auParts.month - 1,
    auParts.day,
    auParts.hour,
    auParts.minute,
    auParts.second
  );
  const diffMs = guess.getTime() - auAsUtc;
  return new Date(guess.getTime() + diffMs);
}

/**
 * Returns current Australian date formatted as YYYY-MM-DD.
 */
export function getAuTodayString(timeZone: string = DEFAULT_AU_TIMEZONE): string {
  const parts = getAuDateParts(new Date(), timeZone);
  const m = String(parts.month).padStart(2, '0');
  const d = String(parts.day).padStart(2, '0');
  return `${parts.year}-${m}-${d}`;
}

/**
 * Returns ISO string formatted date (YYYY-MM-DD) for any date in Australian timezone.
 */
export function formatAuDateIso(
  date: Date | string | number = new Date(),
  timeZone: string = DEFAULT_AU_TIMEZONE
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const parts = getAuDateParts(d, timeZone);
  const m = String(parts.month).padStart(2, '0');
  const dayStr = String(parts.day).padStart(2, '0');
  return `${parts.year}-${m}-${dayStr}`;
}

/**
 * Returns the current month billing period (start date and end date as YYYY-MM-DD in AU timezone).
 */
export function getAuMonthBillingPeriod(
  date: Date = new Date(),
  timeZone: string = DEFAULT_AU_TIMEZONE
): { startOfMonth: string; endOfMonth: string; monthName: string } {
  const parts = getAuDateParts(date, timeZone);
  const m = String(parts.month).padStart(2, '0');
  const startOfMonth = `${parts.year}-${m}-01`;

  // Last day of month
  const lastDay = new Date(parts.year, parts.month, 0).getDate();
  const endOfMonth = `${parts.year}-${m}-${String(lastDay).padStart(2, '0')}`;

  const monthFormatter = new Intl.DateTimeFormat(DEFAULT_AU_LOCALE, {
    timeZone,
    month: 'long',
    year: 'numeric',
  });
  const monthName = monthFormatter.format(date);

  return { startOfMonth, endOfMonth, monthName };
}

/**
 * Formats a date in standard Australian display style (e.g., '15 Oct 2026' or '15/10/2026').
 */
export function formatAuDisplayDate(
  date: Date | string | number | null | undefined,
  style: 'short' | 'medium' | 'long' = 'medium',
  timeZone: string = DEFAULT_AU_TIMEZONE
): string {
  if (!date) return '—';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);

  if (style === 'short') {
    return new Intl.DateTimeFormat(DEFAULT_AU_LOCALE, {
      timeZone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  }

  return new Intl.DateTimeFormat(DEFAULT_AU_LOCALE, {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Formats a date & time in standard Australian display style (e.g., '15 Oct 2026, 9:00 am AEST').
 */
export function formatAuDisplayDateTime(
  date: Date | string | number | null | undefined,
  includeSeconds: boolean = false,
  timeZone: string = DEFAULT_AU_TIMEZONE
): string {
  if (!date) return '—';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);

  return new Intl.DateTimeFormat(DEFAULT_AU_LOCALE, {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true,
  }).format(d);
}
